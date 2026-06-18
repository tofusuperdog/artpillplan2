truncate table stock_history, stock_lots, medications, app_settings restart identity cascade;

insert into app_settings (low_stock_alert_days, expiring_lot_alert_days, pin_value)
values (14, 90, '1234');

insert into medications (name, daily_dose_pills, pills_per_box, is_active)
values
  ('Enoxaparin', 1, 10, true),
  ('Azathioprine', 2, 30, true),
  ('Tacrolimus 1 mg', 3.5, 50, true),
  ('Mycophenolate 180 mg', 2, 60, true),
  ('Prednisone 5 mg', 1, 100, true);

insert into stock_lots (
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price,
  created_at
)
select id, 1, 1, 12, 2027, 20, 20, 600, now() - interval '5 days'
from medications where name = 'Azathioprine';

insert into stock_lots (
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price,
  created_at
)
select id, 12, 12, 5, 2026, 144, 12, 600, now() - interval '4 days'
from medications where name = 'Tacrolimus 1 mg';

insert into stock_lots (
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price,
  created_at
)
select id, 16, 16, 7, 2026, 192, 12, 600, now() - interval '3 days'
from medications where name = 'Tacrolimus 1 mg';

insert into stock_lots (
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price,
  created_at
)
select id, 48, 48, 8, 2026, 480, 10, 600, now() - interval '2 days'
from medications where name = 'Mycophenolate 180 mg';

insert into stock_lots (
  medication_id,
  quantity_pills_original,
  quantity_pills_remaining,
  expiry_month,
  expiry_year,
  total_price,
  cost_per_pill,
  standard_box_price,
  created_at
)
select id, 92, 92, 12, 2027, 92, 1, 100, now() - interval '1 day'
from medications where name = 'Prednisone 5 mg';

insert into stock_history (
  medication_id,
  stock_lot_id,
  type,
  quantity_pills,
  price,
  expiry_month,
  expiry_year,
  note,
  created_at
)
select
  m.id,
  l.id,
  'add_stock',
  l.quantity_pills_original,
  l.total_price,
  l.expiry_month,
  l.expiry_year,
  'Added ' || l.lot_code,
  l.created_at
from stock_lots l
join medications m on m.id = l.medication_id;

insert into stock_history (medication_id, type, quantity_pills, note, created_at)
select id, 'recount_stock', 39, 'Updated to 39 pills', now() - interval '1 hour'
from medications
where name = 'Mycophenolate 180 mg';
