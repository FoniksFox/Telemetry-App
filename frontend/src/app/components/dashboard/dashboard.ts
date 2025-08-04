import { Component, signal } from '@angular/core';
import { Display, DisplayConfig } from '../dashboardComponents/display/display';
import { CommandButton, CommandConfig } from '../dashboardComponents/command-button/command-button';

@Component({
	selector: 'app-dashboard',
	imports: [Display, CommandButton],
	template: `
	<div class="dashboard-grid">
		<app-display 
			class="dashboard-item" 
			[config]="temperatureDisplay()">
		</app-display>
		<app-display 
			class="dashboard-item" 
			[config]="pressureDisplay()">
		</app-display>
		<app-display 
			class="dashboard-item" 
			[config]="humidityDisplay()">
		</app-display>
		<app-command-button 
			class="dashboard-item" 
			[config]="commandButtonConfig()">
		</app-command-button>
		<app-command-button 
			class="dashboard-item" 
			[config]="commandButtonConfig2()">
		</app-command-button>
		@for (i of [6,7,8,9]; track i) {
			<div class="dashboard-item">
				Example Dashboard Component {{ i }}
			</div>
		}
	</div>
	`,
	styles: `
		.dashboard-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: repeat(3, 1fr);
			gap: 0.5rem;
			height: 100%;
			padding: 1rem;
		}
		
		.dashboard-item {
			background-color: var(--mat-sys-surface-container-low);
			border-radius: 8px;
			padding: 16px;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--mat-sys-on-surface);
		}
	`
})
export class Dashboard {
	// Example display configurations - these would typically come from user settings
	temperatureDisplay = signal<DisplayConfig>({
		telemetryKey: 'temperature',
		label: 'Temperature',
		dataType: 'float',
		unit: '°C',
		precision: 2,
		alertThreshold: { min: 0, max: 50 }
	});
	
	pressureDisplay = signal<DisplayConfig>({
		telemetryKey: 'pressure',
		label: 'Pressure',
		dataType: 'float',
		unit: 'hPa',
		precision: 0
	});
	
	humidityDisplay = signal<DisplayConfig>({
		telemetryKey: 'humidity',
		label: 'Humidity',
		dataType: 'float',
		unit: '%',
		precision: 1,
		alertThreshold: { min: 30, max: 70 }
	});

	commandButtonConfig = signal<CommandConfig>({
		command: 'reset_sensors',
		parameters: {},
		label: 'Reset Sensors',
		icon: 'refresh',
		color: 'primary',
		requireConfirmation: true,
		confirmationMessage: 'Are you sure you want to reset all sensors to their default values?'
	});

	commandButtonConfig2 = signal<CommandConfig>({
		command: 'set_update_interval',
		parameters: {
		interval: 1.0
	},
	label: 'Fast Updates',
	icon: 'speed',
	color: 'accent',
	hideCommandDetails: true
});
}