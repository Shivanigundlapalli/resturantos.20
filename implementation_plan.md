# Make Application Fully Responsive

This plan outlines the refactoring steps required to make all components in the application responsive across mobile, tablet, and desktop devices. The focus will be on fixing hardcoded widths, ensuring tables scroll horizontally on small screens, and adapting grid layouts.

## User Review Required
> [!IMPORTANT]
> The changes affect layouts globally. This will significantly improve the mobile experience, particularly for the Dashboard, Inventory, Sales, and Menu Management screens. 
> Please review the proposed changes below and approve if you are ready to proceed.

## Proposed Changes

### 1. Fix Table Overflows
Mobile screens cannot fit multi-column data tables. We will wrap all `<table className="...">` tags in an `overflow-x-auto` container to allow horizontal scrolling on small devices without breaking the page layout.

#### [MODIFY] src/components/InventoryView.tsx
- Wrap both Inventory and Menu recipe tables in `<div className="overflow-x-auto w-full">`.

#### [MODIFY] src/components/MenuView.tsx
- Wrap the Menu items table in `<div className="overflow-x-auto w-full">`.

#### [MODIFY] src/components/SalesView.tsx
- Ensure the Orders and Invoice tables are wrapped in `<div className="overflow-x-auto w-full">`.

#### [MODIFY] src/components/FinanceView.tsx
- Ensure the Ledger table is wrapped in `<div className="overflow-x-auto w-full">`.

### 2. Make Grids Responsive
Several components use fixed grid columns (e.g., `grid-cols-2`, `grid-cols-4`) which squeeze content too much on mobile screens. We will add responsive prefixes (e.g., `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`).

#### [MODIFY] src/components/LoginView.tsx
- Update the demo credential grid from `grid-cols-4` to `grid-cols-2 lg:grid-cols-4`.

#### [MODIFY] src/components/owner/MenuManagement.tsx
- Update the category pills grid from `grid-cols-5` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.

#### [MODIFY] src/components/SalesView.tsx
- Update forms and summary stat cards from fixed `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`.

#### [MODIFY] src/components/owner/MenuItemEditor.tsx & CategoryManager.tsx
- Make form fields stack on mobile (`grid-cols-1 sm:grid-cols-2`).

### 3. Fix Hardcoded Modal and Drawer Widths
Hardcoded widths like `w-[500px]` will overflow a 375px mobile screen. We will use fluid widths with a maximum bound.

#### [MODIFY] src/components/owner/CategoryManager.tsx
- Update slide-in drawer from `w-[500px]` to `w-full max-w-[500px]`.

#### [MODIFY] src/components/owner/MenuItemEditor.tsx
- Update center modal from `w-[320px]` to `w-[90vw] max-w-[320px]`.

#### [MODIFY] src/components/owner/AiImageGenerator.tsx
- Update the sidebar from `w-80` to `w-full md:w-80`.

## Verification Plan

### Manual Verification
1. I will simulate mobile and tablet viewports to verify that no horizontal scrollbars appear on the page body.
2. I will verify that tables have localized horizontal scrolling.
3. I will verify that modals/drawers take up the full screen (or 90%) on mobile while retaining their original sizing on desktop.
