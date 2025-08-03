import { Component } from '@angular/core';

@Component({
	selector: 'app-dashboard',
	imports: [],
	template: `
	<div class="dashboard-grid">
		@for (i of [1,2,3,4,5,6,7,8,9]; track i) {
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
			background-color: var(--mat-sys-surface-container);
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

}
