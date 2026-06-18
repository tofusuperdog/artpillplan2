# 06 — Vibe Coding Master Prompt

## วิธีใช้

ให้ copy prompt ด้านล่างไปใช้กับ Vibe Coding / AI Coding Agent

ควรแนบรูป UI reference แต่ละหน้าพร้อมกัน เช่น:

- 01-login.png
- 02-home.png
- 03-medication-detail.png
- 04-add-stock.png
- 05-recount-stock.png
- 06-history.png
- 07-settings.png
- 08-edit-medication.png
- 09-change-pin.png

---

# Master Prompt

You are a senior full-stack product engineer and UI implementation specialist.

Build a production-ready personal medication stock management web app called **ArtPillPlan v2** using:

- Next.js
- TypeScript
- Supabase
- Tailwind CSS
- Mobile-first responsive design

I will attach UI reference images for each screen. Use the attached images as the visual source of truth.

## Goal

ArtPillPlan is a personal medication stock tracker.

The app helps the user:

- Track how many days each medication can still be taken
- Track medication stock by Lot
- Track expiry dates
- Add new stock
- Recount stock
- View recent stock history
- Manage medications and settings
- Use a simple 4-digit PIN login

## Visual Style

Implement a Cream / Red Retro UI.

Style keywords:

- Warm cream background
- Ivory / beige cards
- Terracotta red primary actions
- Muted orange warnings
- Purple for expired lots
- Green for in-stock / good
- Rounded retro panels
- Subtle shadows
- 80s/90s handheld device mood
- Clean and usable modern mobile app

Do not use dark cyberpunk styling.

## Required Screens

Implement:

1. Login PIN
2. Home
3. Medication Detail
4. Stock Modal — Add Stock
5. Stock Modal — Recount Stock
6. History
7. Settings
8. Edit Medication
9. Change PIN

## Database

Use Supabase with these tables:

- medications
- stock_lots
- stock_history
- app_settings

Follow `02_DATABASE_SCHEMA.md`.

## Seed Data

Create seed data from `03_SEED_DATA.md`.

## Stock Logic

Implement stock logic from `04_STOCK_LOGIC.md`.

Important rules:

- Remaining days = usable stock / daily dose
- Display days rounded down
- Expired lots are visible but not counted as usable stock
- Use FEFO for stock adjustment
- Home sorts by lowest remaining days
- Home shows max 2 badges plus +1
- Add Stock always creates a new Lot
- Recount Stock updates total stock using earliest expiry lots first

## File Structure

Use this structure:

```text
/app
/components/layout
/components/ui
/components/medications
/components/stock
/components/history
/components/settings
/lib/supabase
/lib/db
/lib/stock
/types
/supabase
```

## Required Components

Create reusable components:

- AppShell
- RetroHeader
- BottomDeviceBar
- MedicationCard
- StatusBadge
- StockIconButton
- RetroPanel
- RetroButton
- RetroInput
- RetroTabs
- StockModal
- AddStockForm
- RecountStockForm
- MedicationDetailModal
- HistoryList
- SettingsSection
- PinKeypad

## Expected Output

Please build:

- Next.js pages
- Supabase client
- SQL migration
- Seed data
- Typed database access functions
- Stock calculation utilities
- Reusable UI components
- Mobile-first styling
- README setup instructions

Please implement step by step:

1. Database schema
2. Seed data
3. Stock logic
4. UI components
5. Screens
6. CRUD and interactions
7. Polish
