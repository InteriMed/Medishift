import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";

const parseDocumentTypeEnum = ['identity', 'work_permit', 'diploma', 'billing', 'generic'] as const;

const ParseDocumentSchema = z.object({
  imageUrl: z.string().url("Must be a valid image URL"),
  documentType: z.enum(parseDocumentTypeEnum),
  extractFields: z.array(z.string()).optional(),
});

interface ParsedDocument {
  success: boolean;
  documentType: string;
  fields: Record<string, any>;
  confidence: number;
  rawText?: string;
  error?: string;
}

/**
 * Parse document and extract structured data using AI
 * Intelligently extracts fields based on document type
 */
export const parseDocumentAction: ActionDefinition<typeof ParseDocumentSchema, ParsedDocument> = {
  id: "ai.parse_document",
  fileLocation: "src/services/actions/catalog/ai/parseDocument.ts",
  requiredPermission: "admin.access",
  label: "Parse Document (AI)",
  description: "Parse document and extract structured data using AI",
  keywords: ["parse", "document", "ai", "extract"],
  icon: "FileSearch",
  schema: ParseDocumentSchema,
  metadata: {
    riskLevel: "LOW",
  },

  handler: async (input: z.infer<typeof ParseDocumentSchema>, ctx: ActionContext): Promise<ParsedDocument> => {
    const { imageUrl, documentType, extractFields } = input;

    try {
      // First extract text via OCR
      const { executeAction } = await import('../../hook');
      const ocrResult = await executeAction<z.infer<typeof ParseDocumentSchema>, { text: string; confidence: number }>('ai.ocr.extract_text', {
        imageUrl,
        documentType
      }, ctx);

      if (!ocrResult || !ocrResult.text) {
        return {
          success: false,
          documentType,
          fields: {},
          confidence: 0,
          error: 'No text extracted'
        };
      }

      // Then parse with AI based on document type
      const parsed = await parseWithAI(ocrResult.text, documentType, extractFields);

      await ctx.auditLogger('ai.parse_document', 'SUCCESS', {
        documentType,
        fieldsExtracted: Object.keys(parsed.fields).length
      });

      return {
        success: true,
        documentType,
        fields: parsed.fields,
        confidence: parsed.confidence,
        rawText: ocrResult.text
      };

    } catch (error) {
      await ctx.auditLogger('ai.parse_document', 'ERROR', {
        documentType,
        error: (error as Error).message
      });

      return {
        success: false,
        documentType,
        fields: {},
        confidence: 0,
        error: (error as Error).message
      };
    }
  }
};

/**
 * Parse extracted text using AI to extract structured fields
 */
async function parseWithAI(
  text: string,
  documentType: string,
  extractFields?: string[]
): Promise<{ fields: Record<string, any>; confidence: number }> {
  // TODO: Integrate with actual AI service (OpenAI, Claude, custom model)
  // This is a placeholder implementation

  const response = await fetch('/api/ai/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      documentType,
      extractFields
    })
  });

  if (!response.ok) {
    throw new Error('AI parsing failed');
  }

  const result = await response.json();
  return {
    fields: result.fields || {},
    confidence: result.confidence || 0
  };
}

