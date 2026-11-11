import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from './features/chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'web';
}
