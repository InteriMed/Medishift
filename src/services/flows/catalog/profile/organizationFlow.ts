import { FlowDefinition } from "../../types";
import {
  OrganizationProfileCombinedSchema,
  OrganizationProfileData,
  OrganizationCoreDetailsSchema,
  OrganizationLegalBillingSchema,
  OrganizationSettingsSchema
} from "./organizationSchemas";

export const OrganizationProfileFlow: FlowDefinition<OrganizationProfileData> = {
  id: "flow.profile.organization",
  title: "Organization Profile",
  combinedSchema: OrganizationProfileCombinedSchema,
  submitActionId: "profile.update_me",

  steps: [
    {
      id: "organizationCoreDetails",
      label: "Core Details",
      path: "core-details",
      schema: OrganizationCoreDetailsSchema
    },
    {
      id: "organizationLegalBilling",
      label: "Legal & Billing",
      path: "legal-billing",
      schema: OrganizationLegalBillingSchema
    },
    {
      id: "settings",
      label: "Settings",
      path: "settings",
      schema: OrganizationSettingsSchema
    }
  ]
};

export * from "./organizationSchemas";

