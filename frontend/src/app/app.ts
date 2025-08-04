import { Component, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Sidebar, SidebarAction } from './components/sidebar/sidebar';

import { ConnectionService } from './services/connection.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Header, Sidebar],
    template: `
        <main class="flex-between flex-column">
            <app-header [onToggleSidebar]="toggleSidebar" [title]="title()"></app-header>
            <app-sidebar #sidebar class="content" [actions]="sidebarActions">
                <router-outlet></router-outlet>
            </app-sidebar>
        </main>
    `,
    styles: `
        main {
            width: 100vw;
            height: 100vh;
        }
        .content {
            flex-grow: 1;
            width: 100%;
        }
    `
})
export class App {
    protected readonly title = signal('Telemetry Dashboard');
    
    // Define sidebar actions for testing, should be replaced with actual actions
    sidebarActions: SidebarAction[] = [
        { id: 'add', icon: 'add', label: 'Add', onClick: () => console.log('Add clicked') },
        { id: 'settings', icon: 'settings', label: 'Settings', onClick: () => console.log('Settings clicked') },
        { id: 'about', icon: 'info', label: 'About', onClick: () => console.log('About clicked') }
    ];
    
    // Get reference to the sidebar component
    sidebar = viewChild(Sidebar);
    
    // Create the toggle function that will be passed to header
    toggleSidebar = (): void => {
        this.sidebar()?.toggle();
    }

    // Make the connection service available for console commands
    constructor(private connectionService: ConnectionService) {
        // Initialize connection service or any other setup if needed
        this.connectionService.connect();
        
        // Make connection service available globally for console debugging
        if (typeof window !== 'undefined') {
            (window as any).connectionService = this.connectionService;
            console.log('🔧 ConnectionService available globally as window.connectionService');
            console.log('📡 Available methods: connect(), disconnect(), sendMessage(), getTelemetryTypes()');
            console.log('📊 Example: connectionService.getTelemetryTypes().subscribe(console.log)');
        }
    }
    

}
