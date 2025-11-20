-- Create detailed error logging table
CREATE TABLE public.analytics_error_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.analytics_sessions(id),
  event_id UUID REFERENCES public.analytics_events(id),
  error_type TEXT NOT NULL,
  error_severity TEXT NOT NULL CHECK (error_severity IN ('critical', 'high', 'medium', 'low')),
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  edge_function_logs TEXT,
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_error_details ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert error details
CREATE POLICY "Anyone can insert error details"
ON public.analytics_error_details
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to view error details
CREATE POLICY "Anyone can view error details"
ON public.analytics_error_details
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_analytics_error_details_session_id ON public.analytics_error_details(session_id);
CREATE INDEX idx_analytics_error_details_error_type ON public.analytics_error_details(error_type);
CREATE INDEX idx_analytics_error_details_created_at ON public.analytics_error_details(created_at DESC);