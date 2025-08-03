import { Component, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Sidebar, SidebarAction } from './components/sidebar/sidebar';

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
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', onClick: () => console.log('Dashboard clicked') },
        { id: 'settings', icon: 'settings', label: 'Settings', onClick: () => console.log('Settings clicked') },
        { id: 'about', icon: 'info', label: 'About', onClick: () => console.log('About clicked') }
    ];
    
    // Get reference to the sidebar component
    sidebar = viewChild(Sidebar);
    
    // Create the toggle function that will be passed to header
    toggleSidebar = (): void => {
        this.sidebar()?.toggle();
    }
}
