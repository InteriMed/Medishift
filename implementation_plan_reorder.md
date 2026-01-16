# Reorder Main Sections

## Goal Description
Reorder the main sections on the **Facilities** and **Professionals** pages according to the user's specific sequence requests ("Facilities: 1>2>3 do 2>3>1" and "Professionals: 1>2>3 do 2>1>3"). The sections are identified as the major content blocks following the Hero section.

## User Review Required
> [!NOTE]
> The "sections" are interpreted as the major content areas below the Hero.
> **Facilities Sections:**
> 1. Core Solutions Grid (Small cards)
> 2. Team Workspace (Large split section)
> 3. Vacancy Management (Dark bottom section)
> **New Order:** Team Workspace -> Vacancy Management -> Core Solutions Grid.
>
> **Professionals Sections:**
> 1. Smart Application Process (Small cards)
> 2. Availability & Communication (Large split section)
> 3. Final Conversion (Dark blue card)
> **New Order:** Availability & Communication -> Smart Application Process -> Final Conversion.

## Proposed Changes

### Frontend
#### [MODIFY] [FacilitiesPage.js](file://wsl.localhost/Ubuntu-20.04/root/Interimed/frontend/src/pages/FacilitiesPage.js)
- Move the `Team Workspace Section` (currently section 2) to become the first section after the Hero.
- Move the `In-depth Vacancy Management Section` (currently section 3) to become the second section.
- Move the `Core Solutions Grid` (currently section 1) to become the third section.

#### [MODIFY] [ProfessionalsPage.js](file://wsl.localhost/Ubuntu-20.04/root/Interimed/frontend/src/pages/ProfessionalsPage.js)
- Move the `Availability & Communication Section` (currently section 2) to become the first section after the Hero.
- Move the `Smart Application Process` (currently section 1) to become the second section.
- Keep the `Final Conversion Section` (currently section 3) as the third section.

## Verification Plan
### Manual Verification
- Verify the new vertical order of sections on the Facilities page matches the request.
- Verify the new vertical order of sections on the Professionals page matches the request.
- Ensure all animations and styles remain intact after moving the code blocks.
