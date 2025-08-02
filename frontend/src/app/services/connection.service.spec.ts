import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ConnectionService } from './connection.service';
import { WebSocketService } from './websocket.service';
import { ConnectionState, ConnectionError } from '../models/connection.interface';
import { 
    TelemetryMessage, 
    CommandMessage, 
    CommandResultMessage, 
    DeviceMessage,
    CommandStatus,
    DataType 
} from '../models/telemetry.interface';
import { 
    TelemetryTypesResponse, 
    CommandTemplatesResponse,
    HistoricalDataQuery,
    HistoricalDataResponse 
} from '../models/configuration.interface';
import { environment } from '../../environments/environment';
import { of, Subject, BehaviorSubject } from 'rxjs';

describe('ConnectionService', () => {
    let service: ConnectionService;
    let httpMock: HttpTestingController;
    let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
    let mockConnectionStatus$: BehaviorSubject<any>;
    let mockErrors$: Subject<ConnectionError>;
    let mockMessages$: Subject<string>;

    const mockTelemetryTypes: TelemetryTypesResponse = {
        telemetry_types: {
            'temperature': { 
                data_type: DataType.FLOAT, 
                unit: '°C', 
                description: 'Temperature sensor',
                range: { min: -50, max: 150 }
            },
            'pressure': { 
                data_type: DataType.FLOAT, 
                unit: 'Pa', 
                description: 'Pressure sensor',
                range: { min: 0, max: 200000 }
            }
        },
        last_updated: '2025-08-02T10:00:00.000Z'
    };

    const mockCommandTemplates: CommandTemplatesResponse = {
        command_templates: {
            'set_threshold': {
                command: 'set_threshold',
                description: 'Set sensor threshold',
                parameters: {
                    'sensor_id': { type: 'string', required: true },
                    'value': { type: 'float', required: true }
                }
            },
            'get_status': {
                command: 'get_status',
                description: 'Get device status',
                parameters: {}
            }
        },
        last_updated: '2025-08-02T10:00:00.000Z'
    };

    beforeEach(() => {
        mockConnectionStatus$ = new BehaviorSubject({
            state: ConnectionState.DISCONNECTED,
            reconnectAttempts: 0
        });
        mockErrors$ = new Subject<ConnectionError>();
        mockMessages$ = new Subject<string>();

        const webSocketServiceSpy = jasmine.createSpyObj('WebSocketService', [
            'connect',
            'disconnect',
            'sendMessage',
            'getConnectionStatus',
            'getErrors',
            'getMessages'
        ]);

        webSocketServiceSpy.getConnectionStatus.and.returnValue(mockConnectionStatus$);
        webSocketServiceSpy.getErrors.and.returnValue(mockErrors$);
        webSocketServiceSpy.getMessages.and.returnValue(mockMessages$);

        TestBed.configureTestingModule({
            providers: [
                ConnectionService,
                { provide: WebSocketService, useValue: webSocketServiceSpy },
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(ConnectionService);
        httpMock = TestBed.inject(HttpTestingController);
        mockWebSocketService = TestBed.inject(WebSocketService) as jasmine.SpyObj<WebSocketService>;
    });

    afterEach(() => {
        httpMock.verify();
        service.ngOnDestroy();
    });

    describe('Service Initialization', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should initialize with empty telemetry types and command templates', () => {
            service.getTelemetryTypes().subscribe(types => {
                expect(types.telemetry_types).toEqual({});
            });

            service.getCommandTemplates().subscribe(templates => {
                expect(templates.command_templates).toEqual({});
            });
        });

        it('should merge WebSocket errors with internal errors', () => {
            const testError: ConnectionError = {
                type: 'websocket',
                message: 'Test error',
                timestamp: new Date(),
                recoverable: true
            };

            let receivedError: ConnectionError | undefined;
            service.getConnectionErrors().subscribe(error => {
                receivedError = error;
            });

            mockErrors$.next(testError);

            expect(receivedError).toBeDefined();
            expect(receivedError!.type).toBe('websocket');
        });
    });

    describe('Message Processing and Buffering', () => {
        it('should process and buffer valid telemetry messages', () => {
            const telemetryMessage: TelemetryMessage = {
                type: 'data',
                id: 'temperature',
                value: 23.5,
                timestamp: '2025-08-02T10:00:00.000Z'
            };

            mockMessages$.next(JSON.stringify(telemetryMessage));

            const bufferedMessages = service.getBufferedMessages();
            expect(bufferedMessages.length).toBe(1);
            expect(bufferedMessages[0]).toEqual(telemetryMessage);
        });

        it('should filter telemetry messages by sensor ID', () => {
            const tempMessage: TelemetryMessage = {
                type: 'data',
                id: 'temperature',
                value: 23.5,
                timestamp: '2025-08-02T10:00:00.000Z'
            };

            const pressureMessage: TelemetryMessage = {
                type: 'data',
                id: 'pressure',
                value: 1013.25,
                timestamp: '2025-08-02T10:01:00.000Z'
            };

            mockMessages$.next(JSON.stringify(tempMessage));
            mockMessages$.next(JSON.stringify(pressureMessage));

            const temperatureMessages = service.getBufferedTelemetryMessages('temperature');
            expect(temperatureMessages.length).toBe(1);
            expect(temperatureMessages[0].id).toBe('temperature');

            const pressureMessages = service.getBufferedTelemetryMessages('pressure');
            expect(pressureMessages.length).toBe(1);
            expect(pressureMessages[0].id).toBe('pressure');
        });

        it('should process command result messages', () => {
            const commandResult: CommandResultMessage = {
                type: 'command_result',
                id: 'command_result',
                value: {
                    command: 'set_threshold',
                    status: CommandStatus.SUCCESS,
                    message: 'Threshold set successfully'
                },
                timestamp: '2025-08-02T10:00:00.000Z'
            };

            mockMessages$.next(JSON.stringify(commandResult));

            const bufferedResults = service.getBufferedCommandResults('set_threshold');
            expect(bufferedResults.length).toBe(1);
            expect(bufferedResults[0].value.command).toBe('set_threshold');
        });

        it('should process device messages', () => {
            const deviceMessage: DeviceMessage = {
                type: 'device_message',
                id: 'device_status',
                value: { status: 'online', uptime: 3600 },
                timestamp: '2025-08-02T10:00:00.000Z'
            };

            mockMessages$.next(JSON.stringify(deviceMessage));

            const bufferedDeviceMessages = service.getBufferedDeviceMessages('device_status');
            expect(bufferedDeviceMessages.length).toBe(1);
            expect(bufferedDeviceMessages[0].id).toBe('device_status');
        });

        it('should handle malformed JSON messages gracefully', () => {
            let errorReceived = false;
            service.getConnectionErrors().subscribe(error => {
                if (error.type === 'validation') {
                    errorReceived = true;
                }
            });

            mockMessages$.next('invalid json {');

            expect(errorReceived).toBe(true);
        });

        it('should limit buffer size', () => {
            const bufferSize = environment.buffer.maxSize || 1000;
            
            // Add more messages than buffer size
            for (let i = 0; i < bufferSize + 10; i++) {
                const message: TelemetryMessage = {
                    type: 'data',
                    id: 'test',
                    value: i,
                    timestamp: new Date().toISOString()
                };
                mockMessages$.next(JSON.stringify(message));
            }

            const bufferedMessages = service.getBufferedMessages();
            expect(bufferedMessages.length).toBe(bufferSize);
        });
    });

    describe('Connection Management', () => {
        it('should connect to WebSocket and fetch configuration', () => {
            service.connect();

            expect(mockWebSocketService.connect).toHaveBeenCalled();

            // Simulate connection established
            mockConnectionStatus$.next({
                state: ConnectionState.CONNECTED,
                reconnectAttempts: 0,
                lastConnected: new Date()
            });

            // Should make HTTP requests for configuration
            const telemetryReq = httpMock.expectOne(`${environment.apiUrl}/telemetry-types`);
            expect(telemetryReq.request.method).toBe('GET');
            telemetryReq.flush(mockTelemetryTypes);

            const templatesReq = httpMock.expectOne(`${environment.apiUrl}/command-templates`);
            expect(templatesReq.request.method).toBe('GET');
            templatesReq.flush(mockCommandTemplates);
        });

        it('should disconnect and clear buffer', () => {
            // Add some messages first
            const message: TelemetryMessage = {
                type: 'data',
                id: 'test',
                value: 42,
                timestamp: new Date().toISOString()
            };
            mockMessages$.next(JSON.stringify(message));

            expect(service.getBufferedMessages().length).toBe(1);

            service.disconnect();

            expect(mockWebSocketService.disconnect).toHaveBeenCalled();
            expect(service.getBufferedMessages().length).toBe(0);
        });

        it('should handle HTTP errors when fetching configuration', () => {
            let errorReceived = false;
            service.getConnectionErrors().subscribe(error => {
                if (error.message.includes('telemetry types')) {
                    errorReceived = true;
                }
            });

            service.connect();
            mockConnectionStatus$.next({
                state: ConnectionState.CONNECTED,
                reconnectAttempts: 0
            });

            // Handle the telemetry types request with error
            const telemetryReq = httpMock.expectOne(`${environment.apiUrl}/telemetry-types`);
            telemetryReq.error(new ErrorEvent('Network error'));

            // Handle the command templates request that will also be made
            const templatesReq = httpMock.expectOne(`${environment.apiUrl}/command-templates`);
            templatesReq.flush(mockCommandTemplates); // Complete this one successfully

            expect(errorReceived).toBe(true);
        });
    });

    describe('Command Validation and Sending', () => {
        beforeEach(() => {
            // Set up command templates
            service['commandTemplates$'].next(mockCommandTemplates);
        });

        it('should validate and send valid commands', () => {
            const result = service.sendCommandMessage('set_threshold', {
                sensor_id: 'temperature',
                value: 25.0
            });

            expect(result).toBe(true);
            expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith({
                type: 'command',
                command: 'set_threshold',
                parameters: {
                    sensor_id: 'temperature',
                    value: 25.0
                }
            });
        });

        it('should reject commands with missing required parameters', () => {
            const result = service.sendCommandMessage('set_threshold', {
                sensor_id: 'temperature'
                // missing 'value' parameter
            });

            expect(result).toBe(false);
            expect(mockWebSocketService.sendMessage).not.toHaveBeenCalled();
        });

        it('should reject commands with invalid parameter types', () => {
            const result = service.sendCommandMessage('set_threshold', {
                sensor_id: 'temperature',
                value: 'invalid_number' // should be a number
            });

            expect(result).toBe(false);
            expect(mockWebSocketService.sendMessage).not.toHaveBeenCalled();
        });

        it('should reject unknown commands', () => {
            const result = service.sendCommandMessage('unknown_command', {});

            expect(result).toBe(false);
            expect(mockWebSocketService.sendMessage).not.toHaveBeenCalled();
        });

        it('should validate commands with no parameters', () => {
            const result = service.sendCommandMessage('get_status');

            expect(result).toBe(true);
            expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith({
                type: 'command',
                command: 'get_status',
                parameters: {}
            });
        });
    });

    describe('Configuration Management', () => {
        beforeEach(() => {
            service['telemetryTypes$'].next(mockTelemetryTypes);
            service['commandTemplates$'].next(mockCommandTemplates);
        });

        it('should return available telemetry IDs', () => {
            const ids = service.getAvailableTelemetryIds();
            expect(ids).toEqual(['temperature', 'pressure']);
        });

        it('should return available commands', () => {
            const commands = service.getAvailableCommands();
            expect(commands).toEqual(['set_threshold', 'get_status']);
        });

        it('should return command configuration', () => {
            const config = service.getCommandConfig('set_threshold');
            expect(config).toEqual(mockCommandTemplates.command_templates['set_threshold']);
        });

        it('should return null for unknown command configuration', () => {
            const config = service.getCommandConfig('unknown_command');
            expect(config).toBeNull();
        });

        it('should check if command is available', () => {
            expect(service.isCommandAvailable('set_threshold')).toBe(true);
            expect(service.isCommandAvailable('unknown_command')).toBe(false);
        });
    });

    describe('Buffer Statistics and Utilities', () => {
        beforeEach(() => {
            // Add sample messages
            const telemetryMessage: TelemetryMessage = {
                type: 'data',
                id: 'temperature',
                value: 23.5,
                timestamp: '2025-08-02T10:00:00.000Z'
            };

            const commandMessage: CommandMessage = {
                type: 'command',
                command: 'get_status',
                parameters: {}
            };

            mockMessages$.next(JSON.stringify(telemetryMessage));
            mockMessages$.next(JSON.stringify(commandMessage));
        });

        it('should return buffer statistics', () => {
            const stats = service.getBufferStats();
            
            expect(stats.totalMessages).toBe(2);
            expect(stats.telemetryMessages).toBe(1);
            expect(stats.commandMessages).toBe(1);
            expect(stats.bufferUsage).toBeGreaterThan(0);
        });

        it('should get latest messages with limit', () => {
            const latest = service.getBufferedTelemetryMessages('temperature', 1);
            
            expect(latest.length).toBe(1);
            expect(latest[0].id).toBe('temperature');
            expect(latest[0].value).toBe(23.5);
        });

        it('should return empty array for non-existent sensor', () => {
            const messages = service.getBufferedTelemetryMessages('non_existent');
            expect(messages.length).toBe(0);
        });

        it('should clear buffer', () => {
            expect(service.getBufferedMessages().length).toBe(2);
            
            service.clearBuffer();
            
            expect(service.getBufferedMessages().length).toBe(0);
        });

        it('should return service state for debugging', () => {
            service['telemetryTypes$'].next(mockTelemetryTypes);
            service['commandTemplates$'].next(mockCommandTemplates);

            const state = service.getServiceState();
            
            expect(state.telemetryTypesCount).toBe(2);
            expect(state.commandTemplatesCount).toBe(2);
            expect(state.subscriptionsCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Historical Data', () => {
        it('should fetch historical data', () => {
            const query: HistoricalDataQuery = {
                id: 'temperature',
                from_timestamp: '2025-08-01T00:00:00.000Z',
                to_timestamp: '2025-08-02T00:00:00.000Z',
                limit: 100
            };

            const mockResponse: HistoricalDataResponse = {
                data: [
                    {
                        type: 'data',
                        id: 'temperature',
                        value: 23.5,
                        timestamp: '2025-08-01T10:00:00.000Z'
                    },
                    {
                        type: 'data',
                        id: 'temperature',
                        value: 24.0,
                        timestamp: '2025-08-01T11:00:00.000Z'
                    }
                ],
                total_records: 100,
                filtered_records: 2
            };

            service.fetchHistoricalData(query).subscribe(response => {
                expect(response.data.length).toBe(2);
                expect(response.total_records).toBe(100);
                expect(response.filtered_records).toBe(2);
            });

            const req = httpMock.expectOne(`${environment.apiUrl}/historical-data`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(query);
            req.flush(mockResponse);
        });

        it('should handle historical data fetch errors', () => {
            const query: HistoricalDataQuery = {
                id: 'temperature',
                from_timestamp: '2025-08-01T00:00:00.000Z',
                to_timestamp: '2025-08-02T00:00:00.000Z'
            };

            let errorReceived = false;
            service.getConnectionErrors().subscribe(error => {
                if (error.message.includes('historical data')) {
                    errorReceived = true;
                }
            });

            service.fetchHistoricalData(query).subscribe({
                next: () => fail('Should have failed'),
                error: () => {} // Expected to fail
            });

            const req = httpMock.expectOne(`${environment.apiUrl}/historical-data`);
            req.error(new ErrorEvent('Network error'));

            expect(errorReceived).toBe(true);
        });
    });

    describe('Observable Streams', () => {
        it('should provide connection status observable', () => {
            const observable = service.getConnectionStatus();
            expect(observable).toBeTruthy();
            
            let currentStatus: any;
            observable.subscribe(status => {
                currentStatus = status;
            });

            mockConnectionStatus$.next({
                state: ConnectionState.CONNECTED,
                reconnectAttempts: 0
            });

            expect(currentStatus.state).toBe(ConnectionState.CONNECTED);
        });

        it('should provide isConnected boolean observable', () => {
            let isConnected: boolean | undefined;
            service.isConnected().subscribe(connected => {
                isConnected = connected;
            });

            mockConnectionStatus$.next({
                state: ConnectionState.CONNECTED,
                reconnectAttempts: 0
            });

            expect(isConnected).toBe(true);

            mockConnectionStatus$.next({
                state: ConnectionState.DISCONNECTED,
                reconnectAttempts: 0
            });

            expect(isConnected).toBe(false);
        });

        it('should provide filtered message observables', () => {
            let telemetryReceived = false;
            let commandReceived = false;

            service.getTelemetryMessages().subscribe(() => {
                telemetryReceived = true;
            });

            service.getCommandMessages().subscribe(() => {
                commandReceived = true;
            });

            const telemetryMessage: TelemetryMessage = {
                type: 'data',
                id: 'temperature',
                value: 23.5,
                timestamp: '2025-08-02T10:00:00.000Z'
            };

            const commandMessage: CommandMessage = {
                type: 'command',
                command: 'get_status',
                parameters: {}
            };

            mockMessages$.next(JSON.stringify(telemetryMessage));
            mockMessages$.next(JSON.stringify(commandMessage));

            expect(telemetryReceived).toBe(true);
            expect(commandReceived).toBe(true);
        });
    });

    describe('Cleanup and Lifecycle', () => {
        it('should clean up resources on destroy', () => {
            // Connect to create subscriptions
            service.connect();
            
            // Spy on completion methods
            spyOn(service['telemetryTypes$'], 'complete');
            spyOn(service['commandTemplates$'], 'complete');
            spyOn(service['internalErrors$'], 'complete');

            service.ngOnDestroy();

            expect(mockWebSocketService.disconnect).toHaveBeenCalled();
            expect(service['telemetryTypes$'].complete).toHaveBeenCalled();
            expect(service['commandTemplates$'].complete).toHaveBeenCalled();
            expect(service['internalErrors$'].complete).toHaveBeenCalled();
        });
    });
});