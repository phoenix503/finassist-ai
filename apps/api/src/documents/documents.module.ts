import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { ApiTokenGuard } from '../security/api-token.guard.js';

@Module({
  controllers: [DocumentsController],
  imports:[DatabaseModule,EmbeddingsModule],
  providers: [DocumentsService, ApiTokenGuard]
})
export class DocumentsModule {}
