# 03 — Seed Data

## ไฟล์นี้มีไว้ทำไม

Seed data คือข้อมูลตัวอย่างเริ่มต้นที่ใส่เข้าไปในฐานข้อมูล เพื่อให้เปิดแอปแล้วมีข้อมูลให้ทดสอบทันที

ถ้าไม่มี seed data หน้า Home จะว่าง ทำให้เช็ก UI และ logic ยาก

Seed data ช่วยทดสอบ:

- No Stock
- Runs Out Today
- Low Stock
- Expired Lot
- Expiring Lot
- In Stock
- History list
- Cost calculation

---

# Example Settings

```sql
insert into app_settings (
  low_stock_alert_days,
  expiring_lot_alert_days,
  pin_value
)
values (
  14,
  90,
  '1234'
);
```

## มีไว้ทำไม

- `14 days` ใช้ทดสอบ Low Stock
- `90 days` ใช้ทดสอบ Expiring Lot
- PIN `1234` ใช้สำหรับ login ในช่วง dev

---

# Example Medications

```sql
insert into medications (name, daily_dose_pills, pills_per_box, is_active)
values
  ('Enoxaparin', 1, 10, true),
  ('Azathioprine', 2, 30, true),
  ('Tacrolimus 1 mg', 3.5, 50, true),
  ('Mycophenolate Mofetil 180 mg', 2, 60, true),
  ('Prednisone 5 mg', 1, 100, true);
```

## มีไว้ทำไม

| Medication | ใช้ทดสอบอะไร |
|---|---|
| Enoxaparin | No Stock |
| Azathioprine | Runs Out Today |
| Tacrolimus 1 mg | Low Stock + Expired Lot + Expiring Lot |
| Mycophenolate Mofetil 180 mg | Expiring Lot |
| Prednisone 5 mg | In Stock |

---

# Example Stock Lots

หมายเหตุ: ปี/เดือนในตัวอย่างควรปรับตามวันที่พัฒนา เพื่อให้สถานะ Expired / Expiring Soon ถูกต้อง

```sql
-- Azathioprine: Runs Out Today
insert into stock_lots (
  lot_code,
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price
)
select
  'Lot #001',
  id,
  1,
  1,
  12,
  2027,
  20,
  20,
  600
from medications
where name = 'Azathioprine';

-- Tacrolimus: Low Stock + Expired Lot
insert into stock_lots (
  lot_code,
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price
)
select
  'Lot #002',
  id,
  12,
  12,
  5,
  2026,
  144,
  12,
  600
from medications
where name = 'Tacrolimus 1 mg';

-- Tacrolimus: Expiring Lot
insert into stock_lots (
  lot_code,
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price
)
select
  'Lot #003',
  id,
  16,
  16,
  7,
  2026,
  192,
  12,
  600
from medications
where name = 'Tacrolimus 1 mg';

-- Mycophenolate: Expiring Lot
insert into stock_lots (
  lot_code,
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price
)
select
  'Lot #004',
  id,
  48,
  48,
  8,
  2026,
  480,
  10,
  600
from medications
where name = 'Mycophenolate Mofetil 180 mg';

-- Prednisone: In Stock
insert into stock_lots (
  lot_code,
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price
)
select
  'Lot #005',
  id,
  92,
  92,
  12,
  2027,
  92,
  1,
  100
from medications
where name = 'Prednisone 5 mg';
```

---

# Example History

```sql
insert into stock_history (
  medication_id,
  stock_lot_id,
  type,
  quantity_pills,
  price,
  expiry_month,
  expiry_year,
  note
)
select
  m.id,
  l.id,
  'add_stock',
  l.quantity_pills_original,
  l.total_price,
  l.expiry_month,
  l.expiry_year,
  'Added ' || l.lot_code
from stock_lots l
join medications m on m.id = l.medication_id;

insert into stock_history (
  medication_id,
  type,
  quantity_pills,
  note
)
select
  id,
  'recount_stock',
  39,
  'Updated to 39 pills'
from medications
where name = 'Mycophenolate Mofetil 180 mg';
```

## มีไว้ทำไม

ทำให้หน้า History มีรายการตัวอย่าง เช่น:

- Add Stock
- Recount Stock
- Lot ID
- Quantity
- Price
- Date
