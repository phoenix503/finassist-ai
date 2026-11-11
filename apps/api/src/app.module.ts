import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ChatModule } from './chat/chat.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';

@Module({
  imports: [ChatModule, DocumentsModule, EmbeddingsModule],
})
export class AppModule {}
