export const apiActions = [
  {
    id: "api.healthRegistryLookup",
    category: "api",
    workspace: ["personal", "facility", "organization"],
    service: "cloudFunctions",
    method: "healthRegistryAPI",
    location: "src/services/cloudFunctions.js",
    keywords: ["health", "registry", "gln", "lookup", "verify", "professional", "license"],
    labelKey: "serviceTree:api.healthRegistryLookup",
    descriptionKey: "serviceTree:api.healthRegistryLookupDesc",
    route: "/dashboard/verification",
    icon: "shield",
    parameters: [
      {
        name: "gln",
        type: "string",
        description: "Global Location Number (GLN) of the healthcare professional to verify",
        required: true,
        example: "7601000000000"
      }
    ]
  },
  {
    id: "api.companySearch",
    category: "api",
    workspace: ["personal", "facility", "organization"],
    service: "cloudFunctions",
    method: "companySearchAPI",
    location: "src/services/cloudFunctions.js",
    keywords: ["company", "search", "gln", "business", "facility", "organization"],
    labelKey: "serviceTree:api.companySearch",
    descriptionKey: "serviceTree:api.companySearchDesc",
    route: "/dashboard/organization",
    icon: "building",
    parameters: [
      {
        name: "gln",
        type: "string",
        description: "Global Location Number (GLN) of the company/facility to search",
        required: true,
        example: "7601000000000"
      }
    ]
  }
];

