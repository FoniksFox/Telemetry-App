"""
Test configuration module for the telemetry app backend.
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from app import app
from services.websocket_manager import websocket_manager
from services.simulator import simulator
from services.configuration_manager import config_manager


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def app_lifecycle():
    """Fixture to handle app startup and shutdown for tests."""
    # Startup
    await simulator.start()
    yield
    # Shutdown
    await simulator.stop()


@pytest.fixture(autouse=True)
def reset_services():
    """Reset services to clean state before each test."""
    # Clear any existing connections and data
    websocket_manager.active_connections.clear()
    websocket_manager.message_history.clear()
    config_manager.telemetry_types.clear()
    config_manager.command_templates.clear()
    config_manager.device_connected = False
    yield
    # Cleanup after test
    websocket_manager.active_connections.clear()
    websocket_manager.message_history.clear()
