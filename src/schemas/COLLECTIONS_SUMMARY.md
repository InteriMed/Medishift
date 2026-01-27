# DATABASE COLLECTIONS SUMMARY

Complete overview of all Firestore collections in the Interimed application.

## TOTAL COLLECTIONS: 20

---

## USER & PROFILE COLLECTIONS (5)

### 1. users
**Purpose:** Core user identity and authentication data  
**Document ID:** Firebase Auth UID  
**Key Fields:** uid, email, firstName, lastName, displayName, photoURL, emailVerified, roles  
**Notes:** Minimal collection - profile-specific data is in professionalProfiles/facilityProfiles

### 2. professionalProfiles
**Purpose:** Detailed professional profile information  
**Document ID:** userId (matches users/{uid})  
**Key Fields:** userId, profileType, identity, contact, professionalDetails, education, workExperience, verification  
**Notes:** Contains tutorialAccessMode and verification status (not in users collection)

### 3. facilityProfiles
**Purpose:** Facility/employer profile information  
**Document ID:** facilityProfileId (unique facility identifier)  
**Key Fields:** facilityProfileId, profileType, facilityDetails, identityLegal, billingInformation, employees, admins, verification  
**Notes:** Supports multiple employees with roles array

### 4. organizations
**Purpose:** Organization/chain/group profile information  
**Document ID:** organizationProfileId (organization UID)  
**Key Fields:** organizationProfileId, organizationDetails, facilities (map), internalTeam, sharedTeam, verification  
**Notes:** Supports facility management and cross-facility shared teams

### 5. admins
**Purpose:** Admin user accounts and permissions  
**Document ID:** uid (admin user UID)  
**Key Fields:** uid, email, permissions, roles  
**Notes:** Medishift platform administrators

---

## COMMUNICATION COLLECTIONS (3)

### 6. conversations
**Purpose:** Chat conversations between users  
**Document ID:** Auto-generated  
**Key Fields:** participantIds, lastMessageTimestamp, lastMessage, unreadCount  
**Notes:** Supports multi-participant conversations

### 7. messages
**Purpose:** Individual messages within conversations  
**Document ID:** Auto-generated  
**Key Fields:** conversationId, senderId, content, messageType, read, readAt, attachments  
**Notes:** Sub-collection or separate collection with conversationId reference

### 8. notifications
**Purpose:** User notifications  
**Document ID:** Auto-generated  
**Key Fields:** userId, type, title, message, priority, read, actionUrl, expiresAt  
**Notes:** Supports different notification types and priorities

---

## BUSINESS COLLECTIONS (5)

### 9. contracts
**Purpose:** Signed contracts between professionals and facilities  
**Document ID:** Auto-generated  
**Key Fields:** parties (professional, employer), participants, terms, statusLifecycle  
**Notes:** Status values: draft, awaiting_dual_approval, approved, active, completed, cancelled

### 10. shifts
**Purpose:** Work shifts assigned to employees  
**Document ID:** Auto-generated  
**Key Fields:** employeeId, facilityId, startTime, endTime, status, shiftType, compensation  
**Notes:** Status: scheduled, confirmed, completed, cancelled

### 11. payroll
**Purpose:** Payroll records for employees  
**Document ID:** Auto-generated  
**Key Fields:** employeeId, facilityId, period, shifts, hoursWorked, grossAmount, netAmount, status  
**Notes:** Status: draft, pending, processed, paid

### 12. invoices
**Purpose:** Invoice records  
**Document ID:** Auto-generated  
**Key Fields:** invoiceNumber, facilityId, professionalId, amount, items, status, paymentDate  
**Notes:** Status: draft, sent, paid, overdue, cancelled

### 13. bonusClaims
**Purpose:** Bonus claims from professionals  
**Document ID:** Auto-generated  
**Key Fields:** professionalId, facilityId, claimType, amount, status, supportingDocuments  
**Notes:** Status: pending, approved, rejected, paid

---

## MARKETPLACE COLLECTIONS (3)

### 14. positions
**Purpose:** Job positions posted by facilities  
**Document ID:** Auto-generated  
**Key Fields:** facilityId, title, description, jobType, status, startTime, endTime, compensation, requiredSkills  
**Notes:** Status: open, filled, closed, cancelled

### 15. availability
**Purpose:** Availability records  
**Document ID:** Auto-generated  
**Key Fields:** userId, professionalId, startTime, endTime, status  
**Notes:** General availability tracking

### 16. professionalAvailabilities
**Purpose:** Availability listings from professionals  
**Document ID:** Auto-generated  
**Key Fields:** professionalId, title, startTime, endTime, location, languages, experience, certifications  
**Notes:** Detailed availability with requirements and preferences

---

## SYSTEM COLLECTIONS (4)

### 17. facilityInvitations
**Purpose:** Facility invitation records  
**Document ID:** Auto-generated  
**Key Fields:** facilityId, invitedEmail, invitedBy, roles, status, token, expiresAt  
**Notes:** Status: pending, accepted, rejected, expired

### 18. legal_archive
**Purpose:** Legal archive documents  
**Document ID:** Auto-generated  
**Key Fields:** documentType, relatedEntityId, relatedEntityType, documentUrl, archivedBy, retentionUntil  
**Notes:** Long-term storage for legal/compliance documents

### 19. antifraud_hashes
**Purpose:** Anti-fraud hash records for document verification  
**Document ID:** Auto-generated  
**Key Fields:** documentHash, documentType, userId, hashAlgorithm  
**Notes:** Prevents duplicate document uploads and fraud

### 20. auditProfessionalCertification
**Purpose:** Audit logs for professional certification verification  
**Document ID:** Auto-generated  
**Key Fields:** professionalId, certificationId, action, verifiedBy, verificationStatus  
**Notes:** Tracks certification verification history

---

## DATABASE INFORMATION

- **Database Name:** medishift
- **Database Type:** Firestore (NoSQL)
- **Total Collections:** 20
- **Primary Collections:** users, professionalProfiles, facilityProfiles, organizations

## COLLECTION NAMING CONVENTIONS

- Collections use camelCase (e.g., `professionalProfiles`, `facilityProfiles`)
- System collections use snake_case (e.g., `legal_archive`, `antifraud_hashes`)
- Document IDs typically match user UIDs for profile collections
- Auto-generated IDs for transactional collections (contracts, shifts, etc.)

## RELATED CONFIGURATION

- Collection name constants: `src/config/keysDatabase.js`
- Functions collection constants: `functions/config/keysDatabase.js`
- Schema definitions: `src/schemas/*.js`

