/**
 * Development environment configuration
 */
export const environment = {
    production: false,
    
    // API Configuration
    apiUrl: 'http://localhost:8000',
    websocketUrl: 'ws://localhost:8000/ws',
    
    // Connection Settings
    websocket: {
        reconnectInterval: 1000, // 1 second
        maxReconnectAttempts: 20,
        heartbeatInterval: 30000, // 30 seconds
        timeout: 10000 // 10 seconds
    },
    
    // Data Management
    buffer: {
        maxSize: 10000, // maximum data points per telemetry ID
        autoCleanup: true
    },
    
    // Future Chart Settings
    charts: {
    },
    
    // Logging
    logging: {
        level: 'debug', // 'debug' | 'info' | 'warn' | 'error'
        enableConsoleOutput: true,
        enableWebSocketLogging: true
    }
};
