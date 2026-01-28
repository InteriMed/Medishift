import { z } from "zod";
import { ActionDefinition } from "../../types";

const VerifyGLNSchema = z.object({
  gln: z.string().length(13, "GLN must be exactly 13 digits"),
  registry: z.enum(['medReg', 'gesReg', 'betReg']).optional(),
});

interface VerifyGLNResult {
  isValid: boolean;
  data?: {
    name: string;
    firstName?: string;
    gln: string;
    professions?: any[];
    primaryProfession?: string;
    registry: string;
    [key: string]: any;
  };
  source: 'medReg' | 'gesReg' | 'betReg' | null;
  error?: string;
}

/**
 * Verify GLN against Swiss healthcare registries
 * Checks medReg (professionals), gesReg (health professionals), betReg (facilities)
 */
export const verifyGLNAction: ActionDefinition = {
  id: "verification.gln",
  riskLevel: "LOW",
  label: "Verify GLN",
  description: "Verify Global Location Number against Swiss registries",
  schema: VerifyGLNSchema,

  handler: async (input, ctx): Promise<VerifyGLNResult> => {
    const { gln, registry } = input;

    // Basic validation
    if (!/^\d{13}$/.test(gln)) {
      return {
        isValid: false,
        source: null,
        error: "Invalid GLN format. Must be 13 digits."
      };
    }

    try {
      // Try registries in order unless specific one requested
      const registriesToCheck = registry 
        ? [registry]
        : ['medReg', 'gesReg', 'betReg'] as const;

      for (const reg of registriesToCheck) {
        const result = await checkRegistry(gln, reg, ctx);
        if (result.isValid) {
          await ctx.auditLogger('verification.gln', 'SUCCESS', {
            gln,
            registry: reg,
            professional: result.data?.name
          });
          return result;
        }
      }

      // No match found
      await ctx.auditLogger('verification.gln', 'NOT_FOUND', { gln });
      return {
        isValid: false,
        source: null,
        error: "GLN not found in any registry"
      };

    } catch (error) {
      await ctx.auditLogger('verification.gln', 'ERROR', { gln, error: (error as Error).message });
      throw error;
    }
  }
};

/**
 * Check GLN against specific registry
 */
async function checkRegistry(
  gln: string, 
  registry: 'medReg' | 'gesReg' | 'betReg',
  ctx: any
): Promise<VerifyGLNResult> {
  const { normalizeGLNData } = await import('../../../utils/gln');
  
  if (registry === 'medReg') {
    // MedReg API (Swiss Medical Registry)
    const response = await fetch(
      `https://www.medregom.admin.ch/api/nareg/search?term=${gln}`
    );
    
    if (!response.ok) {
      return { isValid: false, source: null };
    }

    const data = await response.json();
    const results = data.results || data || [];
    const match = results.find((r: any) => r.gln === gln);

    if (match) {
      return {
        isValid: true,
        data: normalizeGLNData(match, 'medReg'),
        source: 'medReg'
      };
    }
  }

  if (registry === 'gesReg') {
    // GesReg API (Health Professionals Registry)
    const response = await fetch(
      `https://www.gesreg.admin.ch/api/nareg/search?gln=${gln}`
    );

    if (!response.ok) {
      return { isValid: false, source: null };
    }

    const data = await response.json();
    if (data.Data && data.Data.length > 0) {
      const match = data.Data.find((r: any) => r.PersonGlnNumber === gln);
      if (match) {
        return {
          isValid: true,
          data: normalizeGLNData(match, 'gesReg'),
          source: 'gesReg'
        };
      }
    }
  }

  if (registry === 'betReg') {
    // BetReg API (Company Registry)
    const response = await fetch(
      `https://www.betriebsregister-web.admin.ch/api/companies?gln=${gln}`
    );

    if (!response.ok) {
      return { isValid: false, source: null };
    }

    const data = await response.json();
    if (data && data.glnCompany === gln) {
      return {
        isValid: true,
        data: normalizeGLNData(data, 'betReg'),
        source: 'betReg'
      };
    }
  }

  return { isValid: false, source: null };
}

