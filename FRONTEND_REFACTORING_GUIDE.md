# FRONTEND REFACTORING GUIDE

## Overview

The codebase is being refactored to use a centralized **Action Catalog** architecture for backend operations and **Flow System** for multi-step frontend processes. All business logic is now defined as discrete, auditable actions in `services/actions/catalog/`, and all wizards/forms use the Flow Definition Engine in `services/flows/`.

## Architecture

### Actions System (`services/actions/`)

**Core Files:**
- `types.ts` - Action definitions, permissions, context interfaces
- `hook.ts` - `useAction()` React hook for executing actions
- `registry.ts` - Central registry of all actions
- `catalog/` - Business logic organized by domain

**Usage:**
```typescript
import { useAction } from '@/services/actions/hook';

const { execute, loading, error } = useAction();

// Execute any action
await execute('thread.create', {
  collectionType: 'messages',
  content: 'Hello',
  participants: ['user1', 'user2']
});
```

**Benefits:**
- ✅ Automatic permission checking
- ✅ Built-in audit logging
- ✅ Type-safe with Zod schemas
- ✅ AI-compatible (MCP tools)
- ✅ Centralized business logic

### Flows System (`services/flows/`)

**Purpose:** Manage multi-step frontend processes (Wizards, Onboarding, Forms) with schema-driven validation.

**Core Files:**
- `types.ts` - Flow definitions, step interfaces
- `engine.ts` - `useFlow()` React hook (state machine)
- `catalog/` - Flow definitions organized by domain

**Usage:**
```typescript
import { useFlow } from '@/services/flows';
import { OnboardingFlow } from '@/services/flows/catalog/onboarding';

const { step, data, errors, next, back, updateField } = useFlow(OnboardingFlow);

// Automatic validation on next()
const result = await next();
if (result.complete) {
  // All steps validated!
  console.log(result.data);
}
```

**Benefits:**
- ✅ Schema-first validation (Zod)
- ✅ Automatic step progression
- ✅ Conditional step visibility
- ✅ Type-safe form data
- ✅ Built-in error handling
- ✅ Progress tracking

**Example: Onboarding Flow**
```typescript
export const OnboardingFlow: FlowDefinition = {
  id: "flow.onboarding",
  title: "Account Setup",
  steps: [
    {
      id: "role",
      label: "Select Role",
      path: "role",
      schema: Step1_RoleSelection,
    },
    {
      id: "legal",
      label: "Legal Terms",
      path: "legal",
      schema: Step2_LegalConsiderations,
    },
    {
      id: "facility_gln",
      label: "Facility Verification",
      path: "facility-gln",
      schema: Step5_FacilityGLN,
      condition: (data) => data.role === 'company' // Only for companies
    }
  ]
};
```

### Workspace System (`services/actions/catalog/workspace/`)

**Purpose:** Manage workspace-based access control with token-based authentication.

**Core Files:**
- `switchWorkspace.ts` - Switch workspace with verification
- `checkWorkspaces.ts` - Get available workspaces

**Integration:**
```typescript
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';

const { workspaces, needsOnboarding, switchWorkspace } = useWorkspaceAccess();

// Auto-redirects to onboarding if no workspaces
// Provides workspace switching functionality
```

**Features:**
- ✅ Automatic onboarding redirect
- ✅ Workspace membership verification
- ✅ Custom Firebase tokens with claims
- ✅ Audit logging for all switches
- ✅ Permission-based access

### Schemas (`src/schemas/`)

**Purpose:** Centralized Firestore collection schemas and field definitions.

**Usage:**
```typescript
import { usersSchema, contractsSchema } from '@/schemas';
import { COLLECTION_NAMES } from '@/schemas';

const usersRef = collection(db, COLLECTION_NAMES.USERS);
```

**Structure:**
- Each schema file exports: `collectionName`, `description`, `fields`, `indexes`, `notes`
- Use for type safety and documentation
- Reference when creating/updating documents

### Centralized Hooks (`src/hooks/`)

**Purpose:** Reusable React hooks for common functionality.

**Available Hooks:**
- `useWorkspaceAccess.js` - Workspace management and routing
  - Returns: `workspaces`, `needsOnboarding`, `switchWorkspace`, `refreshWorkspaces`
  - Auto-redirects to onboarding when no workspace exists
  - Handles workspace switching and permission checking

**Usage:**
```javascript
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';

const MyComponent = () => {
  const { 
    workspaces,           // Available workspaces
    loading,              // Loading state
    needsOnboarding,      // Needs onboarding?
    switchWorkspace,      // Switch function
    hasAnyWorkspace       // Has at least one workspace
  } = useWorkspaceAccess();
  
  return <div>...</div>;
};
```

**Future Hooks:**
- `usePermissions()` - Permission checking
- `useAudit()` - Audit logging
- `useFeatureFlags()` - Feature flag management

### Centralized Config (`src/config/`)

**Purpose:** All configuration, constants, and utility functions.

**Core Files:**
- `keysDatabase.js` - All localStorage, cookie, Firestore keys
- `workspaceDefinitions.js` - Workspace access logic
- `roleDefinitions.js` - Role and permission definitions
- `appRoutes.js` - Main application routes
- `routeHelpers.js` - Route building utilities
- `routeUtils.js` - Route manipulation utilities
- `subscriptionTiers.js` - Subscription tier logic

**Usage:**
```javascript
import { FIRESTORE_COLLECTIONS } from '@/config/keysDatabase';
import { getAvailableWorkspaces } from '@/config/workspaceDefinitions';
import { hasPermission } from '@/config/roleDefinitions';
```

### Route Guards (`src/components/`)

**Components:**
- `WorkspaceGuard/WorkspaceGuard.js` - Protects routes requiring workspace
- `ProtectedRoute.js` - Protects routes requiring authentication

**Usage:**
```javascript
import WorkspaceGuard from '@/components/WorkspaceGuard/WorkspaceGuard';

<WorkspaceGuard requiredWorkspaceType="facility">
  <FacilityDashboard />
</WorkspaceGuard>
```

### Essential Contexts (`src/contexts/`)

**Maintained Contexts:**
- `AuthContext.js` - Firebase authentication state management
- `NetworkContext.js` - Online/offline status detection
- `NotificationContext.js` - Notification system

**Usage:**
```javascript
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';

const { currentUser, loading } = useAuth();
const { isOnline } = useNetwork();
```

**Note:** These contexts handle React-specific state management and remain separate from the config system. They provide reactive state updates and should NOT be moved to the config folder.

## Migration Path

### OLD (Deprecated):
```typescript
import { db } from '../services/firebase';
import contractsService from '../services/contractsService';

// Direct Firestore calls
await addDoc(collection(db, 'contracts'), data);

// Service layer calls
await contractsService.createContract(data);

// Manual state management for wizards
const [step, setStep] = useState(1);
const [field1, setField1] = useState('');
// ... 10+ more useState calls

// Manual validation
if (step === 1 && !field1) {
  alert("Required!");
  return;
}
```

### NEW (Action Catalog + Flows):
```typescript
import { useAction } from '@/services/actions/hook';
import { useFlow } from '@/services/flows';

// Use action catalog
const { execute } = useAction();
await execute('contract.create', {
  parties: { professional, employer },
  terms: { startDate, endDate }
});

// Use flow system for wizards
const { step, data, next, updateField } = useFlow(MyFlow);
const result = await next();  // Automatic validation!
```

## Key Principles

1. **No Direct Firestore Calls** - Use actions instead
2. **No Service Layer** - Business logic is in `actions/catalog/`
3. **No Manual State for Wizards** - Use flows system
4. **Centralized Hooks** - All custom hooks in `src/hooks/`
5. **Centralized Config** - All constants in `src/config/`
6. **Infrastructure Only** - `services/services/` contains only:
   - `firebase.ts` - Firebase SDK singleton
   - `auth.ts` - Authentication helpers
   - `audit.ts` - Audit logging
   - `flags.ts` - Feature flags
   - `notifications.ts` - Notification system
   - `telemetry.ts` - Error tracking
   - `masquerade.ts` - Admin impersonation

7. **Utilities** - `services/utils/` contains:
   - `validation.ts` - Input validators
   - `date.ts` - Date utilities
   - `errors.ts` - Error handling
   - `performance.ts` - Debounce/throttle
   - `formatting.ts` - CSS utilities

## Action Catalog Structure

```
actions/catalog/
├── calendar/        # Shift management
├── contracts/       # Contract operations
├── messages/        # Thread service (messages, tickets, announcements)
├── payroll/         # Payroll operations
├── profile/         # User profile management
├── marketplace/     # Job postings, applications
├── organization/    # Organization management
├── workspace/       # Workspace switching and access
└── common/          # Shared utilities
```

## Flow Catalog Structure

```
flows/catalog/
├── onboarding/      # User onboarding wizard
│   ├── index.ts     # Flow definition
│   ├── schemas.ts   # Validation schemas
│   └── completion.ts # Completion logic
└── [future flows]   # Application forms, profile setup, etc.
```

## Available Actions

Check `actions/registry.ts` for the complete list. Common actions:
- `thread.create` - Create message/ticket/announcement
- `thread.reply` - Reply to thread
- `thread.fetch` - Get thread with access control
- `contract.create` - Create contract
- `contract.sign` - Sign contract
- `shift.create` - Create shift
- `workspace.switch` - Switch workspace with verification
- `workspace.check_available` - Get available workspaces
- And many more...

## Schema Reference

All collection schemas are documented in `src/schemas/`:
- `users.js` - User identity
- `professionalProfiles.js` - Professional details
- `facilityProfiles.js` - Facility information
- `contracts.js` - Contract structure
- `shifts.js` - Shift data model
- See `COLLECTIONS_SUMMARY.md` for full list

## Next Steps

1. Replace direct Firestore calls with `useAction()` hook
2. Replace service imports with action catalog
3. Replace manual wizard state with `useFlow()` hook
4. Move custom hooks to `src/hooks/`
5. Use centralized config from `src/config/`
6. Use schemas for type safety when working with collections
7. Remove deprecated `src/services/` and `src/utils/` imports

## Resources

- **Action Guide:** `services/actions/THREAD_SERVICE_GUIDE.md`
- **Flows Guide:** `services/flows/README.md`
- **Flows Implementation:** `services/flows/IMPLEMENTATION_GUIDE.md`
- **Migration Guide:** `services/flows/MIGRATION_GUIDE.md`
- **Workspace Integration:** `services/flows/WORKSPACE_INTEGRATION.md`
- **Workspace Routing:** `services/flows/WORKSPACE_ROUTING_COMPLETE.md`
- **Schemas:** `src/schemas/README.md`
- **Registry:** `services/actions/registry.ts`

## Folder Structure

```
src/
├── config/                    # ✅ All configuration and constants
│   ├── keysDatabase.js       # localStorage, cookies, Firestore keys
│   ├── workspaceDefinitions.js # Workspace access logic
│   ├── roleDefinitions.js    # Roles and permissions
│   ├── appRoutes.js          # Main routes
│   ├── routeHelpers.js       # Route utilities
│   ├── routeUtils.js         # Route manipulation
│   └── subscriptionTiers.js  # Subscription logic
│
├── hooks/                     # ✅ Centralized custom hooks
│   └── useWorkspaceAccess.js # Workspace management
│
├── contexts/                  # ✅ React contexts (state management)
│   ├── AuthContext.js        # Firebase auth
│   ├── NetworkContext.js     # Network status
│   └── NotificationContext.js # Notifications
│
├── components/                # ✅ Reusable components
│   ├── WorkspaceGuard/       # Workspace protection
│   └── ProtectedRoute.js     # Auth protection
│
├── services/              # ✅ Core business logic
│   ├── actions/              # Backend operations
│   │   ├── catalog/          # Action implementations
│   │   ├── hook.ts           # useAction() hook
│   │   └── registry.ts       # Action registry
│   │
│   ├── flows/                # Frontend wizards
│   │   ├── catalog/          # Flow implementations
│   │   ├── engine.ts         # useFlow() hook
│   │   └── types.ts          # Flow types
│   │
│   ├── services/             # Infrastructure only
│   └── utils/                # Shared utilities
│
└── schemas/                   # ✅ Firestore schemas
    └── [collection schemas]
```

## Legacy Code Status

### ✅ Completed Refactors:
- Onboarding flow (now uses Flow Definition Engine)
- Workspace access (now uses Passport Strategy)
- Route protection (now uses WorkspaceGuard)
- Route persistence (removed - workspace-based routing)

### 🔄 To Be Refactored:
- Dashboard contexts (DashboardContext, TutorialContext)
- Legacy service layer imports
- Direct Firestore calls in components
- Manual wizard implementations

### 📋 Files Marked for Review:
- 113 files still importing from `contexts/` (AuthContext, NetworkContext are valid)
- Dashboard components using legacy access patterns
- Components with manual state management for multi-step forms
