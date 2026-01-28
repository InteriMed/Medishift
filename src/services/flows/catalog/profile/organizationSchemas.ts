import { z } from "zod";

export const OrganizationCoreDetailsSchema = z.object({
  organizationName: z.string().min(3, "Organization name must be at least 3 characters"),
  organizationType: z.string().min(1, "Organization type is required"),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    number: z.string().min(1, "Number is required"),
    postalCode: z.string().regex(/^[0-9]{4}$/, "Invalid postal code"),
    city: z.string().min(1, "City is required"),
    canton: z.string().min(1, "Canton is required"),
    country: z.string().min(1, "Country is required")
  }).partial(),
  mainPhoneNumber: z.string().regex(
    /^\+?[0-9\s-()]{7,20}$/,
    "Invalid phone number"
  ).optional(),
  mainEmail: z.string().email("Invalid email address").optional(),
  website: z.union([z.string().url(), z.literal("")]).optional()
}).partial();

export const OrganizationLegalBillingSchema = z.object({
  legalEntityName: z.string().min(3, "Legal entity name must be at least 3 characters"),
  uidNumber: z.string().regex(
    /^CHE-[0-9]{3}\.[0-9]{3}\.[0-9]{3}(\sMWST)?$/,
    "Invalid UID number format (CHE-XXX.XXX.XXX)"
  ),
  commercialRegisterNumber: z.string().optional(),
  billingContact: z.object({
    name: z.string().optional(),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional()
  }).partial(),
  bankDetails: z.object({
    iban: z.string().regex(
      /^CH[0-9]{2}[0-9A-Za-z]{1,17}$/,
      "Invalid Swiss IBAN"
    ),
    bankName: z.string().min(1, "Bank name is required")
  }).partial()
}).partial();

export const OrganizationSettingsSchema = z.object({
  settings: z.object({
    autoApproveMembers: z.boolean().optional(),
    allowPublicJoining: z.boolean().optional()
  }).optional()
}).partial();

export const OrganizationProfileCombinedSchema = OrganizationCoreDetailsSchema
  .merge(OrganizationLegalBillingSchema)
  .merge(OrganizationSettingsSchema);

export type OrganizationProfileData = z.infer<typeof OrganizationProfileCombinedSchema>;

