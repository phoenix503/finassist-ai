import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { PDFParse } from 'pdf-parse';
import { DatabaseService } from '../database/database.service.js';
import { splitIntoChunks } from './chunking.util.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly embeddingService: EmbeddingsService
  ) { }

  async extractText(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    // Do not trust the multipart Content-Type header alone.
    if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('Uploaded file is not a valid PDF');
    }

    const parser = new PDFParse({
      data: file.buffer,
    });

    try {
      const result = await parser.getText();
      const extractedText = result.text.trim();

      if (!extractedText) {
        throw new BadRequestException(
          'No readable text found in PDF.',
        );
      }

      // Step 1: Split document into chunks
      const chunks = splitIntoChunks(extractedText);

      // Step 2: Get PostgreSQL client
      const client = await this.databaseService.getClient();

      try {
        await client.query('BEGIN');

        // Step 3: Save original document
        const documentResult = await client.query(
          `INSERT INTO documents (filename)
           VALUES ($1)
           RETURNING id`,
          [file.originalname],
        );

        const documentId = documentResult.rows[0].id;

        // Step 4: Save individual chunks
        for (let i = 0; i < chunks.length; i++) {
          await client.query(
            `INSERT INTO document_chunks
             (document_id, chunk_index, content)
             VALUES ($1, $2, $3)`,
            [documentId, i, chunks[i]],
          );
        }

        await client.query('COMMIT');

        return {
          message: 'Document uploaded and chunks saved successfully',
          documentId,
          filename: file.originalname,
          totalPages: result.total,
          totalChunks: chunks.length,
          totalCharacters: extractedText.length,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } finally {
      await parser.destroy();
    }
  }

  async testEmbedding() {
    const vector = await this.embeddingService.generateEmbedding(
      'A savings account requires a minimum balance.',
    );

    return {
      dimensions: vector.length,
      preview: vector.slice(0, 5),
    };
  }

  async generateDocumentEmbeddings(documentId: string) {
    // 1. Check whether document exists
    const document = await this.databaseService.query(
      `SELECT id FROM documents WHERE id = $1`,
      [documentId],
    );

    if (document.rows.length === 0) {
      throw new Error('Document not found');
    }

    // 2. Fetch chunks without embeddings
    const chunks = await this.databaseService.query(
      `SELECT id, content
     FROM document_chunks
     WHERE document_id = $1
     AND embedding IS NULL
     ORDER BY chunk_index`,
      [documentId],
    );

    let processed = 0;

    // 3. Generate and save embeddings
    for (const chunk of chunks.rows) {
      const vector =
        await this.embeddingService.generateEmbedding(chunk.content);

      // 4. Validate vector dimensions
      if (vector.length !== 768) {
        throw new Error(
          `Expected 768 dimensions, received ${vector.length}`,
        );
      }

      // 5. Save vector in PostgreSQL
      const vectorString = `[${vector.join(',')}]`;

      await this.databaseService.query(
        `UPDATE document_chunks
       SET embedding = $1::vector
       WHERE id = $2`,
        [vectorString, chunk.id],
      );

      processed++;
    }

    return {
      message: 'Document embeddings generated successfully',
      documentId,
      totalChunks: chunks.rows.length,
      processedChunks: processed,
    };
  }

  async searchDocuments(query: string) {
    if (!query?.trim()) {
      throw new BadRequestException('Search query is required');
    }

    // 1. Generate embedding for user's question
    const queryVector =
      await this.embeddingService.generateEmbedding(query.trim());

    // 2. Validate embedding dimensions
    if (queryVector.length !== 768) {
      throw new Error('Invalid embedding dimensions');
    }

    const vectorString = `[${queryVector.join(',')}]`;

    // 3. Find the five closest document chunks
    const result = await this.databaseService.query(
      `SELECT
       dc.id,
       dc.document_id,
       d.filename,
       dc.chunk_index,
       dc.content,
       dc.embedding <=> $1::vector AS distance
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     WHERE dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $2`,
      [vectorString, 5],
    );

    // 4. Return relevant results
    return {
      query,
      totalResults: result.rows.length,
      results: result.rows.map((row) => ({
        documentId: row.document_id,
        filename: row.filename,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: Number(
          (1 - Number(row.distance)).toFixed(4),
        ),
      })),
    };
  }


}

