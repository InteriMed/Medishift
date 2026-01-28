import { FlowDefinition } from "../../types";
import {
  FacilityProfileCombinedSchema,
  FacilityProfileData,
  FacilityCoreDetailsSchema,
  FacilityLegalBillingSchema,
  MarketplacePreferencesSchema
} from "./facilitySchemas";

export const FacilityProfileFlow: FlowDefinition<FacilityProfileData> = {
  id: "flow.profile.facility",
  title: "Facility Profile",
  combinedSchema: FacilityProfileCombinedSchema,
  submitActionId: "profile.update_me",

  steps: [
    {
      id: "facilityCoreDetails",
      label: "Core Details",
      path: "core-details",
      schema: FacilityCoreDetailsSchema
    },
    {
      id: "facilityLegalBilling",
      label: "Legal & Billing",
      path: "legal-billing",
      schema: FacilityLegalBillingSchema
    },
    {
      id: "marketplace",
      label: "Marketplace Preferences",
      path: "marketplace",
      schema: MarketplacePreferencesSchema
    }
  ]
};

export * from "./facilitySchemas";



