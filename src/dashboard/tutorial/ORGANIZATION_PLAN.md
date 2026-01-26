# Tutorial Files Organization Plan

## Current Structure
Tutorial-related files are scattered across multiple locations:
- `dashboard/tutorial/` - Core tutorial files
- `dashboard/contexts/TutorialContext/` - **Main context (CORRECT LOCATION - DO NOT MOVE)**
- `dashboard/contexts/tutorial/` - Context utilities
- `dashboard/hooks/` - Tutorial hooks
- `dashboard/onboarding/components/` - Tutorial components
- `dashboard/components/modals/` - Tutorial modals
- `dashboard/components/common/` - Tutorial-aware components
- `dashboard/pages/profile/components/` - Profile tutorial components
- `components/Header/` - Tutorial help component

## Target Structure
All tutorial files will be organized under `dashboard/tutorial/`:

**NOTE**: TutorialContext.js must remain in `dashboard/contexts/TutorialContext/` as the single source of truth.

```
dashboard/tutorial/
├── Tutorial.js (core - already here)
├── Tutorial.module.css (already here)
├── TutorialMockData.js (already here)
├── tutorialSteps.js (already here)
├── contexts/
│   ├── TutorialContext.js (❌ DO NOT MOVE - stays in dashboard/contexts/TutorialContext/)
│   ├── useTutorialLifecycle.js (move from contexts/tutorial/)
│   ├── useTutorialRules.js (move from contexts/tutorial/)
│   └── tutorialReducer.js (move from contexts/tutorial/)
├── hooks/
│   ├── useTutorialPersistence.js (move from hooks/)
│   ├── useTutorialPositioning.js (move from hooks/)
│   └── useProfileTutorial.js (move from pages/profile/hooks/)
├── components/
│   ├── HighlightTooltip.js (move from onboarding/components/)
│   ├── SidebarTutorial.js (move from onboarding/components/)
│   ├── ContentTutorial.js (move from onboarding/components/)
│   ├── SidebarHighlighter.js (move from onboarding/components/)
│   ├── TutorialSelectionModal.js (move from components/modals/)
│   ├── TutorialAwareModal.js (move from components/common/)
│   └── RestartTutorialPopup.js (move from pages/profile/components/)
└── styles/
    ├── TutorialSelectionModal.module.css (move from components/modals/)
    └── TutorialOverlay.module.css (move from onboarding/components/)
```

## Files to Update Imports
After moving files, update imports in:
- All files importing from old locations
- TutorialContext.js (update tutorialSteps import) - **NOTE**: TutorialContext stays in dashboard/contexts/TutorialContext/
- All components using tutorial hooks/contexts

