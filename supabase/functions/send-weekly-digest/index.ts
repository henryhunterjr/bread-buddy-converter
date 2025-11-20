import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const adminEmail = Deno.env.get('ADMIN_EMAIL')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Weekly Digest] Starting generation...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    // Fetch error data
    const { data: errors } = await supabase
      .from('analytics_error_details')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    // Fetch events data
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString());

    // Calculate summary statistics
    const totalErrors = errors?.length || 0;
    const conversions = events?.filter(e => e.event_type === 'conversion_completed').length || 0;
    const aiSuccess = events?.filter(e => e.event_type === 'ai_parsing_success').length || 0;
    const aiFailed = events?.filter(e => e.event_type === 'ai_parsing_failed').length || 0;
    const successRate = aiSuccess + aiFailed > 0 
      ? Math.round((aiSuccess / (aiSuccess + aiFailed)) * 100) 
      : 0;

    // Group errors by type
    const errorsByType: Record<string, number> = {};
    errors?.forEach(err => {
      errorsByType[err.error_type] = (errorsByType[err.error_type] || 0) + 1;
    });

    // Find top 5 error types
    const topErrors = Object.entries(errorsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Identify new errors (errors that didn't appear in previous week)
    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(startDate);

    const { data: prevWeekErrors } = await supabase
      .from('analytics_error_details')
      .select('error_type')
      .gte('created_at', prevWeekStart.toISOString())
      .lt('created_at', prevWeekEnd.toISOString());

    const prevWeekTypes = new Set(prevWeekErrors?.map(e => e.error_type) || []);
    const currentWeekTypes = new Set(errors?.map(e => e.error_type) || []);
    const newErrorTypes = Array.from(currentWeekTypes).filter(t => !prevWeekTypes.has(t));

    // Calculate trends
    const prevWeekCount = prevWeekErrors?.length || 0;
    const errorTrend = prevWeekCount > 0 
      ? Math.round(((totalErrors - prevWeekCount) / prevWeekCount) * 100)
      : 0;

    // User behavior categories
    const attemptedUsers = sessions?.filter(s => {
      const sessionEvents = events?.filter(e => e.session_id === s.id) || [];
      const hasInput = sessionEvents.some(e => e.event_type === 'funnel_input_started');
      const hasError = sessionEvents.some(e => 
        e.event_type === 'ai_parsing_failed' || e.event_type === 'error_occurred'
      );
      const hasConversion = sessionEvents.some(e => e.event_type === 'conversion_completed');
      
      return hasInput && hasError && !hasConversion;
    }).length || 0;

    // Generate HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .stat-card { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 15px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .critical { border-left-color: #ef4444; }
    .warning { border-left-color: #f59e0b; }
    .success { border-left-color: #10b981; }
    .metric { font-size: 36px; font-weight: bold; color: #667eea; }
    .trend-up { color: #ef4444; }
    .trend-down { color: #10b981; }
    .error-list { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .error-item { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .priority-high { color: #ef4444; font-weight: bold; }
    .priority-medium { color: #f59e0b; font-weight: bold; }
    .action-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    h2 { color: #1f2937; margin-top: 30px; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-new { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Weekly Analytics Digest</h1>
    <p>BGB Recipe Converter - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</p>
  </div>
  
  <div class="content">
    <h2>📈 Summary</h2>
    <div class="stat-card">
      <div class="metric">${totalErrors}</div>
      <div>Total Errors This Week ${errorTrend !== 0 ? `<span class="${errorTrend > 0 ? 'trend-up' : 'trend-down'}">(${errorTrend > 0 ? '+' : ''}${errorTrend}%)</span>` : ''}</div>
    </div>
    
    <div class="stat-card success">
      <div class="metric">${conversions}</div>
      <div>Successful Conversions</div>
    </div>
    
    <div class="stat-card ${successRate < 70 ? 'critical' : successRate < 85 ? 'warning' : 'success'}">
      <div class="metric">${successRate}%</div>
      <div>AI Parsing Success Rate</div>
    </div>

    ${attemptedUsers > 0 ? `
    <div class="stat-card critical">
      <div class="metric">${attemptedUsers}</div>
      <div>⚠️ Lost Conversions (Attempted Users who hit errors)</div>
    </div>
    ` : ''}

    <h2>🔥 Top Error Patterns</h2>
    <div class="error-list">
      ${topErrors.map((err, idx) => `
        <div class="error-item">
          <span class="${idx === 0 ? 'priority-high' : idx < 3 ? 'priority-medium' : ''}">
            ${idx + 1}. ${err.type.replace(/_/g, ' ').toUpperCase()}
          </span>
          <span style="float: right; font-weight: bold;">${err.count} occurrences</span>
        </div>
      `).join('')}
    </div>

    ${newErrorTypes.length > 0 ? `
    <h2>🆕 New Errors This Week</h2>
    <div class="action-box">
      <strong>⚠️ Attention Required:</strong> ${newErrorTypes.length} new error type${newErrorTypes.length > 1 ? 's' : ''} appeared this week:
      <ul>
        ${newErrorTypes.map(type => `
          <li><span class="badge badge-new">NEW</span> ${type.replace(/_/g, ' ').toUpperCase()}</li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <h2>💡 Recommended Actions</h2>
    <div class="action-box">
      <strong>Priority Fixes:</strong>
      <ul>
        ${topErrors.slice(0, 3).map(err => `
          <li>✓ Fix "${err.type.replace(/_/g, ' ')}" (${err.count} users affected)</li>
        `).join('')}
        ${attemptedUsers > 0 ? `
          <li><span class="badge badge-critical">CRITICAL</span> ${attemptedUsers} users abandoned after errors - focus on error patterns above</li>
        ` : ''}
      </ul>
    </div>

    <h2>📊 Full Analytics Dashboard</h2>
    <p>View detailed error patterns, user behavior categories, and error replay tools:</p>
    <p><a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/analytics" style="color: #667eea; font-weight: bold;">Open Analytics Dashboard →</a></p>
  </div>

  <div class="footer">
    <p>This is an automated weekly digest from your BGB Recipe Converter analytics.</p>
    <p>To adjust email frequency or recipients, update ADMIN_EMAIL in your Cloud secrets.</p>
  </div>
</body>
</html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'BGB Analytics <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `📊 Weekly Digest: ${totalErrors} errors, ${conversions} conversions (${successRate}% success rate)`,
      html: htmlContent,
    });

    console.log('[Weekly Digest] Email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: {
          totalErrors,
          conversions,
          successRate,
          topErrors,
          newErrorTypes,
          attemptedUsers
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Weekly Digest] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
