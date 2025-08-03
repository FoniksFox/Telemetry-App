import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Header, Sidebar],
    template: `
        <main class="flex-between flex-column">
            <app-header></app-header>
            <div class="content flex-between flex-row">
                <app-sidebar></app-sidebar>
                <router-outlet></router-outlet>
            </div>
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
    protected readonly title = signal('frontend');
}
