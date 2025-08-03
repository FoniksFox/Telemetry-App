import { Component, viewChild, input } from '@angular/core';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Type for sidebar functionality
export interface SidebarAction {
	id?: string;       // Optional unique identifier
	icon: string;
	label?: string;
	onClick: () => void;
	disabled?: boolean;
}

@Component({
	selector: 'app-sidebar',
	imports: [
		MatSidenavModule,
		MatListModule,
		MatIconModule,
		MatButtonModule
	],
	template: `
		<mat-sidenav-container class="sidebar-container">
			<mat-sidenav #sidenav class="sidebar" mode="side" [opened]="true">
				@for (action of actions(); track action.id || $index) {
					<button 
						mat-icon-button 
						class="sidebar-action"
						(click)="action.onClick()"
						[disabled]="action.disabled"
						[title]="action.label">
						<mat-icon>{{ action.icon }}</mat-icon>
					</button>
				}
			</mat-sidenav>
			<mat-sidenav-content class="main-content">
				<ng-content></ng-content>
			</mat-sidenav-content>
		</mat-sidenav-container>
	`,
	styles: `
		:host {
			display: block;
			height: 100%;
		}
		.sidebar-container {
			height: 100%;
			width: 100%;
		}
		.sidebar {
			max-width: 53px; /* Adjusted to avoid overflow, not the best solution but it works */
			background-color: var(--mat-sys-surface-container-high);
			border-right: 1px solid var(--mat-sys-outline);
			border-radius: 0;
			padding: 4px;
		}
		.sidebar-action {
			margin-bottom: var(--spacing-sm);
		}
		.main-content {
			flex-grow: 1;
		}
	`
})
export class Sidebar {
	actions = input<SidebarAction[]>([]);

	sidenav = viewChild(MatSidenav);
	
	toggle(): void {
		this.sidenav()?.toggle();
	}
}
