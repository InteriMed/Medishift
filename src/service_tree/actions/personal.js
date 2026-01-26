export const personalActions = [
  {
    id: "calendar.getEvents",
    category: "calendar",
    workspace: ["personal", "facility"],
    service: "calendarService",
    method: "getEvents",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "events", "shifts", "schedule", "get", "fetch", "list", "agenda", "planning"],
    labelKey: "serviceTree:calendar.getEvents",
    descriptionKey: "serviceTree:calendar.getEventsDesc",
    route: "/dashboard/calendar",
    icon: "calendar",
    parameters: [
      {
        name: "startDate",
        type: "string",
        description: "Start date for event range (ISO 8601 format)",
        required: false,
        example: "2024-01-01T00:00:00Z"
      },
      {
        name: "endDate",
        type: "string",
        description: "End date for event range (ISO 8601 format)",
        required: false,
        example: "2024-01-31T23:59:59Z"
      },
      {
        name: "eventType",
        type: "string",
        description: "Filter by event type (availability, appointment, meeting, etc.)",
        required: false,
        enum: ["availability", "appointment", "meeting", "blocking"],
        example: "availability"
      }
    ]
  },
  {
    id: "calendar.createEvent",
    category: "calendar",
    workspace: ["personal", "facility"],
    service: "calendarService",
    method: "createEvent",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "event", "shift", "create", "add", "new", "schedule", "book"],
    labelKey: "serviceTree:calendar.createEvent",
    descriptionKey: "serviceTree:calendar.createEventDesc",
    route: "/dashboard/calendar?action=create",
    icon: "plus-circle",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Event title or name",
        required: true,
        example: "Morning Shift"
      },
      {
        name: "start",
        type: "string",
        description: "Event start date and time (ISO 8601 format)",
        required: true,
        example: "2024-01-15T09:00:00Z"
      },
      {
        name: "end",
        type: "string",
        description: "Event end date and time (ISO 8601 format)",
        required: true,
        example: "2024-01-15T17:00:00Z"
      },
      {
        name: "type",
        type: "string",
        description: "Event type",
        required: false,
        default: "availability",
        enum: ["availability", "appointment", "meeting", "blocking", "shift"],
        example: "availability"
      },
      {
        name: "location",
        type: "string",
        description: "Event location",
        required: false,
        example: "Main Office"
      },
      {
        name: "notes",
        type: "string",
        description: "Additional notes or description",
        required: false,
        example: "Regular availability"
      },
      {
        name: "isRecurring",
        type: "boolean",
        description: "Whether the event repeats",
        required: false,
        default: false,
        example: true
      },
      {
        name: "recurrencePattern",
        type: "object",
        description: "Recurrence pattern if isRecurring is true",
        required: false,
        example: { frequency: "weekly", interval: 1, endDate: "2024-12-31" }
      }
    ]
  },
  {
    id: "calendar.updateEvent",
    category: "calendar",
    workspace: ["personal", "facility"],
    service: "calendarService",
    method: "updateEvent",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "event", "shift", "update", "edit", "modify", "change", "reschedule"],
    labelKey: "serviceTree:calendar.updateEvent",
    descriptionKey: "serviceTree:calendar.updateEventDesc",
    route: "/dashboard/calendar",
    icon: "edit",
    parameters: [
      {
        name: "eventId",
        type: "string",
        description: "ID of the event to update",
        required: true,
        example: "event-123"
      },
      {
        name: "updates",
        type: "object",
        description: "Object containing fields to update",
        required: true,
        example: { title: "Updated Title", start: "2024-01-15T10:00:00Z" }
      },
      {
        name: "updateType",
        type: "string",
        description: "Type of update: 'single', 'future', or 'all' for recurring events",
        required: false,
        default: "single",
        enum: ["single", "future", "all"],
        example: "single"
      }
    ]
  },
  {
    id: "calendar.deleteEvent",
    category: "calendar",
    workspace: ["personal", "facility"],
    service: "calendarService",
    method: "deleteEvent",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "event", "shift", "delete", "remove", "cancel"],
    labelKey: "serviceTree:calendar.deleteEvent",
    descriptionKey: "serviceTree:calendar.deleteEventDesc",
    route: "/dashboard/calendar",
    icon: "trash",
    parameters: [
      {
        name: "eventId",
        type: "string",
        description: "ID of the event to delete",
        required: true,
        example: "event-123"
      },
      {
        name: "deleteType",
        type: "string",
        description: "Type of deletion: 'single', 'future', or 'all' for recurring events",
        required: false,
        default: "single",
        enum: ["single", "future", "all"],
        example: "single"
      }
    ]
  },
  {
    id: "calendar.syncCalendar",
    category: "calendar",
    workspace: ["personal", "facility"],
    service: "calendarService",
    method: "syncCalendar",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "sync", "external", "google", "outlook", "integration", "import"],
    labelKey: "serviceTree:calendar.syncCalendar",
    descriptionKey: "serviceTree:calendar.syncCalendarDesc",
    route: "/dashboard/calendar",
    icon: "refresh",
    parameters: [
      {
        name: "provider",
        type: "string",
        description: "External calendar provider",
        required: true,
        enum: ["google", "outlook", "ical"],
        example: "google"
      },
      {
        name: "calendarId",
        type: "string",
        description: "External calendar ID to sync",
        required: false,
        example: "primary"
      },
      {
        name: "syncDirection",
        type: "string",
        description: "Sync direction: 'import', 'export', or 'bidirectional'",
        required: false,
        default: "bidirectional",
        enum: ["import", "export", "bidirectional"],
        example: "bidirectional"
      }
    ]
  },
  {
    id: "contracts.getContracts",
    category: "contracts",
    workspace: ["personal", "facility"],
    service: "contractsService",
    method: "getContracts",
    location: "src/services/contractsService.js",
    keywords: ["contracts", "list", "fetch", "get", "all", "agreements", "view"],
    labelKey: "serviceTree:contracts.getContracts",
    descriptionKey: "serviceTree:contracts.getContractsDesc",
    route: "/dashboard/contracts",
    icon: "file-text",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Filter by contract status",
        required: false,
        enum: ["draft", "pending", "active", "completed", "cancelled"],
        example: "active"
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of contracts to return",
        required: false,
        default: 50,
        example: 20
      }
    ]
  },
  {
    id: "contracts.createContract",
    category: "contracts",
    workspace: ["personal", "facility"],
    service: "contractsService",
    method: "createContract",
    location: "src/services/contractsService.js",
    keywords: ["contract", "create", "new", "draft", "agreement", "hire", "employ"],
    labelKey: "serviceTree:contracts.createContract",
    descriptionKey: "serviceTree:contracts.createContractDesc",
    route: "/dashboard/contracts/new",
    icon: "file-plus",
    parameters: [
      {
        name: "professionalId",
        type: "string",
        description: "ID of the professional party in the contract",
        required: true,
        example: "user-123"
      },
      {
        name: "employerId",
        type: "string",
        description: "ID of the employer/facility party in the contract",
        required: true,
        example: "facility-456"
      },
      {
        name: "startDate",
        type: "string",
        description: "Contract start date (ISO 8601 format)",
        required: true,
        example: "2024-01-01"
      },
      {
        name: "endDate",
        type: "string",
        description: "Contract end date (ISO 8601 format), null for indefinite",
        required: false,
        example: "2024-12-31"
      },
      {
        name: "terms",
        type: "object",
        description: "Contract terms and conditions",
        required: true,
        example: { hourlyRate: 50, hoursPerWeek: 40, role: "Pharmacist" }
      }
    ]
  },
  {
    id: "contracts.updateContract",
    category: "contracts",
    workspace: ["personal", "facility"],
    service: "contractsService",
    method: "updateContract",
    location: "src/services/contractsService.js",
    keywords: ["contract", "update", "edit", "modify", "status", "change", "sign"],
    labelKey: "serviceTree:contracts.updateContract",
    descriptionKey: "serviceTree:contracts.updateContractDesc",
    route: "/dashboard/contracts",
    icon: "edit",
    parameters: [
      {
        name: "contractId",
        type: "string",
        description: "ID of the contract to update",
        required: true,
        example: "contract-123"
      },
      {
        name: "updates",
        type: "object",
        description: "Object containing fields to update",
        required: true,
        example: { status: "active", endDate: "2024-12-31" }
      }
    ]
  },
  {
    id: "contracts.generatePdf",
    category: "contracts",
    workspace: ["personal", "facility"],
    service: "contractsService",
    method: "generatePdf",
    location: "src/services/contractsService.js",
    keywords: ["contract", "pdf", "generate", "download", "document", "export", "print"],
    labelKey: "serviceTree:contracts.generatePdf",
    descriptionKey: "serviceTree:contracts.generatePdfDesc",
    route: "/dashboard/contracts",
    icon: "download",
    parameters: [
      {
        name: "contractId",
        type: "string",
        description: "ID of the contract to generate PDF for",
        required: true,
        example: "contract-123"
      }
    ]
  },
  {
    id: "contracts.applyToJob",
    category: "contracts",
    workspace: ["personal"],
    service: "contractsService",
    method: "applyToJob",
    location: "src/services/contractsService.js",
    keywords: ["job", "apply", "application", "shift", "vacancy", "submit", "candidate"],
    labelKey: "serviceTree:contracts.applyToJob",
    descriptionKey: "serviceTree:contracts.applyToJobDesc",
    route: "/dashboard/marketplace",
    icon: "send",
    parameters: [
      {
        name: "jobId",
        type: "string",
        description: "ID of the job/vacancy to apply for",
        required: true,
        example: "job-123"
      },
      {
        name: "coverLetter",
        type: "string",
        description: "Optional cover letter text",
        required: false,
        example: "I am interested in this position..."
      }
    ]
  },
  {
    id: "messages.getConversations",
    category: "messages",
    workspace: ["personal", "facility", "organization"],
    service: "messagesService",
    method: "getConversations",
    location: "src/services/messagesService.js",
    keywords: ["messages", "conversations", "chats", "inbox", "list", "fetch"],
    labelKey: "serviceTree:messages.getConversations",
    descriptionKey: "serviceTree:messages.getConversationsDesc",
    route: "/dashboard/messages",
    icon: "inbox",
    parameters: [
      {
        name: "limit",
        type: "number",
        description: "Maximum number of conversations to return",
        required: false,
        default: 50,
        example: 20
      },
      {
        name: "unreadOnly",
        type: "boolean",
        description: "If true, only return conversations with unread messages",
        required: false,
        default: false,
        example: true
      }
    ]
  },
  {
    id: "messages.createConversation",
    category: "messages",
    workspace: ["personal", "facility", "organization"],
    service: "messagesService",
    method: "createConversation",
    location: "src/services/messagesService.js",
    keywords: ["conversation", "chat", "create", "new", "start", "message", "contact"],
    labelKey: "serviceTree:messages.createConversation",
    descriptionKey: "serviceTree:messages.createConversationDesc",
    route: "/dashboard/messages",
    icon: "message-plus",
    parameters: [
      {
        name: "participantId",
        type: "string",
        description: "ID of the user to start conversation with",
        required: true,
        example: "user-123"
      },
      {
        name: "initialMessage",
        type: "string",
        description: "Optional initial message text",
        required: false,
        example: "Hello, I'd like to discuss..."
      }
    ]
  },
  {
    id: "messages.sendMessage",
    category: "messages",
    workspace: ["personal", "facility", "organization"],
    service: "messagesService",
    method: "sendMessage",
    location: "src/services/messagesService.js",
    keywords: ["message", "send", "chat", "reply", "text", "communicate", "write"],
    labelKey: "serviceTree:messages.sendMessage",
    descriptionKey: "serviceTree:messages.sendMessageDesc",
    route: "/dashboard/messages",
    icon: "send",
    parameters: [
      {
        name: "conversationId",
        type: "string",
        description: "ID of the conversation to send message to",
        required: true,
        example: "conv-123"
      },
      {
        name: "text",
        type: "string",
        description: "Message text content",
        required: true,
        example: "Hello, how are you?"
      },
      {
        name: "attachments",
        type: "array",
        description: "Optional array of file attachments",
        required: false,
        example: [{ url: "https://...", name: "document.pdf" }]
      }
    ]
  },
  {
    id: "profile.getCurrentUser",
    category: "profile",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "userService",
    method: "getCurrentUser",
    location: "src/services/userService.js",
    keywords: ["user", "profile", "current", "me", "self", "get", "account"],
    labelKey: "serviceTree:profile.getCurrentUser",
    descriptionKey: "serviceTree:profile.getCurrentUserDesc",
    route: "/dashboard/profile",
    icon: "user",
    parameters: []
  },
  {
    id: "profile.updateUserProfile",
    category: "profile",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "userService",
    method: "updateUserProfile",
    location: "src/services/userService.js",
    keywords: ["profile", "update", "edit", "save", "modify", "user", "settings"],
    labelKey: "serviceTree:profile.updateUserProfile",
    descriptionKey: "serviceTree:profile.updateUserProfileDesc",
    route: "/dashboard/profile/edit",
    icon: "user-edit",
    parameters: [
      {
        name: "userId",
        type: "string",
        description: "ID of the user to update (defaults to current user if not provided)",
        required: false,
        example: "user-123"
      },
      {
        name: "updates",
        type: "object",
        description: "Object containing profile fields to update",
        required: true,
        example: { displayName: "John Doe", phone: "+1234567890" }
      }
    ]
  },
  {
    id: "profile.changePassword",
    category: "profile",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "userService",
    method: "changePassword",
    location: "src/services/userService.js",
    keywords: ["password", "change", "update", "security", "account", "credentials"],
    labelKey: "serviceTree:profile.changePassword",
    descriptionKey: "serviceTree:profile.changePasswordDesc",
    route: "/dashboard/settings",
    icon: "lock",
    parameters: [
      {
        name: "oldPassword",
        type: "string",
        description: "Current password for verification",
        required: true,
        example: "currentPassword123"
      },
      {
        name: "newPassword",
        type: "string",
        description: "New password (must meet security requirements)",
        required: true,
        example: "newSecurePassword456"
      }
    ]
  },
  {
    id: "profile.uploadProfilePicture",
    category: "profile",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "userService",
    method: "uploadProfilePicture",
    location: "src/services/userService.js",
    keywords: ["profile", "picture", "photo", "avatar", "upload", "image"],
    labelKey: "serviceTree:profile.uploadProfilePicture",
    descriptionKey: "serviceTree:profile.uploadProfilePictureDesc",
    route: "/dashboard/profile",
    icon: "camera",
    parameters: [
      {
        name: "file",
        type: "File",
        description: "Image file to upload as profile picture",
        required: true,
        example: "File object from input (JPG, PNG, etc.)"
      }
    ]
  },
  {
    id: "profile.searchUsers",
    category: "profile",
    workspace: ["personal", "facility", "organization"],
    service: "userService",
    method: "searchUsers",
    location: "src/services/userService.js",
    keywords: ["users", "search", "find", "lookup", "name", "email", "professionals"],
    labelKey: "serviceTree:profile.searchUsers",
    descriptionKey: "serviceTree:profile.searchUsersDesc",
    route: "/dashboard/marketplace",
    icon: "search",
    parameters: [
      {
        name: "searchTerm",
        type: "string",
        description: "Search term to match against user names or emails (minimum 3 characters)",
        required: true,
        example: "John Doe"
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
    id: "payroll.createPayrollRequest",
    category: "payroll",
    workspace: ["personal", "facility"],
    service: "payrollService",
    method: "createPayrollRequest",
    location: "src/services/payrollService.js",
    keywords: ["payroll", "create", "request", "payment", "shift", "worker", "salary"],
    labelKey: "serviceTree:payroll.createPayrollRequest",
    descriptionKey: "serviceTree:payroll.createPayrollRequestDesc",
    route: "/dashboard/payroll",
    icon: "dollar-sign",
    parameters: [
      {
        name: "shiftIds",
        type: "array",
        description: "Array of shift IDs to include in payroll request",
        required: true,
        example: ["shift-1", "shift-2", "shift-3"]
      },
      {
        name: "facilityId",
        type: "string",
        description: "ID of the facility for payroll processing",
        required: true,
        example: "facility-123"
      },
      {
        name: "notes",
        type: "string",
        description: "Optional notes for the payroll request",
        required: false,
        example: "Monthly payroll for January"
      }
    ]
  },
  {
    id: "payroll.getPayrollRequests",
    category: "payroll",
    workspace: ["personal", "facility"],
    service: "payrollService",
    method: "getPayrollRequests",
    location: "src/services/payrollService.js",
    keywords: ["payroll", "requests", "list", "fetch", "history", "payments"],
    labelKey: "serviceTree:payroll.getPayrollRequests",
    descriptionKey: "serviceTree:payroll.getPayrollRequestsDesc",
    route: "/dashboard/payroll",
    icon: "list",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Filter by request status",
        required: false,
        enum: ["pending", "processing", "completed", "rejected"],
        example: "pending"
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of requests to return",
        required: false,
        default: 50,
        example: 20
      }
    ]
  },
  {
    id: "payroll.calculateShiftFees",
    category: "payroll",
    workspace: ["personal", "facility"],
    service: "payrollService",
    method: "calculateShiftFees",
    location: "src/services/payrollService.js",
    keywords: ["fees", "calculate", "shift", "cost", "commission", "preview", "price"],
    labelKey: "serviceTree:payroll.calculateShiftFees",
    descriptionKey: "serviceTree:payroll.calculateShiftFeesDesc",
    route: "/dashboard/contracts",
    icon: "calculator",
    parameters: [
      {
        name: "shiftId",
        type: "string",
        description: "ID of the shift to calculate fees for",
        required: true,
        example: "shift-123"
      },
      {
        name: "hourlyRate",
        type: "number",
        description: "Hourly rate for the shift",
        required: true,
        example: 50
      },
      {
        name: "hours",
        type: "number",
        description: "Number of hours for the shift",
        required: true,
        example: 8
      }
    ]
  },
  {
    id: "documents.processWithAI",
    category: "documents",
    workspace: ["personal", "facility", "organization"],
    service: "documentProcessingService",
    method: "processDocumentWithAI",
    location: "src/services/documentProcessingService.js",
    keywords: ["document", "ocr", "ai", "extract", "cv", "resume", "scan", "autofill"],
    labelKey: "serviceTree:documents.processWithAI",
    descriptionKey: "serviceTree:documents.processWithAIDesc",
    route: "/dashboard/documents",
    icon: "cpu",
    parameters: [
      {
        name: "file",
        type: "File",
        description: "Document file to process (PDF, image, etc.)",
        required: true,
        example: "File object from input"
      },
      {
        name: "documentType",
        type: "string",
        description: "Type of document being processed",
        required: false,
        enum: ["cv", "resume", "certificate", "contract", "other"],
        example: "cv"
      },
      {
        name: "extractFields",
        type: "array",
        description: "Specific fields to extract (if empty, extracts all available fields)",
        required: false,
        example: ["name", "email", "phone", "experience"]
      }
    ]
  }
];

