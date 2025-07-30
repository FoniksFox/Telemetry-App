import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from models.configuration import (
    TelemetryTypesResponse, 
    CommandTemplatesResponse,
    TelemetryTypeConfig,
    CommandTemplate
)

logger = logging.getLogger(__name__)


class ConfigurationManager:
    """
    Manages dynamic telemetry type definitions and command templates.
    Receives configuration from connected devices/simulators rather than static files.
    """
    
    def __init__(self):
        self.telemetry_types: Dict[str, TelemetryTypeConfig] = {}
        self.command_templates: Dict[str, CommandTemplate] = {}
        self.last_updated: datetime = datetime.now()
        self.device_connected: bool = False
        
        logger.info("Configuration manager initialized - waiting for device configuration")
    
    def register_device_configuration(self, 
                                    telemetry_types: Dict[str, Dict[str, Any]], 
                                    command_templates: Dict[str, Dict[str, Any]],
                                    device_id: str = "simulator") -> bool:
        """
        Register configuration from a connected device/simulator.
        
        Args:
            telemetry_types: Dictionary of telemetry type definitions
            command_templates: Dictionary of command template definitions
            device_id: Identifier of the device providing the configuration
            
        Returns:
            True if configuration was successfully registered
        """
        try:
            # Convert to Pydantic models for validation
            validated_telemetry_types = {
                key: TelemetryTypeConfig(**config) 
                for key, config in telemetry_types.items()
            }
            
            validated_command_templates = {
                key: CommandTemplate(**template) 
                for key, template in command_templates.items()
            }
            
            # Update stored configuration
            self.telemetry_types = validated_telemetry_types
            self.command_templates = validated_command_templates
            self.last_updated = datetime.now()
            self.device_connected = True
            
            logger.info(f"Device '{device_id}' registered configuration: "
                       f"{len(self.telemetry_types)} telemetry types, "
                       f"{len(self.command_templates)} command templates")
            
            return True
            
        except Exception as e:
            logger.error(f"Error registering device configuration from '{device_id}': {e}")
            return False
    
    def unregister_device(self, device_id: str = "simulator") -> None:
        """
        Unregister a device and clear its configuration.
        
        Args:
            device_id: Identifier of the device to unregister
        """
        self.telemetry_types.clear()
        self.command_templates.clear()
        self.device_connected = False
        self.last_updated = datetime.now()
        
        logger.info(f"Device '{device_id}' unregistered - configuration cleared")
    
    def get_telemetry_types(self) -> TelemetryTypesResponse:
        """
        Get all available telemetry type definitions.
        
        Returns:
            TelemetryTypesResponse containing all telemetry type configurations
        """
        return TelemetryTypesResponse(
            telemetry_types=self.telemetry_types,
            last_updated=self.last_updated.isoformat()
        )
    
    def get_command_templates(self) -> CommandTemplatesResponse:
        """
        Get all available command templates.
        
        Returns:
            CommandTemplatesResponse containing all command templates
        """
        return CommandTemplatesResponse(
            command_templates=self.command_templates,
            last_updated=self.last_updated.isoformat()
        )
    
    def is_configuration_available(self) -> bool:
        """
        Check if device configuration is available.
        
        Returns:
            True if a device has registered configuration
        """
        return self.device_connected and (
            len(self.telemetry_types) > 0 or len(self.command_templates) > 0
        )
    
    def get_telemetry_type(self, type_id: str) -> TelemetryTypeConfig:
        """
        Get a specific telemetry type configuration.
        
        Args:
            type_id: The telemetry type identifier
            
        Returns:
            TelemetryTypeConfig for the specified type
            
        Raises:
            KeyError: If the telemetry type is not found
        """
        if type_id not in self.telemetry_types:
            raise KeyError(f"Telemetry type '{type_id}' not found")
        
        return self.telemetry_types[type_id]
    
    def get_command_template(self, command_id: str) -> CommandTemplate:
        """
        Get a specific command template.
        
        Args:
            command_id: The command identifier
            
        Returns:
            CommandTemplate for the specified command
            
        Raises:
            KeyError: If the command template is not found
        """
        if command_id not in self.command_templates:
            raise KeyError(f"Command template '{command_id}' not found")
        
        return self.command_templates[command_id]
    
    def validate_telemetry_value(self, type_id: str, value: Any) -> tuple[bool, Optional[str]]:
        """
        Validate a telemetry value against its type configuration.
        
        Args:
            type_id: The telemetry type identifier
            value: The value to validate
            
        Returns:
            Tuple of (is_valid, error_message). If valid, error_message is None.
        """
        try:
            config = self.get_telemetry_type(type_id)
            
            # Check data type
            if config.data_type.value == "float":
                if not isinstance(value, (int, float)):
                    return False, "Value must be a float or int"
                value = float(value)
            elif config.data_type.value == "int":
                if not isinstance(value, int):
                    return False, "Value must be an int"
            elif config.data_type.value == "string":
                if not isinstance(value, str):
                    return False, "Value must be a string"
            elif config.data_type.value == "boolean":
                if not isinstance(value, bool):
                    return False, "Value must be a boolean"

            # Check range constraints
            if config.range and isinstance(value, (int, float)):
                min_val = config.range.get("min")
                max_val = config.range.get("max")
                if min_val is not None and value < min_val:
                    return False, f"Value must be greater than or equal to {min_val}"
                if max_val is not None and value > max_val:
                    return False, f"Value must be less than or equal to {max_val}"

            # Check enum constraints
            if config.enum and value not in config.enum:
                return False, f"Value must be one of {config.enum}"

            return True, None
            
        except KeyError:
            return False, "Unknown telemetry type"

    def validate_command(self, command_id: str, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validate a command and its parameters against the command template.
        
        Args:
            command_id: The command identifier
            parameters: The command parameters to validate
            
        Returns:
            Tuple of (is_valid, error_message). If valid, error_message is None.
        """
        try:
            template = self.get_command_template(command_id)
            
            # Check required parameters
            for param_name, param_config in template.parameters.items():
                if param_config.required and param_name not in parameters:
                    return False, f"Required parameter '{param_name}' is missing"
            
            # Validate each provided parameter
            for param_name, param_value in parameters.items():
                if param_name not in template.parameters:
                    return False, f"Unknown parameter '{param_name}' for command '{command_id}'"
                
                param_config = template.parameters[param_name]
                
                # Validate parameter type
                if not self._validate_parameter_type(param_value, param_config.type):
                    return False, f"Parameter '{param_name}' has invalid type. Expected {param_config.type}"
                
                # Validate enum constraints
                if param_config.enum and param_value not in param_config.enum:
                    return False, f"Parameter '{param_name}' value '{param_value}' not in allowed values: {param_config.enum}"
            
            return True, None
            
        except KeyError:
            return False, f"Command '{command_id}' not found in registered templates"
    
    def _validate_parameter_type(self, value: Any, expected_type: str) -> tuple[bool, Optional[str]]:
        """
        Validate that a parameter value matches the expected type.
        
        Args:
            value: The value to validate
            expected_type: The expected type string ("string", "int", "float", "boolean")
            
        Returns:
            True if the value matches the expected type
        """
        if expected_type == "string":
            if not isinstance(value, str):
                return False, "Value must be a string"
            else: 
                return True, None
        elif expected_type == "int":
            if not isinstance(value, int):
                return False, "Value must be an int"
            else:
                return True, None
        elif expected_type == "float":
            if not isinstance(value, (int, float)):
                return False, "Value must be a float"
            else:
                return True, None
        elif expected_type == "boolean":
            if not isinstance(value, bool):
                return False, "Value must be a boolean"
            else:
                return True, None
        else:
            # Unknown type, assume not valid
            return False, f"Unknown parameter type '{expected_type}'"
    
    def get_configuration_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the current configuration state.
        
        Returns:
            Dictionary containing configuration summary information
        """
        return {
            "device_connected": self.device_connected,
            "telemetry_types_count": len(self.telemetry_types),
            "command_templates_count": len(self.command_templates),
            "last_updated": self.last_updated.isoformat(),
            "configuration_available": self.is_configuration_available(),
            "telemetry_types": list(self.telemetry_types.keys()),
            "available_commands": list(self.command_templates.keys())
        }


# Global configuration manager instance
config_manager = ConfigurationManager()
