# Files to Remove After Testing

These legacy files have been replaced by the new Flow-based architecture and can be safely removed once testing is complete:

## Profile Components (Legacy - DO NOT USE)
- [ ] `Profile.js` - Replaced by workspace-specific pages (ProfessionalProfile, FacilityProfile, OrganizationProfile)
- [ ] `Profile.module.css` - Replaced by Tailwind utility classes
- [ ] `components/ProfileHeader.js` - Replaced by `components/titles/PageHeader.js`
- [ ] `components/SideMenu.js` - Replaced by `components/titles/SubTabs.js`

## Professional Components (Legacy - DO NOT USE)
- [ ] `professionals/components/PersonalDetails.js` - Replaced by `tabs/professional/PersonalDetailsTab.js`
- [ ] `professionals/components/PersonalDetails.module.css`
- [ ] `professionals/components/BillingInformation.js` - Replaced by `tabs/professional/BillingInformationTab.js`
- [ ] `professionals/components/ProfessionalBackground.js` - To be replaced (implementation pending)
- [ ] `professionals/components/DocumentUploads.js` - To be replaced (implementation pending)
- [ ] `professionals/components/Facility.js` - Legacy, not needed in new architecture
- [ ] `professionals/components/PreferenceDays.js` - To be integrated into settings
- [ ] `professionals/components/Settings.js` - To be refactored using flows
- [ ] `professionals/components/Subscription.js` - To be refactored using flows
- [ ] `professionals/components/Account.js` - Keep for account management features

## Facility Components (Legacy - DO NOT USE)
- [ ] `facilities/components/FacilityDetails.js` - Replaced by `tabs/facility/FacilityCoreDetailsTab.js`
- [ ] `facilities/components/BillingInformation.js` - Replaced by `tabs/facility/FacilityLegalBillingTab.js`
- [ ] `facilities/components/Settings.js` - Replaced by `tabs/facility/MarketplacePreferencesTab.js`
- [ ] `facilities/components/OpeningHours.js` - To be integrated into settings
- [ ] `facilities/components/Operations.js` - To be integrated into settings
- [ ] `facilities/components/DocumentUploads.js` - To be replaced (implementation pending)
- [ ] `facilities/components/Subscription.js` - To be refactored using flows
- [ ] `facilities/components/Account.js` - Keep for account management features

## Organization Components (Legacy - DO NOT USE)
- [ ] `organizations/components/OrganizationDetails.js` - To be replaced with tabs
- [ ] `organizations/components/OrganizationBillingInformation.js` - To be replaced with tabs
- [ ] `organizations/components/OrganizationVerification.js` - To be replaced with tabs
- [ ] `organizations/components/Account.js` - Keep for account management features

## Hooks (To Be Refactored)
- [ ] `hooks/useProfileConfig.js` - Flow definitions replace config files
- [ ] `hooks/useProfileFormHandlers.js` - useFlow() hook replaces manual handlers
- [ ] `hooks/useProfileValidation.js` - Zod schemas replace manual validation
- [ ] `hooks/useProfileDocumentProcessing.js` - To be refactored with actions system
- [ ] `hooks/useProfileTutorial.js` - To be refactored with new tutorial system

## Utils (To Be Reviewed)
- [ ] `utils/profileUtils.js` - Review and extract useful functions
- [ ] `utils/professionalBackgroundUtils.js` - Review and extract useful functions
- [ ] `utils/mockProfileData.js` - Keep for testing/development
- [ ] `utils/DropdownListsImports.js` - Replaced by i18n dropdown options

## Configs (Reference Only - Do Not Delete Yet)
- Keep `professionals/configs/professionals-professional.json` - Reference for missing fields
- Keep `facilities/configs/facility.json` - Reference for missing fields
- Keep `organizations/configs/organization.json` - Reference for missing fields

## Modals (Keep - Still Needed)
- Keep `modals/accessLevelChoiceModal.js` - Specialized workflow
- Keep `modals/bankingAccessModal.js` - Specialized workflow

## Account Management (Keep - Still Needed)
- Keep `components/AccountDeletion.js` - Account management feature
- Keep `components/DeleteAccount.js` - Account management feature
- Keep `components/accountManagement.js` - Account management feature

## DO NOT REMOVE YET
The following files should be kept until full testing is complete:
- All `Account.js` files (account management features)
- All modal files (specialized workflows)
- `documentation.md` (reference documentation)
- Config JSON files (schema reference)

## Removal Schedule

### Phase 1 (After Initial Testing)
Remove replaced components:
- Profile.js and Profile.module.css
- Legacy ProfileHeader and SideMenu
- PersonalDetails and BillingInformation tabs (both workspaces)

### Phase 2 (After Flow Implementation Complete)
Remove remaining legacy components:
- ProfessionalBackground, DocumentUploads
- Settings and Subscription components
- Legacy hooks

### Phase 3 (After Full Migration)
Remove or refactor:
- Utils folder (extract useful functions)
- Config files (if no longer needed as reference)

