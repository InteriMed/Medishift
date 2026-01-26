# Service Tree Catalog

This directory contains the service tree catalog system, which provides a searchable, workspace-aware action catalog with parameter schemas for AI agentic calls.

## Structure

The catalog is organized by workspace types:

- **`actions/common.js`** - Actions available in all workspaces (storage, notifications, account management)
- **`actions/personal.js`** - Personal workspace actions (calendar, contracts, messages, profile, payroll, documents)
- **`actions/organization.js`** - Organization workspace actions (employees, organigram, hiring, contracts, payroll, policies)
- **`actions/catalog.js`** - Catalog search actions (organizations, professionals, facilities)
- **`actions/api.js`** - API verification actions (GLN lookup, company search)

## Action Schema

Each action includes:

```javascript
{
  id: "action.uniqueId",
  category: "categoryName",
  workspace: ["personal", "facility", "organization", "admin"], // Workspaces where action is available
  service: "serviceName",
  method: "methodName",
  location: "src/path/to/service.js",
  keywords: ["search", "terms"],
  labelKey: "serviceTree:category.action",
  descriptionKey: "serviceTree:category.actionDesc",
  route: "/dashboard/route",
  icon: "icon-name",
  parameters: [
    {
      name: "paramName",
      type: "string|number|boolean|object|array|File",
      description: "Human-readable description of the parameter",
      required: true|false,
      default: "defaultValue", // Optional
      enum: ["value1", "value2"], // Optional, for limited values
      example: "example value"
    }
  ]
}
```

## Parameter Types

- **string**: Text values
- **number**: Numeric values
- **boolean**: True/false values
- **object**: Complex objects with nested properties
- **array**: Lists of values
- **File**: File uploads (browser File objects)

## Usage for AI Agents

### Get Available Actions

```javascript
import { getActionsByWorkspace } from './service_tree';

const personalActions = getActionsByWorkspace('personal');
const organizationActions = getActionsByWorkspace('organization');
```

### Get Action Parameters

```javascript
import { getActionParameters } from './service_tree';

const params = getActionParameters('calendar.createEvent');
// Returns: [{ name: "title", type: "string", required: true, ... }, ...]
```

### Search Actions

```javascript
import { searchActions } from './service_tree/searchService';

const results = searchActions('create event', 'en', {
  workspace: 'personal',
  limit: 10
});
```

### Execute Action with Parameters

When calling an action programmatically, use the parameters schema to validate and construct the call:

```javascript
const action = getActionById('calendar.createEvent');
const params = getActionParameters('calendar.createEvent');

// Validate required parameters
const requiredParams = params.filter(p => p.required);
// Check that all required params are provided

// Call the service method
const service = require(action.location);
const result = await service[action.method]({
  title: "Morning Shift",
  start: "2024-01-15T09:00:00Z",
  end: "2024-01-15T17:00:00Z",
  // ... other parameters
});
```

## Workspace Types

- **personal**: Personal/professional workspace
- **facility**: Facility/team workspace
- **organization**: Organization/chain workspace
- **admin**: Admin workspace

## Categories

- **calendar**: Calendar and event management
- **contracts**: Contract management
- **messages**: Messaging and communication
- **profile**: User profile management
- **payroll**: Payroll and payment processing
- **common**: Common utilities (storage, notifications)
- **account**: Account management (deletion, export)
- **documents**: Document processing
- **api**: External API integrations
- **catalog**: Catalog search (organizations, professionals, facilities)
- **organization**: Organization-specific actions

