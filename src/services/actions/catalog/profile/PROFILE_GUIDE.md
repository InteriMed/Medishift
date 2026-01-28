# Profile Management Module

## Overview
Complete profile management system for **Users**, **Facilities**, and **Organizations** with self-service, security controls, and SSO integration.

---

## 1. 👤 My Profile (`/catalog/profile/me/`)

### PROFILE.GET_ME
**Purpose**: Retrieve user profile with merged permissions  
**Input**: None  
**Output**: User object + mergedPermissions + activeFacilityId  

**Logic**:
- Merges Base Permissions + Role Permissions + Facility Permissions
- Returns active facility context

```typescript
const { profile, mergedPermissions, activeFacilityId } = await executeAction('profile.get_me', {});
```

---

### PROFILE.UPDATE_ME
**Purpose**: Update personal details (self-service)  
**Input**: `preferredName`, `language`, `phone`, `emergencyContact`  

**Constraints**:
- Cannot change `email` or `legalName` (requires HR ticket)

```typescript
await executeAction('profile.update_me', {
  preferredName: "Maria",
  language: "fr",
  emergencyContact: {
    name: "John Doe",
    relationship: "Spouse",
    phone: "+41791234567"
  }
});
```

---

### PROFILE.SET_PREFERENCES
**Purpose**: Update notification settings and theme  
**Input**: `theme`, `notifications`, `defaultView`, `locale`  

```typescript
await executeAction('profile.set_preferences', {
  theme: "DARK",
  notifications: {
    push: {
      shifts: true,
      messages: true,
      announcements: false,
      payroll: true
    },
    email: {
      shifts: false,
      messages: true,
      announcements: true,
      payroll: true,
      weekly_summary: true
    }
  }
});
```

---

### PROFILE.UPLOAD_AVATAR
**Purpose**: Upload profile photo (public read allowed)  
**Input**: `imageBase64`, `fileName`  
**Output**: `avatarUrl`  

**Storage**: `public/avatars/{userId}.{extension}`

```typescript
const { avatarUrl } = await executeAction('profile.upload_avatar', {
  imageBase64: "data:image/jpeg;base64,...",
  fileName: "profile.jpg"
});
```

---

## 2. 🏥 Facility Profile (`/catalog/profile/facility/`)

### FACILITY.UPDATE_SETTINGS
**Purpose**: Update workplace settings (hours, address, contact)  
**Input**: `facilityId`, `openingHours`, `timezone`, `address`, `contactPhone`, `contactEmail`  

**Access Control**:
- Can only modify own facility unless `admin.access`

```typescript
await executeAction('facility.update_settings', {
  facilityId: "fac_123",
  openingHours: {
    1: { open: "08:00", close: "18:00", closed: false },
    2: { open: "08:00", close: "18:00", closed: false },
    0: { open: "00:00", close: "00:00", closed: true }
  },
  timezone: "Europe/Zurich",
  address: {
    street: "Rue de la Gare 10",
    city: "Lausanne",
    zip: "1003",
    canton: "VD"
  }
});
```

---

### FACILITY.UPDATE_CONFIG
**Purpose**: Update scheduling rules (min staff, breaks, overtime)  
**Input**: `facilityId`, `minStaffRules`, `breakRules`, `overtimeThreshold`, `allowFloaters`  

**Impact**: These rules are read by **Calendar Engine** to validate shifts

**Risk Level**: HIGH (affects validation logic)

```typescript
await executeAction('facility.update_config', {
  facilityId: "fac_123",
  minStaffRules: {
    pharmacist: 2,
    assistant: 1
  },
  breakRules: {
    lunchDuration: 45,
    breakFrequency: 240,
    minBreakDuration: 15
  },
  overtimeThreshold: 50
});
```

---

### FACILITY.MANAGE_WHITELIST
**Purpose**: Update security whitelist (IPs, geofencing for Time Clock)  
**Input**: `facilityId`, `allowedIPs`, `allowedMacAddresses`, `geofencing`  

**Security**: HIGH risk action (affects clock-in authentication)

```typescript
await executeAction('facility.manage_whitelist', {
  facilityId: "fac_123",
  allowedIPs: ["192.168.1.0/24"],
  geofencing: {
    latitude: 46.5197,
    longitude: 6.6323,
    radiusMeters: 100
  }
});
```

---

## 3. 🏢 Organization Profile (`/catalog/profile/org/`)

### ORG.UPDATE_BRANDING
**Purpose**: White-label the PWA (logo, colors, app name)  
**Input**: `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `appName`  

```typescript
await executeAction('org.update_branding', {
  logoUrl: "https://cdn.example.com/logo.png",
  primaryColor: "#0066CC",
  secondaryColor: "#FF6600",
  appName: "Pharmacie Populaire"
});
```

---

### ORG.MANAGE_SUBSCRIPTION
**Purpose**: Update plan type, billing, and seat count  
**Input**: `planType`, `billingEmail`, `paymentMethod`, `seats`  

**Feature Map**:
- **BASIC**: calendar, messages
- **PRO**: + payroll, reporting
- **ENTERPRISE**: + sso, ai

```typescript
await executeAction('org.manage_subscription', {
  planType: "ENTERPRISE",
  billingEmail: "billing@pharmaciepopulaire.ch",
  seats: 250
});
```

---

### ORG.CONFIGURE_SSO
**Purpose**: Connect to Azure AD / Google Workspace / OKTA  
**Input**: `enabled`, `provider`, `idpMetadataUrl`, `clientId`, `tenantId`, `domainHint`  

**Risk Level**: HIGH (affects authentication flow)

```typescript
await executeAction('org.configure_sso', {
  enabled: true,
  provider: "AZURE_AD",
  clientId: "abc-123-xyz",
  tenantId: "tenant-uuid",
  domainHint: "pharmaciepopulaire.ch"
});
```

---

### ORG.GET_HIERARCHY
**Purpose**: Retrieve parent/child tree (for Floating Pool logic)  
**Input**: `rootId` (optional)  
**Output**: Recursive tree structure  

**Use Case**: Hospital networks where nurses can float within "Internal Medicine" units but not to "Pediatrics"

```typescript
const { hierarchy } = await executeAction('org.get_hierarchy', {
  rootId: "org_root"
});

// Output:
{
  id: "org_root",
  name: "General Hospital",
  type: "ROOT",
  children: [
    {
      id: "dept_internal",
      name: "Internal Medicine",
      type: "DEPARTMENT",
      floatingPoolScope: ["unit_cardio", "unit_nephro"],
      children: [...]
    }
  ]
}
```

---

## Key Features

### 1. **Merged Permissions Logic**
The `profile.get_me` action calculates effective permissions from three sources:
- Base User Permissions
- Role Permissions (from `role_definitions`)
- Facility Permissions (facility-specific grants)

### 2. **Security for Sensitive Settings**
- **Facility Config**: Audit logged with severity HIGH
- **Whitelist Management**: IP restrictions for Time Clock
- **SSO Configuration**: Critical security action

### 3. **White-Labeling**
Organizations can fully rebrand the PWA:
- Custom logo/favicon
- Custom colors
- Custom app name

### 4. **Hierarchical Floating Pool**
The `org.get_hierarchy` action enables smart floating pool logic:
- Build tree structure of departments/units
- Define `floatingPoolScope` (which units staff can float to)
- Used by Calendar Engine for cross-facility assignments

---

## Firestore Collections

```
users/
  {uid}/
    - preferredName
    - language
    - phone
    - emergencyContact
    - photoURL

user_preferences/
  {uid}/
    - theme
    - notifications
    - defaultView

facility_profiles/
  {facilityId}/
    - openingHours
    - timezone
    - address
    - contactPhone

facility_configs/
  {facilityId}/
    - minStaffRules
    - breakRules
    - overtimeThreshold

facility_whitelists/
  {facilityId}/
    - allowedIPs
    - geofencing

organizations/
  global_config/
    - branding
    - subscription

organization_sso/
  config/
    - enabled
    - provider
    - clientId

organization_hierarchy/
  {nodeId}/
    - name
    - type
    - parentId
    - floatingPoolScope
```

---

## Security Rules (Firestore)

```javascript
// Users can update their own profile
match /users/{uid} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == uid 
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['email', 'legalName']);
}

// Facility settings require admin access or own facility manager
match /facility_profiles/{facilityId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.facilityId == facilityId 
    || request.auth.token.role == 'admin';
}

// Organization settings require global admin
match /organizations/global_config {
  allow read: if request.auth != null;
  allow write: if request.auth.token.role == 'admin';
}

// Hierarchy is public read
match /organization_hierarchy/{nodeId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.role == 'admin';
}
```

---

## React Hooks

```typescript
// Get current user profile
const useMyProfile = () => {
  const { profile, mergedPermissions, activeFacilityId } = useAction('profile.get_me', {});
  return { profile, permissions: mergedPermissions, activeFacilityId };
};

// Update preferences
const usePreferences = () => {
  const [preferences, setPreferences] = useState({});
  
  const updatePreferences = async (newPrefs) => {
    await executeAction('profile.set_preferences', newPrefs);
    setPreferences(newPrefs);
  };

  return { preferences, updatePreferences };
};

// Organization hierarchy for floating pool
const useOrgHierarchy = (rootId) => {
  const { hierarchy } = useAction('org.get_hierarchy', { rootId });
  return hierarchy;
};
```

---

## Migration Checklist

- [ ] Deploy new actions to registry
- [ ] Create Firestore collections with security rules
- [ ] Migrate existing user profiles to new structure
- [ ] Test permission merging logic
- [ ] Configure default organization branding
- [ ] Set up initial hierarchy for multi-facility organizations
- [ ] Test SSO integration (if applicable)
- [ ] Verify geofencing for Time Clock (if used)

---

## Testing

```typescript
// Test profile retrieval
const { profile, mergedPermissions } = await executeAction('profile.get_me', {});
console.log('Effective permissions:', mergedPermissions);

// Test facility config update
await executeAction('facility.update_config', {
  facilityId: 'fac_test',
  minStaffRules: { pharmacist: 2 }
});

// Verify audit log
const auditLog = await getDoc(doc(db, 'system_logs', 'latest'));
assert(auditLog.data().actionId === 'facility.update_config');
```

