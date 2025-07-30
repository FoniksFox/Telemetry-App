"""
Services package for the Telemetry App backend.

Contains business logic services:
- WebSocket Manager: Real-time connection management
- Simulator: Telemetry data generation
- Configuration Manager: Template and configuration handling
- Command Handler: Command processing and forwarding
"""

from .websocket_manager import websocket_manager
from .simulator import simulator
from .configuration_manager import config_manager

__all__ = ["websocket_manager", "simulator", "config_manager"]
