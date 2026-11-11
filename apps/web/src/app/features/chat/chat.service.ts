import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  answer: string;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant',
  content: string;
 }

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3000/api/chat';

  sendMessage(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, { message });
  }

  async streamMessage(
    message: string,
    history: ChatHistoryMessage[],
    onChunk: (text: string) => void,
  ): Promise<void> {
    const response = await fetch(
      'http://localhost:3000/api/chat/stream',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, history }),
      },
    );

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Streaming response is not available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');

      buffer = events.pop() ?? '';

      for (const event of events) {
        const dataLine = event
          .split('\n')
          .find(line => line.startsWith('data:'));

        if (!dataLine) continue;

        const data = dataLine.slice(5).trim();

        if (data === '[DONE]') return;

        const payload = JSON.parse(data);

        if (payload.error) {
          throw new Error(payload.error);
        }

        if (payload.text) {
          onChunk(payload.text);
        }
      }
    }

    // Process any remaining event after the stream closes.
    const finalDataLine = buffer
      .split('\n')
      .find(line => line.startsWith('data:'));

    if (finalDataLine) {
      const data = finalDataLine.slice(5).trim();

      if (data !== '[DONE]') {
        const payload = JSON.parse(data);

        if (payload.error) throw new Error(payload.error);
        if (payload.text) onChunk(payload.text);
      }
    }
  }


}
