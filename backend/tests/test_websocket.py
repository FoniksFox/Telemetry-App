"""
Test WebSocket functionality including connections, message handling, and historical data.
"""
import pytest
import json
from datetime import datetime
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import WebSocket

from app import app
from services.websocket_manager import websocket_manager
from services.configuration_manager import config_manager
from models.telemetry import TelemetryMessage, CommandMessage, GenericMessage
from models.configuration import TelemetryTypeConfig, CommandTemplate, CommandParameter


class TestWebSocketManager:
    """Test the WebSocket manager functionality."""
    
    def test_websocket_manager_initialization(self):
        """Test that WebSocket manager initializes correctly."""
        assert websocket_manager.active_connections == []
        assert websocket_manager.message_history == []
        assert websocket_manager.max_history_size > 0
    
    @pytest.mark.asyncio
    async def test_connect_disconnect(self):
        """Test WebSocket connection and disconnection."""
        # Mock WebSocket
        mock_websocket = AsyncMock(spec=WebSocket)
        
        # Test connection
        await websocket_manager.connect(mock_websocket)
        assert mock_websocket in websocket_manager.active_connections
        mock_websocket.accept.assert_called_once()
        
        # Test disconnection
        websocket_manager.disconnect(mock_websocket)
        assert mock_websocket not in websocket_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_broadcast_message(self):
        """Test message broadcasting to connected clients."""
        # Create mock WebSockets
        mock_ws1 = AsyncMock(spec=WebSocket)
        mock_ws2 = AsyncMock(spec=WebSocket)
        
        # Connect both
        await websocket_manager.connect(mock_ws1)
        await websocket_manager.connect(mock_ws2)
        
        # Create test message using GenericMessage (TelemetryMessage variant)
        test_message = GenericMessage(TelemetryMessage(
            type="data",
            id="test_sensor",
            value=42.5,
            timestamp=datetime.now()
        ))
        
        # Broadcast message
        await websocket_manager.broadcast_message(test_message)
        
        # Verify both clients received the message
        mock_ws1.send_text.assert_called_once()
        mock_ws2.send_text.assert_called_once()
        
        # Verify message was added to history
        assert len(websocket_manager.message_history) == 1
    
    @pytest.mark.asyncio
    async def test_handle_invalid_command(self):
        """Test handling of invalid command messages."""
        mock_websocket = AsyncMock(spec=WebSocket)
        await websocket_manager.connect(mock_websocket)
        
        # Test invalid JSON
        with pytest.raises(Exception):
            await websocket_manager.handle_incoming_message(mock_websocket, "invalid json")
        
        # Verify error response was sent
        mock_websocket.send_text.assert_called()
        sent_message = json.loads(mock_websocket.send_text.call_args[0][0])
        assert "error" in sent_message
    
    @pytest.mark.asyncio
    async def test_handle_valid_command(self):
        """Test handling of valid command messages."""
        # Setup configuration manager with a test command
        config_manager.command_templates["test_command"] = CommandTemplate(
            command="test_command",
            description="A test command",
            parameters={
                "param1": CommandParameter(
                    type="number",
                    required=True,
                    description="Test parameter"
                )
            }
        )
        
        mock_websocket = AsyncMock(spec=WebSocket)
        await websocket_manager.connect(mock_websocket)
        
        # Test valid command
        command_data = {
            "type": "command",
            "command": "test_command",
            "parameters": {"param1": 123}
        }
        
        result = await websocket_manager.handle_incoming_message(
            mock_websocket, 
            json.dumps(command_data)
        )
        
        assert isinstance(result, CommandMessage)
        assert result.command == "test_command"
        assert result.parameters == {"param1": 123}
    
    @pytest.mark.asyncio
    async def test_handle_command_validation_failure(self):
        """Test handling of commands that fail validation."""
        # Setup configuration manager with a test command requiring parameters
        config_manager.command_templates["test_command"] = CommandTemplate(
            command="test_command",
            description="A test command",
            parameters={
                "required_param": CommandParameter(
                    type="number",
                    required=True,
                    description="Required parameter"
                )
            }
        )
        
        mock_websocket = AsyncMock(spec=WebSocket)
        await websocket_manager.connect(mock_websocket)
        
        # Test command missing required parameter
        command_data = {
            "type": "command",
            "command": "test_command",
            "parameters": {}  # Missing required_param
        }
        
        with pytest.raises(Exception):
            await websocket_manager.handle_incoming_message(
                mock_websocket, 
                json.dumps(command_data)
            )
        
        # Verify error response was sent
        mock_websocket.send_text.assert_called()
        sent_message = json.loads(mock_websocket.send_text.call_args[0][0])
        assert "error" in sent_message
    
    def test_get_historical_data_no_filters(self):
        """Test retrieving historical data without filters."""
        # Add some test messages to history as GenericMessage
        messages = [
            GenericMessage(TelemetryMessage(
                type="data",
                id="sensor1",
                value=10,
                timestamp=datetime.now()
            )),
            GenericMessage(TelemetryMessage(
                type="data",
                id="sensor2",
                value=20,
                timestamp=datetime.now()
            )),
        ]
        
        for msg in messages:
            websocket_manager.message_history.append(msg)
        
        from models.configuration import HistoricalDataQuery
        query = HistoricalDataQuery()
        
        result = websocket_manager.get_historical_data(query)
        
        assert result is not None
        assert len(result.data) == 2
        assert result.total_records == 2

    def test_get_historical_data_with_limit(self):
        """Test retrieving historical data with limit."""
        # Add multiple test messages as GenericMessage
        for i in range(5):
            msg = GenericMessage(TelemetryMessage(
                type="data",
                id=f"sensor{i}",
                value=i * 10,
                timestamp=datetime.now()
            ))
            websocket_manager.message_history.append(msg)
        
        from models.configuration import HistoricalDataQuery
        query = HistoricalDataQuery(limit=3)
        
        result = websocket_manager.get_historical_data(query)
        
        assert result is not None
        assert len(result.data) == 3
        assert result.total_records == 5  # Total should still show all messages
    
    def test_get_historical_data_with_type_filter(self):
        """Test retrieving historical data filtered by type."""
        # Add mixed message types as GenericMessage
        messages = [
            GenericMessage(TelemetryMessage(id="sensor1", value=10, timestamp=datetime.now())),
            GenericMessage(CommandMessage(command="command1", parameters={"param": 1})),
            GenericMessage(TelemetryMessage(id="sensor2", value=20, timestamp=datetime.now())),
        ]
        
        for msg in messages:
            websocket_manager.message_history.append(msg)
        
        from models.configuration import HistoricalDataQuery
        query = HistoricalDataQuery(type="data")
        
        result = websocket_manager.get_historical_data(query)
        
        assert result is not None
        assert len(result.data) == 2
    
    def test_get_historical_data_with_time_filters(self):
        """Test retrieving historical data with time filters."""
        # Add messages with specific timestamps
        now = datetime.now()
        from datetime import timedelta
        messages = [
            GenericMessage(TelemetryMessage(type="data", id="sensor1", value=10, timestamp=now)),
            GenericMessage(TelemetryMessage(type="data", id="sensor2", value=20, timestamp=now)),
            GenericMessage(TelemetryMessage(type="data", id="sensor3", value=30, timestamp=now)),
            GenericMessage(TelemetryMessage(type="data", id="sensor4", value=40, timestamp=now + timedelta(minutes=2))),
            GenericMessage(TelemetryMessage(type="data", id="sensor5", value=50, timestamp=now - timedelta(minutes=2)))
        ]
        
        for msg in messages:
            websocket_manager.message_history.append(msg)
        
        from models.configuration import HistoricalDataQuery
        query = HistoricalDataQuery(
            from_timestamp=(now - timedelta(minutes=1)).isoformat(),
            to_timestamp=(now + timedelta(minutes=1)).isoformat()
        )
        
        result = websocket_manager.get_historical_data(query)
        
        assert result is not None
        assert len(result.data) == 3
        assert result.total_records == 5


class TestWebSocketEndpoint:
    """Test the WebSocket endpoint integration."""
    
    def test_websocket_endpoint_exists(self, client):
        """Test that WebSocket endpoint is accessible."""
        # This tests that the endpoint exists and can be connected to
        # Full WebSocket testing would require more complex setup with actual WebSocket client
        with client.websocket_connect("/ws") as websocket:
            # If we get here without exception, the endpoint exists and accepts connections
            assert websocket is not None
