from pydantic import BaseModel
from typing import Dict, Any, Optional
from enum import Enum


class CommandStatus(str, Enum):
    """Status of command execution."""
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"


class Command(BaseModel):
    """
    Internal command representation after validation.
    """
    command: str
    parameters: Dict[str, Any]


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
