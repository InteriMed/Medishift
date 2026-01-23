export const actions = [
  {
    id: "calendar.getEvents",
    category: "calendar",
    service: "calendarService",
    method: "getEvents",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "events", "shifts", "schedule", "get", "fetch", "list", "agenda", "planning"],
    labelKey: "serviceTree:calendar.getEvents",
    descriptionKey: "serviceTree:calendar.getEventsDesc",
    route: "/dashboard/calendar",
    icon: "calendar"
  },
  {
    id: "calendar.createEvent",
    category: "calendar",
    service: "calendarService",
    method: "createEvent",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "event", "shift", "create", "add", "new", "schedule", "book"],
    labelKey: "serviceTree:calendar.createEvent",
    descriptionKey: "serviceTree:calendar.createEventDesc",
    route: "/dashboard/calendar",
    icon: "plus-circle"
  },
  {
    id: "calendar.updateEvent",
    category: "calendar",
    service: "calendarService",
    method: "updateEvent",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "event", "shift", "update", "edit", "modify", "change", "reschedule"],
    labelKey: "serviceTree:calendar.updateEvent",
    descriptionKey: "serviceTree:calendar.updateEventDesc",
    route: "/dashboard/calendar",
    icon: "edit"
  },
  {
    id: "calendar.deleteEvent",
    category: "calendar",
    service: "calendarService",
    method: "deleteEvent",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "event", "shift", "delete", "remove", "cancel"],
    labelKey: "serviceTree:calendar.deleteEvent",
    descriptionKey: "serviceTree:calendar.deleteEventDesc",
    route: "/dashboard/calendar",
    icon: "trash"
  },
  {
    id: "calendar.syncCalendar",
    category: "calendar",
    service: "calendarService",
    method: "syncCalendar",
    location: "src/services/calendarService.js",
    keywords: ["calendar", "sync", "external", "google", "outlook", "integration", "import"],
    labelKey: "serviceTree:calendar.syncCalendar",
    descriptionKey: "serviceTree:calendar.syncCalendarDesc",
    route: "/dashboard/calendar",
    icon: "refresh"
  },
  {
    id: "contracts.getContracts",
    category: "contracts",
    service: "contractsService",
    method: "getContracts",
    location: "src/services/contractsService.js",
    keywords: ["contracts", "list", "fetch", "get", "all", "agreements", "view"],
    labelKey: "serviceTree:contracts.getContracts",
    descriptionKey: "serviceTree:contracts.getContractsDesc",
    route: "/dashboard/contracts",
    icon: "file-text"
  },
  {
    id: "contracts.createContract",
    category: "contracts",
    service: "contractsService",
    method: "createContract",
    location: "src/services/contractsService.js",
    keywords: ["contract", "create", "new", "draft", "agreement", "hire", "employ"],
    labelKey: "serviceTree:contracts.createContract",
    descriptionKey: "serviceTree:contracts.createContractDesc",
    route: "/dashboard/contracts/new",
    icon: "file-plus"
  },
  {
    id: "contracts.updateContract",
    category: "contracts",
    service: "contractsService",
    method: "updateContract",
    location: "src/services/contractsService.js",
    keywords: ["contract", "update", "edit", "modify", "status", "change", "sign"],
    labelKey: "serviceTree:contracts.updateContract",
    descriptionKey: "serviceTree:contracts.updateContractDesc",
    route: "/dashboard/contracts",
    icon: "edit"
  },
  {
    id: "contracts.generatePdf",
    category: "contracts",
    service: "contractsService",
    method: "generatePdf",
    location: "src/services/contractsService.js",
    keywords: ["contract", "pdf", "generate", "download", "document", "export", "print"],
    labelKey: "serviceTree:contracts.generatePdf",
    descriptionKey: "serviceTree:contracts.generatePdfDesc",
    route: "/dashboard/contracts",
    icon: "download"
  },
  {
    id: "contracts.applyToJob",
    category: "contracts",
    service: "contractsService",
    method: "applyToJob",
    location: "src/services/contractsService.js",
    keywords: ["job", "apply", "application", "shift", "vacancy", "submit", "candidate"],
    labelKey: "serviceTree:contracts.applyToJob",
    descriptionKey: "serviceTree:contracts.applyToJobDesc",
    route: "/dashboard/marketplace",
    icon: "send"
  },
  {
    id: "messages.getConversations",
    category: "messages",
    service: "messagesService",
    method: "getConversations",
    location: "src/services/messagesService.js",
    keywords: ["messages", "conversations", "chats", "inbox", "list", "fetch"],
    labelKey: "serviceTree:messages.getConversations",
    descriptionKey: "serviceTree:messages.getConversationsDesc",
    route: "/dashboard/messages",
    icon: "inbox"
  },
  {
    id: "messages.createConversation",
    category: "messages",
    service: "messagesService",
    method: "createConversation",
    location: "src/services/messagesService.js",
    keywords: ["conversation", "chat", "create", "new", "start", "message", "contact"],
    labelKey: "serviceTree:messages.createConversation",
    descriptionKey: "serviceTree:messages.createConversationDesc",
    route: "/dashboard/messages",
    icon: "message-plus"
  },
  {
    id: "messages.sendMessage",
    category: "messages",
    service: "messagesService",
    method: "sendMessage",
    location: "src/services/messagesService.js",
    keywords: ["message", "send", "chat", "reply", "text", "communicate", "write"],
    labelKey: "serviceTree:messages.sendMessage",
    descriptionKey: "serviceTree:messages.sendMessageDesc",
    route: "/dashboard/messages",
    icon: "send"
  },
  {
    id: "profile.getCurrentUser",
    category: "profile",
    service: "userService",
    method: "getCurrentUser",
    location: "src/services/userService.js",
    keywords: ["user", "profile", "current", "me", "self", "get", "account"],
    labelKey: "serviceTree:profile.getCurrentUser",
    descriptionKey: "serviceTree:profile.getCurrentUserDesc",
    route: "/dashboard/profile",
    icon: "user"
  },
  {
    id: "profile.updateUserProfile",
    category: "profile",
    service: "userService",
    method: "updateUserProfile",
    location: "src/services/userService.js",
    keywords: ["profile", "update", "edit", "save", "modify", "user", "settings"],
    labelKey: "serviceTree:profile.updateUserProfile",
    descriptionKey: "serviceTree:profile.updateUserProfileDesc",
    route: "/dashboard/profile/edit",
    icon: "user-edit"
  },
  {
    id: "profile.changePassword",
    category: "profile",
    service: "userService",
    method: "changePassword",
    location: "src/services/userService.js",
    keywords: ["password", "change", "update", "security", "account", "credentials"],
    labelKey: "serviceTree:profile.changePassword",
    descriptionKey: "serviceTree:profile.changePasswordDesc",
    route: "/dashboard/settings",
    icon: "lock"
  },
  {
    id: "profile.uploadProfilePicture",
    category: "profile",
    service: "userService",
    method: "uploadProfilePicture",
    location: "src/services/userService.js",
    keywords: ["profile", "picture", "photo", "avatar", "upload", "image"],
    labelKey: "serviceTree:profile.uploadProfilePicture",
    descriptionKey: "serviceTree:profile.uploadProfilePictureDesc",
    route: "/dashboard/profile",
    icon: "camera"
  },
  {
    id: "profile.searchUsers",
    category: "profile",
    service: "userService",
    method: "searchUsers",
    location: "src/services/userService.js",
    keywords: ["users", "search", "find", "lookup", "name", "email", "professionals"],
    labelKey: "serviceTree:profile.searchUsers",
    descriptionKey: "serviceTree:profile.searchUsersDesc",
    route: "/dashboard/marketplace",
    icon: "search"
  },
  {
    id: "payroll.createPayrollRequest",
    category: "payroll",
    service: "payrollService",
    method: "createPayrollRequest",
    location: "src/services/payrollService.js",
    keywords: ["payroll", "create", "request", "payment", "shift", "worker", "salary"],
    labelKey: "serviceTree:payroll.createPayrollRequest",
    descriptionKey: "serviceTree:payroll.createPayrollRequestDesc",
    route: "/dashboard/payroll",
    icon: "dollar-sign"
  },
  {
    id: "payroll.getPayrollRequests",
    category: "payroll",
    service: "payrollService",
    method: "getPayrollRequests",
    location: "src/services/payrollService.js",
    keywords: ["payroll", "requests", "list", "fetch", "history", "payments"],
    labelKey: "serviceTree:payroll.getPayrollRequests",
    descriptionKey: "serviceTree:payroll.getPayrollRequestsDesc",
    route: "/dashboard/payroll",
    icon: "list"
  },
  {
    id: "payroll.calculateShiftFees",
    category: "payroll",
    service: "payrollService",
    method: "calculateShiftFees",
    location: "src/services/payrollService.js",
    keywords: ["fees", "calculate", "shift", "cost", "commission", "preview", "price"],
    labelKey: "serviceTree:payroll.calculateShiftFees",
    descriptionKey: "serviceTree:payroll.calculateShiftFeesDesc",
    route: "/dashboard/contracts",
    icon: "calculator"
  },
  {
    id: "storage.uploadFile",
    category: "common",
    service: "storageService",
    method: "uploadFile",
    location: "src/services/storageService.js",
    keywords: ["upload", "file", "storage", "document", "image", "attachment"],
    labelKey: "serviceTree:storage.uploadFile",
    descriptionKey: "serviceTree:storage.uploadFileDesc",
    route: "/dashboard/documents",
    icon: "upload"
  },
  {
    id: "storage.deleteFile",
    category: "common",
    service: "storageService",
    method: "deleteFile",
    location: "src/services/storageService.js",
    keywords: ["file", "delete", "remove", "storage"],
    labelKey: "serviceTree:storage.deleteFile",
    descriptionKey: "serviceTree:storage.deleteFileDesc",
    route: "/dashboard/documents",
    icon: "trash"
  },
  {
    id: "notifications.listNotifications",
    category: "common",
    service: "notificationService",
    method: "listNotifications",
    location: "src/services/notificationService.js",
    keywords: ["notifications", "list", "fetch", "alerts", "inbox", "bell"],
    labelKey: "serviceTree:notifications.listNotifications",
    descriptionKey: "serviceTree:notifications.listNotificationsDesc",
    route: "/dashboard",
    icon: "bell"
  },
  {
    id: "notifications.markAllAsRead",
    category: "common",
    service: "notificationService",
    method: "markAllNotificationsAsRead",
    location: "src/services/notificationService.js",
    keywords: ["notifications", "read", "all", "clear", "mark", "dismiss"],
    labelKey: "serviceTree:notifications.markAllAsRead",
    descriptionKey: "serviceTree:notifications.markAllAsReadDesc",
    route: "/dashboard",
    icon: "check-circle"
  },
  {
    id: "account.getDeletionPreview",
    category: "account",
    service: "accountManagementService",
    method: "getDeletionPreview",
    location: "src/services/accountManagementService.js",
    keywords: ["account", "delete", "preview", "gdpr", "data", "retention"],
    labelKey: "serviceTree:account.getDeletionPreview",
    descriptionKey: "serviceTree:account.getDeletionPreviewDesc",
    route: "/dashboard/settings",
    icon: "alert-triangle"
  },
  {
    id: "account.deleteAccount",
    category: "account",
    service: "accountManagementService",
    method: "deleteAccount",
    location: "src/services/accountManagementService.js",
    keywords: ["account", "delete", "gdpr", "anonymize", "close", "remove"],
    labelKey: "serviceTree:account.deleteAccount",
    descriptionKey: "serviceTree:account.deleteAccountDesc",
    route: "/dashboard/settings",
    icon: "user-x"
  },
  {
    id: "account.exportUserData",
    category: "account",
    service: "accountManagementService",
    method: "exportUserData",
    location: "src/services/accountManagementService.js",
    keywords: ["export", "data", "gdpr", "download", "user", "backup"],
    labelKey: "serviceTree:account.exportUserData",
    descriptionKey: "serviceTree:account.exportUserDataDesc",
    route: "/dashboard/settings",
    icon: "download"
  },
  {
    id: "documents.processWithAI",
    category: "documents",
    service: "documentProcessingService",
    method: "processDocumentWithAI",
    location: "src/services/documentProcessingService.js",
    keywords: ["document", "ocr", "ai", "extract", "cv", "resume", "scan", "autofill"],
    labelKey: "serviceTree:documents.processWithAI",
    descriptionKey: "serviceTree:documents.processWithAIDesc",
    route: "/dashboard/documents",
    icon: "cpu"
  },
  {
    id: "api.healthRegistryLookup",
    category: "api",
    service: "cloudFunctions",
    method: "healthRegistryAPI",
    location: "src/services/cloudFunctions.js",
    keywords: ["health", "registry", "gln", "lookup", "verify", "professional", "license"],
    labelKey: "serviceTree:api.healthRegistryLookup",
    descriptionKey: "serviceTree:api.healthRegistryLookupDesc",
    route: "/dashboard/verification",
    icon: "shield"
  },
  {
    id: "api.companySearch",
    category: "api",
    service: "cloudFunctions",
    method: "companySearchAPI",
    location: "src/services/cloudFunctions.js",
    keywords: ["company", "search", "gln", "business", "facility", "organization"],
    labelKey: "serviceTree:api.companySearch",
    descriptionKey: "serviceTree:api.companySearchDesc",
    route: "/dashboard/organization",
    icon: "building"
  }
];

export const categories = {
  calendar: {
    labelKey: "serviceTree:categories.calendar",
    icon: "calendar",
    color: "#3B82F6"
  },
  contracts: {
    labelKey: "serviceTree:categories.contracts",
    icon: "file-text",
    color: "#10B981"
  },
  messages: {
    labelKey: "serviceTree:categories.messages",
    icon: "message-circle",
    color: "#8B5CF6"
  },
  profile: {
    labelKey: "serviceTree:categories.profile",
    icon: "user",
    color: "#F59E0B"
  },
  payroll: {
    labelKey: "serviceTree:categories.payroll",
    icon: "dollar-sign",
    color: "#EF4444"
  },
  common: {
    labelKey: "serviceTree:categories.common",
    icon: "settings",
    color: "#6B7280"
  },
  account: {
    labelKey: "serviceTree:categories.account",
    icon: "shield",
    color: "#EC4899"
  },
  documents: {
    labelKey: "serviceTree:categories.documents",
    icon: "file",
    color: "#14B8A6"
  },
  api: {
    labelKey: "serviceTree:categories.api",
    icon: "cloud",
    color: "#6366F1"
  }
};

export default { actions, categories };

