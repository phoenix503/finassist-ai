import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../chat/chat.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  private readonly chatService = inject(ChatService);

  userInput = '';
  messages: ChatMessage[] = [];
  isLoading = false;
  errorMessage = '';

  async sendMessage(): Promise<void> {
    const message = this.userInput.trim();

    if (!message || this.isLoading) {
      return;
    }

    this.messages.push({
      role: 'user',
      content: message,
    });

    // Create an empty assistant message.
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
    };

    this.messages.push(assistantMessage);

    this.userInput = '';
    this.isLoading = true;
    this.errorMessage = '';

    const history = this.messages.filter(
      item => item.content.trim().length > 0)
      .map(item => ({
        role: item.role,
        content: item.content,
      }))

    try {
      await this.chatService.streamMessage(message, history, (chunk) => {
        assistantMessage.content += chunk;
      });
    } catch (error) {
      console.error('Streaming error:', error);

      this.messages.pop();

      this.errorMessage =
        'Unable to get a response. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }


}

