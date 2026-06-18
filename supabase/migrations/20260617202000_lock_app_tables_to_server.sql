revoke all on table medications from anon, authenticated;
revoke all on table stock_lots from anon, authenticated;
revoke all on table stock_history from anon, authenticated;
revoke all on table app_settings from anon, authenticated;

-- The browser talks to Next.js API routes only. Server routes use the
-- service role key and bypass RLS for this personal single-user app.
