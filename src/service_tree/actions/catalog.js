export const catalogActions = [
  {
    id: "catalog.searchOrganizations",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "SEARCH_ORGANIZATIONS",
    location: "src/services/catalogService.js",
    keywords: ["organization", "search", "chain", "group", "company", "find", "lookup"],
    labelKey: "serviceTree:catalog.searchOrganizations",
    descriptionKey: "serviceTree:catalog.searchOrganizationsDesc",
    route: "/dashboard/organization",
    icon: "search",
    parameters: [
      {
        name: "searchTerm",
        type: "string",
        description: "Search term to match against organization names, GLN, or additional names (minimum 2 characters)",
        required: true,
        example: "Pharmacy Chain"
      },
      {
        name: "organizationType",
        type: "string",
        description: "Filter by organization type",
        required: false,
        enum: ["pharmacy_chain", "hospital_group", "clinic_network", "chain", "group", "network"],
        example: "pharmacy_chain"
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return",
        required: false,
        default: 20,
        example: 10
      }
    ]
  },
  {
    id: "catalog.getOrganization",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "GET_ORGANIZATION",
    location: "src/services/catalogService.js",
    keywords: ["organization", "view", "details", "info", "get", "fetch"],
    labelKey: "serviceTree:catalog.getOrganization",
    descriptionKey: "serviceTree:catalog.getOrganizationDesc",
    route: "/dashboard/organization",
    icon: "building",
    parameters: [
      {
        name: "organizationId",
        type: "string",
        description: "ID of the organization to retrieve",
        required: true,
        example: "org-123"
      }
    ]
  },
  {
    id: "catalog.getOrganizationFacilities",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "GET_ORGANIZATION_FACILITIES",
    location: "src/services/catalogService.js",
    keywords: ["organization", "facilities", "list", "members", "chain", "locations"],
    labelKey: "serviceTree:catalog.getOrganizationFacilities",
    descriptionKey: "serviceTree:catalog.getOrganizationFacilitiesDesc",
    route: "/dashboard/organization",
    icon: "map-pin",
    parameters: [
      {
        name: "organizationId",
        type: "string",
        description: "ID of the organization to get facilities for",
        required: true,
        example: "org-123"
      }
    ]
  },
  {
    id: "catalog.searchProfessionals",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "SEARCH_PROFESSIONALS",
    location: "src/services/catalogService.js",
    keywords: ["professional", "search", "worker", "employee", "staff", "find", "lookup", "healthcare"],
    labelKey: "serviceTree:catalog.searchProfessionals",
    descriptionKey: "serviceTree:catalog.searchProfessionalsDesc",
    route: "/dashboard/marketplace",
    icon: "search",
    parameters: [
      {
        name: "searchTerm",
        type: "string",
        description: "Search term to match against professional names, email, or GLN (minimum 2 characters)",
        required: true,
        example: "John Doe"
      },
      {
        name: "specialty",
        type: "string",
        description: "Filter by professional specialty",
        required: false,
        example: "Pharmacist"
      },
      {
        name: "qualification",
        type: "string",
        description: "Filter by qualification type or name",
        required: false,
        example: "PharmD"
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return",
        required: false,
        default: 20,
        example: 10
      }
    ]
  },
  {
    id: "catalog.getProfessional",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "GET_PROFESSIONAL",
    location: "src/services/catalogService.js",
    keywords: ["professional", "view", "profile", "details", "info", "get", "fetch"],
    labelKey: "serviceTree:catalog.getProfessional",
    descriptionKey: "serviceTree:catalog.getProfessionalDesc",
    route: "/dashboard/marketplace",
    icon: "user",
    parameters: [
      {
        name: "professionalId",
        type: "string",
        description: "ID of the professional to retrieve",
        required: true,
        example: "prof-123"
      }
    ]
  },
  {
    id: "catalog.searchFacilities",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "SEARCH_FACILITIES",
    location: "src/services/catalogService.js",
    keywords: ["facility", "search", "pharmacy", "clinic", "hospital", "find", "lookup", "location"],
    labelKey: "serviceTree:catalog.searchFacilities",
    descriptionKey: "serviceTree:catalog.searchFacilitiesDesc",
    route: "/dashboard/marketplace",
    icon: "search",
    parameters: [
      {
        name: "searchTerm",
        type: "string",
        description: "Search term to match against facility names, GLN, or additional names (minimum 2 characters)",
        required: true,
        example: "Main Pharmacy"
      },
      {
        name: "facilityType",
        type: "string",
        description: "Filter by facility type",
        required: false,
        enum: ["pharmacy", "clinic", "hospital", "laboratory"],
        example: "pharmacy"
      },
      {
        name: "canton",
        type: "string",
        description: "Filter by Swiss canton code",
        required: false,
        example: "ZH"
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return",
        required: false,
        default: 20,
        example: 10
      }
    ]
  },
  {
    id: "catalog.getFacility",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "GET_FACILITY",
    location: "src/services/catalogService.js",
    keywords: ["facility", "view", "profile", "details", "info", "get", "fetch"],
    labelKey: "serviceTree:catalog.getFacility",
    descriptionKey: "serviceTree:catalog.getFacilityDesc",
    route: "/dashboard/marketplace",
    icon: "map-pin",
    parameters: [
      {
        name: "facilityId",
        type: "string",
        description: "ID of the facility to retrieve",
        required: true,
        example: "facility-123"
      }
    ]
  },
  {
    id: "catalog.searchAll",
    category: "catalog",
    workspace: ["personal", "facility", "organization"],
    service: "catalogService",
    method: "SEARCH_ALL",
    location: "src/services/catalogService.js",
    keywords: ["catalog", "search", "all", "everything", "organizations", "professionals", "facilities", "universal"],
    labelKey: "serviceTree:catalog.searchAll",
    descriptionKey: "serviceTree:catalog.searchAllDesc",
    route: "/dashboard/marketplace",
    icon: "grid",
    parameters: [
      {
        name: "searchTerm",
        type: "string",
        description: "Search term to match across all entity types (minimum 2 characters)",
        required: true,
        example: "John"
      },
      {
        name: "limitPerType",
        type: "number",
        description: "Maximum number of results per entity type (organizations, professionals, facilities)",
        required: false,
        default: 10,
        example: 5
      },
      {
        name: "filters",
        type: "object",
        description: "Optional filters object with entity-specific filter criteria",
        required: false,
        example: { organizationType: "pharmacy_chain", facilityType: "pharmacy", specialty: "Pharmacist" }
      }
    ]
  }
];

