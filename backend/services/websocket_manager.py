from fastapi import WebSocket
from typing import List, Optional
import json
import logging
import os
from datetime import datetime

from models.telemetry import CommandMessage, GenericMessage
from models.configuration import HistoricalDataQuery, HistoricalDataResponse

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and handles message broadcasting.
    Supports multiple concurrent clients and message routing.
    """
    
    def __init__(self):
        # Active WebSocket connections
        self.active_connections: List[WebSocket] = []
        
        # In-memory log of all messages for historical data
        self.message_history: List[GenericMessage] = []
        
        # Maximum number of messages to keep in history
        self.max_history_size = int(os.getenv("MAX_HISTORY_SIZE", "10000"))
        
    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket connection closed. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_message(self, message: GenericMessage) -> None:
        """
        Broadcast a telemetry message to all connected clients.
        Also stores the message in history for historical data queries.
        """
        # Convert message to JSON
        message_json = message.model_dump_json()
        
        # Store in history
        self._add_to_history(message)
        
        # Broadcast to all connected clients
        if self.active_connections:
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected clients
            for connection in disconnected:
                self.disconnect(connection)
    
    async def handle_incoming_message(self, websocket: WebSocket, message_data: str) -> CommandMessage:
        """
        Handle incoming message from a WebSocket client.
        Validates and parses command messages.
        """
        try:
            # Parse JSON message
            data = json.loads(message_data)
            data['type'] = 'command'  # Set message type
            
            # Create CommandMessage object
            command_message = CommandMessage(**data)
            
            # Validate command against registered templates
            from services.configuration_manager import config_manager
            is_valid, error_msg = config_manager.validate_command(
                command_message.command, 
                command_message.parameters
            )
            
            if not is_valid:
                logger.warning(f"Invalid command received: {error_msg}")
                await self.send_personal_message(
                    json.dumps({"error": f"Command validation failed: {error_msg}"}), 
                    websocket
                )
                raise ValueError(f"Command validation failed: {error_msg}")
            
            logger.info(f"Received valid command: {command_message.command} with parameters: {command_message.parameters}")
            
            return command_message
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in WebSocket message: {e}")
            await self.send_personal_message(
                json.dumps({"error": "Invalid JSON format"}), 
                websocket
            )
            raise
        except Exception as e:
            logger.error(f"Error parsing WebSocket message: {e}")
            await self.send_personal_message(
                json.dumps({"error": f"Message parsing error: {str(e)}"}), 
                websocket
            )
            raise
    
    def _add_to_history(self, message: GenericMessage) -> None:
        """Add a message to the history log, maintaining size limit."""
        self.message_history.append(message)

        # Maintain history size limit
        if len(self.message_history) > self.max_history_size:
            # Remove oldest messages (FIFO), for now
            # (TODO) Implement storing in different files, to not lose data (except otherwise specified)
            excess = len(self.message_history) - self.max_history_size
            self.message_history = self.message_history[excess:]
    
    def get_historical_data(self, 
                          query: Optional[HistoricalDataQuery] = None) -> HistoricalDataResponse:
        """
        Retrieve historical messages with optional filtering.
        
        Args:
            query: HistoricalDataQuery object with optional filters
        Returns:
            HistoricalDataResponse containing filtered messages
        """
        filtered_messages = self.message_history.copy()
        
        # Apply filters
        if query:
            if query.type:
                filtered_messages = [msg for msg in filtered_messages if msg.root.type == query.type]
            if query.id:
                # Only filter by id if the message type has an id field
                filtered_messages = [
                    msg for msg in filtered_messages 
                    if hasattr(msg.root, 'id') and getattr(msg.root, 'id', None) == query.id
                ]
            if query.from_timestamp:
                from_dt = datetime.fromisoformat(query.from_timestamp.replace('Z', '+00:00'))
                filtered_messages = [
                    msg for msg in filtered_messages
                    if msg.root.timestamp > from_dt
                ]
            if query.to_timestamp:
                to_dt = datetime.fromisoformat(query.to_timestamp.replace('Z', '+00:00'))
                filtered_messages = [
                    msg for msg in filtered_messages 
                    if msg.root.timestamp < to_dt
                ]

        # Apply limit (take most recent messages)
        if query and query.limit:
            filtered_messages = filtered_messages[-query.limit:]

        return HistoricalDataResponse(
            data=filtered_messages,
            total_records=len(self.message_history),
            filtered_records=len(filtered_messages)
        )
    
    def get_connection_count(self) -> int:
        """Get the number of active WebSocket connections."""
        return len(self.active_connections)
    
    def clear_history(self) -> int:
        """Clear all historical data. Returns number of messages cleared."""
        cleared_count = len(self.message_history)
        self.message_history.clear()
        logger.info(f"Cleared {cleared_count} messages from history")
        return cleared_count


# Global WebSocket manager instance
websocket_manager = WebSocketManager()