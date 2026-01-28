import { z } from "zod";

export const FacilityCoreDetailsSchema = z.object({
  facilityDetails: z.object({
    name: z.string().min(3, "Facility name must be at least 3 characters"),
    additionalName: z.string().optional(),
    facilityType: z.string().min(1, "Facility type is required"),
    address: z.object({
      street: z.string().min(1, "Street is required"),
      number: z.string().min(1, "Number is required"),
      postalCode: z.string().regex(/^[0-9]{4}$/, "Invalid postal code"),
      city: z.string().min(1, "City is required"),
      canton: z.string().min(1, "Canton is required"),
      country: z.string().min(1, "Country is required")
    }),
    mainPhoneNumber: z.string().regex(
      /^\+?[0-9\s-()]{7,20}$/,
      "Invalid phone number"
    ),
    mainEmail: z.string().email("Invalid email address"),
    website: z.string().url().optional().or(z.literal("")),
    glnNumber: z.string().optional()
  }).partial(),
  legalRepresentative: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional()
  }).partial(),
  responsiblePersonIdentity: z.object({
    nationality: z.string().min(1, "Nationality is required")
  }).partial()
}).partial();

export const FacilityLegalBillingSchema = z.object({
  identityLegal: z.object({
    legalCompanyName: z.string().min(3, "Legal company name must be at least 3 characters"),
    uidNumber: z.string().regex(
      /^CHE-[0-9]{3}\.[0-9]{3}\.[0-9]{3}(\sMWST)?$/,
      "Invalid UID number format (CHE-XXX.XXX.XXX)"
    ),
    commercialRegisterNumber: z.string().optional()
  }).partial(),
  billingContact: z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional()
  }).partial(),
  facilityIBAN: z.string().regex(
    /^CH[0-9]{2}[0-9A-Za-z]{1,17}$/,
    "Invalid Swiss IBAN"
  ).optional(),
  facilityBankName: z.string().min(1, "Bank name is required").optional()
}).partial();

export const MarketplacePreferencesSchema = z.object({
  contractSettings: z.object({
    autoRenewal: z.boolean().optional(),
    requiresApproval: z.boolean().optional()
  }).optional()
}).partial();

export const FacilityProfileCombinedSchema = FacilityCoreDetailsSchema
  .merge(FacilityLegalBillingSchema)
  .merge(MarketplacePreferencesSchema);

export type FacilityProfileData = z.infer<typeof FacilityProfileCombinedSchema>;



