from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal, Union, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from .telemetry import GenericMessage


class DataType(str, Enum):
    """Supported data types for telemetry values."""
    INT = "int"
    FLOAT = "float"
    STRING = "string"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class TelemetryTypeConfig(BaseModel):
    """
    Configuration template for a telemetry type.
    Defines structure, validation, and metadata for telemetry data.
    """
    unit: Optional[str] = None  # e.g., "°C", "hPa", "rpm"
    data_type: DataType
    range: Optional[Dict[str, Union[int, float]]] = None  # {"min": 0, "max": 100}
    description: str
    enum: Optional[List[Union[str, int, float]]] = None  # For types with fixed values (e.g., "on", "off"; or 1, 2, 3)


class CommandParameter(BaseModel):
    """Configuration for a command parameter."""
    type: str  # "string", "float", "int", "boolean"
    required: bool = True
    enum: Optional[List[Union[str, int, float]]] = None  # Valid values for the parameter
    description: Optional[str] = None


class CommandTemplate(BaseModel):
    """
    Template defining available commands and their parameters.
    """
    command: str  # Unique command identifier (e.g., "set_threshold")
    parameters: Dict[str, CommandParameter]
    description: str


class TelemetryTypesResponse(BaseModel):
    """Response format for GET /telemetry-types endpoint."""
    telemetry_types: Dict[str, TelemetryTypeConfig]
    last_updated: str  # ISO timestamp


class CommandTemplatesResponse(BaseModel):
    """Response format for GET /command-templates endpoint."""
    command_templates: Dict[str, CommandTemplate]
    last_updated: str  # ISO timestamp


class HistoricalDataQuery(BaseModel):
    """Query parameters for historical data requests."""
    id: Optional[str] = None  # Filter by telemetry ID, if applicable (e.g., "temperature", "command_confirmation")
    type: Optional[str] = None  # Filter by message type (e.g., "data")
    limit: Optional[int] = 1000  # Maximum records to return
    from_timestamp: Optional[str] = None  # ISO timestamp, defaults to first record
    to_timestamp: Optional[str] = None  # ISO timestamp, defaults to last record


class HistoricalDataResponse(BaseModel):
    """Response format for GET /historical-data endpoint."""
    data: List["GenericMessage"]  # List of telemetry messages
    total_records: int
    filtered_records: int
