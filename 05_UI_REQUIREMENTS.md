# 05 — UI Requirements

## ไฟล์นี้มีไว้ทำไม

ไฟล์นี้อธิบายหน้าจอทั้งหมดของ ArtPillPlan v2 เพื่อให้ AI Coding Agent ทำ UI ได้ตรงกับภาพ reference

UI ทั้งหมดใช้ภาษาอังกฤษ

---

# Visual Style

- Cream / Red Retro
- Warm cream background
- Ivory cards
- Terracotta red primary action
- Muted orange warning
- Purple expired lot
- Green in stock / good
- Rounded panels
- Subtle shadow
- Retro handheld device feeling
- Clean mobile-first UI

---

# 1. Login PIN

## Elements

- App logo
- ArtPillPlan
- Enter PIN
- 4 PIN dots
- Enter your 4-digit PIN
- Numeric keypad 0–9
- Backspace

## Behavior

- Validate after 4 digits
- If correct, go to Home
- Stay logged in until Logout

---

# 2. Home

## Header

- Logo
- ArtPillPlan
- History icon
- Settings icon

## Content

- No summary section
- Medication cards
- Sort by lowest remaining days

## Card

Each card shows:

- Medication name
- Remaining time
- Up to 2 badges
- +1 if more statuses
- Stock icon button

## Interactions

- Tap card = Medication Detail
- Tap stock icon = Stock Modal

---

# 3. Medication Detail

Section order:

1. Overall Status
2. Daily Intake
3. Cost
4. Remaining Lots
5. Recent History

## Overall Status

Example:

```text
8 days
28 pills
Low Stock
Expired Lot
Expiring Lot
```

## Daily Intake

```text
3.5 pills/day
50 pills/box
```

## Cost

```text
Average cost
Standard box value
Current stock value
```

Use ฿ symbol

## Remaining Lots

Show only lots with quantity remaining > 0

Example:

```text
Lot #003 · 12 pills · Expiry 05/2026 · Expired
Lot #001 · 10 pills · Expiry 07/2026 · Expiring Soon
Lot #004 · 6 pills · Expiry 11/2026 · Good
```

Do not show price in lot rows

## Recent History

Show latest 3 items only

Actions:

- Recount Stock
- Edit Medication Info

---

# 4. Stock Modal — Add Stock

## Tabs

- Add Stock
- Recount Stock

Add Stock is active by default

## Fields

- Quantity Type: Total pills / Boxes
- Quantity
- Price Input Type: Total price / Price per box
- Price
- Expiry Date: MM/YYYY

## Preview

Always show:

```text
Received: 30 pills
Total value: ฿600
Cost: ฿20 / pill
Standard box price: ฿1,000 / box
Expiry: 12/2026
```

## Save

- Create new stock lot
- Create history item
- Toast: Stock added successfully
- Close modal automatically
- Refresh Home

---

# 5. Stock Modal — Recount Stock

## Fields

- Current stock
- Counted pills

## Behavior

- No preview
- Save adjusts stock by FEFO
- Toast: Stock updated successfully
- Close modal automatically
- Refresh Home

---

# 6. History

## Behavior

- Latest 30 records
- Newest first
- Filter by medication only

## Add Stock row

```text
Tacrolimus 1 mg
Add Stock
Lot #008 · +30 pills
Exp: 08/2026
฿135.00
May 12, 2025 · 09:21
```

## Recount Stock row

```text
Mycophenolate 180 mg
Recount Stock
Updated to 39 pills
May 12, 2025 · 08:47
```

---

# 7. Settings

Sections:

## Medications

```text
Tacrolimus 1 mg
3.5 pills/day · 50 pills/box
```

Button:

```text
+ Add Medication
```

## Alerts

```text
Low Stock Alert: 14 days
Expiring Lot Alert: 90 days
```

## Security

```text
Change PIN
Logout
```

Footer:

```text
Version 2.0
```

---

# 8. Edit Medication

Fields:

- Medication name
- Daily intake
- Pills per box

Actions:

- Save Changes
- Delete Medication

Delete = soft delete by setting is_active = false

---

# 9. Change PIN

Fields:

- New PIN
- Confirm New PIN

Validation:

```text
PINs do not match
```

Action:

- Save PIN
