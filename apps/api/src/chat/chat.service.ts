import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { env } from 'process';
import { ChatHistoryMessageDto } from './dto/chat-request.dto.js';

@Injectable()
export class ChatService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = env.GEMINI_MODEL || '';

    if (!this.model) {
      throw new Error('GEMINI_MODEL is missing');
    }
  }

  async sendMessage(message: string) {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: message,
      config: {
        temperature: 0.2,
        systemInstruction: `
          You are FinAssist AI, a banking assistance copilot.

          Help users understand general banking concepts.
          Never invent account balances or transaction details.
          Never ask users for passwords, PINs or OTPs.
          Never claim that you have executed a financial transaction.
          If customer-specific information is required,
          explain that securely authenticated access is needed.
        `,
      },
    });

    return {
      answer: response.text ?? '',
    };
  }

  async *streamMessage(
    history: ChatHistoryMessageDto[],
  ): AsyncGenerator<string> {
    const contents = history.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    }));

    const stream = await this.ai.models.generateContentStream({
      model: this.model,
      contents,
      config: {
        temperature: 0.2,
        systemInstruction: `
        You are FinAssist AI, a banking assistance copilot.

        Use the conversation history to understand follow-up questions.
        Explain banking concepts clearly.
        Never invent customer account information.
        Never ask for passwords, PINs or OTPs.
        Never claim to execute financial transactions.
      `,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }




}

