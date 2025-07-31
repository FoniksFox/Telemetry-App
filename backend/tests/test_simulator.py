"""
Test simulator functionality including data generation, command handling, and configuration registration.
"""
import pytest
import asyncio
from datetime import datetime

from services.simulator import simulator
from services.configuration_manager import config_manager
from services.websocket_manager import websocket_manager
from models.commands import Command


class TestSimulator:
    """Test the simulator service functionality."""
    
    def test_simulator_initialization(self):
        """Test that simulator initializes correctly."""
        assert simulator.is_running == False
        assert simulator.update_interval > 0
        assert "temperature" in simulator.sensors
        assert "pressure" in simulator.sensors
        assert "humidity" in simulator.sensors
    
    @pytest.mark.asyncio
    async def test_start_stop_simulator(self):
        """Test starting and stopping the simulator."""
        # Test start
        await simulator.start()
        assert simulator.is_running == True
        
        # Test stop
        await simulator.stop()
        assert simulator.is_running == False
    
    @pytest.mark.asyncio
    async def test_register_device_configuration(self):
        """Test that simulator registers its configuration on startup."""
        # Clear any existing configuration
        config_manager.telemetry_types.clear()
        config_manager.command_templates.clear()
        
        # Start simulator (which should trigger registration)
        await simulator.start()
        
        # Verify telemetry types were registered
        assert len(config_manager.telemetry_types) > 0
        assert "temperature" in config_manager.telemetry_types
        assert "pressure" in config_manager.telemetry_types
        assert "humidity" in config_manager.telemetry_types
        
        # Verify command templates were registered
        assert len(config_manager.command_templates) > 0
        assert "set_update_interval" in config_manager.command_templates
        assert "calibrate_sensors" in config_manager.command_templates
        
        # Verify device is marked as connected
        assert config_manager.device_connected == True
        
        await simulator.stop()
    
    @pytest.mark.asyncio
    async def test_handle_set_update_interval_command(self):
        """Test handling set_update_interval command."""
        await simulator.start()
        
        # Create command
        command = Command(
            command="set_update_interval",
            parameters={"interval": 25}
        )
        
        # Mock websocket manager to capture confirmation
        captured_messages = []
        original_broadcast = websocket_manager.broadcast_message
        
        async def mock_broadcast(message):
            captured_messages.append(message)
            return await original_broadcast(message)
        
        websocket_manager.broadcast_message = mock_broadcast
        
        try:
            # Handle command
            await simulator.handle_command(command)
            
            # Should have sent a confirmation message
            assert len(captured_messages) == 1
            confirmation = captured_messages[0]
            assert confirmation.root.type == "command_result"
            assert confirmation.root.id == "command_result"
            assert f"Update interval set to {command.parameters['interval']} seconds" in confirmation.root.value.message

        finally:
            websocket_manager.broadcast_message = original_broadcast
            await simulator.stop()
    
    @pytest.mark.asyncio
    async def test_handle_calibrate_sensors_command(self):
        """Test handling calibrate_sensors command (long-running)."""
        await simulator.start()
        
        # Create command with short duration for testing
        command = Command(
            command="calibrate_sensors",
            parameters={"duration": 1}  # 1 second for testing
        )
        
        # Mock websocket manager to capture messages
        captured_messages = []
        original_broadcast = websocket_manager.broadcast_message
        
        async def mock_broadcast(message):
            captured_messages.append(message)
            return await original_broadcast(message)
        
        websocket_manager.broadcast_message = mock_broadcast
        
        try:
            # Handle command
            start_time = datetime.now()
            await simulator.handle_command(command)
            
            # Wait for the success message to arrive (calibration should complete in ~1 second)
            # We'll wait up to 3 seconds for the completion message
            max_wait_time = 3.0
            wait_start = datetime.now()
            
            while (datetime.now() - wait_start).total_seconds() < max_wait_time:
                if len(captured_messages) >= 2:
                    # Check if we have a success message
                    success_messages = [msg for msg in captured_messages 
                                      if msg.root.type == "command_result" and msg.root.value.status == "success"]
                    if success_messages:
                        end_time = datetime.now()
                        break
                await asyncio.sleep(0.1)  # Check every 100ms
            else:
                # Timeout waiting for success message
                assert False, f"Timeout waiting for calibration completion. Messages: {len(captured_messages)}"
            
            # Should have taken approximately 1 second from start to success message
            duration = (end_time - start_time).total_seconds()
            assert 0.8 <= duration <= 1.5  # Allow some tolerance
            
            # Should have sent multiple progress updates + completion
            assert len(captured_messages) >= 2
            
            # Last message should be completion
            final_message = captured_messages[-1]
            assert "calibration completed" in final_message.root.value.message.lower()
            
        finally:
            websocket_manager.broadcast_message = original_broadcast
            await simulator.stop()
    
    @pytest.mark.asyncio
    async def test_handle_unknown_command(self):
        """Test handling of unknown command."""
        await simulator.start()
        
        # Create unknown command
        command = Command(
            command="unknown_command",
            parameters={}
        )
        
        # Mock websocket manager to capture error message
        captured_messages = []
        original_broadcast = websocket_manager.broadcast_message
        
        async def mock_broadcast(message):
            captured_messages.append(message)
            return await original_broadcast(message)
        
        websocket_manager.broadcast_message = mock_broadcast
        
        try:
            # Handle command
            await simulator.handle_command(command)
            
            # Should have sent an error message
            assert len(captured_messages) == 1
            error_message = captured_messages[0]
            assert error_message.root.type == "command_result"
            assert error_message.root.id == "command_result"
            assert "unknown command" in error_message.root.value.message.lower()
            
        finally:
            websocket_manager.broadcast_message = original_broadcast
            await simulator.stop()
    
    @pytest.mark.asyncio
    async def test_data_generation_during_simulation(self):
        """Test that data is generated when simulator is running."""
        # Mock the update interval to be very short for testing
        original_interval = simulator.update_interval
        simulator.update_interval = 0.1  # 100ms
        
        # Mock websocket manager to capture messages
        captured_messages = []
        original_broadcast = websocket_manager.broadcast_message
        
        async def mock_broadcast(message):
            captured_messages.append(message)
            return await original_broadcast(message)
        
        websocket_manager.broadcast_message = mock_broadcast
        
        try:
            # Start simulator for a short period
            await simulator.start()
            await asyncio.sleep(0.3)  # Let it run for ~3 generations
            await simulator.stop()
            
            # Should have generated telemetry data
            assert len(captured_messages) > 0
            
            # Check that we have telemetry messages
            telemetry_messages = [msg for msg in captured_messages if msg.root.type == "data"]
            assert len(telemetry_messages) > 0
            
        finally:
            websocket_manager.broadcast_message = original_broadcast
            simulator.update_interval = original_interval
    
    def test_sensor_initial_values(self):
        """Test that sensor values are initialized within expected ranges."""
        # Check initial sensor values
        temp_sensor = simulator.sensors["temperature"]
        pressure_sensor = simulator.sensors["pressure"]
        humidity_sensor = simulator.sensors["humidity"]
        
        # Check that values are within defined min/max ranges
        assert temp_sensor["min"] <= temp_sensor["value"] <= temp_sensor["max"]
        assert pressure_sensor["min"] <= pressure_sensor["value"] <= pressure_sensor["max"]
        assert humidity_sensor["min"] <= humidity_sensor["value"] <= humidity_sensor["max"]
        
        # Check that units are defined
        assert temp_sensor["unit"] == "°C"
        assert pressure_sensor["unit"] == "hPa"
        assert humidity_sensor["unit"] == "%"
    
    @pytest.mark.asyncio
    async def test_simulator_cleanup_on_stop(self):
        """Test that simulator properly cleans up when stopped."""
        await simulator.start()
        assert simulator.is_running == True
        assert simulator.simulation_task is not None
        
        await simulator.stop()
        assert simulator.is_running == False
        assert simulator.simulation_task is None or simulator.simulation_task.cancelled()
