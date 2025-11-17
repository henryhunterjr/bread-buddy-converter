-- Create analytics_events table to track every user interaction
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create analytics_sessions table to track unique user sessions
CREATE TABLE public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_views INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  conversion_completed BOOLEAN DEFAULT false,
  conversion_direction VARCHAR(30)
);

-- Create analytics_daily_stats table for pre-computed metrics
CREATE TABLE public.analytics_daily_stats (
  date DATE PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  sourdough_to_yeast_count INTEGER DEFAULT 0,
  yeast_to_sourdough_count INTEGER DEFAULT 0,
  pdf_downloads INTEGER DEFAULT 0,
  recipes_saved INTEGER DEFAULT 0,
  file_uploads INTEGER DEFAULT 0,
  ai_parsing_success_rate DECIMAL(5,2),
  avg_session_duration_seconds INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_events_session ON public.analytics_events(session_id);
CREATE INDEX idx_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX idx_sessions_started ON public.analytics_sessions(started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public insert (for anonymous tracking)
CREATE POLICY "Allow public insert on analytics_events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public insert on analytics_sessions"
ON public.analytics_sessions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update on analytics_sessions"
ON public.analytics_sessions
FOR UPDATE
TO public
USING (true);

-- Only allow select for authenticated users (you, as the owner)
CREATE POLICY "Allow authenticated select on analytics_events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated select on analytics_sessions"
ON public.analytics_sessions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated all on analytics_daily_stats"
ON public.analytics_daily_stats
FOR ALL
TO authenticated
USING (true);