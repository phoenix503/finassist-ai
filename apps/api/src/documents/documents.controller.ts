import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service.js';
import type { Multer } from 'multer'
import { SearchDocumentsDto } from './dto/search-documents.dto.js';
import { ApiTokenGuard } from '../security/api-token.guard.js';
@Controller('api/documents')
@UseGuards(ApiTokenGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.extractText(file);
  }


  @Get('test-embedding')
  testEmbedding() {
    return this.documentsService.testEmbedding();
  }


  @Post(':documentId/embed')
  generateEmbeddings(
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.generateDocumentEmbeddings(
      documentId,
    );
  }

  @Post('search')
  searchDocuments(
    @Body() body: SearchDocumentsDto,
  ) {
    return this.documentsService.searchDocuments(body.query);
  }



}

