from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import Optional
from datetime import datetime
from models.telemetry import GenericMessage
from models.configuration import HistoricalDataQuery, HistoricalDataResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


from services.websocket_manager import websocket_manager
from services.simulator import simulator
from services.configuration_manager import config_manager

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle startup and shutdown events."""
    # Startup
    logger.info("Starting telemetry simulator...")
    await simulator.start()
    
    yield
    
    # Shutdown
    logger.info("Stopping telemetry simulator...")
    await simulator.stop()


app = FastAPI(
    title="Telemetry App Backend",
    description="Real-time telemetry data streaming and command interface",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:4200")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Telemetry backend is running",
        "active_connections": websocket_manager.get_connection_count()
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Handle incoming command messages
            try:
                command_message = await websocket_manager.handle_incoming_message(websocket, data)
                # Forward command to simulator (command_message is already a Command object)
                await simulator.handle_command(command_message)
                
            except Exception as e:
                print(f"Error handling message: {e}")
                # Error response is already sent by websocket_manager
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        print("Client disconnected")

@app.get("/historical-data")
async def get_historical_data(
    limit: Optional[int] = Query(None, description="Maximum number of messages to return"),
    type: Optional[str] = Query(None, description="Filter by message type"),
    id: Optional[str] = Query(None, description="Filter by message ID"),
    since: Optional[str] = Query(None, description="ISO timestamp - only return messages after this time"),
    until: Optional[str] = Query(None, description="ISO timestamp - only return messages before this time")
) -> Optional[HistoricalDataResponse]:
    """
    Get historical telemetry data with optional filtering.
    Returns a list of telemetry messages (a HistoricalDataResponse) based on the provided filters, or None if there is an error.
    """
    since_datetime = None
    if since:
        try:
            since_datetime = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except ValueError:
            logger.error("Invalid timestamp format for 'since'. Use ISO format.")
            return None

    until_datetime = None
    if until:
        try:
            until_datetime = datetime.fromisoformat(until.replace('Z', '+00:00'))
        except ValueError:
            logger.error("Invalid timestamp format for 'until'. Use ISO format.")
            return None

    query = HistoricalDataQuery(
        limit=limit,
        type=type,
        id=id,
        from_timestamp=since_datetime.isoformat() if since_datetime else None,
        to_timestamp=until_datetime.isoformat() if until_datetime else None
    )
    historical_data = websocket_manager.get_historical_data(query)
    
    return historical_data

@app.get("/telemetry-types")
async def get_telemetry_types():
    """Get available telemetry type definitions."""
    return config_manager.get_telemetry_types()

@app.get("/command-templates")
async def get_command_templates():
    """Get available command templates."""
    return config_manager.get_command_templates()

@app.get("/config-summary")
async def get_configuration_summary():
    """Get a summary of the current configuration state."""
    return config_manager.get_configuration_summary()

@app.get("/command-validation/{command_id}")
async def get_command_validation_info(command_id: str):
    """Get validation information for a specific command."""
    try:
        return config_manager.get_command_template(command_id)
    except KeyError:
        return {"error": f"Command '{command_id}' not found"}

if __name__ == "__main__":
    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug"
    )
