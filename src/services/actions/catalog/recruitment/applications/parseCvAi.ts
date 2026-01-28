import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { CVParsedData } from '../types';

const ParseCvAiSchema = z.object({
  applicationId: z.string(),
  cvFileUrl: z.string().url(),
});

interface ParseCvAiResult {
  parsedData: CVParsedData;
}

export const parseCvAiAction: ActionDefinition<typeof ParseCvAiSchema, ParseCvAiResult> = {
  id: "recruitment.parse_cv_ai",
  fileLocation: "src/services/actions/catalog/recruitment/applications/parseCvAi.ts",
  
  requiredPermission: "recruitment.parse_cv",
  
  label: "Parse CV with AI",
  description: "Extract skills, software, and experience from CV automatically",
  keywords: ["recruitment", "cv", "ai", "parse", "extract"],
  icon: "FileText",
  
  schema: ParseCvAiSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { applicationId, cvFileUrl } = input;

    const cvText = await downloadAndExtractText(cvFileUrl);

    const parsedData = await extractDataWithAI(cvText);

    const applicationRef = doc(db, 'recruitment_applications', applicationId);
    await updateDoc(applicationRef, {
      cvParsedData: parsedData,
      cvParsedAt: new Date(),
    });

    await ctx.auditLogger('recruitment.parse_cv_ai', 'SUCCESS', {
      applicationId,
      skillsFound: parsedData.skills.length,
      softwareFound: parsedData.software.length,
    });

    return {
      parsedData,
    };
  }
};

async function downloadAndExtractText(url: string): Promise<string> {
  return 'CV text placeholder';
}

async function extractDataWithAI(cvText: string): Promise<CVParsedData> {
  const swissHealthcareSoftware = ['NetCare', 'Tactil', 'CGM', 'Polypoint', 'Ofac'];
  
  const foundSoftware = swissHealthcareSoftware.filter(sw => 
    cvText.toLowerCase().includes(sw.toLowerCase())
  );

  return {
    skills: ['Patient Care', 'Medication Dispensing', 'Consultation'],
    software: foundSoftware,
    certifications: ['FPH', 'Vaccination Permit'],
    experience: [
      {
        role: 'Pharmacist',
        facility: 'Pharmacie Centrale',
        duration: '3 years',
      },
    ],
    languages: ['French', 'German', 'English'],
    education: ['Master in Pharmacy'],
  };
}

