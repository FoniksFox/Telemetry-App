from pydantic import BaseModel, RootModel, Field
from typing import Union, Dict, Any, List, Annotated, Literal
from datetime import datetime
from .commands import Command, CommandResult


class TelemetryMessage(BaseModel):
    """
    Core telemetry data message format.
    Individual message per telemetry point for better granularity.
    """
    type: Literal["data"] = "data"
    id: str  # Sensor/telemetry identifier (e.g., "temperature", "pressure")
    value: Union[int, float, str, bool, List, Dict]  # Flexible value types
    timestamp: datetime


class CommandMessage(Command):
    """
    Command message format for frontend → backend communication.
    Extends the base Command class with message type information.
    """
    type: Literal["command"] = "command"
    timestamp: datetime = Field(default_factory=datetime.now)  # When command was received
    
class CommandResultMessage(BaseModel):
    """
    Command result as telemetry message.
    """
    type: Literal["command_result"] = "command_result"
    id: str = "command_result"
    value: CommandResult
    timestamp: datetime = Field(default_factory=datetime.now)  # When result was generated

class DeviceMessage(BaseModel):
    """
    Device message from device to backend to frontend.
    """
    type: Literal["device_message"] = "device_message"
    id: str  # Type of message (e.g., "device_status", "device_data", "log", etc.)
    value: Dict[str, Any]  # Device-specific data
    timestamp: datetime

class GenericMessage(RootModel):
    """
    Generic message type that can be any of the defined message types.
    Used for type hinting and validation in endpoints.
    Uses discriminated union for better performance and validation.
    """
    root: Annotated[
        Union[TelemetryMessage, CommandMessage, CommandResultMessage, DeviceMessage],
        Field(discriminator='type')
    ]