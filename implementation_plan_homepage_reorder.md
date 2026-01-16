# Homepage Layout and Content Update

## Goal Description
1.  **Hero Section**: Ensure height matches screen height.
2.  **Hero Image**: Force square aspect ratio to match Facilities page.
3.  **Section Reorder**: Change the order of the main content sections from [Value Prop, Security, Problem, Solution, Why Choose Us] to [Security, Problem, Solution, Value Prop, Why Choose Us].
4.  **CTA Section**: Increase the height of the final CTA section.

## User Review Required
> [!NOTE]
> The section reordering moves the "Value Proposition" (Grid with Pro/Pharmacy cards) to *lower* on the page, after the "Problem" and "Solution" sections.

## Proposed Changes

### Frontend
#### [MODIFY] [Homepage.js](file://wsl.localhost/Ubuntu-20.04/root/Interimed/frontend/src/pages/Homepage.js)
- **Hero**: Update `items-start` to `items-center`. Verify `min-height` calc.
- **Hero Image**: Add `aspect-square` to the image container.
- **Reorder Sections**:
    -   Move `Value Proposition` (Grid) to after `Solution` (Split).
    -   New Order:
        1.  Security & Swiss Made
        2.  Problem Section (Sticky)
        3.  Split Section / Solution
        4.  Value Proposition
        5.  Why Choose Us (3 cards)
- **Final CTA**: Increase `py-32` to `py-48` or similar.

## Verification Plan
### Manual Verification
- Check Hero section height and image aspect ratio.
- Verify the new flow of sections.
- Verify the increased height of the final CTA.
