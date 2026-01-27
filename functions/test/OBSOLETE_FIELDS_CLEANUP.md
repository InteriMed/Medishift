# CLEANUP: REMOVED OBSOLETE FIELDS FROM USERS COLLECTION

## CHAMPS OBSOLÈTES SUPPRIMÉS

Les champs suivants ont été supprimés de la collection `users` selon l'architecture de la base de données:

### ❌ Champs supprimés de `users`:
1. **`role`** - NE DOIT PAS être dans users
2. **`profileType`** - Doit être dans professionalProfiles ou facilityProfiles
3. **`profileCompleted`** - Obsolète (utiliser tutorialAccessMode)
4. **`profileStatus`** - Obsolète
5. **`tutorialPassed`** - Obsolète (utiliser tutorialAccessMode)
6. **`tutorialAccessMode`** - Doit être dans les collections de profils
7. **`facilityMemberships`** - Remplacé par `roles` array
8. **`verifiedAt`** - Déplacé vers les collections de profils
9. **`verifiedBy`** - Déplacé vers les collections de profils

## STRUCTURE CORRECTE

### Collection `users` (SEULEMENT):
```javascript
{
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  displayName: string,
  photoURL: string | null,
  emailVerified: boolean,
  roles: [                                    // Accès aux facilities/organisations
    { facility_uid: string, roles: string[] },
    { organization_uid: string, roles: string[], rights: string[] }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp,
  adminCreated: boolean (optionnel),
  adminCreatedAt: Timestamp (optionnel)
}
```

### Collection `professionalProfiles`:
```javascript
{
  userId: string,
  email: string,
  profileType: 'doctor' | 'nurse' | etc.,      // ICI, pas dans users
  tutorialAccessMode: 'enabled' | 'disabled',  // ICI, pas dans users
  subscriptionTier: 'free' | 'premium' | etc.,
  identity: { ... },
  contact: { ... },
  // ... autres champs professionnels
  verification: {
    status: string,
    verifiedAt: Timestamp,                     // ICI, pas dans users
    verifiedBy: string                         // ICI, pas dans users
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Collection `facilityProfiles`:
```javascript
{
  userId: string,
  facilityProfileId: string,
  email: string,
  profileType: 'pharmacy' | 'clinic' | etc.,   // ICI, pas dans users
  tutorialAccessMode: 'enabled' | 'disabled',  // ICI, pas dans users
  subscriptionTier: 'free' | 'premium' | etc.,
  facilityDetails: { ... },
  identityLegal: { ... },
  billingInformation: { ... },
  employees: [
    { user_uid: string, uid: string, roles: string[] }  // Structure correcte
  ],
  verification: {
    status: string,
    verifiedAt: Timestamp,                     // ICI, pas dans users
    verifiedBy: string                         // ICI, pas dans users
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## FICHIERS MODIFIÉS

### 1. `generateTestData.js`
✅ Supprimé `onboardingStatus`, `profileCompleted`, `verifiedAt`, `verifiedBy` de users
✅ Conserve uniquement: uid, email, firstName, lastName, displayName, emailVerified, roles, timestamps

### 2. `AccountCreationTool.js`
✅ Supprimé `onboardingStatus`, `profileCompleted`, `verifiedAt`, `verifiedBy` de users
✅ Ajouté `tutorialAccessMode: 'disabled'` dans professionalProfiles
✅ Ajouté `tutorialAccessMode: 'disabled'` dans facilityProfiles
✅ Ajouté `facilityProfileId` dans facilityProfiles
✅ Ajouté `roles` array avec facility_uid dans users pour facilities

### 3. `cleanupObsoleteUserFields.js` (NOUVEAU)
✅ Script pour nettoyer les champs obsolètes dans la base de données existante
✅ Supprime automatiquement tous les champs obsolètes de la collection users

## COMMENT DÉTERMINER L'ACCÈS AUX WORKSPACES

### ✅ Professional Workspace Access:
```javascript
const hasProfessionalAccess = async (userId) => {
  const profDoc = await db.collection('professionalProfiles').doc(userId).get();
  return profDoc.exists();  // Si le document existe, l'utilisateur a accès
};
```

### ✅ Facility Workspace Access:
```javascript
const hasFacilityAccess = (userData, facilityId) => {
  const roles = userData.roles || [];
  return roles.some(r => r.facility_uid === facilityId);
};
```

### ✅ Admin Workspace Access:
```javascript
const hasAdminAccess = async (userId) => {
  const adminDoc = await db.collection('admins').doc(userId).get();
  return adminDoc.exists() && adminDoc.data().isActive !== false;
};
```

## COMMANDES POUR NETTOYER

### Nettoyer les champs obsolètes dans la base existante:
```bash
cd "NEW INTERIMED MERGED/functions"
npm run cleanup-obsolete-fields
```

### Générer de nouvelles données de test (avec structure correcte):
```bash
npm run generate-test-data
```

## RÈGLES IMPORTANTES

### ❌ NE JAMAIS:
- Ajouter `role` ou `profileType` dans users
- Ajouter `tutorialAccessMode` ou `tutorialPassed` dans users
- Utiliser `profileCompleted` ou `profileStatus`
- Utiliser `facilityMemberships` (utiliser `roles` à la place)

### ✅ TOUJOURS:
- Vérifier l'existence de `professionalProfiles/{userId}` pour l'accès professional
- Utiliser `users.roles` array pour l'accès facility/organization
- Stocker `profileType` et `tutorialAccessMode` dans les collections de profils
- Utiliser les utilitaires centralisés: `hasProfessionalAccess`, `hasFacilityAccess`, `hasAdminAccess`

## RÉFÉRENCES

- **Documentation**: `NEW INTERIMED MERGED/rules` (Cursor Rules)
- **Fichier de configuration**: `src/config/keysDatabase.js`
- **Utilitaires d'accès**: `src/utils/workspaceAccess.js`
- **Définitions de rôles**: `src/config/roleDefinitions.js`

## VÉRIFICATION

Après le nettoyage, vérifiez que:
1. ✅ Collection `users` ne contient que les champs autorisés
2. ✅ `profileType` est dans professionalProfiles/facilityProfiles
3. ✅ `tutorialAccessMode` est dans les collections de profils
4. ✅ `roles` array est correctement structuré
5. ✅ Les workspaces se chargent correctement
6. ✅ Aucune erreur "Erreur lors du chargement de la configuration du profil"

---

**Date**: 2026-01-27
**Status**: ✅ COMPLETE
**Effet**: Corrige l'erreur de chargement de configuration de profil

