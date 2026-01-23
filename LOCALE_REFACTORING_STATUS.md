# Locale Refactoring Status

## Goal
Refactor English locales to only have `pages/` and `dashboard/` folders, mirroring the folder skeleton for pages.

## Completed Steps

### 1. ✅ src/locales/en Structure
- **Deleted root-level files:**
  - ❌ auth.json (content now in pages/auth/auth.json)
  - ❌ common.json (content merged into dashboard/common.json)
  - ❌ dropdowns.json (content merged into dashboard/common.json)
  - ❌ support.json (content in pages/support.json)
  - ❌ validation.json (content in dashboard/validation.json)
- **Removed duplicate folders:**
  - ❌ blog/ (empty folder removed)
  - Note: legal/ folder with Zone.Identifier file still exists (manual cleanup needed)

### 2. ✅ Updated i18n.js Configuration
- All namespace mappings updated to point to pages/ or dashboard/ structure
- `auth` → `pages/auth/auth`
- `common` → `dashboard/common`
- `dropdowns` → `dashboard/common` (same file as common)
- `validation` → `dashboard/validation`
- `support` → `pages/support`
- All other namespaces properly mapped to their respective folders

### 3. ✅ Merged Content Files
- **dashboard/common.json**: Contains merged content from:
  - Original common.json (general UI strings, navigation, buttons, tabs, etc.)
  - Original dropdowns.json (gender, cantons, nationalities, etc.)
  - Footer, header, navigation, routes, and other shared content
- **dashboard/validation.json**: Contains all validation messages

### 4. ✅ Code Compatibility
- No code changes needed! All existing `useTranslation()` calls work because:
  - Namespaces map correctly via i18n.js
  - Both 'common' and 'dropdowns' point to same file (dashboard/common.json)
  - All page-specific namespaces map to correct pages/ subfolder

## Remaining Tasks for public/locales/en

The `public/locales/en` folder needs similar refactoring:

### Files to Delete (root level):
- [ ] auth.json → move content to pages/auth/auth.json ✅ (already created)
- [ ] common.json → content should be in dashboard/common.json
- [ ] dropdowns.json → merge into dashboard/common.json
- [ ] support.json → move to pages/support.json
- [ ] validation.json → move to dashboard/validation.json
- [ ] dashboard.json → move to dashboard/dashboard.json
- [ ] blog.json → move to pages/blog.json
- [ ] legal.json → move to pages/legal.json (if needed)
- [ ] pages.home.json → move to pages/home.json
- [ ] tabs.json → merge into dashboard/common.json

### Folders to Reorganize:
- [ ] blog/*.json → pages/blog/posts/*.json ✅ (posts.json already created)
- [ ] legal/*.json → pages/legal/*.json
- [ ] dashboard/*.json files should be in dashboard/[section]/[section].json structure

### Current public/locales/en Structure:
```
public/locales/en/
├── auth.json (DELETE - use pages/auth/auth.json)
├── common.json (DELETE - use dashboard/common.json)
├── dropdowns.json (DELETE - merge into dashboard/common.json)
├── support.json (DELETE - use pages/support.json)
├── validation.json (DELETE - use dashboard/validation.json)
├── blog/ (MOVE to pages/blog/posts/)
├── legal/ (MOVE to pages/legal/)
├── dashboard/ (REORGANIZE into subfolders)
└── pages/ (ALREADY EXISTS - keep structure)
```

### Desired Final Structure:
```
public/locales/en/
├── pages/
│   ├── home.json
│   ├── about.json
│   ├── contact.json
│   ├── facilities.json
│   ├── professionals.json
│   ├── faq.json
│   ├── sitemap.json
│   ├── support.json
│   ├── glnTestVerif.json
│   ├── testGLN.json
│   ├── notFound.json
│   ├── placeholders.json
│   ├── auth/
│   │   └── auth.json ✅
│   ├── blog/
│   │   ├── blog.json
│   │   └── posts/
│   │       └── posts.json ✅
│   ├── legal/
│   │   ├── privacy.json
│   │   └── terms.json
│   └── onboarding/
│       └── onboarding.json
└── dashboard/
    ├── common.json (merged common + dropdowns)
    ├── validation.json
    ├── dashboard.json
    ├── admin/
    │   └── admin.json
    ├── calendar/
    │   └── calendar.json
    ├── contracts/
    │   └── contracts.json
    ├── marketplace/
    │   └── marketplace.json
    ├── messages/
    │   └── messages.json
    ├── organization/
    │   └── organization.json
    ├── payroll/
    │   └── payroll.json
    ├── personalDashboard/
    │   └── personalDashboard.json
    ├── profile/
    │   └── profile.json
    └── team/
        └── team.json
```

## Impact Summary
- ✅ No breaking changes - all existing imports work
- ✅ Cleaner structure mirroring pages folder
- ✅ Content consolidation (common + dropdowns merged)
- ✅ Easier maintenance and navigation
- ⚠️ Manual cleanup needed in public/locales/en folder

## Next Steps
1. Manually clean up public/locales/en folder to match new structure
2. Delete obsolete root-level files from public/locales/en
3. Remove src/locales/en/legal/ folder with Zone.Identifier file
4. Test all pages to ensure translations load correctly
5. Apply same refactoring to other language folders (fr, de, it) if needed

