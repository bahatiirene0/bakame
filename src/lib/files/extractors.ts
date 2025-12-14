/**
 * Document Text Extraction (Server-only)
 *
 * Extracts text content from various document formats:
 * - PDF: using pdfjs-dist (official PDF.js)
 * - DOCX: using mammoth
 * - XLSX: using xlsx
 *
 * NOTE: This file uses Node.js APIs and should only be imported
 * in server-side code (API routes, server components).
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Maximum characters to extract (to prevent token overflow)
const MAX_EXTRACTED_CHARS = 50000;

/**
 * Extract text from a PDF file using pdf2json (Next.js compatible)
 * Based on: https://github.com/tuffstuff9/nextjs-pdf-parser
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Dynamic import pdf2json
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFParser = require('pdf2json');

      // Create parser instance - the (null, 1) args bypass TypeScript issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParser = new (PDFParser as any)(null, 1);

      pdfParser.on('pdfParser_dataError', (errData: { parserError: Error }) => {
        console.error('PDF parsing error:', errData.parserError);
        reject(new Error('Failed to extract text from PDF'));
      });

      pdfParser.on('pdfParser_dataReady', () => {
        try {
          // getRawTextContent() returns the extracted text
          const text = pdfParser.getRawTextContent();
          resolve(truncateText(text, MAX_EXTRACTED_CHARS));
        } catch (err) {
          console.error('PDF text extraction error:', err);
          reject(new Error('Failed to extract text from PDF'));
        }
      });

      // Parse the buffer
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('PDF extraction error:', error);
      reject(new Error('Failed to extract text from PDF'));
    }
  });
}

/**
 * Extract text from a Word document (DOCX)
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return truncateText(result.value, MAX_EXTRACTED_CHARS);
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extract text from an Excel spreadsheet (XLSX)
 * Converts each sheet to a readable text format
 */
export async function extractXlsxText(buffer: Buffer): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const textParts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Convert to CSV for readable text format
      const csv = XLSX.utils.sheet_to_csv(sheet);

      // Also get JSON for structured data
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

      // Format as readable text
      textParts.push(`\n--- Sheet: ${sheetName} ---\n`);

      // Add headers if they exist
      if (json.length > 0) {
        const headers = json[0] as string[];
        textParts.push(`Columns: ${headers.join(', ')}\n`);
        textParts.push(`Rows: ${json.length - 1}\n`);
      }

      // Add CSV data
      textParts.push(csv);
    }

    return truncateText(textParts.join('\n'), MAX_EXTRACTED_CHARS);
  } catch (error) {
    console.error('XLSX extraction error:', error);
    throw new Error('Failed to extract text from Excel file');
  }
}

/**
 * Main extraction router - extracts text based on MIME type
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPdfText(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocxText(buffer);

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return extractXlsxText(buffer);

    default:
      throw new Error(`Unsupported document type: ${mimeType}`);
  }
}

/**
 * Truncate text to max length with notice
 */
function truncateText(text: string, maxLength: number): string {
  // Clean up whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate and add notice
  const truncated = cleaned.slice(0, maxLength);
  return `${truncated}\n\n[Document truncated - showing first ${maxLength} characters]`;
}
