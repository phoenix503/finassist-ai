import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class EmbeddingsService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;
  private readonly dimensions: number;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.model = process.env.GEMINI_EMBEDDING_MODEL!;
    this.dimensions = Number(
      process.env.GEMINI_EMBEDDING_DIMENSIONS || 768,
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: text,
      config: {
        outputDimensionality: this.dimensions,
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding?.length) {
      throw new Error('Gemini returned an empty embedding');
    }

    return embedding;
  }
}

