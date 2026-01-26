export const organizationActions = [
  {
    id: "organization.viewEmployees",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewEmployees",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "employees", "directory", "staff", "team", "workers", "view", "list"],
    labelKey: "serviceTree:organization.viewEmployees",
    descriptionKey: "serviceTree:organization.viewEmployeesDesc",
    route: "/dashboard/organization/team",
    icon: "users",
    parameters: [
      {
        name: "facilityId",
        type: "string",
        description: "Optional facility ID to filter employees by facility",
        required: false,
        example: "facility-123"
      },
      {
        name: "searchQuery",
        type: "string",
        description: "Optional search query to filter employees by name",
        required: false,
        example: "John"
      }
    ]
  },
  {
    id: "organization.viewOrganigram",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewOrganigram",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "organigram", "structure", "hierarchy", "chart", "view"],
    labelKey: "serviceTree:organization.viewOrganigram",
    descriptionKey: "serviceTree:organization.viewOrganigramDesc",
    route: "/dashboard/organization/team?subTab=organigram",
    icon: "git-branch",
    parameters: [
      {
        name: "facilityId",
        type: "string",
        description: "Optional facility ID to show organigram for specific facility",
        required: false,
        example: "facility-123"
      }
    ]
  },
  {
    id: "organization.viewHiring",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewHiring",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "hiring", "recruitment", "ats", "processes", "jobs", "vacancies"],
    labelKey: "serviceTree:organization.viewHiring",
    descriptionKey: "serviceTree:organization.viewHiringDesc",
    route: "/dashboard/organization/team?subTab=hiring",
    icon: "briefcase",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Filter hiring processes by status",
        required: false,
        enum: ["open", "in-progress", "closed", "filled"],
        example: "open"
      }
    ]
  },
  {
    id: "organization.viewContracts",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewContracts",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "contracts", "agreements", "view", "list"],
    labelKey: "serviceTree:organization.viewContracts",
    descriptionKey: "serviceTree:organization.viewContractsDesc",
    route: "/dashboard/organization/contracts",
    icon: "file-text",
    parameters: [
      {
        name: "facilityId",
        type: "string",
        description: "Optional facility ID to filter contracts by facility",
        required: false,
        example: "facility-123"
      },
      {
        name: "status",
        type: "string",
        description: "Filter contracts by status",
        required: false,
        enum: ["draft", "pending", "active", "completed", "cancelled"],
        example: "active"
      }
    ]
  },
  {
    id: "organization.viewPayroll",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewPayroll",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "payroll", "consolidated", "payments", "wages", "salary", "view"],
    labelKey: "serviceTree:organization.viewPayroll",
    descriptionKey: "serviceTree:organization.viewPayrollDesc",
    route: "/dashboard/organization/payroll",
    icon: "credit-card",
    parameters: [
      {
        name: "facilityId",
        type: "string",
        description: "Optional facility ID to filter payroll by facility",
        required: false,
        example: "facility-123"
      },
      {
        name: "period",
        type: "string",
        description: "Payroll period (month-year format)",
        required: false,
        example: "2024-01"
      }
    ]
  },
  {
    id: "organization.viewPolicyLibrary",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewPolicyLibrary",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "policy", "library", "policies", "documents", "rules", "view"],
    labelKey: "serviceTree:organization.viewPolicyLibrary",
    descriptionKey: "serviceTree:organization.viewPolicyLibraryDesc",
    route: "/dashboard/organization/policy",
    icon: "file-text",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Filter policies by status",
        required: false,
        enum: ["active", "review", "archived"],
        example: "active"
      }
    ]
  },
  {
    id: "organization.uploadPolicy",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "uploadPolicy",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "policy", "upload", "add", "create", "new", "document"],
    labelKey: "serviceTree:organization.uploadPolicy",
    descriptionKey: "serviceTree:organization.uploadPolicyDesc",
    route: "/dashboard/organization/policy?modal=upload",
    icon: "upload",
    parameters: [
      {
        name: "file",
        type: "File",
        description: "Policy document file to upload (PDF or Word document)",
        required: true,
        example: "File object from input"
      },
      {
        name: "name",
        type: "string",
        description: "Policy name/title",
        required: true,
        example: "Employee Handbook 2024"
      },
      {
        name: "description",
        type: "string",
        description: "Optional policy description",
        required: false,
        example: "Updated employee handbook with new policies"
      },
      {
        name: "isInternal",
        type: "boolean",
        description: "Whether the policy is internal only",
        required: false,
        default: false,
        example: true
      },
      {
        name: "isInterim",
        type: "boolean",
        description: "Whether the policy applies to interim workers",
        required: false,
        default: false,
        example: true
      }
    ]
  },
  {
    id: "organization.viewProfile",
    category: "organization",
    workspace: ["organization"],
    service: "organizationService",
    method: "viewProfile",
    location: "src/dashboard/pages/organization",
    keywords: ["organization", "profile", "details", "info", "settings", "view"],
    labelKey: "serviceTree:organization.viewProfile",
    descriptionKey: "serviceTree:organization.viewProfileDesc",
    route: "/dashboard/organization/profile",
    icon: "user",
    parameters: []
  }
];

