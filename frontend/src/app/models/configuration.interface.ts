/**
 * Configuration interfaces for dynamic telemetry types and commands
 */

import { DataType, GenericMessage } from './telemetry.interface';

/**
 * Configuration template for a telemetry type.
 * Defines structure, validation, and metadata for telemetry data.
 */
export interface TelemetryTypeConfig {
    unit?: string; // e.g., "°C", "hPa", "rpm"
    data_type: DataType;
    range?: Record<string, number>; // For numeric types, e.g., { min: 0, max: 100 }, keys can be different based on the device
    description: string;
    enum?: (string | number)[];  // For types with fixed values (e.g., "on", "off"; or 1, 2, 3)
}

/**
 * Configuration for a command parameter
 */
export interface CommandParameter {
    type: "string" | "float" | "int" | "boolean";
    required?: boolean;
    enum?: (string | number)[]; // Valid values for the parameter
    description?: string;
    default?: any; // Default value for the parameter
}

/**
 * Template defining available commands and their parameters
 */
export interface CommandTemplate {
    command: string; // Unique command identifier (e.g., "set_threshold")
    parameters: Record<string, CommandParameter>;
    description: string;
}

/**
 * Response format for GET /telemetry-types endpoint
 */
export interface TelemetryTypesResponse {
    telemetry_types: Record<string, TelemetryTypeConfig>;
    last_updated: string; // ISO timestamp
}

/**
 * Response format for GET /command-templates endpoint
 */
export interface CommandTemplatesResponse {
    command_templates: Record<string, CommandTemplate>;
    last_updated: string; // ISO timestamp
}

/**
 * Query parameters for historical data requests
 */
export interface HistoricalDataQuery {
    id?: string; // Filter by telemetry ID
    type?: string; // Filter by message type
    limit?: number; // Maximum records to return
    from_timestamp?: string; // ISO timestamp
    to_timestamp?: string; // ISO timestamp
}

/**
 * Response format for GET /historical-data endpoint
 */
export interface HistoricalDataResponse {
    data: GenericMessage[];
    total_records: number;
    filtered_records: number;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Device configuration summary
 */
export interface DeviceConfigSummary {
    device_id: string;
    device_type: string;
    status: 'connected' | 'disconnected' | 'error';
    telemetry_types_count: number;
    command_templates_count: number;
    last_updated: string;
}