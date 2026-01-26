# Tutorial Files Migration Summary

## Files Already Moved
✅ `contexts/tutorialReducer.js` → `tutorial/contexts/tutorialReducer.js`
✅ `contexts/useTutorialLifecycle.js` → `tutorial/contexts/useTutorialLifecycle.js`
✅ `contexts/useTutorialRules.js` → `tutorial/contexts/useTutorialRules.js`

## Files Still To Move

### Context Files
- ✅ `dashboard/contexts/TutorialContext/TutorialContext.js` - **CORRECT LOCATION - DO NOT MOVE**
  - TutorialContext must remain in `dashboard/contexts/TutorialContext/` as the single source of truth

### Hooks
- [ ] `dashboard/hooks/useTutorialPersistence.js` → `dashboard/tutorial/hooks/useTutorialPersistence.js`
- [ ] `dashboard/hooks/useTutorialPositioning.js` → `dashboard/tutorial/hooks/useTutorialPositioning.js`
- [ ] `dashboard/pages/profile/hooks/useProfileTutorial.js` → `dashboard/tutorial/hooks/useProfileTutorial.js`

### Components
- [ ] `dashboard/onboarding/components/HighlightTooltip.js` → `dashboard/tutorial/components/HighlightTooltip.js`
- [ ] `dashboard/onboarding/components/SidebarTutorial.js` → `dashboard/tutorial/components/SidebarTutorial.js`
- [ ] `dashboard/onboarding/components/ContentTutorial.js` → `dashboard/tutorial/components/ContentTutorial.js`
- [ ] `dashboard/onboarding/components/SidebarHighlighter.js` → `dashboard/tutorial/components/SidebarHighlighter.js`
- [ ] `dashboard/components/modals/TutorialSelectionModal.js` → `dashboard/tutorial/components/TutorialSelectionModal.js`
- [ ] `dashboard/components/common/TutorialAwareModal.js` → `dashboard/tutorial/components/TutorialAwareModal.js`
- [ ] `dashboard/pages/profile/components/RestartTutorialPopup.js` → `dashboard/tutorial/components/RestartTutorialPopup.js`

### Styles
- [ ] `dashboard/components/modals/TutorialSelectionModal.module.css` → `dashboard/tutorial/styles/TutorialSelectionModal.module.css`
- [ ] `dashboard/onboarding/components/TutorialOverlay.module.css` → `dashboard/tutorial/styles/TutorialOverlay.module.css`

## Import Path Updates Required

### Files importing from `contexts/tutorial/`:
- Update: `from '../../contexts/tutorial/tutorialReducer'` → `from '../../tutorial/contexts/tutorialReducer'`
- Update: `from '../../contexts/tutorial/useTutorialLifecycle'` → `from '../../tutorial/contexts/useTutorialLifecycle'`
- Update: `from '../../contexts/tutorial/useTutorialRules'` → `from '../../tutorial/contexts/useTutorialRules'`

### Files importing from `contexts/TutorialContext`:
- ✅ **CORRECT**: All imports should use `from '../../contexts/TutorialContext'` or `from '../contexts/TutorialContext'`
- ❌ **DO NOT UPDATE**: TutorialContext stays in `dashboard/contexts/TutorialContext/` (not in tutorial/contexts/)

### Files importing tutorial hooks:
- Update: `from '../../hooks/useTutorialPersistence'` → `from '../../tutorial/hooks/useTutorialPersistence'`
- Update: `from '../../hooks/useTutorialPositioning'` → `from '../../tutorial/hooks/useTutorialPositioning'`

### Files importing tutorial components:
- Update: `from '../onboarding/components/HighlightTooltip'` → `from '../tutorial/components/HighlightTooltip'`
- Update: `from '../onboarding/components/SidebarTutorial'` → `from '../tutorial/components/SidebarTutorial'`
- Update: `from '../components/modals/TutorialSelectionModal'` → `from '../tutorial/components/TutorialSelectionModal'`

## Notes
- ✅ **TutorialContext.js** is correctly located in `dashboard/contexts/TutorialContext/` - this is the ONLY location
- All imports correctly reference `dashboard/contexts/TutorialContext/` - no changes needed
- Some components may have relative imports that need adjustment based on their location
- CSS module imports will need path updates in their respective JS files

