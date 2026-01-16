# Update Homepage Content

## Goal Description
Replace the existing "How It Works" (Inscription Gratuite, etc.) section on the Homepage with a new "Why Choose Us" section. The new content emphasizes that the platform is free for users and establishments, with no hidden fees or commitments.

## User Review Required
> [!NOTE]
> The text content is hardcoded as per the user's request, replacing the localization keys used in the previous section. If localization is needed later, these strings will need to be extracted to the translation files.

## Proposed Changes

### Frontend
#### [MODIFY] [Homepage.js](file://wsl.localhost/Ubuntu-20.04/root/Interimed/frontend/src/pages/Homepage.js)
- Replace the section `<section className="py-24 bg-white relative">` (How It Works) with the new "Why Choose Us" section.
- Use `FaBuilding` for Establishments.
- Use `FaUserMd` for Professionals.
- Use `FaUsers` (or `FaCheckCircle`) for "Pour tous".

## Verification Plan
### Automated Tests
- None specific for this UI text change.

### Manual Verification
- Verify that the "How It Works" section is gone.
- Verify that the new "Why Choose Us" section appears with the correct 3 cards.
- Check responsive behavior (grid adapts to mobile).
- Ensure styling matches the premium aesthetic (rounded corners, shadows, fonts).
