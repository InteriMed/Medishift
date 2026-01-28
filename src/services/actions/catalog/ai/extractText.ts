import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";

const documentTypeEnum = ['identity', 'permit', 'invoice', 'generic'] as const;
const languageEnum = ['en', 'de', 'fr', 'it'] as const;

const ExtractTextSchema = z.object({
  imageUrl: z.string().url("Must be a valid image URL"),
  documentType: z.enum(documentTypeEnum).optional(),
  language: z.enum(languageEnum).optional(),
});

interface ExtractedText {
  text: string;
  confidence: number;
  structuredData?: Record<string, any>;
  language?: string;
}

/**
 * Extract text from document image using OCR
 * Supports identity documents, permits, invoices, and generic documents
 */
export const extractTextAction: ActionDefinition<typeof ExtractTextSchema, ExtractedText> = {
  id: "ai.ocr.extract_text",
  fileLocation: "src/services/actions/catalog/ai/extractText.ts",
  requiredPermission: "admin.access",
  label: "Extract Text (OCR)",
  description: "Extract text from document images using OCR",
  keywords: ["ocr", "extract", "text", "document"],
  icon: "FileText",
  schema: ExtractTextSchema,
  metadata: {
    riskLevel: "LOW",
  },

  handler: async (input: z.infer<typeof ExtractTextSchema>, ctx: ActionContext): Promise<ExtractedText> => {
    const { imageUrl, documentType = 'generic', language = 'en' } = input;

    try {
      // TODO: Integrate with actual OCR service (Google Vision, Azure CV, Tesseract)
      // This is a placeholder implementation
      
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          documentType,
          language
        })
      });

      if (!response.ok) {
        throw new Error('OCR extraction failed');
      }

      const result = await response.json();

      await ctx.auditLogger('ai.ocr.extract_text', 'SUCCESS', {
        documentType,
        textLength: result.text?.length || 0,
        confidence: result.confidence
      });

      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        structuredData: result.structuredData,
        language: result.language || language
      };

    } catch (error) {
      await ctx.auditLogger('ai.ocr.extract_text', 'ERROR', {
        imageUrl,
        error: (error as Error).message
      });
      throw error;
    }
  }
};

