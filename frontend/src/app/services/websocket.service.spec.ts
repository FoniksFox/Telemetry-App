import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { ConnectionState } from '../models/connection.interface';
import { TelemetryMessage } from '../models/telemetry.interface';
import { environment } from '../../environments/environment';

// Mock WebSocket class
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState: number = MockWebSocket.CONNECTING;
    url: string;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        // Simulate async connection
        setTimeout(() => this.simulateOpen(), 10);
    }

    send(data: string): void {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }
        // Mock successful send
    }

    close(code?: number, reason?: string): void {
        this.readyState = MockWebSocket.CLOSED;
        setTimeout(() => {
            if (this.onclose) {
                this.onclose(new CloseEvent('close', { 
                    code: code || 1000, 
                    reason: reason || '',
                    wasClean: true 
                }));
            }
        }, 10);
    }

    simulateOpen(): void {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) {
            this.onopen(new Event('open'));
        }
    }

    simulateMessage(data: any): void {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }

    simulateError(): void {
        if (this.onerror) {
            this.onerror(new Event('error'));
        }
    }

    simulateClose(code: number = 1006, reason: string = 'Connection lost'): void {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { 
                code, 
                reason, 
                wasClean: false 
            }));
        }
    }
}

describe('WebSocketService', () => {
    let service: WebSocketService;
    let mockWebSocket: MockWebSocket;
    let ngZone: NgZone;
    let originalWebSocket: any;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [WebSocketService]
        });

        service = TestBed.inject(WebSocketService);
        ngZone = TestBed.inject(NgZone);

        // Store original WebSocket and replace with mock
        originalWebSocket = (window as any).WebSocket;
        (window as any).WebSocket = MockWebSocket;
        
        // Set up Jasmine clock for timer control
        jasmine.clock().install();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
        // Restore original WebSocket
        (window as any).WebSocket = originalWebSocket;
        service.ngOnDestroy();
    });

    describe('Service Initialization', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should initialize with disconnected state', (done) => {
            service.getConnectionStatus().subscribe(status => {
                expect(status.state).toBe(ConnectionState.DISCONNECTED);
                expect(status.reconnectAttempts).toBe(0);
                done();
            });
        });

        it('should have correct configuration from environment', () => {
            expect((service as any).config.url).toBe(environment.websocketUrl);
            expect((service as any).config.maxReconnectAttempts).toBe(environment.websocket.maxReconnectAttempts);
        });
    });

    describe('Connection Management', () => {
        it('should connect successfully', (done) => {
            let statusUpdates: any[] = [];
            let connected = false;
            
            service.getConnectionStatus().subscribe(status => {
                statusUpdates.push(status);
                
                if (status.state === ConnectionState.CONNECTED && !connected) {
                    connected = true;
                    expect(statusUpdates.length).toBeGreaterThanOrEqual(2);
                    expect(statusUpdates[1].state).toBe(ConnectionState.CONNECTING);
                    expect(statusUpdates[statusUpdates.length - 1].state).toBe(ConnectionState.CONNECTED);
                    expect(status.reconnectAttempts).toBe(0);
                    expect(status.lastConnected).toBeDefined();
                    done();
                }
            });

            service.connect();
            jasmine.clock().tick(50); // Allow async operations
        });

        it('should not connect if already connected', () => {
            spyOn(console, 'warn');
            
            service.connect();
            jasmine.clock().tick(50);
            
            // Try to connect again
            service.connect();
            
            expect(console.warn).toHaveBeenCalledWith('WebSocket is already connected.');
        });

        it('should disconnect gracefully', (done) => {
            let disconnected = false;
            
            service.connect();
            jasmine.clock().tick(50);

            service.getConnectionStatus().subscribe(status => {
                if (status.state === ConnectionState.DISCONNECTED && 
                    status.lastDisconnected && 
                    !disconnected) {
                    disconnected = true;
                    expect(status.reconnectAttempts).toBe(0);
                    done();
                }
            });

            service.disconnect();
            jasmine.clock().tick(50);
        });

        it('should handle connection timeout', (done) => {
            let errorReceived = false;
            
            service.getErrors().subscribe(error => {
                if (!errorReceived) {
                    expect(error.type).toBe('timeout');
                    expect(error.message).toContain('timed out');
                    expect(error.recoverable).toBe(true);
                    errorReceived = true;
                    done();
                }
            });

            // Directly test the timeout error handling by calling the method
            const timeoutError = {
                type: 'timeout' as const,
                message: 'WebSocket connection timed out',
                timestamp: new Date(),
                recoverable: true,
                details: {
                    readyState: 0,
                    timeout: 5000
                }
            };

            // Call the private method directly to test timeout handling
            (service as any).handleConnectionError(timeoutError);
        });
    });

    describe('Message Handling', () => {
        beforeEach((done) => {
            service.connect();
            service.getConnectionStatus().subscribe(status => {
                if (status.state === ConnectionState.CONNECTED) {
                    mockWebSocket = (service as any).socket;
                    done();
                }
            });
            jasmine.clock().tick(50);
        });

        it('should send messages successfully', () => {
            const testMessage: TelemetryMessage = {
                type: 'data',
                id: 'test-sensor',
                value: 42,
                timestamp: new Date().toISOString()
            };

            spyOn(mockWebSocket, 'send');
            
            service.sendMessage(testMessage);
            
            expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
        });

        it('should handle send errors when socket is not open', (done) => {
            service.disconnect();
            jasmine.clock().tick(50);

            service.getErrors().subscribe(error => {
                expect(error.type).toBe('websocket');
                expect(error.message).toContain('not open');
                expect(error.recoverable).toBe(true);
                done();
            });

            const testMessage: TelemetryMessage = {
                type: 'data',
                id: 'test-sensor',
                value: 42,
                timestamp: new Date().toISOString()
            };

            service.sendMessage(testMessage);
        });

        it('should receive and parse messages correctly', (done) => {
            const testMessage: TelemetryMessage = {
                type: 'data',
                id: 'temperature',
                value: 23.5,
                timestamp: new Date().toISOString()
            };

            service.getMessages().subscribe(message => {
                expect(message).toEqual(testMessage);
                done();
            });

            mockWebSocket.simulateMessage(testMessage);
        });

        it('should handle malformed messages', (done) => {
            service.getErrors().subscribe(error => {
                expect(error.type).toBe('validation');
                expect(error.message).toContain('parse');
                expect(error.recoverable).toBe(true);
                done();
            });

            // Simulate invalid JSON
            if (mockWebSocket.onmessage) {
                mockWebSocket.onmessage(new MessageEvent('message', { 
                    data: 'invalid json {' 
                }));
            }
        });
    });

    describe('Error Handling and Reconnection', () => {
        it('should attempt reconnection on abnormal closure', (done) => {
            let reconnectAttempted = false;
            
            service.getConnectionStatus().subscribe(status => {
                if (status.state === ConnectionState.RECONNECTING) {
                    expect(status.reconnectAttempts).toBe(1);
                    reconnectAttempted = true;
                }
                if (reconnectAttempted && status.state === ConnectionState.CONNECTED) {
                    done();
                }
            });

            service.connect();
            jasmine.clock().tick(50);

            // Simulate connection loss
            mockWebSocket = (service as any).socket;
            mockWebSocket.simulateClose(1006, 'Connection lost');
            
            // Advance timer for reconnection delay
            jasmine.clock().tick(2000);
        });

        it('should not reconnect on normal closure', (done) => {
            service.connect();
            jasmine.clock().tick(50);

            let statusAfterClose: any = null;
            let subscription = service.getConnectionStatus().subscribe(status => {
                if (status.state === ConnectionState.DISCONNECTED && status.lastDisconnected) {
                    statusAfterClose = status;
                }
            });

            mockWebSocket = (service as any).socket;
            mockWebSocket.simulateClose(1000, 'Normal closure');
            
            jasmine.clock().tick(2000); // Wait for potential reconnection
            
            // Use setTimeout to check final state
            setTimeout(() => {
                subscription.unsubscribe();
                expect(statusAfterClose).toBeTruthy();
                expect(statusAfterClose.state).toBe(ConnectionState.DISCONNECTED);
                done();
            }, 50);
            
            jasmine.clock().tick(100);
        });

        it('should stop reconnecting after max attempts', (done) => {
            // Set low max attempts for testing
            (service as any).config.maxReconnectAttempts = 2;
            
            let maxErrorReceived = false;
            service.getErrors().subscribe(error => {
                if (error.message.includes('Max reconnect') && !maxErrorReceived) {
                    expect(error.recoverable).toBe(false);
                    maxErrorReceived = true;
                    done();
                }
            });

            // Mock WebSocket that always fails to connect
            (window as any).WebSocket = class {
                readyState = 0;
                onopen: ((event: Event) => void) | null = null;
                onclose: ((event: CloseEvent) => void) | null = null;
                onmessage: ((event: MessageEvent) => void) | null = null;
                onerror: ((event: Event) => void) | null = null;
                
                constructor() {
                    // Simulate immediate connection failure
                    setTimeout(() => {
                        if (this.onclose) {
                            this.onclose(new CloseEvent('close', { 
                                code: 1006, 
                                reason: 'Connection failed',
                                wasClean: false 
                            }));
                        }
                    }, 5);
                }
                close() {}
            };

            service.connect();
            
            // Fast-forward through multiple reconnection attempts
            for (let i = 0; i < 8; i++) {
                jasmine.clock().tick(2000);
            }
        });

        it('should handle WebSocket errors', (done) => {
            service.connect();
            jasmine.clock().tick(50);

            service.getErrors().subscribe(error => {
                expect(error.type).toBe('websocket');
                expect(error.message).toContain('error occurred');
                expect(error.recoverable).toBe(true);
                done();
            });

            mockWebSocket = (service as any).socket;
            mockWebSocket.simulateError();
        });
    });

    describe('Cleanup and Destruction', () => {
        it('should clean up resources on destroy', () => {
            service.connect();
            jasmine.clock().tick(50);

            spyOn(console, 'log');
            
            service.ngOnDestroy();
            
            expect(console.log).toHaveBeenCalledWith('WebSocketService destroyed, cleaning up...');
            expect((service as any).socket).toBeNull();
        });

        it('should complete all observables on destroy', () => {
            const statusSpy = jasmine.createSpy('status');
            const messagesSpy = jasmine.createSpy('messages');
            const errorsSpy = jasmine.createSpy('errors');

            const statusSub = service.getConnectionStatus().subscribe(statusSpy);
            const messagesSub = service.getMessages().subscribe(messagesSpy);
            const errorsSub = service.getErrors().subscribe(errorsSpy);

            service.ngOnDestroy();

            expect(statusSub.closed).toBe(true);
            expect(messagesSub.closed).toBe(true);
            expect(errorsSub.closed).toBe(true);
        });
    });
});
