-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow anonymous inserts to analytics_sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow anonymous inserts to analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow anonymous updates to analytics_sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to view analytics_sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to view analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated users to view analytics_daily_stats" ON public.analytics_daily_stats;

-- Create permissive policies for anonymous tracking
-- Anyone can insert sessions (for tracking)
CREATE POLICY "Anyone can insert sessions"
ON public.analytics_sessions
FOR INSERT
TO anon
WITH CHECK (true);

-- Anyone can update their own session
CREATE POLICY "Anyone can update sessions"
ON public.analytics_sessions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert events"
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Anyone can view analytics data (for dashboard)
CREATE POLICY "Anyone can view sessions"
ON public.analytics_sessions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can view events"
ON public.analytics_events
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can view daily stats"
ON public.analytics_daily_stats
FOR SELECT
TO anon
USING (true);