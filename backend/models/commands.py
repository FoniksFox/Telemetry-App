from pydantic import BaseModel
from typing import Dict, Any, Optional, Literal, List, Union
from enum import Enum


class CommandStatus(str, Enum):
    """Status of command execution."""
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"

class CommandParameter(BaseModel):
    """
    Represents a single command parameter.
    """
    type: Literal['string', 'float', 'int', 'boolean']
    required: bool
    enum: Optional[List[Union[str, int, float]]]
    description: Optional[str]
    default: Optional[Any]


class Command(BaseModel):
    """
    Internal command representation after validation.
    """
    command: str
    parameters: Optional[List[CommandParameter]] = None  # Command parameters, if any


class CommandResult(BaseModel):
    """
    Result of command execution (before being sent as telemetry).
    """
    command: str
    status: CommandStatus
    message: str
    details: Optional[Dict[str, Any]] = None  # Additional result data


class CommandValidationError(BaseModel):
    """
    Error details for invalid commands.
    """
    command: str
    error: str
    details: Optional[Dict[str, Any]] = None
