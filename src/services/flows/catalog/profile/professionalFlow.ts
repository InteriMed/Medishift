import { FlowDefinition } from "../../types";
import {
  ProfessionalProfileCombinedSchema,
  ProfessionalProfileData,
  PersonalDetailsSchema,
  ProfessionalBackgroundSchema,
  BillingInformationSchema,
  DocumentUploadsSchema
} from "./professionalSchemas";

export const ProfessionalProfileFlow: FlowDefinition<ProfessionalProfileData> = {
  id: "flow.profile.professional",
  title: "Professional Profile",
  combinedSchema: ProfessionalProfileCombinedSchema,
  submitActionId: "profile.update_me",

  steps: [
    {
      id: "personalDetails",
      label: "Personal Details",
      path: "personal-details",
      schema: PersonalDetailsSchema
    },
    {
      id: "professionalBackground",
      label: "Professional Background",
      path: "professional-background",
      schema: ProfessionalBackgroundSchema
    },
    {
      id: "billingInformation",
      label: "Billing Information",
      path: "billing-information",
      schema: BillingInformationSchema
    },
    {
      id: "documentUploads",
      label: "Document Uploads",
      path: "document-uploads",
      schema: DocumentUploadsSchema
    }
  ]
};

export * from "./professionalSchemas";

