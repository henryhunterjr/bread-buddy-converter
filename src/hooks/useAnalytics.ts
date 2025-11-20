import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Event types for analytics tracking
export type AnalyticsEvent = 
  | 'page_view'
  | 'conversion_started'
  | 'conversion_completed'
  | 'pdf_downloaded'
  | 'recipe_saved'
  | 'file_uploaded'
  | 'ai_parsing_success'
  | 'ai_parsing_failed'
  | 'ai_vision_parsing'
  | 'regex_parsing_used'
  | 'ingredient_confirmation_shown'
  | 'ingredient_edited'
  | 'error_occurred';

interface EventData {
  conversion_direction?: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  parser_used?: 'ai' | 'regex';
  file_type?: string;
  error_message?: string;
  referrer?: string;
  recipe_type?: string;
  ingredient_count?: number;
  [key: string]: any;
}

class AnalyticsService {
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private eventQueue: Array<{ event_type: AnalyticsEvent; event_data: EventData }> = [];
  private isProcessing = false;

  constructor() {
    this.initSession();
  }

  private initSession() {
    // Get or create session ID from sessionStorage
    const existingSessionId = sessionStorage.getItem('analytics_session_id');
    const sessionStartTime = sessionStorage.getItem('analytics_session_start');
    
    if (existingSessionId && sessionStartTime) {
      this.sessionId = existingSessionId;
      this.sessionStartTime = parseInt(sessionStartTime, 10);
    } else {
      this.createNewSession();
    }
  }

  private async createNewSession() {
    try {
      const { data, error } = await supabase
        .from('analytics_sessions')
        .insert({
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Analytics] Failed to create session:', error);
        return;
      }

      this.sessionId = data.id;
      this.sessionStartTime = Date.now();
      sessionStorage.setItem('analytics_session_id', data.id);
      sessionStorage.setItem('analytics_session_start', this.sessionStartTime.toString());

      // Track traffic source on first page view
      const referrer = document.referrer || 'direct';
      const source = referrer === 'direct' ? 'Direct' : new URL(referrer).hostname;
      this.trackEvent('page_view', { referrer: source });
    } catch (err) {
      console.error('[Analytics] Session creation error:', err);
    }
  }

  async trackEvent(event_type: AnalyticsEvent, event_data: EventData = {}) {
    if (!this.sessionId) {
      await this.createNewSession();
      if (!this.sessionId) return; // Still failed, abort
    }

    // Add to queue
    this.eventQueue.push({ event_type, event_data });

    // Process queue
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.eventQueue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const eventsToInsert = events.map(({ event_type, event_data }) => ({
        session_id: this.sessionId!,
        event_type,
        event_data,
      }));

      const { error } = await supabase
        .from('analytics_events')
        .insert(eventsToInsert);

      if (error) {
        console.error('[Analytics] Failed to track events:', error);
        // Put failed events back in queue
        this.eventQueue.unshift(...events);
      } else {
        // Update session page_views and events_count
        await this.updateSessionStats(events);
      }
    } catch (err) {
      console.error('[Analytics] Event tracking error:', err);
    } finally {
      this.isProcessing = false;
      
      // Process remaining queue if any
      if (this.eventQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  private async updateSessionStats(events: Array<{ event_type: AnalyticsEvent; event_data: EventData }>) {
    if (!this.sessionId) return;

    const pageViewCount = events.filter(e => e.event_type === 'page_view').length;
    const hasConversion = events.some(e => e.event_type === 'conversion_completed');
    const conversionEvent = events.find(e => e.event_type === 'conversion_completed');

    try {
      const updates: any = {
        events_count: await this.getSessionEventCount(),
      };

      if (pageViewCount > 0) {
        const currentPageViews = await this.getSessionPageViews();
        updates.page_views = currentPageViews + pageViewCount;
      }

      if (hasConversion && conversionEvent) {
        updates.conversion_completed = true;
        updates.conversion_direction = conversionEvent.event_data.conversion_direction;
        updates.ended_at = new Date().toISOString();
      }

      await supabase
        .from('analytics_sessions')
        .update(updates)
        .eq('id', this.sessionId);
    } catch (err) {
      console.error('[Analytics] Failed to update session stats:', err);
    }
  }

  private async getSessionEventCount(): Promise<number> {
    if (!this.sessionId) return 0;
    
    const { count } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', this.sessionId);
    
    return count || 0;
  }

  private async getSessionPageViews(): Promise<number> {
    if (!this.sessionId) return 0;
    
    const { data } = await supabase
      .from('analytics_sessions')
      .select('page_views')
      .eq('id', this.sessionId)
      .single();
    
    return data?.page_views || 0;
  }

  async endSession() {
    if (!this.sessionId || !this.sessionStartTime) return;

    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    try {
      await supabase
        .from('analytics_sessions')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', this.sessionId);
    } catch (err) {
      console.error('[Analytics] Failed to end session:', err);
    }
  }
}

// Singleton instance
const analytics = new AnalyticsService();

// React hook
export function useAnalytics() {
  const hasTrackedMount = useRef(false);

  useEffect(() => {
    // Track page view on mount (once)
    if (!hasTrackedMount.current) {
      analytics.trackEvent('page_view');
      hasTrackedMount.current = true;
    }

    // End session on unmount
    return () => {
      analytics.endSession();
    };
  }, []);

  return {
    trackEvent: (event_type: AnalyticsEvent, event_data?: EventData) => 
      analytics.trackEvent(event_type, event_data),
  };
}
