-- Launch security gate: analytics ingestion is anonymous, analytics reads are not.
-- Error details may contain recipe text and stack traces, so anon must never
-- be able to query any analytics table.

REVOKE SELECT ON TABLE
  public.analytics_events,
  public.analytics_sessions,
  public.analytics_daily_stats,
  public.analytics_error_details
FROM anon;

DROP POLICY IF EXISTS "Anyone can view sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Anyone can view events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can view daily stats" ON public.analytics_daily_stats;
DROP POLICY IF EXISTS "Anyone can view error details" ON public.analytics_error_details;

DROP POLICY IF EXISTS "Allow anonymous select on analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow anonymous select on analytics_sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow anonymous select on analytics_daily_stats" ON public.analytics_daily_stats;
DROP POLICY IF EXISTS "Allow anonymous select on analytics_error_details" ON public.analytics_error_details;

-- Keep dashboard access available to authenticated operators. The application
-- can continue using service-role access for scheduled digest processing.
CREATE POLICY "Authenticated users can view error details"
  ON public.analytics_error_details
  FOR SELECT
  TO authenticated
  USING (true);
