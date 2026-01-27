export const commonActions = [
  {
    id: "storage.uploadFile",
    category: "common",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "storageService",
    method: "uploadFile",
    location: "src/services/storageService.js",
    keywords: ["upload", "file", "storage", "document", "image", "attachment"],
    labelKey: "serviceTree:storage.uploadFile",
    descriptionKey: "serviceTree:storage.uploadFileDesc",
    route: "/dashboard/documents",
    icon: "upload",
    parameters: [
      {
        name: "file",
        type: "File",
        description: "The file object to upload (document, image, or other file type)",
        required: true,
        example: "File object from input"
      },
      {
        name: "path",
        type: "string",
        description: "Optional storage path where the file should be stored",
        required: false,
        default: "auto-generated path",
        example: "documents/user-uploads/file.pdf"
      },
      {
        name: "metadata",
        type: "object",
        description: "Optional metadata object containing file information",
        required: false,
        example: { contentType: "application/pdf", customMetadata: {} }
      }
    ]
  },
  {
    id: "storage.deleteFile",
    category: "common",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "storageService",
    method: "deleteFile",
    location: "src/services/storageService.js",
    keywords: ["file", "delete", "remove", "storage"],
    labelKey: "serviceTree:storage.deleteFile",
    descriptionKey: "serviceTree:storage.deleteFileDesc",
    route: "/dashboard/documents",
    icon: "trash",
    parameters: [
      {
        name: "filePath",
        type: "string",
        description: "The storage path of the file to delete",
        required: true,
        example: "documents/user-uploads/file.pdf"
      }
    ]
  },
  {
    id: "notifications.listNotifications",
    category: "common",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "notificationService",
    method: "listNotifications",
    location: "src/services/notificationService.js",
    keywords: ["notifications", "list", "fetch", "alerts", "inbox", "bell"],
    labelKey: "serviceTree:notifications.listNotifications",
    descriptionKey: "serviceTree:notifications.listNotificationsDesc",
    route: "/dashboard",
    icon: "bell",
    parameters: [
      {
        name: "limit",
        type: "number",
        description: "Maximum number of notifications to return",
        required: false,
        default: 50,
        example: 20
      },
      {
        name: "unreadOnly",
        type: "boolean",
        description: "If true, only return unread notifications",
        required: false,
        default: false,
        example: true
      }
    ]
  },
  {
    id: "notifications.markAllAsRead",
    category: "common",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "notificationService",
    method: "markAllNotificationsAsRead",
    location: "src/services/notificationService.js",
    keywords: ["notifications", "read", "all", "clear", "mark", "dismiss"],
    labelKey: "serviceTree:notifications.markAllAsRead",
    descriptionKey: "serviceTree:notifications.markAllAsReadDesc",
    route: "/dashboard",
    icon: "check-circle",
    parameters: []
  },
  {
    id: "account.getDeletionPreview",
    category: "account",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "accountManagementService",
    method: "getDeletionPreview",
    location: "src/services/accountManagementService.js",
    keywords: ["account", "delete", "preview", "gdpr", "data", "retention"],
    labelKey: "serviceTree:account.getDeletionPreview",
    descriptionKey: "serviceTree:account.getDeletionPreviewDesc",
    route: "/dashboard/settings",
    icon: "alert-triangle",
    parameters: []
  },
  {
    id: "account.deleteAccount",
    category: "account",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "accountManagementService",
    method: "deleteAccount",
    location: "src/services/accountManagementService.js",
    keywords: ["account", "delete", "gdpr", "anonymize", "close", "remove"],
    labelKey: "serviceTree:account.deleteAccount",
    descriptionKey: "serviceTree:account.deleteAccountDesc",
    route: "/dashboard/settings",
    icon: "user-x",
    parameters: [
      {
        name: "confirmationText",
        type: "string",
        description: "Confirmation text that must match 'DELETE' to proceed",
        required: true,
        example: "DELETE"
      },
      {
        name: "reason",
        type: "string",
        description: "Optional reason for account deletion",
        required: false,
        example: "No longer using the service"
      }
    ]
  },
  {
    id: "account.exportUserData",
    category: "account",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "accountManagementService",
    method: "exportUserData",
    location: "src/services/accountManagementService.js",
    keywords: ["export", "data", "gdpr", "download", "user", "backup"],
    labelKey: "serviceTree:account.exportUserData",
    descriptionKey: "serviceTree:account.exportUserDataDesc",
    route: "/dashboard/settings",
    icon: "download",
    parameters: [
      {
        name: "format",
        type: "string",
        description: "Export format (json or zip)",
        required: false,
        default: "zip",
        enum: ["json", "zip"],
        example: "zip"
      }
    ]
  },
  {
    id: "support.createTicket",
    category: "support",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "supportTicketService",
    method: "CREATE_TICKET",
    location: "src/services/supportTicketService.js",
    keywords: ["support", "ticket", "create", "help", "issue", "problem", "assistance", "request"],
    labelKey: "serviceTree:support.createTicket",
    descriptionKey: "serviceTree:support.createTicketDesc",
    route: "/dashboard/support?action=create",
    icon: "help-circle",
    parameters: [
      {
        name: "subject",
        type: "string",
        description: "Subject/title of the support ticket",
        required: true,
        example: "Unable to access calendar"
      },
      {
        name: "message",
        type: "string",
        description: "Detailed description of the issue or request",
        required: true,
        example: "I'm experiencing an issue where..."
      },
      {
        name: "category",
        type: "string",
        description: "Ticket category",
        required: false,
        default: "general",
        enum: ["general", "technical", "billing", "account", "feature_request", "bug_report"],
        example: "technical"
      },
      {
        name: "priority",
        type: "string",
        description: "Priority level of the ticket",
        required: false,
        default: "medium",
        enum: ["low", "medium", "high", "urgent"],
        example: "medium"
      },
      {
        name: "attachments",
        type: "array",
        description: "Optional array of file attachments (URLs or file references)",
        required: false,
        example: ["https://storage.../screenshot.png"]
      }
    ]
  },
  {
    id: "support.listTickets",
    category: "support",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "supportTicketService",
    method: "LIST_MY_TICKETS",
    location: "src/services/supportTicketService.js",
    keywords: ["support", "tickets", "list", "my", "history", "view", "requests"],
    labelKey: "serviceTree:support.listTickets",
    descriptionKey: "serviceTree:support.listTicketsDesc",
    route: "/dashboard/support",
    icon: "list",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Filter tickets by status",
        required: false,
        enum: ["open", "in_progress", "responded", "resolved", "closed"],
        example: "open"
      },
      {
        name: "category",
        type: "string",
        description: "Filter tickets by category",
        required: false,
        enum: ["general", "technical", "billing", "account", "feature_request", "bug_report"],
        example: "technical"
      }
    ]
  },
  {
    id: "support.getTicket",
    category: "support",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "supportTicketService",
    method: "GET_TICKET",
    location: "src/services/supportTicketService.js",
    keywords: ["support", "ticket", "view", "details", "get", "fetch"],
    labelKey: "serviceTree:support.getTicket",
    descriptionKey: "serviceTree:support.getTicketDesc",
    route: "/dashboard/support",
    icon: "file-text",
    parameters: [
      {
        name: "ticketId",
        type: "string",
        description: "ID of the support ticket to retrieve",
        required: true,
        example: "ticket-123"
      }
    ]
  },
  {
    id: "support.addResponse",
    category: "support",
    workspace: ["personal", "facility", "organization", "admin"],
    service: "supportTicketService",
    method: "ADD_RESPONSE",
    location: "src/services/supportTicketService.js",
    keywords: ["support", "ticket", "reply", "respond", "message", "update"],
    labelKey: "serviceTree:support.addResponse",
    descriptionKey: "serviceTree:support.addResponseDesc",
    route: "/dashboard/support",
    icon: "send",
    parameters: [
      {
        name: "ticketId",
        type: "string",
        description: "ID of the support ticket to respond to",
        required: true,
        example: "ticket-123"
      },
      {
        name: "message",
        type: "string",
        description: "Response message text",
        required: true,
        example: "Thank you for your inquiry..."
      },
      {
        name: "attachments",
        type: "array",
        description: "Optional array of file attachments",
        required: false,
        example: []
      }
    ]
  },
  {
    id: "services.createRequest",
    category: "services",
    workspace: ["personal", "facility", "organization"],
    service: "serviceRequestService",
    method: "CREATE_SERVICE_REQUEST",
    location: "src/services/serviceRequestService.js",
    keywords: ["service", "request", "create", "new", "apply", "order", "booking"],
    labelKey: "serviceTree:services.createRequest",
    descriptionKey: "serviceTree:services.createRequestDesc",
    route: "/dashboard/services?action=create",
    icon: "plus-circle",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Title of the service request",
        required: true,
        example: "Request for temporary staffing"
      },
      {
        name: "description",
        type: "string",
        description: "Detailed description of the service request",
        required: true,
        example: "I need 2 pharmacists for the weekend shift..."
      },
      {
        name: "serviceType",
        type: "string",
        description: "Type of service being requested",
        required: true,
        enum: ["staffing", "training", "consulting", "integration", "custom"],
        example: "staffing"
      },
      {
        name: "category",
        type: "string",
        description: "Service category (varies by serviceType)",
        required: false,
        example: "temporary"
      },
      {
        name: "priority",
        type: "string",
        description: "Priority level of the request",
        required: false,
        default: "medium",
        enum: ["low", "medium", "high", "urgent"],
        example: "medium"
      },
      {
        name: "attachments",
        type: "array",
        description: "Optional array of file attachments",
        required: false,
        example: []
      }
    ]
  },
  {
    id: "services.listRequests",
    category: "services",
    workspace: ["personal", "facility", "organization"],
    service: "serviceRequestService",
    method: "LIST_SERVICE_REQUESTS",
    location: "src/services/serviceRequestService.js",
    keywords: ["service", "requests", "list", "view", "history", "my", "applications"],
    labelKey: "serviceTree:services.listRequests",
    descriptionKey: "serviceTree:services.listRequestsDesc",
    route: "/dashboard/services",
    icon: "list",
    parameters: [
      {
        name: "status",
        type: "string",
        description: "Filter requests by status",
        required: false,
        enum: ["pending", "in_progress", "approved", "rejected", "completed", "cancelled"],
        example: "pending"
      },
      {
        name: "serviceType",
        type: "string",
        description: "Filter by service type",
        required: false,
        enum: ["staffing", "training", "consulting", "integration", "custom"],
        example: "staffing"
      },
      {
        name: "category",
        type: "string",
        description: "Filter by service category",
        required: false,
        example: "temporary"
      }
    ]
  },
  {
    id: "services.getRequest",
    category: "services",
    workspace: ["personal", "facility", "organization"],
    service: "serviceRequestService",
    method: "GET_SERVICE_REQUEST",
    location: "src/services/serviceRequestService.js",
    keywords: ["service", "request", "view", "details", "get", "fetch"],
    labelKey: "serviceTree:services.getRequest",
    descriptionKey: "serviceTree:services.getRequestDesc",
    route: "/dashboard/services",
    icon: "file-text",
    parameters: [
      {
        name: "requestId",
        type: "string",
        description: "ID of the service request to retrieve",
        required: true,
        example: "request-123"
      }
    ]
  },
  {
    id: "services.listAvailableServices",
    category: "services",
    workspace: ["personal", "facility", "organization"],
    service: "serviceRequestService",
    method: "GET_AVAILABLE_SERVICES",
    location: "src/services/serviceRequestService.js",
    keywords: ["services", "list", "available", "catalog", "offerings", "what", "can"],
    labelKey: "serviceTree:services.listAvailableServices",
    descriptionKey: "serviceTree:services.listAvailableServicesDesc",
    route: "/dashboard/services",
    icon: "grid",
    parameters: []
  },
  {
    id: "announcements.createAnnouncement",
    category: "announcements",
    workspace: ["facility", "organization"],
    service: "announcementService",
    method: "createAnnouncement",
    location: "src/dashboard/pages/messages/AnnouncementsPage.js",
    keywords: ["announcement", "create", "new", "post", "broadcast", "communication"],
    labelKey: "serviceTree:announcements.createAnnouncement",
    descriptionKey: "serviceTree:announcements.createAnnouncementDesc",
    route: "/dashboard/announcements/new",
    icon: "megaphone",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Title of the announcement",
        required: true,
        example: "Important Update: New Policy"
      },
      {
        name: "description",
        type: "string",
        description: "Content/body of the announcement",
        required: true,
        example: "We are implementing a new policy..."
      },
      {
        name: "hasPoll",
        type: "boolean",
        description: "Whether to include a poll in the announcement",
        required: false,
        default: false,
        example: true
      },
      {
        name: "poll",
        type: "object",
        description: "Poll data (required if hasPoll is true)",
        required: false,
        example: {
          question: "Do you agree with this change?",
          options: ["Yes", "No", "Maybe"]
        }
      }
    ]
  },
  {
    id: "announcements.votePoll",
    category: "announcements",
    workspace: ["facility", "organization"],
    service: "announcementService",
    method: "votePoll",
    location: "src/dashboard/pages/messages/components/AnnouncementDetail.js",
    keywords: ["announcement", "poll", "vote", "option", "choice", "select"],
    labelKey: "serviceTree:announcements.votePoll",
    descriptionKey: "serviceTree:announcements.votePollDesc",
    route: "/dashboard/announcements",
    icon: "bar-chart-2",
    parameters: [
      {
        name: "threadId",
        type: "string",
        description: "ID of the announcement/thread containing the poll",
        required: true,
        example: "thread-123"
      },
      {
        name: "optionText",
        type: "string",
        description: "Text of the poll option to vote for",
        required: true,
        example: "Yes"
      }
    ]
  }
];

