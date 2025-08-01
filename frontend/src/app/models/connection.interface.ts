/**
 * Connection and WebSocket related interfaces
 */

/**
 * WebSocket connection state
 */
export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    ERROR = 'error'
}

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
    url: string;
    reconnectInterval: number; // milliseconds
    maxReconnectAttempts: number;
    heartbeatInterval?: number; // milliseconds for ping/pong
    timeout?: number; // connection timeout in milliseconds
}

/**
 * Connection status information
 */
export interface ConnectionStatus {
    state: ConnectionState;
    lastConnected?: Date;
    lastDisconnected?: Date;
    reconnectAttempts: number;
    errorMessage?: string;
    latency?: number; // milliseconds
}

/**
 * Buffer configuration for data storage
 */
export interface BufferConfig {
    maxSize: number; // maximum number of data points per telemetry ID (if 0, buffer disabled; if -1, then unlimited, not recommended if not using retention time)
    retentionTime?: number; // milliseconds to keep data (optional, size-based by default)
    autoCleanup: boolean; // whether to automatically remove old data
}

/**
 * Data buffer entry
 */
export interface BufferEntry<T = any> {
    data: T;
    timestamp: Date; // Timestamp based indexing
}

/**
 * Statistics for connection monitoring
 */
export interface ConnectionStats {
    messagesReceived: number;
    messagesSent: number;
    errorsCount: number;
    averageLatency: number;
    uptime: number; // milliseconds
    reconnectCount: number;
}

/**
 * Error information for connection issues
 */
export interface ConnectionError {
    type: 'connection' | 'websocket' | 'timeout' | 'validation' | 'unknown';
    message: string;
    timestamp: Date;
    details?: any;
    recoverable: boolean;
}

/**
 * Event types for connection service
 */
export enum ConnectionEventType {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    ERROR = 'error',
    MESSAGE_RECEIVED = 'message_received',
    MESSAGE_SENT = 'message_sent',
    RECONNECTING = 'reconnecting'
}

/**
 * Connection event
 */
export interface ConnectionEvent {
    type: ConnectionEventType;
    timestamp: Date;
    data?: any;
    error?: ConnectionError;
}
