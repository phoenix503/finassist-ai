import { Body, Controller, Post, Res } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { ChatService } from './chat.service.js';

import type {Response} from 'express';


@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post()
  async sendMessage(@Body() body: ChatRequestDto) {
    return this.chatService.sendMessage(body.message);
  }

  @Post('stream')
  async streamMessage(
    @Body() body: ChatRequestDto,
    @Res() response: Response,
  ) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    try {
      for await (const chunk of this.chatService.streamMessage(body.history ?? [{role: 'user' , content: body.message}])) {
        response.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      response.write('data: [DONE]\n\n');
    } catch (error) {
      console.error('Gemini streaming error:', error);

      response.write(
        `data: ${JSON.stringify({ error: 'Unable to generate response' })}\n\n`,
      );
    } finally {
      response.end();
    }
  }

}
