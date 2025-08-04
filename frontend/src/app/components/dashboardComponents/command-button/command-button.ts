import { Component, input, output, signal, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConnectionService } from '../../../services/connection.service';

export interface CommandConfig {
    id?: string;
    label: string;
    command: string;
    parameters?: Record<string, any>;
    icon?: string;
    color?: 'primary' | 'accent' | 'warn';
    requireConfirmation?: boolean;
    confirmationMessage?: string;
    hideCommandDetails?: boolean;
}

@Component({
    selector: 'app-command-button',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    template: `
        <mat-card class="command-card" [class.sending]="isSending()" (click)="executeCommand()">
            <mat-card-content class="command-content">
                <div class="command-display">
                    <div class="command-header">
                        <mat-icon class="command-icon" [class]="'command-icon ' + (config().color || 'primary')">
                            {{ config().icon || 'radio_button_checked' }}
                        </mat-icon>
                        <span class="command-label">{{ config().label }}</span>
                    </div>
                    @if (!config().hideCommandDetails) {
                        <div class="command-details">
                            <code class="command-code">{{ config().command }}</code>
                            @if (hasParameters()) {
                                <code class="parameters-code">{{ getParametersString() }}</code>
                            }
                        </div>
                    }
                    @if (isSending()) {
                        <span class="sending-status">Sending...</span>
                    }
                </div>
                <div class="command-actions">
                    <button mat-icon-button class="action-button" 
                            matTooltip="Configure Command"
                            (click)="openConfig(); $event.stopPropagation()">
                        <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button class="action-button" 
                            matTooltip="Minimize"
                            (click)="minimizeCommand(); $event.stopPropagation()">
                        <mat-icon>minimize</mat-icon>
                    </button>
                    <button mat-icon-button class="action-button" 
                            matTooltip="Remove"
                            (click)="deleteCommand(); $event.stopPropagation()">
                        <mat-icon>delete</mat-icon>
                    </button>
                </div>
            </mat-card-content>
        </mat-card>
    `,
  styles: `
    .command-card {
		width: 100%;
		min-width: 200px;
		max-height: 150px;
		min-height: 100px;
		display: flex;
		flex-direction: column;
		border-radius: 0;
		background-color: var(--mat-sys-surface-container);
		padding: 0;
		cursor: pointer;
		transition: all 0.3s ease;
    }

    .command-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--mat-sys-elevation-2);
    }

    .command-card.sending {
		border-color: var(--mat-sys-primary);
		background-color: var(--mat-sys-primary-container);
    }
    
    .command-content {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 100%;
		flex: 1;
		padding: 0;
    }
    
    .command-display {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		height: 100%;
		justify-content: center;
		gap: var(--spacing-xs);
		flex: 1;
		padding: var(--spacing-md);
    }

    .command-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-xs);
    }
    
    .command-icon {
		font-size: 1.2rem;
		width: 1.2rem;
		height: 1.2rem;
    }
    
    .command-label {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--mat-sys-on-surface);
		line-height: 1.2;
    }

    .command-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
    }

    .command-code, .parameters-code {
		font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
		font-size: 0.75rem;
		line-height: 1.2;
		color: var(--mat-sys-on-surface-variant);
		background-color: transparent;
		word-break: break-all;
		margin: 0;
    }

    .command-code {
      	font-weight: 600;
    }

    .parameters-code {
		font-weight: 400;
		opacity: 0.8;
    }

    .sending-status {
		font-size: 0.875rem;
		color: var(--mat-sys-primary);
		font-style: italic;
		margin-top: var(--spacing-xs);
    }
    
    .command-actions {
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm);
    }

    /* Small icon buttons */
    .action-button {
		width: 24px !important;
		height: 24px !important;
		min-width: 24px !important;
		padding: 0 !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
    }
    
    .action-button .mat-mdc-button-touch-target {
		width: 24px !important;
		height: 24px !important;
    }
    
    .action-button mat-icon {
		font-size: 16px;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
    }
    
    /* Hover effects */
    .action-button:hover {
     	background-color: var(--mat-sys-surface-variant);
    }
    
    .command-card:hover .action-button {
      	opacity: 1;
    }
    
    .action-button {
		opacity: 0.7;
		transition: opacity var(--transition-normal);
	}

    /* Icon color variations */
    .command-icon.primary {
      	color: var(--mat-sys-primary);
    }

    .command-icon.accent {
      	color: var(--mat-sys-secondary);
    }

    .command-icon.warn {
      	color: var(--mat-sys-error);
    }
  `
})
export class CommandButton implements OnDestroy {
    // Input configuration for the command
    config = input.required<CommandConfig>();
    
    // Output events for parent component communication
    configChanged = output<CommandConfig>();
    minimizeRequest = output<void>();
    deleteRequest = output<void>();
    commandExecuted = output<{config: CommandConfig, success: boolean, response?: any}>();

    // Component state
    isSending = signal(false);

    constructor(
        private connectionService: ConnectionService,
        private snackBar: MatSnackBar
    ) {}

    ngOnDestroy(): void {
        // Cleanup if needed
    }

    hasParameters(): boolean {
        const params = this.config().parameters;
        return !!(params && Object.keys(params).length > 0);
    }

    getParametersString(): string {
        const params = this.config().parameters;
        if (!params) return '';
        
        return Object.entries(params)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ');
    }

    async executeCommand(): Promise<void> {
        if (this.isSending()) return;

        const config = this.config();
        
        // Show confirmation dialog if required
        if (config.requireConfirmation) {
            const message = config.confirmationMessage || `Are you sure you want to execute "${config.command}"?`;
            if (!confirm(message)) {
                return;
            }
        }

        this.isSending.set(true);

        try {
            // Send command via WebSocket using the connection service
            const success = this.connectionService.sendCommandMessage(
                config.command,
                config.parameters || {}
            );

            if (success) {
                // Show success message
                this.snackBar.open(
                    `Command "${config.label}" sent successfully`,
                    'Close',
                    { duration: 3000, panelClass: ['success-snackbar'] }
                );

                // Emit success event
                this.commandExecuted.emit({
                    config,
                    success: true,
                    response: { command: config.command, parameters: config.parameters }
                });
            } else {
                throw new Error('Failed to send command - WebSocket not connected');
            }

        } catch (error) {
            console.error('Error executing command:', error);
            
            // Show error message
            this.snackBar.open(
                `Failed to execute command "${config.label}"`,
                'Close',
                { duration: 5000, panelClass: ['error-snackbar'] }
            );

            // Emit failure event
            this.commandExecuted.emit({
                config,
                success: false,
                response: error
            });
        } finally {
            // Reset sending state after a short delay
            setTimeout(() => {
                this.isSending.set(false);
            }, 250);
        }
    }

    openConfig(): void {
        console.log('Opening config for command:', this.config().label);
        // TODO: Open configuration dialog
        // This will be similar to the display component's config dialog
    }

    minimizeCommand(): void {
        console.log('Minimizing command:', this.config().label);
        this.minimizeRequest.emit();
    }

    deleteCommand(): void {
        console.log('Deleting command:', this.config().label);
        this.deleteRequest.emit();
    }
}