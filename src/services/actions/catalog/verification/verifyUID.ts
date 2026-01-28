import { z } from "zod";
import { ActionDefinition } from "../../types";

const VerifyUIDSchema = z.object({
  uid: z.string().regex(/^CHE-\d{3}\.\d{3}\.\d{3}$/, "Invalid Swiss UID format"),
  includeDetails: z.boolean().optional(),
});

interface VerifyUIDResult {
  isValid: boolean;
  company?: {
    name: string;
    uid: string;
    address?: {
      street: string;
      zip: string;
      city: string;
      canton: string;
    };
    status?: string;
    registrationDate?: string;
  };
  error?: string;
}

/**
 * Verify Swiss Commercial Registry UID (CHE number)
 */
export const verifyUIDAction: ActionDefinition = {
  id: "verification.uid",
  riskLevel: "LOW",
  label: "Verify UID",
  description: "Verify Swiss Commercial Registry UID",
  schema: VerifyUIDSchema,

  handler: async (input, ctx): Promise<VerifyUIDResult> => {
    const { uid, includeDetails } = input;

    try {
      // Call Swiss Commercial Registry API
      const response = await fetch(
        `https://www.betriebsregister-web.admin.ch/api/companies?uid=${encodeURIComponent(uid)}`
      );

      if (!response.ok) {
        return {
          isValid: false,
          error: "Unable to verify UID"
        };
      }

      const data = await response.json();

      if (!data || !data.uid) {
        await ctx.auditLogger('verification.uid', 'NOT_FOUND', { uid });
        return {
          isValid: false,
          error: "UID not found in registry"
        };
      }

      const result: VerifyUIDResult = {
        isValid: true,
        company: {
          name: data.name || '',
          uid: data.uid,
        }
      };

      if (includeDetails) {
        result.company!.address = {
          street: `${data.street || ''} ${data.streetNumber || ''}`.trim(),
          zip: data.zip || '',
          city: data.city || '',
          canton: data.canton || '',
        };
        result.company!.status = data.status || 'active';
        result.company!.registrationDate = data.registrationDate;
      }

      await ctx.auditLogger('verification.uid', 'SUCCESS', {
        uid,
        company: data.name
      });

      return result;

    } catch (error) {
      await ctx.auditLogger('verification.uid', 'ERROR', { uid, error: (error as Error).message });
      throw error;
    }
  }
};

