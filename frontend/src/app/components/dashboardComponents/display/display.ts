import { Component, OnInit, OnDestroy, input, signal, computed, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionService } from '../../../services/connection.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TelemetryMessage } from '../../../models/telemetry.interface';

@Component({
	selector: 'app-display',
	imports: [MatCardModule, MatIconModule, MatButtonModule],
	template: `
	<mat-card class="display-card">
		<mat-card-content class="display-content">
			<div class="display-value">
				<span class="value">{{ displayValue() }}</span>
				<span class="unit">{{ config().unit || '' }}</span>
				<span class="label">{{ config().label || 'No Data' }}</span>
			</div>
			<div class="display-actions">
				<button mat-icon-button class="action-button" (click)="openEditDialog()">
					<mat-icon>edit</mat-icon>
				</button>
				<button mat-icon-button class="action-button" (click)="minimizeDisplay()">
					<mat-icon>minimize</mat-icon>
				</button>
				<button mat-icon-button class="action-button" (click)="deleteDisplay()">
					<mat-icon>delete</mat-icon>
				</button>
			</div>
		</mat-card-content>
	</mat-card>
	`,
	styles: `
        .display-card {
            width: 100%;
			min-width: 200px;
            max-height: 150px;
			min-height: 100px;
			display: flex;
			flex-direction: column;
			border-radius: 0;
			background-color: var(--mat-sys-surface-container);
			padding: 0;
        }
        
        .display-content {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            height: 100%;
            flex: 1;
            padding: 0;
        }
        
        .display-value {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            height: 100%;
            justify-content: space-between;
        }
        
        .value {
            font-size: 2rem;
            font-weight: 600;
            color: var(--mat-sys-primary);
            line-height: 1;
        }
        
        .unit {
            font-size: 1rem;
            color: var(--mat-sys-on-surface-variant);
            margin-top: 0.25rem;
        }
        
        .label {
            font-size: 0.875rem;
            color: var(--mat-sys-on-surface-variant);
            margin-top: 0.25rem;
        }
        
        .display-actions {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            gap: var(--spacing-xs);
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
        
        .display-card:hover .action-button {
            opacity: 1;
        }
        
        .action-button {
            opacity: 0.7;
            transition: opacity var(--transition-normal);
        }
    `
})
export class Display implements OnInit, OnDestroy {
	// Configuration input - can be passed from parent dashboard
	config = input<DisplayConfig>({ 
		telemetryKey: '', 
		label: 'No Data',
	});
	
	// Output events for parent dashboard
	configChanged = output<DisplayConfig>();
	minimizeRequest = output<void>();
	deleteRequest = output<void>();
	
	// Current telemetry value
	private currentValue = signal<string | null>(null);
	
	// WebSocket subscription
	private telemetrySubscription?: Subscription;
	
	// Computed display value with formatting
	displayValue = computed(() => {
		const value = this.currentValue();
		if (value === null) return '--';
		if (this.config().dataType === 'float' && this.config().precision !== undefined) {
			if (this.config().precision === 0) {
				return Number(value).toFixed(0);
			} else {
				return Number(value).toFixed(this.config().precision);
			}
		}
		return value;
	});
	
	constructor(
		private connectionService: ConnectionService,
		private dialog: MatDialog
	) {}
	
	ngOnInit(): void {
		this.subscribeToTelemetry();
	}
	
	ngOnDestroy(): void {
		this.telemetrySubscription?.unsubscribe();
	}
	
	private subscribeToTelemetry(): void {
		const telemetryKey = this.config().telemetryKey;
		if (!telemetryKey) return;
		
		// Subscribe to telemetry messages and filter for specific sensor
		this.telemetrySubscription = this.connectionService
			.getTelemetryMessages()
			.pipe(
				filter((message: TelemetryMessage) => message.id === telemetryKey)
			)
			.subscribe({
				next: (message: TelemetryMessage) => {
					const value = message.value as string;
					this.currentValue.set(value);
				},
				error: (error: any) => {
					console.error(`Error receiving telemetry for ${telemetryKey}:`, error);
					this.currentValue.set(null);
				}
			});
	}
	
	openEditDialog(): void {
		// TODO: Open dialog to edit display configuration
		console.log('Opening edit dialog for:', this.config());

		// Future implementation of config dialog
		// const dialogRef = this.dialog.open(ConfigDialog, {
		// 	data: this.config(),
		// 	width: '500px'
		// });
		
		// dialogRef.afterClosed().subscribe(result => {
		// 	if (result) {
		// 		this.updateConfig(result);
		// 	}
		// });
	}
	
	minimizeDisplay(): void {
		console.log('Minimizing display:', this.config().label);
		this.minimizeRequest.emit();
	}
	
	deleteDisplay(): void {
		console.log('Deleting display:', this.config().label);
		this.deleteRequest.emit();
	}
	
	private updateConfig(newConfig: DisplayConfig): void {
		// Emit the new configuration to parent
		this.configChanged.emit(newConfig);
		
		// Unsubscribe from old telemetry
		this.telemetrySubscription?.unsubscribe();
		
		// Resubscribe with new config
		this.subscribeToTelemetry();
	}
}

// Configuration interface for the display component, should make a separate file later with all configuration interfaces
export interface DisplayConfig {
	telemetryKey: string;    // Which telemetry data to display
	label: string;          // Display label
	dataType?: string; // Optional: type of data (e.g., 'number', 'string', etc.), take from config
	unit?: string;          // Unit of measurement (°C, mph, etc.)
	precision?: number;     // Decimal places to show
	min?: number;          // Optional: minimum expected value
	max?: number;          // Optional: maximum expected value
	alertThreshold?: {     // Optional: alert configuration
		min?: number;
		max?: number;
	};
}