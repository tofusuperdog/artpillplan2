# 07 — Implementation Plan

## ไฟล์นี้มีไว้ทำไม

ไฟล์นี้เป็นแผนทำงานทีละขั้นสำหรับให้ AI Coding Agent ทำตาม

ถ้าสั่งให้ AI ทำทั้งแอปทีเดียว มักจะเกิดปัญหา schema ไม่ตรง, logic คำนวณผิด, component ปนกันมั่ว หรือ Supabase เชื่อมไม่ครบ

---

# Phase 1 — Project Setup

## Goal

สร้าง Next.js + TypeScript + Tailwind project

## Tasks

- Create Next.js app
- Enable TypeScript
- Install Supabase client
- Setup Tailwind CSS
- Create folder structure
- Setup environment variables

## Output

Project run ได้ และ Tailwind ใช้งานได้

---

# Phase 2 — Supabase Schema

## Goal

สร้างฐานข้อมูล

## Tasks

- Create SQL migration
- Create tables:
  - medications
  - stock_lots
  - stock_history
  - app_settings
- Add indexes
- Add constraints

## Output

มี Supabase tables ครบ

---

# Phase 3 — Seed Data

## Goal

ใส่ข้อมูลตัวอย่าง

## Tasks

- Insert sample medications
- Insert sample stock lots
- Insert sample history
- Insert default settings

## Output

หน้า Home มีข้อมูลให้แสดงเมื่อ UI พร้อม

---

# Phase 4 — Database Access Layer

## Goal

สร้าง function สำหรับอ่าน/เขียน Supabase

## Suggested files

```text
/lib/db/medications.ts
/lib/db/stock.ts
/lib/db/history.ts
/lib/db/settings.ts
```

## Functions

- getMedications()
- createMedication()
- updateMedication()
- softDeleteMedication()
- getStockLotsByMedication()
- addStock()
- recountStock()
- getHistory()
- getSettings()
- updateSettings()

## Output

Frontend ไม่เรียก Supabase ตรง ๆ กระจัดกระจาย

---

# Phase 5 — Stock Calculation Utilities

## Suggested file

```text
/lib/stock/calculations.ts
```

## Functions

- getExpiryDate()
- isExpiredLot()
- isExpiringLot()
- calculateUsableStock()
- calculateRemainingDays()
- getMedicationBadges()
- sortMedicationsByUrgency()
- calculateAverageCost()
- calculateCurrentStockValue()
- applyFefoDeduction()
- applyRecountAdjustment()

---

# Phase 6 — Design System Components

## Components

- RetroPanel
- RetroButton
- RetroInput
- RetroTabs
- StatusBadge
- AppShell
- RetroHeader
- BottomDeviceBar

---

# Phase 7 — Home

## Tasks

- Load medications
- Load lots
- Calculate status
- Sort by urgency
- Render MedicationCard
- Card click opens detail
- Stock icon click opens StockModal

---

# Phase 8 — Stock Modal

## Tasks

- Add Stock form
- Preview calculation
- Validation
- Save stock lot
- Create history
- Recount Stock form
- FEFO adjustment
- Toast
- Auto close modal

---

# Phase 9 — Medication Detail

## Tasks

- Overall Status
- Daily Intake
- Cost
- Remaining Lots
- Recent History
- Actions

---

# Phase 10 — History

## Tasks

- Load latest 30 records
- Newest first
- Filter by medication
- Render Add Stock and Recount Stock rows

---

# Phase 11 — Settings

## Tasks

- Medication list
- Edit medication
- Add medication
- Alert settings
- Change PIN
- Logout

---

# Phase 12 — Polish

## Tasks

- Loading states
- Empty states
- Error states
- Mobile spacing
- Form validation
- Toast messages
- Responsive desktop center layout
- README
