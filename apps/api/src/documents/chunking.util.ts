export function splitIntoChunks(
  text: string,
  chunkSize = 1000,
  overlap = 150,
): string[] {
  if (chunkSize <= 0 || overlap < 0 || overlap >= chunkSize) {
    throw new Error('Invalid chunk size or overlap');
  }

  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    const chunk = text.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
}
