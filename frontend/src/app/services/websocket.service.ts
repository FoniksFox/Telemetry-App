/**
 * WebSocket service for real-time communication with the backend.
 */

import { Injectable, NgZone } from '@angular/core';
import { environment } from '../../environments/environment';
import {
    WebSocketConfig,
    ConnectionStatus,
    ConnectionState,
    ConnectionError
} from '../models/connection.interface';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
    private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
        state: ConnectionState.DISCONNECTED,
        reconnectAttempts: 0
    });

    private socket: WebSocket | null = null;
    private config: WebSocketConfig = {
        url: environment.websocketUrl,
        ...environment.websocket
    };
    private messages$ = new Subject<string>();
    private errors$ = new Subject<ConnectionError>();
    private destroy$ = new Subject<void>();
    private connectionTimeout: any;

    constructor(private ngZone: NgZone) {
        console.log('WebSocketService initialized with config:', this.config);
    }

    /**
     * Get the current connection status as an Observable.
     */
    getConnectionStatus(): Observable<ConnectionStatus> {
        return this.connectionStatus$.asObservable();
    }

    /**
     * Get incoming messages as an Observable.
     * Returns raw string messages that need to be parsed by the calling service.
     */
    getMessages(): Observable<string> {
        return this.messages$.asObservable();
    }

    /**
     * Get connection errors as an Observable.
     */
    getErrors(): Observable<ConnectionError> {
        return this.errors$.asObservable();
    }

    /**
     * Update the connection status and emit the new status.
     */
    private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
        this.connectionStatus$.next({
            ...this.connectionStatus$.value,
            ...updates
        });
        console.log('Connection status updated:', this.connectionStatus$.value);
    }

    /**
     * Handle connection errors and emit an error event.
     */
    private handleConnectionError(error: ConnectionError): void {
        console.error('Connection error:', error.message, error);

        this.errors$.next(error);

        this.updateConnectionStatus({
            state: ConnectionState.ERROR,
            errorMessage: error.message,
        });

        if (error.recoverable) {
            switch (error.type) {
                case 'connection':
                    console.log('Network connection error, waiting for onclose to reconnect');
                    break;
                case 'websocket':
                    console.log('WebSocket error, closing socket and attempting to reconnect');
                    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
                        this.socket.close(1006, 'WebSocket error occurred');
                    }
                    break;
                case 'timeout':
                    console.log('Timeout error, attempting to reconnect');
                    this.attemptReconnect();
                    break;
                case 'validation':
                    console.log('Validation error');
                    break;
                case 'unknown':
                    console.log('Unknown recoverable error, letting normal flow handle it');
                    break;
            }
        } else {
            console.log('Non-recoverable error occurred, stopping connection attempts and cleaning up');
            this.disconnect();
        }
    }

    /**
     * Connect to the WebSocket server.
     */
    connect(): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.warn('WebSocket is already connected.');
            return;
        }

        this.updateConnectionStatus({
            state: ConnectionState.CONNECTING,
            reconnectAttempts: this.connectionStatus$.value.reconnectAttempts
        });

        try {
            this.socket = new WebSocket(this.config.url);
            this.setUpEventHandlers();

            this.connectionTimeout = setTimeout(() => {
                if (this.socket?.readyState === WebSocket.CONNECTING) {
                    console.warn('WebSocket connection timed out, closing socket');
                    const timeoutError: ConnectionError = {
                        type: 'timeout',
                        message: 'WebSocket connection timed out',
                        timestamp: new Date(),
                        recoverable: true,
                        details: {
                            readyState: this.socket?.readyState,
                            timeout: this.config.timeout || 5000
                        }
                    };
                    this.socket.close(1000, 'Connection timeout');
                    this.handleConnectionError(timeoutError);
                }
            }, this.config.timeout || 5000); // Default timeout of 5 seconds if not specified

        } catch (error) {
            const connectionError: ConnectionError = {
                type: 'connection',
                message: 'Failed to create WebSocket connection',
                timestamp: new Date(),
                details: error,
                recoverable: true
            };
            this.handleConnectionError(connectionError);

            // Reset socket and attempt to reconnect
            this.socket = null;
            this.attemptReconnect();
        }
    }

    /**
     * Close the WebSocket connection.
     */
    disconnect(): void {
        console.log('Closing WebSocket connection...');

        this.destroy$.next();

        if (this.socket) {
            this.socket.close(1000, 'Client initiated disconnect');
            this.socket = null;
            this.updateConnectionStatus({
                state: ConnectionState.DISCONNECTED,
                lastDisconnected: new Date(),
                reconnectAttempts: 0
            });
        } else {
            console.warn('No WebSocket connection to close.');
        }

        this.destroy$ = new Subject<void>(); // Reset destroy subject for future connections
    }

    /**
     * Attempt to reconnect to the WebSocket server.
     */
    private attemptReconnect(): void {
        const currentStatus = this.connectionStatus$.value;
        if (currentStatus.reconnectAttempts >= this.config.maxReconnectAttempts) {
            const error: ConnectionError = {
                type: 'websocket',
                message: 'Max reconnect attempts reached',
                timestamp: new Date(),
                recoverable: false
            };
            this.handleConnectionError(error);
            return;
        }

        const reconnectAttempts = currentStatus.reconnectAttempts + 1;
        const delay = this.config.reconnectInterval * Math.pow(2, reconnectAttempts - 1); // Exponential backoff

        console.log(`Attempting to reconnect in ${delay}ms (Attempt ${reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
        this.updateConnectionStatus({
            state: ConnectionState.RECONNECTING,
            reconnectAttempts
        });

        timer(delay)
            .pipe(
                takeUntil(this.destroy$)
            )
            .subscribe(() => 
                this.connect()
            );
    }

    /**
     * Send a message through the WebSocket.
     * Accepts any object that can be JSON stringified.
     */
    sendMessage(message: any): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            const error: ConnectionError = {
                type: 'websocket',
                message: 'WebSocket is not open, cannot send message',
                timestamp: new Date(),
                details: { socket: this.socket, readyState: this.socket?.readyState },
                recoverable: true
            };
            this.handleConnectionError(error);
            return;
        }

        try {
            const messageString = JSON.stringify(message);
            console.log('Sending message:', messageString);
            this.socket.send(messageString);
        } catch (error) {
            const connectionError: ConnectionError = {
                type: 'websocket',
                message: 'Failed to send message',
                timestamp: new Date(),
                details: error,
                recoverable: true
            };
            this.handleConnectionError(connectionError);
        }
    }

    /**
     * Set up WebSocket event handlers.
     */
    private setUpEventHandlers(): void {
        if (!this.socket) return;

        this.socket.onopen = (event) => {
            console.log('WebSocket connection opened:', event);
            // Clear connection timeout if set
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            this.ngZone.run(() => {
                this.updateConnectionStatus({
                    state: ConnectionState.CONNECTED,
                    lastConnected: new Date(),
                    reconnectAttempts: 0
                });
            });
        };

        this.socket.onclose = (event) => {
            console.log(`WebSocket closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`);
            // Clear connection timeout if set
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            this.ngZone.run(() => {
                this.updateConnectionStatus({
                    state: ConnectionState.DISCONNECTED,
                    lastDisconnected: new Date(),
                });

                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000) { // 1000 is normal closure
                    this.attemptReconnect();
                }
            });
        };

        this.socket.onmessage = (event) => {
            // Just pass the raw data string - let the calling service handle parsing and validation
            console.log('Received raw message:', event.data);
            this.ngZone.run(() => {
                this.messages$.next(event.data);
            });
        };

        this.socket.onerror = (event) => {
            const error: ConnectionError = {
                type: 'websocket',
                message: 'WebSocket error occurred',
                timestamp: new Date(),
                details: event,
                recoverable: true
            };
            this.ngZone.run(() => {
                this.handleConnectionError(error);
            });
        };
    }

    ngOnDestroy(): void {
        console.log('WebSocketService destroyed, cleaning up...');
        this.disconnect();
        this.destroy$.complete();
        this.connectionStatus$.complete();
        this.messages$.complete();
        this.errors$.complete();
    }
}