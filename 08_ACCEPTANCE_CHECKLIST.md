# 08 — Acceptance Checklist

## ไฟล์นี้มีไว้ทำไม

ใช้ตรวจงานหลัง AI Coding Agent สร้างแอปเสร็จ

ถ้าข้อไหนไม่ผ่าน ให้สั่ง AI แก้เฉพาะจุดนั้น

---

# Database

- [ ] มีตาราง `medications`
- [ ] มีตาราง `stock_lots`
- [ ] มีตาราง `stock_history`
- [ ] มีตาราง `app_settings`
- [ ] medications มี `daily_dose_pills`
- [ ] medications มี `pills_per_box`
- [ ] stock_lots มี `quantity_pills_remaining`
- [ ] stock_lots มี `expiry_month` และ `expiry_year`
- [ ] stock_history เก็บเฉพาะ `add_stock` และ `recount_stock`
- [ ] app_settings มี `low_stock_alert_days`
- [ ] app_settings มี `expiring_lot_alert_days`

---

# Seed Data

- [ ] มี sample medications
- [ ] มี sample stock lots
- [ ] มี sample history
- [ ] มี default settings
- [ ] เปิดหน้า Home แล้วมีข้อมูลให้ดูทันที

---

# PIN Login

- [ ] มีหน้า Enter PIN
- [ ] ใช้ keypad 0–9
- [ ] มี 4 PIN dots
- [ ] Login แล้วเข้า Home ได้
- [ ] ไม่ต้องใส่ PIN ใหม่จนกว่าจะ Logout
- [ ] Change PIN มี New PIN และ Confirm New PIN
- [ ] ถ้า PIN ไม่ตรง แสดง `PINs do not match`

---

# Home

- [ ] Header มี ArtPillPlan
- [ ] มี History icon
- [ ] มี Settings icon
- [ ] ไม่มี summary section ด้านบน
- [ ] แสดง medication cards
- [ ] เรียงตามยาที่เหลือน้อยที่สุด
- [ ] Card แสดงชื่อยา
- [ ] Card แสดง days remaining
- [ ] Card แสดง badges สูงสุด 2 อัน
- [ ] ถ้ามี badge มากกว่า 2 แสดง +1
- [ ] Card มี stock icon button
- [ ] กด card เปิด detail
- [ ] กด stock icon เปิด Stock modal

---

# Stock Calculation

- [ ] Remaining days = usable stock / daily dose
- [ ] ปัดลงเสมอ
- [ ] ถ้า stock = 0 แสดง `0 days`
- [ ] ถ้ามีน้อยกว่า 1 วัน แสดง `Runs Out Today`
- [ ] Low Stock ใช้ค่าจาก settings
- [ ] Expiring Lot ใช้ค่าจาก settings
- [ ] Expired Lot ไม่ถูกนับเป็น usable stock
- [ ] FEFO ใช้ Lot ที่หมดอายุเร็วสุดก่อน

---

# Add Stock

- [ ] มี Add Stock tab
- [ ] มี Quantity Type: Total pills / Boxes
- [ ] Total pills ต้องเป็นจำนวนเต็ม
- [ ] Boxes รองรับทศนิยมได้
- [ ] Boxes × pills_per_box ต้องได้จำนวน pills เต็ม
- [ ] มี Price Input Type: Total price / Price per box
- [ ] มี Expiry Date รูปแบบ MM/YYYY
- [ ] ไม่อนุญาต expiry ที่หมดอายุไปแล้ว
- [ ] มี Preview
- [ ] Save แล้วสร้าง Lot ใหม่
- [ ] Save แล้วสร้าง history type `add_stock`
- [ ] Save แล้ว toast `Stock added successfully`
- [ ] Save แล้ว modal ปิดอัตโนมัติ

---

# Recount Stock

- [ ] มี Recount Stock tab
- [ ] แสดง Current stock
- [ ] มีช่อง Counted pills
- [ ] Counted pills ต้องเป็นจำนวนเต็ม
- [ ] อนุญาตให้เป็น 0
- [ ] ไม่มี Preview
- [ ] Save แล้วปรับ stock_lots
- [ ] Save แล้วสร้าง history type `recount_stock`
- [ ] History note แสดง `Updated to X pills`
- [ ] Save แล้ว toast `Stock updated successfully`
- [ ] Save แล้ว modal ปิดอัตโนมัติ

---

# Medication Detail

- [ ] มี Overall Status
- [ ] มี Daily Intake
- [ ] มี Cost
- [ ] มี Remaining Lots
- [ ] มี Recent History
- [ ] Lot ที่เหลือ 0 ไม่แสดง
- [ ] Lot หมดอายุแสดง badge Expired
- [ ] Lot ใกล้หมดอายุแสดง badge Expiring Soon
- [ ] Lot list ไม่แสดงราคา
- [ ] Recent History แสดง 3 รายการล่าสุด

---

# History

- [ ] แสดง latest 30 records
- [ ] เรียง newest first
- [ ] มี filter ตามยา
- [ ] Add Stock แสดง Lot ID
- [ ] Add Stock แสดง quantity
- [ ] Add Stock แสดง expiry
- [ ] Add Stock แสดง price
- [ ] Recount Stock แสดง `Updated to X pills`
- [ ] ไม่แสดง edit medication history

---

# Settings

- [ ] มี Medications section
- [ ] มี Alerts section
- [ ] มี Security section
- [ ] Low Stock Alert แก้ได้
- [ ] Expiring Lot Alert แก้ได้
- [ ] Validate Low Stock 1–365 days
- [ ] Validate Expiring Lot 1–730 days
- [ ] มี Change PIN
- [ ] มี Logout
- [ ] มี Version 2.0

---

# Edit Medication

- [ ] แก้ Medication name ได้
- [ ] แก้ Daily intake ได้
- [ ] Daily intake รองรับทศนิยม
- [ ] แก้ Pills per box ได้
- [ ] Delete Medication เป็น soft delete
- [ ] Delete ไม่ลบ stock history

---

# UI Quality

- [ ] ใช้ Cream / Red Retro style
- [ ] Mobile-first
- [ ] อ่านง่าย
- [ ] ปุ่มกดง่าย
- [ ] Card ไม่รก
- [ ] Badge สีถูกต้อง
- [ ] Layout ใกล้เคียงภาพ reference
- [ ] ไม่มี dark cyberpunk style
- [ ] ใช้ภาษาอังกฤษทั้งหมดใน UI

---

# README

- [ ] มีวิธี install
- [ ] มีวิธีตั้งค่า Supabase env
- [ ] มีวิธี run migration
- [ ] มีวิธี seed data
- [ ] มีวิธี run dev server
