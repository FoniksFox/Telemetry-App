"""
Data models for the Telemetry App Backend.

This package contains all Pydantic models for:
- Telemetry data structures
- Configuration templates  
- Command definitions and validation
"""

from .telemetry import (
    TelemetryMessage,
    CommandMessage,
    CommandResultMessage,
    DeviceMessage,
    GenericMessage
)

from .configuration import (
    DataType,
    TelemetryTypeConfig,
    CommandParameter,
    CommandTemplate,
    TelemetryTypesResponse,
    CommandTemplatesResponse,
    HistoricalDataQuery,
    HistoricalDataResponse
)

from .commands import (
    CommandStatus,
    Command,
    CommandResult,
    CommandValidationError
)

__all__ = [
    # Telemetry models
    "TelemetryMessage",
    "CommandMessage",
    "CommandResultMessage",
    "DeviceMessage",
    "GenericMessage",

    # Configuration models
    "DataType",
    "TelemetryTypeConfig",
    "CommandParameter",
    "CommandTemplate",
    "TelemetryTypesResponse",
    "CommandTemplatesResponse",
    "HistoricalDataQuery",
    "HistoricalDataResponse",
    
    # Command models
    "CommandStatus",
    "Command",
    "CommandResult",
    "CommandValidationError"
]
