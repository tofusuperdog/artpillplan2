revoke all on table app_settings from anon, authenticated;

grant select (
  id,
  low_stock_alert_days,
  expiring_lot_alert_days,
  updated_at
) on table app_settings to anon, authenticated;

grant update (
  low_stock_alert_days,
  expiring_lot_alert_days,
  updated_at
) on table app_settings to anon, authenticated;

-- PIN verification and changes now happen only through Next.js server routes
-- using the service role key. Do not grant pin_value to browser roles.
revoke select (pin_value) on table app_settings from anon, authenticated;
revoke update (pin_value) on table app_settings from anon, authenticated;
