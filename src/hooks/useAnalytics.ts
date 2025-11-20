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
  | 'error_occurred'
  | 'funnel_landing'
  | 'funnel_input_started'
  | 'funnel_parsing_started'
  | 'funnel_conversion_viewed'
  | 'funnel_download'
  | 'funnel_save';

export type ErrorCategory = 
  | 'parsing_error'
  | 'network_error'
  | 'validation_error'
  | 'file_upload_error'
  | 'unknown_error';

interface EventData {
  conversion_direction?: 'sourdough-to-yeast' | 'yeast-to-sourdough';
  parser_used?: 'ai' | 'regex';
  file_type?: string;
  error_message?: string;
  error_category?: ErrorCategory;
  error_severity?: 'low' | 'medium' | 'high';
  referrer?: string;
  recipe_type?: string;
  ingredient_count?: number;
  funnel_stage?: string;
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
      const source = this.categorizeTrafficSource(referrer);
      this.trackEvent('funnel_landing', { referrer: source });
    } catch (err) {
      console.error('[Analytics] Session creation error:', err);
    }
  }

  private categorizeTrafficSource(referrer: string): string {
    if (!referrer || referrer === 'direct') return 'Direct';
    
    try {
      const url = new URL(referrer);
      const hostname = url.hostname.toLowerCase();
      
      // Social media
      if (hostname.includes('facebook') || hostname.includes('fb.')) return 'Social - Facebook';
      if (hostname.includes('twitter') || hostname.includes('t.co')) return 'Social - Twitter';
      if (hostname.includes('instagram')) return 'Social - Instagram';
      if (hostname.includes('linkedin')) return 'Social - LinkedIn';
      if (hostname.includes('pinterest')) return 'Social - Pinterest';
      if (hostname.includes('reddit')) return 'Social - Reddit';
      if (hostname.includes('youtube')) return 'Social - YouTube';
      
      // Search engines
      if (hostname.includes('google')) return 'Search - Google';
      if (hostname.includes('bing')) return 'Search - Bing';
      if (hostname.includes('yahoo')) return 'Search - Yahoo';
      if (hostname.includes('duckduckgo')) return 'Search - DuckDuckGo';
      
      // Email
      if (hostname.includes('mail') || hostname.includes('email')) return 'Email';
      
      return `Referral - ${hostname}`;
    } catch {
      return 'Direct';
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

  // Log detailed error information
  async logDetailedError(params: {
    errorType: string;
    errorSeverity: 'critical' | 'high' | 'medium' | 'low';
    errorCode?: string;
    errorMessage: string;
    stackTrace?: string;
    context?: Record<string, any>;
    edgeFunctionLogs?: string;
    requestData?: Record<string, any>;
    responseData?: Record<string, any>;
  }) {
    if (!this.sessionId) return;

    try {
      const { error } = await supabase
        .from('analytics_error_details')
        .insert({
          session_id: this.sessionId,
          error_type: params.errorType,
          error_severity: params.errorSeverity,
          error_code: params.errorCode,
          error_message: params.errorMessage,
          stack_trace: params.stackTrace,
          context: params.context || {},
          edge_function_logs: params.edgeFunctionLogs,
          request_data: params.requestData,
          response_data: params.responseData
        });

      if (error) console.error('[Analytics] Failed to log detailed error:', error);
    } catch (error) {
      console.error('[Analytics] Failed to log detailed error:', error);
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
    logDetailedError: (params: Parameters<typeof analytics.logDetailedError>[0]) => 
      analytics.logDetailedError(params),
  };
}
