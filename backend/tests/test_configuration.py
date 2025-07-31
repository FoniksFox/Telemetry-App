"""
Test configuration manager functionality including dynamic configuration, validation, and device registration.
"""
import pytest
from datetime import datetime

from services.configuration_manager import config_manager
from models.configuration import TelemetryTypeConfig, CommandTemplate, CommandParameter, DataType


class TestConfigurationManager:
    """Test the configuration manager service functionality."""
    
    def test_configuration_manager_initialization(self):
        """Test that configuration manager initializes correctly."""
        assert isinstance(config_manager.telemetry_types, dict)
        assert isinstance(config_manager.command_templates, dict)
        assert isinstance(config_manager.last_updated, datetime)
        assert config_manager.device_connected == False
    
    def test_register_device_configuration(self):
        """Test device configuration registration."""
        # Sample telemetry types as dict (not Pydantic models)
        telemetry_types = {
            "temperature": {
                "unit": "°C",
                "data_type": "float",
                "range": {"min": -20, "max": 50},
                "description": "Temperature sensor"
            },
            "pressure": {
                "unit": "hPa", 
                "data_type": "float",
                "range": {"min": 800, "max": 1200},
                "description": "Pressure sensor"
            }
        }
        
        # Sample command templates as dict
        command_templates = {
            "test_command": {
                "command": "test_command",
                "parameters": {
                    "param1": {
                        "type": "float",
                        "required": True,
                        "description": "Test parameter"
                    }
                },
                "description": "Test command"
            }
        }
        
        # Register configuration
        result = config_manager.register_device_configuration(
            telemetry_types=telemetry_types,
            command_templates=command_templates,
            device_id="test_device"
        )
        
        # Verify registration
        assert result == True
        assert len(config_manager.telemetry_types) == 2
        assert "temperature" in config_manager.telemetry_types
        assert "pressure" in config_manager.telemetry_types
        assert len(config_manager.command_templates) == 1
        assert "test_command" in config_manager.command_templates
        assert config_manager.device_connected == True
    
    def test_get_telemetry_types(self):
        """Test retrieving telemetry types."""
        # Add test data directly
        config_manager.telemetry_types["test_sensor"] = TelemetryTypeConfig(
            unit="V",
            data_type=DataType.FLOAT,
            range={"min": 0, "max": 5},
            description="Test sensor"
        )
        
        response = config_manager.get_telemetry_types()
        
        assert hasattr(response, 'telemetry_types')
        assert hasattr(response, 'last_updated')
        assert "test_sensor" in response.telemetry_types
        assert response.telemetry_types["test_sensor"].unit == "V"
    
    def test_get_command_templates(self):
        """Test retrieving command templates."""
        # Add test data directly
        config_manager.command_templates["test_cmd"] = CommandTemplate(
            command="test_cmd",
            parameters={
                "value": CommandParameter(
                    type="int",
                    required=True,
                    description="Test value"
                )
            },
            description="Test command"
        )
        
        response = config_manager.get_command_templates()
        
        assert hasattr(response, 'command_templates')
        assert hasattr(response, 'last_updated')
        assert "test_cmd" in response.command_templates
        assert response.command_templates["test_cmd"].command == "test_cmd"
    
    def test_get_command_template_by_id(self):
        """Test retrieving specific command template."""
        # Add test data
        template = CommandTemplate(
            command="specific_cmd",
            parameters={
                "param": CommandParameter(
                    type="string",
                    required=False,
                    description="Optional parameter"
                )
            },
            description="Specific command"
        )
        config_manager.command_templates["specific_cmd"] = template
        
        # Test existing command
        result = config_manager.get_command_template("specific_cmd")
        assert result == template
        
        # Test non-existing command
        with pytest.raises(KeyError):
            config_manager.get_command_template("non_existing_cmd")
    
    def test_validate_telemetry_value_success(self):
        """Test successful telemetry value validation."""
        # Setup telemetry type
        config_manager.telemetry_types["test_sensor"] = TelemetryTypeConfig(
            unit="V",
            data_type=DataType.FLOAT,
            range={"min": 0.0, "max": 5.0},
            description="Test sensor"
        )
        
        # Test valid value
        is_valid, error = config_manager.validate_telemetry_value("test_sensor", 3.5)
        assert is_valid == True
        assert error is None
        
        # Test boundary values
        is_valid, error = config_manager.validate_telemetry_value("test_sensor", 0.0)
        assert is_valid == True
        
        is_valid, error = config_manager.validate_telemetry_value("test_sensor", 5.0)
        assert is_valid == True
    
    def test_validate_telemetry_value_out_of_range(self):
        """Test telemetry value validation with out-of-range values."""
        # Setup telemetry type
        config_manager.telemetry_types["range_sensor"] = TelemetryTypeConfig(
            unit="°C",
            data_type=DataType.FLOAT,
            range={"min": -10.0, "max": 50.0},
            description="Temperature sensor"
        )
        
        # Test out-of-range values
        is_valid, error = config_manager.validate_telemetry_value("range_sensor", -20.0)
        assert is_valid == False
        assert error is not None and "greater than or equal to" in error
        
        is_valid, error = config_manager.validate_telemetry_value("range_sensor", 60.0)
        assert is_valid == False
        assert error is not None and "less than or equal to" in error
    
    def test_validate_telemetry_value_enum_constraint(self):
        """Test telemetry value validation with enum constraint."""
        # Setup telemetry type with enum
        config_manager.telemetry_types["status_sensor"] = TelemetryTypeConfig(
            data_type=DataType.STRING,
            enum=["online", "offline", "maintenance"],
            description="Status sensor"
        )
        
        # Test valid enum values
        is_valid, error = config_manager.validate_telemetry_value("status_sensor", "online")
        assert is_valid == True
        assert error is None
        
        is_valid, error = config_manager.validate_telemetry_value("status_sensor", "offline")
        assert is_valid == True
        
        # Test invalid enum value
        is_valid, error = config_manager.validate_telemetry_value("status_sensor", "invalid_status")
        assert is_valid == False
        assert error is not None and "must be one of" in error
    
    def test_validate_telemetry_value_unknown_type(self):
        """Test telemetry value validation for unknown telemetry type."""
        assert config_manager.validate_telemetry_value("unknown_sensor", 42) == (False, "Unknown telemetry type")

    def test_is_configuration_available(self):
        """Test checking if configuration is available."""
        # Initially no configuration
        assert config_manager.is_configuration_available() == False
        
        # Add telemetry type
        config_manager.telemetry_types["test"] = TelemetryTypeConfig(
            data_type=DataType.FLOAT,
            description="Test"
        )
        config_manager.device_connected = True
        
        # Now configuration is available
        assert config_manager.is_configuration_available() == True
    
    def test_unregister_device(self):
        """Test device unregistration."""
        # Add some configuration
        config_manager.telemetry_types["test"] = TelemetryTypeConfig(
            data_type=DataType.FLOAT,
            description="Test"
        )
        config_manager.device_connected = True
        
        # Unregister
        config_manager.unregister_device("test_device")
        
        # Verify cleanup
        assert len(config_manager.telemetry_types) == 0
        assert len(config_manager.command_templates) == 0
        assert config_manager.device_connected == False
