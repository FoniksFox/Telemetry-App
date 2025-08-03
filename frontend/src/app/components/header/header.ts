import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
	selector: 'app-header',
	imports: [
		RouterModule,
		MatToolbarModule,
		MatIconModule,
		MatButtonModule
	],
	template: `
		<mat-toolbar class="app-header">
			<button mat-icon-button>
				<mat-icon>menu</mat-icon>
			</button>
			<h1 class="header-title text-2xl">Telemetry Dashboard</h1>
			<span class="spacer"></span>
			<nav class="nav-links">
				<a mat-icon-button routerLink="/"><mat-icon>home</mat-icon></a>
				<a mat-icon-button routerLink="/dashboard"><mat-icon>dashboard</mat-icon></a>
				<a mat-icon-button routerLink="/settings"><mat-icon>settings</mat-icon></a>
			</nav>
		</mat-toolbar>
	`,
	styles: `
		:host {
			width: 100%;
		}
		.app-header {
			background-color: var(--mat-sys-surface-container-highest);
			color: var(--mat-sys-on-surface);
			border-bottom: 1px solid var(--mat-sys-outline);
		}
		.header-title {
			font-weight: 500;
			margin: 0 var(--spacing-md);
		}
		.spacer {
			flex: 1;
		}
		.nav-links {
			display: flex;
			gap: var(--spacing-sm);
			align-items: center;
		}
		.nav-links a {
			color: var(--mat-sys-on-surface);
		}
	`
})
export class Header {}