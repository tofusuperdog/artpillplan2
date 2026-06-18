# 04 — Stock Logic

## ไฟล์นี้มีไว้ทำไม

ไฟล์นี้อธิบายกฎการคำนวณทั้งหมดของแอป

ถ้า logic ผิด แอปจะบอกจำนวนวันที่ยาเหลือผิด ซึ่งเป็นเรื่องสำคัญมาก

---

# 1. Expiry Rule

ผู้ใช้กรอกวันหมดอายุแบบ `MM/YYYY`

ระบบถือว่าใช้ได้ถึงวันสุดท้ายของเดือนนั้น

ตัวอย่าง:

- `06/2026` = ใช้ได้ถึง 30/06/2026
- `12/2026` = ใช้ได้ถึง 31/12/2026

ถ้าเพิ่ม Stock แล้วกรอกเดือน/ปีที่หมดอายุไปแล้ว:

- ไม่ให้ Save

ถ้าเป็นเดือนปัจจุบัน:

- ให้ Save ได้ เพราะถือว่าใช้ได้ถึงสิ้นเดือน

---

# 2. Usable Stock

Usable stock คือจำนวนเม็ดยาที่ยังใช้ได้จริง

นับเฉพาะ Lot ที่:

- quantity_pills_remaining > 0
- ยังไม่หมดอายุ

Lot ที่หมดอายุแล้ว:

- ยังแสดงในรายละเอียดได้
- แต่ไม่เอามาคิดจำนวนวันที่กินได้
- ไม่เอามาคิด current stock value

---

# 3. Remaining Days

```ts
remainingDaysRaw = usableStockPills / dailyDosePills
remainingDaysDisplay = Math.floor(remainingDaysRaw)
```

ตัวอย่าง:

- usable stock = 28 pills
- daily dose = 3.5 pills/day
- 28 / 3.5 = 8 days

ต้องปัดลงเสมอเพื่อความปลอดภัย

---

# 4. Display Status

## No Stock

ถ้า usableStockPills = 0:

```text
0 days
No Stock
```

## Runs Out Today

ถ้า usableStockPills > 0 แต่ remainingDaysRaw < 1:

```text
Runs Out Today
Runs Out Today
```

## Low Stock

ถ้า remainingDaysDisplay <= lowStockAlertDays:

```text
Low Stock
```

Default: 14 days

## Expired Lot

ถ้ามี Lot ที่เหลืออยู่และหมดอายุแล้ว:

```text
Expired Lot
```

## Expiring Lot

ถ้ามี Lot ที่เหลืออยู่และจะหมดอายุภายใน expiringLotAlertDays:

```text
Expiring Lot
```

Default: 90 days

---

# 5. Home Badge Rule

Home Card แสดง badge สูงสุด 2 อัน

ถ้ามีมากกว่า 2:

```text
+1
```

ลำดับความสำคัญ:

1. No Stock
2. Runs Out Today
3. Low Stock
4. Expired Lot
5. Expiring Lot
6. In Stock

---

# 6. Home Sorting

เรียงยาที่เหลือกินได้น้อยที่สุดขึ้นก่อน

ลำดับพิเศษ:

1. No Stock
2. Runs Out Today
3. Low Stock
4. Normal / In Stock

---

# 7. Add Stock Quantity

## Total pills

ผู้ใช้กรอกจำนวนเม็ดรวม

เช่น:

```text
30 pills
```

ต้องเป็นจำนวนเต็มเท่านั้น

## Boxes

ผู้ใช้กรอกจำนวนกล่อง

เช่น:

```text
0.5 boxes
```

คำนวณ:

```ts
receivedPills = boxes * pillsPerBox
```

ผลลัพธ์ต้องเป็นจำนวนเต็ม

ถ้าได้ 16.5 pills ให้แสดง error:

```text
Quantity must result in whole pills. Please adjust boxes or use Total pills.
```

---

# 8. Add Stock Price

## Total price

```ts
costPerPill = totalPrice / receivedPills
standardBoxPrice = costPerPill * pillsPerBox
```

## Price per box

```ts
costPerPill = pricePerBox / pillsPerBox
totalPrice = costPerPill * receivedPills
standardBoxPrice = pricePerBox
```

---

# 9. Cost Calculation

ใช้เฉพาะ usable stock เท่านั้น

```ts
averageCost = totalUsableStockValue / totalUsableStockPills
standardBoxValue = averageCost * pillsPerBox
currentStockValue = sum(usableLot.quantityRemaining * usableLot.costPerPill)
```

Lot ที่หมดอายุแล้วไม่เอามาคิด

---

# 10. FEFO Rule

FEFO = First Expired, First Out

เวลาต้องลด Stock ให้ลดจาก Lot ที่หมดอายุเร็วที่สุดก่อน

เรียงตาม:

1. expiry_year ASC
2. expiry_month ASC
3. created_at ASC

---

# 11. Recount Stock

ผู้ใช้กรอกจำนวนจริงรวมของยาตัวนั้น เช่น:

```text
39 pills
```

ต้องเป็นจำนวนเต็ม และเป็น 0 ได้

## ถ้า countedPills < systemPills

ลดส่วนต่างจาก Lot ที่หมดอายุเร็วที่สุดก่อน

## ถ้า countedPills > systemPills

เพิ่มส่วนต่างกลับเข้า Lot ที่หมดอายุเร็วที่สุด

## หลัง Save

- ปรับ stock_lots
- เพิ่ม stock_history type = recount_stock
- note = `Updated to 39 pills`
- toast = `Stock updated successfully`
- ปิด modal
