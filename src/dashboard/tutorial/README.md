# Tutorial Files Organization

This folder contains all tutorial-related files for the MediShift dashboard.

## Current Structure

```
tutorial/
├── Tutorial.js                    # Main tutorial component
├── Tutorial.module.css            # Tutorial component styles
├── TutorialMockData.js            # Mock data for testing
├── tutorialSteps.js               # Tutorial step definitions
├── ORGANIZATION_PLAN.md           # Original organization plan
├── MIGRATION_SUMMARY.md           # Migration status and remaining work
├── README.md                      # This file
├── contexts/                      # Tutorial context files
│   ├── TutorialContext.js         # Main tutorial context (TO BE MOVED)
│   ├── tutorialReducer.js        # ✅ MOVED
│   ├── useTutorialLifecycle.js   # ✅ MOVED
│   └── useTutorialRules.js       # ✅ MOVED
├── hooks/                         # Tutorial hooks
│   ├── useTutorialPersistence.js # TO BE MOVED
│   ├── useTutorialPositioning.js # TO BE MOVED
│   └── useProfileTutorial.js     # TO BE MOVED
├── components/                    # Tutorial UI components
│   ├── HighlightTooltip.js       # TO BE MOVED
│   ├── SidebarTutorial.js        # TO BE MOVED
│   ├── ContentTutorial.js        # TO BE MOVED
│   ├── SidebarHighlighter.js     # TO BE MOVED
│   ├── TutorialSelectionModal.js # TO BE MOVED
│   ├── TutorialAwareModal.js     # TO BE MOVED
│   └── RestartTutorialPopup.js   # TO BE MOVED
└── styles/                        # Tutorial styles
    ├── TutorialSelectionModal.module.css  # TO BE MOVED
    └── TutorialOverlay.module.css        # TO BE MOVED
```

## Files Found

### Core Files (Already in tutorial/)
- ✅ `Tutorial.js`
- ✅ `Tutorial.module.css`
- ✅ `TutorialMockData.js`
- ✅ `tutorialSteps.js`

### Context Files
- ✅ `contexts/tutorialReducer.js` (moved)
- ✅ `contexts/useTutorialLifecycle.js` (moved)
- ✅ `contexts/useTutorialRules.js` (moved)
- ⏳ `contexts/TutorialContext.js` (needs to be moved from `dashboard/contexts/`)

### Hooks
- ⏳ `hooks/useTutorialPersistence.js` (needs to be moved from `dashboard/hooks/`)
- ⏳ `hooks/useTutorialPositioning.js` (needs to be moved from `dashboard/hooks/`)
- ⏳ `hooks/useProfileTutorial.js` (needs to be moved from `dashboard/pages/profile/hooks/`)

### Components
- ⏳ `components/HighlightTooltip.js` (needs to be moved from `dashboard/onboarding/components/`)
- ⏳ `components/SidebarTutorial.js` (needs to be moved from `dashboard/onboarding/components/`)
- ⏳ `components/ContentTutorial.js` (needs to be moved from `dashboard/onboarding/components/`)
- ⏳ `components/SidebarHighlighter.js` (needs to be moved from `dashboard/onboarding/components/`)
- ⏳ `components/TutorialSelectionModal.js` (needs to be moved from `dashboard/components/modals/`)
- ⏳ `components/TutorialAwareModal.js` (needs to be moved from `dashboard/components/common/`)
- ⏳ `components/RestartTutorialPopup.js` (needs to be moved from `dashboard/pages/profile/components/`)

### Styles
- ⏳ `styles/TutorialSelectionModal.module.css` (needs to be moved from `dashboard/components/modals/`)
- ⏳ `styles/TutorialOverlay.module.css` (needs to be moved from `dashboard/onboarding/components/`)

## Next Steps

1. Move remaining files to their new locations
2. Update all import paths in files that reference these moved files
3. Test to ensure all imports resolve correctly
4. Remove old files after confirming everything works

See `MIGRATION_SUMMARY.md` for detailed migration instructions.

