/**
 * Core telemetry data interfaces matching backend models
 */

/**
 * Supported data types for telemetry values
 */
export enum DataType {
    INT = 'int',
    FLOAT = 'float',
    STRING = 'string',
    BOOLEAN = 'boolean',
    ARRAY = 'array',
    OBJECT = 'object'
}

/**
 * Core telemetry data message format.
 * Individual message per telemetry point for better granularity.
 */
export interface TelemetryMessage {
    type: 'data';
    id: string; // Sensor/telemetry identifier (e.g., "temperature", "pressure")
    value: number | string | boolean | any[] | Record<string, any>; // Flexible value types
    timestamp: string; // ISO datetime string
}

/**
 * Command message format for frontend → backend communication.
 */
export interface CommandMessage {
    type: 'command';
    command: string;
    parameters?: Record<string, any>;
}

/**
 * Command execution status
 */
export enum CommandStatus {
    SUCCESS = 'success',
    ERROR = 'error',
    PENDING = 'pending'
}

/**
 * Result of command execution
 */
export interface CommandResult {
    command: string;
    status: CommandStatus;
    message: string;
    details?: Record<string, any>; // Additional result data
}

/**
 * Command result as telemetry message
 */
export interface CommandResultMessage {
    type: 'command_result';
    id: 'command_result';
    value: CommandResult;
    timestamp: string; // ISO datetime string
}

/**
 * Device message from device to backend to frontend
 */
export interface DeviceMessage {
    type: 'device_message';
    id: string; // Type of message (e.g., "device_status", "device_data", "log", etc.)
    value: Record<string, any>; // Device-specific data
    timestamp: string; // ISO datetime string
}

/**
 * Generic message type that can be any of the defined message types.
 * Used for type hinting and validation.
 */
export type GenericMessage = TelemetryMessage | CommandMessage | CommandResultMessage | DeviceMessage;

/**
 * Utility type guards for message type checking
 */
export const isTelemetryMessage = (message: GenericMessage): message is TelemetryMessage => {
    return message.type === 'data';
};

export const isCommandMessage = (message: GenericMessage): message is CommandMessage => {
    return message.type === 'command';
};

export const isCommandResultMessage = (message: GenericMessage): message is CommandResultMessage => {
    return message.type === 'command_result';
};

export const isDeviceMessage = (message: GenericMessage): message is DeviceMessage => {
    return message.type === 'device_message';
};