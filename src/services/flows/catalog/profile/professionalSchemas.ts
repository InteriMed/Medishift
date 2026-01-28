import { z } from "zod";

export const PersonalDetailsSchema = z.object({
  identity: z.object({
    legalFirstName: z.string().min(1, "Legal first name is required"),
    legalLastName: z.string().min(1, "Legal last name is required"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    placeOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    nationality: z.string().min(1, "Nationality is required"),
    personalIdentificationNumber: z.string().optional()
  }).partial(),
  contact: z.object({
    residentialAddress: z.object({
      street: z.string().min(1, "Street is required"),
      number: z.string().min(1, "Number is required"),
      postalCode: z.string().regex(/^[0-9]{4}$/, "Invalid postal code"),
      city: z.string().min(1, "City is required"),
      canton: z.string().min(1, "Canton is required"),
      country: z.string().min(1, "Country is required")
    }).partial(),
    contactPhonePrefix: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional()
  }).partial()
}).partial();

export const ProfessionalBackgroundSchema = z.object({
  professionalDetails: z.object({
    profession: z.string().min(1, "Profession is required"),
    specialization: z.string().optional(),
    yearsOfExperience: z.number().min(0).optional(),
    languages: z.array(z.string()).optional(),
    glnNumber: z.string().optional()
  }).partial(),
  education: z.array(z.object({
    degree: z.string().min(1, "Degree is required"),
    field: z.string().optional(),
    institution: z.string().min(1, "Institution is required"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    currentlyStudying: z.boolean().optional(),
    country: z.string().optional(),
    gpa: z.string().optional(),
    honors: z.string().optional()
  })).optional(),
  workExperience: z.array(z.object({
    position: z.string().min(1, "Position is required"),
    jobTitle: z.string().optional(),
    employer: z.string().min(1, "Employer is required"),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    description: z.string().optional()
  })).optional(),
  licensesCertifications: z.array(z.any()).optional(),
  professionalMemberships: z.array(z.any()).optional(),
  volunteering: z.array(z.any()).optional()
}).partial();

export const BillingInformationSchema = z.object({
  billingInformation: z.object({
    bankDetails: z.object({
      accountHolderName: z.string().min(1, "Account holder name is required"),
      iban: z.string().regex(
        /^CH[0-9]{2}[0-9A-Za-z]{1,17}$/,
        "Invalid Swiss IBAN"
      ),
      bankName: z.string().min(1, "Bank name is required")
    }).partial()
  }).partial()
}).partial();

export const DocumentUploadsSchema = z.object({
  cvUrl: z.string().url().optional(),
  diplomaUrls: z.array(z.string().url()).optional()
}).partial();

export const ProfessionalProfileCombinedSchema = PersonalDetailsSchema
  .merge(ProfessionalBackgroundSchema)
  .merge(BillingInformationSchema)
  .merge(DocumentUploadsSchema);

export type ProfessionalProfileData = z.infer<typeof ProfessionalProfileCombinedSchema>;

