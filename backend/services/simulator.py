import asyncio
import random
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json

from models.telemetry import TelemetryMessage, CommandResultMessage, GenericMessage
from models.commands import Command, CommandResult, CommandStatus
from services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


class TelemetrySimulator:
    """
    Simple telemetry data simulator that generates mock sensor data
    and handles basic commands.
    """
    
    def __init__(self):
        self.is_running = False
        self.simulation_task: Optional[asyncio.Task] = None
        
        # Simulation parameters
        self.update_interval = 2.0  # seconds between telemetry updates
        
        # Mock sensor states
        self.sensors = {
            "temperature": {
                "value": 22.5,
                "min": 18.0,
                "max": 35.0,
                "drift": 0.5,
                "unit": "°C"
            },
            "pressure": {
                "value": 1013.25,
                "min": 980.0,
                "max": 1050.0,
                "drift": 2.0,
                "unit": "hPa"
            },
            "humidity": {
                "value": 45.0,
                "min": 20.0,
                "max": 80.0,
                "drift": 1.0,
                "unit": "%"
            },
            "system_status": {
                "value": "operational",
                "options": ["operational", "warning", "error", "maintenance"],
                "change_probability": 0.05
            }
        }
        
    async def start(self) -> None:
        """Start the telemetry simulation."""
        if self.is_running:
            logger.warning("Simulator is already running")
            return
            
        self.is_running = True
        self.simulation_task = asyncio.create_task(self._simulation_loop())
        logger.info("Telemetry simulator started")
        
    async def stop(self) -> None:
        """Stop the telemetry simulation."""
        if not self.is_running:
            return
            
        self.is_running = False
        if self.simulation_task:
            self.simulation_task.cancel()
            try:
                await self.simulation_task
            except asyncio.CancelledError:
                pass
        logger.info("Telemetry simulator stopped")
        
    async def _simulation_loop(self) -> None:
        """Main simulation loop that generates and sends telemetry data."""
        try:
            while self.is_running:
                # Generate telemetry for each sensor
                for sensor_id, sensor_config in self.sensors.items():
                    telemetry_data = self._generate_sensor_data(sensor_id, sensor_config)
                    
                    # Telemetry message
                    message = TelemetryMessage(
                        id=sensor_id,
                        value=telemetry_data["value"],
                        timestamp=datetime.now()
                    )
                    
                    # Wrap in GenericMessage for broadcasting
                    generic_message = GenericMessage(root=message)
                    await websocket_manager.broadcast_message(generic_message)
                
                await asyncio.sleep(self.update_interval)
                
        except asyncio.CancelledError:
            logger.info("Simulation loop cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            self.is_running = False
            
    def _generate_sensor_data(self, sensor_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock data for a sensor based on its configuration."""
        if sensor_id == "system_status":
            # Handle discrete state sensor
            if random.random() < config.get("change_probability", 0.05):
                config["value"] = random.choice(config["options"])
            return {"value": config["value"]}
        else:
            # Handle continuous value sensors
            current_value = config["value"]
            drift = config["drift"]
            min_val = config["min"]
            max_val = config["max"]
            
            # Add random drift
            change = random.uniform(-drift, drift)
            new_value = current_value + change
            
            # Keep within bounds
            new_value = max(min_val, min(max_val, new_value))
            
            # Update stored value
            config["value"] = round(new_value, 2)
            
            return {"value": new_value}
    
    async def handle_command(self, order: Command) -> None:
        """
        Handle incoming commands and send confirmation messages.
        """
        logger.info(f"Simulator received command: {order.command} with parameters: {order.parameters}")

        try:
            result = await self._execute_command(order)
            
            # Some commands (like calibration) handle their own messaging
            if result is not None:
                # Create command result message, wrap in GenericMessage and broadcast
                command_result_message = CommandResultMessage(value=result)
                generic_message = GenericMessage(root=command_result_message)
                await websocket_manager.broadcast_message(generic_message)
            
        except Exception as e:
            logger.error(f"Error executing command {order.command}: {e}")
            
            # Send error result
            error_result = CommandResult(
                command=order.command,
                status=CommandStatus.ERROR,
                message=f"Command execution failed: {str(e)}"
            )
            
            command_result_message = CommandResultMessage(
                value=error_result,
                timestamp=datetime.now()
            )
            
            generic_message = GenericMessage(root=command_result_message)
            await websocket_manager.broadcast_message(generic_message)
    
    async def _execute_command(self, order: Command) -> Optional[CommandResult]:
        """Execute a specific command and return the result."""

        if order.command == "set_update_interval":
            # Change simulation update rate
            new_interval = order.parameters.get("interval", 2.0)
            if 0.1 <= new_interval <= 60.0:
                self.update_interval = new_interval
                return CommandResult(
                    command=order.command,
                    status=CommandStatus.SUCCESS,
                    message=f"Update interval set to {new_interval} seconds"
                )
            else:
                return CommandResult(
                    command=order.command,
                    status=CommandStatus.ERROR,
                    message="Interval must be between 0.1 and 60.0 seconds"
                )

        elif order.command == "reset_sensors":
            # Reset all sensors to default values
            self.sensors["temperature"]["value"] = 22.5
            self.sensors["pressure"]["value"] = 1013.25
            self.sensors["humidity"]["value"] = 45.0
            self.sensors["system_status"]["value"] = "operational"
            
            return CommandResult(
                command=order.command,
                status=CommandStatus.SUCCESS,
                message="All sensors reset to default values"
            )

        elif order.command == "set_sensor_value":
            # Set a specific sensor to a specific value
            sensor_id = order.parameters.get("sensor_id")
            value = order.parameters.get("value")

            if sensor_id in self.sensors:
                if sensor_id == "system_status":
                    if value in self.sensors[sensor_id]["options"]:
                        self.sensors[sensor_id]["value"] = value
                        return CommandResult(
                            command=order.command,
                            status=CommandStatus.SUCCESS,
                            message=f"Sensor {sensor_id} set to {value}"
                        )
                    else:
                        return CommandResult(
                            command=order.command,
                            status=CommandStatus.ERROR,
                            message=f"Invalid value for {sensor_id}. Valid options: {self.sensors[sensor_id]['options']}"
                        )
                else:
                    # Numeric sensor
                    if value is None:
                        return CommandResult(
                            command=order.command,
                            status=CommandStatus.ERROR,
                            message="Value parameter is required"
                        )
                    
                    try:
                        numeric_value = float(value)
                        min_val = self.sensors[sensor_id]["min"]
                        max_val = self.sensors[sensor_id]["max"]
                        
                        if min_val <= numeric_value <= max_val:
                            self.sensors[sensor_id]["value"] = numeric_value
                            return CommandResult(
                                command=order.command,
                                status=CommandStatus.SUCCESS,
                                message=f"Sensor {sensor_id} set to {numeric_value}"
                            )
                        else:
                            return CommandResult(
                                command=order.command,
                                status=CommandStatus.ERROR,
                                message=f"Value must be between {min_val} and {max_val}"
                            )
                    except (ValueError, TypeError):
                        return CommandResult(
                            command=order.command,
                            status=CommandStatus.ERROR,
                            message="Invalid numeric value"
                        )
            else:
                return CommandResult(
                    command=order.command,
                    status=CommandStatus.ERROR,
                    message=f"Unknown sensor: {sensor_id}"
                )

        elif order.command == "get_status":
            # Return current simulator status
            status_info = {
                "is_running": self.is_running,
                "update_interval": self.update_interval,
                "sensor_count": len(self.sensors),
                "current_values": {k: v["value"] for k, v in self.sensors.items()}
            }
            
            return CommandResult(
                command=order.command,
                status=CommandStatus.SUCCESS,
                message="Simulator status retrieved",
                details=status_info
            )

        elif order.command == "calibrate_sensors":
            # Long-running command that demonstrates pending → success flow
            await self._handle_calibration_command(order)
            # Return None since we handle this command asynchronously
            return None
            
        else:
            return CommandResult(
                command=order.command,
                status=CommandStatus.ERROR,
                message=f"Unknown command: {order.command}"
            )


    async def _handle_calibration_command(self, order: Command) -> None:
        """
        Handle calibration command asynchronously with pending → success flow.
        """
        # Send immediate pending response
        pending_result = CommandResult(
            command=order.command,
            status=CommandStatus.PENDING,
            message="Calibration started, this will take a few seconds..."
        )
        
        command_result_message = CommandResultMessage(value=pending_result)
        generic_message = GenericMessage(root=command_result_message)
        await websocket_manager.broadcast_message(generic_message)
        
        # Start calibration in background
        asyncio.create_task(self._perform_calibration(order))
    
    async def _perform_calibration(self, order: Command) -> None:
        """Perform the actual calibration process."""
        try:
            # Simulate calibration taking some time
            calibration_duration = order.parameters.get("duration", 5.0)  # Default 5 seconds
            calibration_duration = max(1.0, min(30.0, calibration_duration))  # Clamp between 1-30 seconds
            
            await asyncio.sleep(calibration_duration)
            
            # Reset all sensors to calibrated values (slightly different from defaults)
            self.sensors["temperature"]["value"] = 22.0
            self.sensors["pressure"]["value"] = 1013.0
            self.sensors["humidity"]["value"] = 50.0
            self.sensors["system_status"]["value"] = "operational"
            
            # Send success response
            success_result = CommandResult(
                command=order.command,
                status=CommandStatus.SUCCESS,
                message=f"Sensor calibration completed in {calibration_duration} seconds",
                details={
                    "calibrated_sensors": list(self.sensors.keys()),
                    "duration": calibration_duration
                }
            )
            
            command_result_message = CommandResultMessage(value=success_result)
            generic_message = GenericMessage(root=command_result_message)
            await websocket_manager.broadcast_message(generic_message)
            
        except Exception as e:
            # Send error response if calibration fails
            error_result = CommandResult(
                command=order.command,
                status=CommandStatus.ERROR,
                message=f"Calibration failed: {str(e)}"
            )
            
            command_result_message = CommandResultMessage(value=error_result)
            generic_message = GenericMessage(root=command_result_message)
            await websocket_manager.broadcast_message(generic_message)


# Global simulator instance
simulator = TelemetrySimulator()
