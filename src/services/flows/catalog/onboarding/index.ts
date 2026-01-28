import { FlowDefinition } from "../../types";
import {
  OnboardingCombinedSchema,
  OnboardingData,
  Step1_RoleSelection,
  Step2_LegalConsiderations,
  Step3_PhoneVerification,
  Step4_ProfessionalGLN,
  Step5_FacilityGLN,
  Step5_CommercialRegistry
} from "./schemas";

export const OnboardingFlow: FlowDefinition<OnboardingData> = {
  id: "flow.onboarding",
  title: "Account Setup",
  combinedSchema: OnboardingCombinedSchema,
  submitActionId: "profile.update_me",

  steps: [
    {
      id: "role",
      label: "Select Your Role",
      path: "role",
      schema: Step1_RoleSelection,
    },
    {
      id: "legal",
      label: "Legal Considerations",
      path: "legal",
      schema: Step2_LegalConsiderations,
    },
    {
      id: "phone",
      label: "Phone Verification",
      path: "phone",
      schema: Step3_PhoneVerification,
    },
    {
      id: "gln_professional",
      label: "Professional Verification",
      path: "gln-professional",
      schema: Step4_ProfessionalGLN.partial(),
      condition: (data) => {
        return data.role === 'worker' || data.role === 'company' || data.role === 'chain';
      }
    },
    {
      id: "gln_facility",
      label: "Facility Verification",
      path: "gln-facility",
      schema: Step5_FacilityGLN.partial(),
      condition: (data) => data.role === 'company'
    },
    {
      id: "commercial_registry",
      label: "Organization Verification",
      path: "commercial-registry",
      schema: Step5_CommercialRegistry.partial(),
      condition: (data) => data.role === 'chain'
    }
  ]
};

export * from "./schemas";

