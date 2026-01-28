import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";

const verifyDocumentTypeEnum = ['identity', 'diploma', 'permit', 'billing'] as const;

const VerifyDocumentSchema = z.object({
  imageUrl: z.string().url("Must be a valid image URL"),
  expectedData: z.record(z.string(), z.any()).optional(),
  documentType: z.enum(verifyDocumentTypeEnum),
});

interface VerificationResult {
  isValid: boolean;
  confidence: number;
  matches: Record<string, boolean>;
  extractedData: Record<string, any>;
  discrepancies: string[];
}

/**
 * Verify document authenticity and data against expected values using AI
 */
export const verifyDocumentAction: ActionDefinition<typeof VerifyDocumentSchema, VerificationResult> = {
  id: "ai.verify_document",
  fileLocation: "src/services/actions/catalog/ai/verifyDocument.ts",
  requiredPermission: "admin.access",
  label: "Verify Document (AI)",
  description: "Verify document authenticity and cross-check data using AI",
  keywords: ["verify", "document", "ai", "authenticity"],
  icon: "ShieldCheck",
  schema: VerifyDocumentSchema,
  metadata: {
    riskLevel: "HIGH",
  },

  handler: async (input: z.infer<typeof VerifyDocumentSchema>, ctx: ActionContext): Promise<VerificationResult> => {
    const { imageUrl, expectedData, documentType } = input;

    try {
      // Parse document to extract data
      const { executeAction } = await import('../../hook');
      const parseResult = await executeAction<{ imageUrl: string; documentType: string }, ParsedDocument>('ai.parse_document', {
        imageUrl,
        documentType
      }, ctx);

      interface ParsedDocument {
        success: boolean;
        fields: Record<string, any>;
        confidence: number;
      }

      if (!parseResult || !parseResult.success) {
        return {
          isValid: false,
          confidence: 0,
          matches: {},
          extractedData: {},
          discrepancies: ['Failed to parse document']
        };
      }

      const extractedData = parseResult.fields || {};
      const matches: Record<string, boolean> = {};
      const discrepancies: string[] = [];

      // Compare extracted data with expected data
      if (expectedData) {
        for (const [key, expectedValue] of Object.entries(expectedData)) {
          const extractedValue = extractedData[key];
          const isMatch = compareValues(extractedValue, expectedValue);
          matches[key] = isMatch;

          if (!isMatch) {
            discrepancies.push(
              `${key}: expected "${expectedValue}", found "${extractedValue}"`
            );
          }
        }
      }

      const isValid = discrepancies.length === 0;
      const confidence = parseResult.confidence || 0;

      await ctx.auditLogger('ai.verify_document', isValid ? 'SUCCESS' : 'ERROR', {
        documentType,
        isValid,
        discrepancies: discrepancies.length
      });

      return {
        isValid,
        confidence,
        matches,
        extractedData,
        discrepancies
      };

    } catch (error) {
      await ctx.auditLogger('ai.verify_document', 'ERROR', {
        documentType,
        error: (error as Error).message
      });

      throw error;
    }
  }
};

/**
 * Compare two values with fuzzy matching
 */
function compareValues(value1: any, value2: any): boolean {
  if (value1 === value2) return true;
  if (!value1 || !value2) return false;

  // Normalize strings for comparison
  const str1 = String(value1).toLowerCase().trim();
  const str2 = String(value2).toLowerCase().trim();

  // Exact match
  if (str1 === str2) return true;

  // Remove spaces and special characters
  const clean1 = str1.replace(/[\s\-\.]/g, '');
  const clean2 = str2.replace(/[\s\-\.]/g, '');

  return clean1 === clean2;
}

