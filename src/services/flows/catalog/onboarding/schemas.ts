import { z } from "zod";

export const Step1_RoleSelection = z.object({
  role: z.enum(['worker', 'company', 'chain']),
  onboardingType: z.enum(['professional', 'facility']).optional()
});

export const Step2_LegalConsiderations = z.object({
  role: z.enum(['worker', 'company', 'chain']),
  belongsToFacility: z.boolean().optional(),
  legalConsiderationsConfirmed: z.boolean().refine(val => val === true, {
    message: "You must accept the terms of service"
  })
});

export const Step3_PhoneVerification = z.object({
  phoneVerified: z.boolean().refine(val => val === true, {
    message: "Phone verification is required"
  }),
  phoneData: z.object({
    phoneNumber: z.string().min(1, "Phone number is required"),
    verified: z.boolean()
  })
});

export const Step4_ProfessionalGLN = z.object({
  glnVerified: z.boolean().optional(),
  glnNumber: z.string().optional()
});

export const Step5_FacilityGLN = z.object({
  facilityGlnVerified: z.boolean().optional(),
  facilityGlnNumber: z.string().optional()
});

export const Step5_CommercialRegistry = z.object({
  commercialRegistryVerified: z.boolean().optional(),
  uidNumber: z.string().optional()
});

export const OnboardingCombinedSchema = Step1_RoleSelection
  .merge(Step2_LegalConsiderations.partial())
  .merge(Step3_PhoneVerification.partial())
  .merge(Step4_ProfessionalGLN.partial())
  .merge(Step5_FacilityGLN.partial())
  .merge(Step5_CommercialRegistry.partial());

export type OnboardingData = z.infer<typeof OnboardingCombinedSchema>;

