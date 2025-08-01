/**
 * Production environment configuration
 */
export const environment = {
    production: true,
    
    // API Configuration - Update these for your production deployment
    apiUrl: 'https://production-api.com',
    websocketUrl: 'wss://production-api.com/ws',
    
    // Connection Settings
    websocket: {
        reconnectInterval: 5000, // 5 seconds (longer in production)
        maxReconnectAttempts: 5, // Fewer attempts in production
        heartbeatInterval: 60000, // 60 seconds
        timeout: 15000 // 15 seconds
    },
    
    // Data Management
    buffer: {
        maxSize: 500, // Smaller buffer in production by default
        autoCleanup: true
    },
    
    // Future Chart Settings
    charts: {
    },
    
    // Logging
    logging: {
        level: 'warn', // Only warnings and errors in production
        enableConsoleOutput: false, // Disable console logging in production
        enableWebSocketLogging: false // Disable WebSocket logging in production
    }
};
