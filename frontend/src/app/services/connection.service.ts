/**
 * ConnectionService provides methods to manage incoming and outgoing data
 * and requests via WebSocket and HTTP.
 * Also handles verification of data, and stores the data in a buffer.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { filter, map, Observable, Subject, catchError, EMPTY, merge, take, BehaviorSubject, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    TelemetryMessage,
    CommandMessage,
    CommandResultMessage,
    DeviceMessage,
    GenericMessage,
    isTelemetryMessage,
    isCommandMessage,
    isCommandResultMessage,
    isDeviceMessage
} from '../models/telemetry.interface';
import {
    TelemetryTypesResponse,
    CommandTemplatesResponse,
    HistoricalDataQuery,
    HistoricalDataResponse,
    DeviceConfigSummary
} from '../models/configuration.interface';
import { WebSocketService } from './websocket.service';
import { ConnectionStatus, ConnectionError, ConnectionState } from '../models/connection.interface';

@Injectable({
    providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
    private internalErrors$ = new Subject<ConnectionError>();
    public errors$: Observable<ConnectionError>;

    public messages$: Observable<GenericMessage>;
    public telemetryMessages$: Observable<TelemetryMessage>;
    public commandMessages$: Observable<CommandMessage>;
    public commandResultMessages$: Observable<CommandResultMessage>;
    public deviceMessages$: Observable<DeviceMessage>;

    public telemetryTypes$ = new BehaviorSubject<TelemetryTypesResponse>(
        { telemetry_types: {}, last_updated: new Date().toISOString() }
    );
    public commandTemplates$ = new BehaviorSubject<CommandTemplatesResponse>(
        { command_templates: {}, last_updated: new Date().toISOString() }
    );

    private subscriptions: Subscription[] = [];

    // Buffer for storing messages
    private messageBuffer: GenericMessage[] = [];
    private readonly bufferSize = environment.buffer.maxSize || 1000;

    constructor(private http: HttpClient, private websocketService: WebSocketService) {
        this.errors$ = merge(
            this.internalErrors$.asObservable(),
            this.websocketService.getErrors()
        );

        const validationError = (error: any) => {
            console.error('Error processing message:', error);

            const connectionError: ConnectionError = {
                type: 'validation',
                message: 'Invalid message format',
                timestamp: new Date(),
                details: error,
                recoverable: true
            };
            this.internalErrors$.next(connectionError);

            return EMPTY;
        };

        this.messages$ = this.websocketService.getMessages().pipe(
            filter((message: string) => message !== null && message !== undefined),
            map((message: string) => JSON.parse(message) as GenericMessage),
            catchError(validationError)
        );

        this.telemetryMessages$ = this.messages$.pipe( filter(isTelemetryMessage), catchError(validationError) );

        this.commandMessages$ = this.messages$.pipe( filter(isCommandMessage), catchError(validationError) );

        this.commandResultMessages$ = this.messages$.pipe( filter(isCommandResultMessage), catchError(validationError) );

        this.deviceMessages$ = this.messages$.pipe( filter(isDeviceMessage), catchError(validationError) );

        // Buffer all incoming messages
        this.messages$.subscribe(message => {
            this.addToBuffer(message);
        });
    }

    /**
     * Connect to the WebSocket server and get the configuration from HTTP.
     */
    connect(): void {
        this.websocketService.connect();
        
        // Wait for connected state specifically
        const connectionSub = this.websocketService.getConnectionStatus().pipe(
            filter(status => status.state === ConnectionState.CONNECTED),
            take(1)
        ).subscribe(() => {
            this.fetchTelemetryTypes();
            this.fetchCommandTemplates();
        });

        this.subscriptions.push(connectionSub);
    }

    /**
     * Add a message to the buffer
     */
    private addToBuffer(message: GenericMessage): void {
        this.messageBuffer.push(message);
        
        // Keep buffer size manageable
        if (this.messageBuffer.length > this.bufferSize) {
            this.messageBuffer.shift(); // Remove oldest message
        }
    }

    /**
     * Disconnect from the WebSocket server.
     */
    disconnect(): void {
        this.websocketService.disconnect();
        this.telemetryTypes$.next(
            { telemetry_types: {}, last_updated: new Date().toISOString() }
        );
        this.commandTemplates$.next(
            { command_templates: {}, last_updated: new Date().toISOString() }
        );
        
        // Clear the message buffer on disconnect
        this.clearBuffer();
    }

    /**
     * Fetch telemetry types from the server.
     */
    private fetchTelemetryTypes(): void {
        const sub = this.http.get<TelemetryTypesResponse>(`${environment.apiUrl}/telemetry-types`).pipe(
            take(1),
            catchError(error => {
                console.error('Error fetching telemetry types:', error);
                
                const connectionError: ConnectionError = {
                    type: 'connection',
                    message: 'Failed to fetch telemetry types',
                    timestamp: new Date(),
                    details: error,
                    recoverable: true
                };
                this.internalErrors$.next(connectionError);
                
                return EMPTY;
            })
        ).subscribe(response => {
            this.telemetryTypes$.next(response);
        });

        this.subscriptions.push(sub);
    }

    /**
     * Fetch command templates from the server.
     */
    private fetchCommandTemplates(): void {
        const sub = this.http.get<CommandTemplatesResponse>(`${environment.apiUrl}/command-templates`).pipe(
            take(1),
            catchError(error => {
                console.error('Error fetching command templates:', error);
                
                const connectionError: ConnectionError = {
                    type: 'connection',
                    message: 'Failed to fetch command templates',
                    timestamp: new Date(),
                    details: error,
                    recoverable: true
                };
                this.internalErrors$.next(connectionError);
                
                return EMPTY;
            })
        ).subscribe(response => {
            this.commandTemplates$.next(response);
        });
        this.subscriptions.push(sub);
    }

    /**
     * Fetch historical data based on the query parameters.
     */
    fetchHistoricalData(query: HistoricalDataQuery): Observable<HistoricalDataResponse> {
        return this.http.post<HistoricalDataResponse>(`${environment.apiUrl}/historical-data`, query).pipe(
            catchError(error => {
                console.error('Error fetching historical data:', error);
                
                const connectionError: ConnectionError = {
                    type: 'connection',
                    message: 'Failed to fetch historical data',
                    timestamp: new Date(),
                    details: error,
                    recoverable: true
                };
                this.internalErrors$.next(connectionError);
                
                return EMPTY;
            })
        );
    }

    /**
     * Get the current connection status as an Observable.
     */
    getConnectionStatus(): Observable<ConnectionStatus> {
        return this.websocketService.getConnectionStatus();
    }

    /**
     * Get the current connection errors as an Observable.
     */
    getConnectionErrors(): Observable<ConnectionError> {
        return this.errors$;
    }

    /**
     * Get command templates as an Observable.
     */
    getCommandTemplates(): Observable<CommandTemplatesResponse> {
        return this.commandTemplates$.asObservable();
    }

    /**
     * Get telemetry types as an Observable.
     */
    getTelemetryTypes(): Observable<TelemetryTypesResponse> {
        return this.telemetryTypes$.asObservable();
    }

    /**
     * Get list of available commands
     */
    getAvailableCommands(): string[] {
        return Object.keys(this.commandTemplates$.value.command_templates);
    }

    /**
     * Get command configuration
     */
    getCommandConfig(command: string) {
        return this.commandTemplates$.value.command_templates[command] || null;
    }

    /**
     * Get all messages as an Observable.
     */
    getAllMessages(): Observable<GenericMessage> {
        return this.messages$;
    }

    /**
     * Get telemetry messages as an Observable.
     */
    getTelemetryMessages(): Observable<TelemetryMessage> {
        return this.telemetryMessages$;
    }

    /**
     * Get command messages as an Observable.
     */
    getCommandMessages(): Observable<CommandMessage> {
        return this.commandMessages$;
    }

    /**
     * Get command result messages as an Observable.
     */
    getCommandResultMessages(): Observable<CommandResultMessage> {
        return this.commandResultMessages$;
    }

    /**
     * Get device messages as an Observable.
     */
    getDeviceMessages(): Observable<DeviceMessage> {
        return this.deviceMessages$;
    }

    /**
     * Get all available telemetry IDs from configuration
     */
    getAvailableTelemetryIds(): string[] {
        return Object.keys(this.telemetryTypes$.value.telemetry_types);
    }

    /**
     * Get buffered messages with optional limit
     */
    getBufferedMessages(limit?: number): GenericMessage[] {
        return limit ? this.messageBuffer.slice(-limit) : [...this.messageBuffer];
    }

    /**
     * Get buffered telemetry messages with optional filtering by sensor ID and limit
     */
    getBufferedTelemetryMessages(sensorId?: string, limit?: number): TelemetryMessage[] {
        let filtered = this.messageBuffer.filter(isTelemetryMessage);
        
        if (sensorId) {
            filtered = filtered.filter(msg => msg.id === sensorId);
        }
        
        return limit ? filtered.slice(-limit) : filtered;
    }

    /**
     * Get buffered command results with optional filtering by command and limit
     */
    getBufferedCommandResults(command?: string, limit?: number): CommandResultMessage[] {
        let filtered = this.messageBuffer.filter(isCommandResultMessage);
        
        if (command) {
            filtered = filtered.filter(msg => msg.value.command === command);
        }
        
        return limit ? filtered.slice(-limit) : filtered;
    }

    /**
     * Get buffered device messages with optional filtering by message ID and limit
     */
    getBufferedDeviceMessages(messageId?: string, limit?: number): DeviceMessage[] {
        let filtered = this.messageBuffer.filter(isDeviceMessage);
        
        if (messageId) {
            filtered = filtered.filter(msg => msg.id === messageId);
        }
        
        return limit ? filtered.slice(-limit) : filtered;
    }

    /**
     * Get buffer statistics for debugging
     */
    getBufferStats() {
        const telemetryCount = this.messageBuffer.filter(isTelemetryMessage).length;
        const commandCount = this.messageBuffer.filter(isCommandMessage).length;
        const commandResultCount = this.messageBuffer.filter(isCommandResultMessage).length;
        const deviceCount = this.messageBuffer.filter(isDeviceMessage).length;
        
        return {
            totalMessages: this.messageBuffer.length,
            telemetryMessages: telemetryCount,
            commandMessages: commandCount,
            commandResultMessages: commandResultCount,
            deviceMessages: deviceCount,
            bufferSize: this.bufferSize,
            bufferUsage: (this.messageBuffer.length / this.bufferSize) * 100
        };
    }

    /**
     * Clear the message buffer
     */
    clearBuffer(): void {
        this.messageBuffer = [];
    }

    /**
     * Get current service state for debugging
     */
    getServiceState() {
        return {
            telemetryTypesCount: Object.keys(this.telemetryTypes$.value.telemetry_types).length,
            commandTemplatesCount: Object.keys(this.commandTemplates$.value.command_templates).length,
            subscriptionsCount: this.subscriptions.length,
            errors: this.errors$,
            connectionStatus: this.getConnectionStatus()
        };
    }

    /**
     * Send a command message through the WebSocket.
     */
    sendCommandMessage(command: string, parameters?: Record<string, any>): boolean {
        if (this.validateCommand(command, parameters)) {
            const commandMessage: CommandMessage = {
                type: 'command',
                command: command,
                parameters: parameters || {}
            };
            this.websocketService.sendMessage(commandMessage);
            return true;
        }
        return false;
    }

    /**
     * Check if currently connected to WebSocket
     */
    isConnected(): Observable<boolean> {
        return this.getConnectionStatus().pipe(
            map(status => status.state === ConnectionState.CONNECTED)
        );
    }

    /**
     * Check if a command is available
     */
    isCommandAvailable(command: string): boolean {
        return !!this.commandTemplates$.value.command_templates[command];
    }

    /**
     * Validate a command message before sending.
     */
    validateCommand(command: string, parameters?: Record<string, any>): boolean {
        if (!command || command.trim() === '') {
            console.warn('Command cannot be empty');
            const validationError: ConnectionError = {
                type: 'validation',
                message: 'Command cannot be empty',
                timestamp: new Date(),
                recoverable: true
            };
            this.internalErrors$.next(validationError);
            return false;
        }
        if (this.commandTemplates$.value.command_templates[command]) {
            const config = this.commandTemplates$.value.command_templates[command];
            if (config.parameters) {
                for (const [key, param] of Object.entries(config.parameters)) {
                    const value = parameters?.[key];
                    if (param.required && value === undefined) {
                        console.warn(`Parameter "${key}" is required for command "${command}"`);
                        const validationError: ConnectionError = {
                            type: 'validation',
                            message: `Parameter "${key}" is required for command "${command}"`,
                            timestamp: new Date(),
                            recoverable: true
                        };
                        this.internalErrors$.next(validationError);
                        return false;
                    }
                    if (param.enum && !param.enum.includes(value)) {
                        console.warn(`Parameter "${key}" has an invalid value for command "${command}"`);
                        const validationError: ConnectionError = {
                            type: 'validation',
                            message: `Parameter "${key}" has an invalid value for command "${command}"`,
                            timestamp: new Date(),
                            recoverable: true
                        };
                        this.internalErrors$.next(validationError);
                        return false;
                    }
                    if (param.type) {
                        if (!param.required && value === undefined) {
                            continue; // Skip validation for optional parameters not provided
                        }
                        if (param.type === 'string' && typeof value !== 'string'
                            || param.type === 'int' && !Number.isInteger(value)
                            || param.type === 'float' && typeof value !== 'number'
                            || param.type === 'boolean' && typeof value !== 'boolean'
                            ) {
                            console.warn(`Parameter "${key}" must be of type "${param.type}" for command "${command}"`);
                            const validationError: ConnectionError = {
                                type: 'validation',
                                message: `Parameter "${key}" must be of type "${param.type}" for command "${command}"`,
                                timestamp: new Date(),
                                recoverable: true
                            };
                            this.internalErrors$.next(validationError);
                            return false;
                        }
                    }
                }
            }
            return true;
        } else {
            console.warn(`Command "${command}" is not defined in command templates`);
            const validationError: ConnectionError = {
                type: 'validation',
                message: `Command "${command}" is not defined in command templates`,
                timestamp: new Date(),
                recoverable: true
            };
            this.internalErrors$.next(validationError);
            return false;
        }
    }

    ngOnDestroy(): void {
        // Clean up subscriptions
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.websocketService.disconnect();
        
        // Reset subjects to prevent memory leaks
        this.telemetryTypes$.complete();
        this.commandTemplates$.complete();
        this.internalErrors$.complete();
    }

}