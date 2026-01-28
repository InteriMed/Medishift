# Action Catalog Visual Map

This document provides visual representations of the Action Catalog architecture.

---

## 📊 Action Distribution by Category

```mermaid
pie title Actions by Category (152 Total)
    "Team" : 20
    "Calendar" : 18
    "Communication" : 17
    "Profile" : 12
    "Marketplace" : 11
    "Organization" : 11
    "Time Tracking" : 10
    "Contracts" : 8
    "Recruitment" : 7
    "Payroll" : 7
    "Support" : 5
    "Admin" : 4
    "AI/Docs" : 3
    "Fiduciary" : 3
    "Education" : 3
    "Risk" : 3
    "Verification" : 2
```

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend"
        UI[React Components]
        Hook[useAction Hook]
    end
    
    subgraph "Action Layer"
        Registry[Action Registry<br/>152 Actions]
        Types[Type Definitions<br/>59 Permissions]
        Catalog[Action Catalog]
    end
    
    subgraph "Backend"
        CF[Cloud Functions<br/>Admin SDK]
        Auth[Firebase Auth]
        DB[(Firestore)]
    end
    
    UI --> Hook
    Hook --> Registry
    Registry --> Catalog
    Catalog --> CF
    CF --> Auth
    CF --> DB
    
    style Registry fill:#4CAF50
    style Hook fill:#2196F3
    style CF fill:#FF9800
```

---

## 🔐 Permission Hierarchy

```mermaid
graph LR
    Admin[admin.access]
    
    subgraph "High-Level Permissions"
        Admin --> FacAdmin[Facility Admin]
        Admin --> OrgAdmin[Organization Admin]
        Admin --> SysAdmin[System Admin]
    end
    
    subgraph "Domain Permissions"
        FacAdmin --> Calendar[Calendar & Scheduling]
        FacAdmin --> Team[Team Management]
        FacAdmin --> Payroll[Payroll Operations]
        FacAdmin --> Time[Time Tracking]
        
        OrgAdmin --> OrgOps[Org Analytics]
        OrgAdmin --> Pool[Staff Pooling]
        OrgAdmin --> CrossCharge[Cross-Charging]
        
        SysAdmin --> Billing[Billing Management]
        SysAdmin --> Tenant[Tenant Provisioning]
        SysAdmin --> Impersonate[User Impersonation]
    end
    
    subgraph "Standard Permissions"
        Calendar --> shift.create
        Calendar --> shift.view
        
        Team --> team.add
        Team --> team.remove
        
        Time --> time.clock_in
        Time --> time.clock_out
        
        Marketplace[Marketplace]
        Marketplace --> mk.post
        Marketplace --> mk.apply
    end
    
    style Admin fill:#F44336
    style FacAdmin fill:#FF9800
    style OrgAdmin fill:#FF9800
    style SysAdmin fill:#FF9800
```

---

## 🔄 Action Execution Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Hook as useAction()
    participant Registry as Action Registry
    participant Action as Action Handler
    participant Auth as Firebase Auth
    participant CF as Cloud Function
    participant DB as Firestore
    participant Audit as Audit Logger
    
    UI->>Hook: executeAction('payroll.lock_period', input)
    Hook->>Auth: Verify user authentication
    Auth-->>Hook: User token + claims
    Hook->>Registry: Lookup action by ID
    Registry-->>Hook: Action definition
    Hook->>Hook: Check permissions
    
    alt Client-Side Action
        Hook->>Action: Execute handler(input, context)
        Action->>DB: Read/Write data
        Action->>Audit: Log START
        DB-->>Action: Response
        Action->>Audit: Log SUCCESS
        Action-->>Hook: Result
    else Backend Action (Admin SDK)
        Hook->>CF: Call Cloud Function
        CF->>Auth: Verify ID token
        CF->>DB: Admin SDK operations
        CF->>Audit: Log action
        DB-->>CF: Response
        CF-->>Hook: Result
    end
    
    Hook-->>UI: Display result / Update UI
```

---

## 📂 Directory Structure

```mermaid
graph TD
    Root[src/services/actions/]
    
    Root --> Registry[registry.ts<br/>152 actions]
    Root --> Types[types.ts<br/>59 permissions]
    Root --> Catalog[catalog/]
    Root --> Middleware[middleware/]
    
    Catalog --> Admin[admin/ - 4]
    Catalog --> AI[ai/ - 3]
    Catalog --> Calendar[calendar/ - 18]
    Catalog --> Communication[communication/ - 17]
    Catalog --> Contracts[contracts/ - 8]
    Catalog --> Education[education/ - 3]
    Catalog --> Fiduciary[fiduciary/ - 3]
    Catalog --> Marketplace[marketplace/ - 11]
    Catalog --> Organization[organization/ - 11]
    Catalog --> Payroll[payroll/ - 7]
    Catalog --> Profile[profile/ - 12]
    Catalog --> Recruitment[recruitment/ - 7]
    Catalog --> Risk[risk/ - 3]
    Catalog --> Support[support/ - 5]
    Catalog --> Team[team/ - 20]
    Catalog --> Time[time/ - 10]
    Catalog --> Verification[verification/ - 2]
    
    style Registry fill:#4CAF50
    style Types fill:#4CAF50
    style Catalog fill:#2196F3
    style Middleware fill:#FF9800
```

---

## 🚦 Action Risk Levels

```mermaid
graph LR
    subgraph "CRITICAL - Requires 2FA"
        C1[admin.impersonate_user]
        C2[admin.provision_tenant]
        C3[risk.trigger_crisis_alert]
    end
    
    subgraph "HIGH - Requires Confirmation"
        H1[payroll.lock_period]
        H2[payroll.export_data]
        H3[team.terminate_user]
        H4[risk.block_user]
        H5[admin.manage_billing]
        H6[time.adjust_balance]
    end
    
    subgraph "MEDIUM - Standard Operations"
        M1[calendar.create_shift]
        M2[team.invite_user]
        M3[contracts.sign_digital]
        M4[marketplace.post_mission]
    end
    
    subgraph "LOW - Read/Query"
        L1[profile.me.get]
        L2[team.list_employees]
        L3[calendar.list_events]
        L4[thread.list]
    end
    
    style C1 fill:#F44336
    style C2 fill:#F44336
    style C3 fill:#F44336
    style H1 fill:#FF9800
    style H2 fill:#FF9800
    style H3 fill:#FF9800
    style M1 fill:#FFC107
    style M2 fill:#FFC107
    style L1 fill:#4CAF50
    style L2 fill:#4CAF50
```

---

## 🔄 State Machine: Payroll Period Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: payroll.calculate_period_variables
    
    DRAFT --> CALCULATING: Calculate hours from shifts
    CALCULATING --> DRAFT: Add manual entries
    DRAFT --> REVIEWING: Manager Review
    
    REVIEWING --> DRAFT: payroll.add_manual_entry<br/>(corrections)
    REVIEWING --> LOCKED: payroll.lock_period<br/>(Hard freeze)
    
    LOCKED --> EXPORTING: payroll.export_data
    EXPORTING --> SENT_TO_FIDUCIARY: CSV/XML generated
    
    SENT_TO_FIDUCIARY --> PROCESSING: Fiduciary processes
    PROCESSING --> CORRECTING: fiduciary.flag_discrepancy<br/>(if issues found)
    CORRECTING --> REVIEWING: Re-open for corrections
    
    PROCESSING --> PAYSLIPS_READY: Payslips uploaded<br/>payroll.upload_payslip_bundle
    PAYSLIPS_READY --> PUBLISHED: payroll.publish_payslips<br/>(visible to employees)
    
    PUBLISHED --> [*]: Period closed
    
    note right of LOCKED
        IMMUTABLE STATE
        No shifts can be modified
        Audit trail recorded
    end note
```

---

## 🌐 Multi-Tenant Architecture

```mermaid
graph TB
    User[User Account]
    
    subgraph "Workspace Selection"
        Personal[Personal Workspace<br/>workspace.switch]
        Facility[Facility Workspace<br/>workspace.switch]
        Organization[Org Workspace<br/>workspace.switch]
        AdminWS[Admin Workspace<br/>workspace.switch]
    end
    
    subgraph "Custom Claims in JWT"
        Claims[workspaceId<br/>workspaceType<br/>facilityId<br/>role<br/>permissions[]]
    end
    
    subgraph "Action Context"
        Context[userId<br/>facilityId<br/>userPermissions<br/>auditLogger]
    end
    
    subgraph "Data Access"
        DB1[(Facility 1<br/>Firestore)]
        DB2[(Facility 2<br/>Firestore)]
        DB3[(Org Data<br/>Firestore)]
    end
    
    User --> Personal
    User --> Facility
    User --> Organization
    User --> AdminWS
    
    Facility --> Claims
    Claims --> Context
    
    Context --> DB1
    Context --> DB2
    Context --> DB3
    
    note right of Claims
        "Passport" issued by backend
        Embedded in Firebase ID Token
        Verified on every request
    end note
    
    style Claims fill:#4CAF50
    style Context fill:#2196F3
```

---

## 📊 Implementation Progress Timeline

```mermaid
gantt
    title Action Catalog Implementation
    dateFormat YYYY-MM-DD
    section Phase 1
    Initial Actions (78)           :done, p1, 2024-01-01, 2025-12-01
    section Phase 2
    Registration (74 new)          :done, p2, 2026-01-28, 2026-01-28
    Permission System (43 new)     :done, p2b, 2026-01-28, 2026-01-28
    Documentation                  :done, p2c, 2026-01-28, 2026-01-28
    section Phase 3 (Planned)
    Backend Migration              :active, p3, 2026-02-01, 2026-03-15
    Security Enhancements          :p4, 2026-03-16, 2026-04-01
    Performance Optimization       :p5, 2026-04-02, 2026-04-15
```

---

## 🔗 Action Dependencies

```mermaid
graph LR
    subgraph "Core Actions"
        Auth[Firebase Auth]
        Switch[workspace.switch]
    end
    
    subgraph "Calendar Actions"
        Switch --> CreateShift[calendar.create_shift]
        CreateShift --> PublishRoster[calendar.publish_roster]
        PublishRoster --> Timesheet[calendar.export_timesheet]
    end
    
    subgraph "Payroll Actions"
        Timesheet --> Calculate[payroll.calculate_period_variables]
        Calculate --> Lock[payroll.lock_period]
        Lock --> Export[payroll.export_data]
        Export --> Upload[payroll.upload_payslip_bundle]
        Upload --> Publish[payroll.publish_payslips]
    end
    
    subgraph "Team Actions"
        Switch --> Invite[team.invite_user]
        Invite --> AddEmployee[team.add_employee_to_facility]
        AddEmployee --> AssignRole[team.update_employee_role]
        AssignRole --> CreateContract[contracts.create]
    end
    
    style Auth fill:#F44336
    style Switch fill:#FF9800
    style Lock fill:#FF9800
    style Export fill:#FF9800
```

---

## 📈 Action Usage Patterns

```mermaid
pie title Most Used Action Types
    "Read Operations" : 40
    "Create/Update" : 35
    "Delete/Archive" : 10
    "Financial" : 8
    "Admin/System" : 7
```

---

## 🎯 Future Enhancements

```mermaid
mindmap
    root((Action Catalog))
        Backend Migration
            Cloud Functions
            Admin SDK
            Tenant Isolation
        Security
            Rate Limiting
            2FA for Critical Actions
            Enhanced Audit Logs
        Performance
            Action Caching
            Batch Operations
            Optimistic UI
        AI Integration
            Action Suggestions
            Automated Workflows
            Predictive Analytics
        Mobile
            Offline Support
            Push Notifications
            Biometric Auth
```

---

## 🔍 Action Search & Discovery

```mermaid
graph TD
    Search[Action Search]
    
    Search --> ByCategory[By Category]
    Search --> ByPermission[By Permission]
    Search --> ByKeyword[By Keyword]
    Search --> ByRisk[By Risk Level]
    
    ByCategory --> Results[Action Results]
    ByPermission --> Results
    ByKeyword --> Results
    ByRisk --> Results
    
    Results --> Execute[Execute Action]
    Results --> ViewDetails[View Details]
    Results --> CheckPerm[Check Permission]
    
    Execute --> UI[UI Component]
    ViewDetails --> Docs[Documentation]
    CheckPerm --> Access[Access Control]
```

---

## 📝 Legend

| Symbol | Meaning |
|--------|---------|
| 🆕 | Newly registered action |
| ✅ | Complete and tested |
| 🔴 | High risk / Critical |
| 🟡 | Medium risk |
| 🟢 | Low risk / Safe |
| 🔒 | Requires special permission |
| 📊 | Returns data/analytics |
| 💾 | Modifies database |
| 🔄 | State transition |

---

**Generated**: 2026-01-28  
**Total Actions**: 152  
**Total Permissions**: 59  
**Status**: ✅ Complete

