import fs from 'fs';
import path from 'path';
import { FileProcessorService } from './fileProcessor';

const fileProcessor = new FileProcessorService();

/**
 * Extracts text from a file (either from disk path or buffer)
 * 
 * @param filePathOrBuffer - Either a file path string or Buffer
 * @param originalName - Original filename (sanitized automatically)
 * @returns Extracted text content
 */
export async function extractTextFromFile(
  filePathOrBuffer: string | Buffer,
  originalName: string
): Promise<string> {
  // Sanitize filename to prevent path traversal
  const sanitizedName = path.basename(originalName);

  // If it's a path (string), use directly
  if (typeof filePathOrBuffer === 'string') {
    const result = await fileProcessor.processFile(filePathOrBuffer, sanitizedName);
    return result.text;
  }

  // If it's a buffer, save temporarily
  const tempDir = path.join(process.cwd(), 'uploads', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFileName = `temp_${Date.now()}_${sanitizedName}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  try {
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, filePathOrBuffer);

    // Process file using existing file processor
    const result = await fileProcessor.processFile(tempFilePath, sanitizedName);

    return result.text;
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
