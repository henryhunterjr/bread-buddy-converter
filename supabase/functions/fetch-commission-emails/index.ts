import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  internalDate: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
}

interface EmailData {
  id: string;
  date: string;
  subject: string;
  from: string;
  body: string;
}

// Decode base64url encoded content from Gmail
function decodeBase64Url(base64url: string): string {
  try {
    // Replace URL-safe characters with standard base64 characters
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Decode using atob
    const decoded = atob(base64);
    // Handle UTF-8 encoding
    return decodeURIComponent(
      decoded.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  } catch {
    return '';
  }
}

// Extract plain text body from Gmail message
function extractBody(message: GmailMessageDetail): string {
  // Try to get body from payload directly
  if (message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }

  // Try to find text/plain or text/html in parts
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to HTML if no plain text
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        // Basic HTML to text conversion
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // Fallback to snippet
  return message.snippet || '';
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[Gmail] Token refresh failed:', errorData);
    throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch emails from Gmail API
async function fetchGmailEmails(accessToken: string, searchQuery: string, maxResults: number = 500): Promise<EmailData[]> {
  // Search for emails matching the query
  const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  searchUrl.searchParams.set('q', searchQuery);
  searchUrl.searchParams.set('maxResults', maxResults.toString());

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!searchResponse.ok) {
    const errorData = await searchResponse.json();
    console.error('[Gmail] Search failed:', errorData);

    if (searchResponse.status === 401) {
      throw new Error('Gmail authentication expired. Please re-authenticate.');
    }
    if (searchResponse.status === 403) {
      throw new Error('Gmail API access denied. Check API permissions.');
    }
    if (searchResponse.status === 429) {
      throw new Error('Gmail API rate limit reached. Please try again later.');
    }

    throw new Error(`Gmail search failed: ${errorData.error?.message || 'Unknown error'}`);
  }

  const searchData = await searchResponse.json();
  const messages: GmailMessage[] = searchData.messages || [];

  if (messages.length === 0) {
    console.log('[Gmail] No messages found matching query');
    return [];
  }

  console.log(`[Gmail] Found ${messages.length} messages, fetching details...`);

  // Fetch details for each message (batch in groups of 50)
  const emails: EmailData[] = [];
  const batchSize = 50;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const detailPromises = batch.map(async (msg) => {
      try {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const detailResponse = await fetch(detailUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!detailResponse.ok) {
          console.error(`[Gmail] Failed to fetch message ${msg.id}`);
          return null;
        }

        const detail: GmailMessageDetail = await detailResponse.json();

        const headers = detail.payload.headers;
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const date = new Date(parseInt(detail.internalDate)).toISOString();
        const body = extractBody(detail);

        return {
          id: detail.id,
          date,
          subject,
          from,
          body,
        };
      } catch (err) {
        console.error(`[Gmail] Error fetching message ${msg.id}:`, err);
        return null;
      }
    });

    const batchResults = await Promise.all(detailPromises);
    emails.push(...batchResults.filter((e): e is EmailData => e !== null));

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[Gmail] Successfully fetched ${emails.length} email details`);
  return emails;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Commission Emails] Starting fetch...');

    // Get credentials from environment
    const gmailRefreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');
    const gmailClientId = Deno.env.get('GMAIL_CLIENT_ID');
    const gmailClientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

    if (!gmailRefreshToken || !gmailClientId || !gmailClientSecret) {
      console.error('[Commission Emails] Missing Gmail credentials');
      throw new Error('Gmail API credentials not configured. Please set GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID, and GMAIL_CLIENT_SECRET in Supabase secrets.');
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const affiliateCode = body.affiliateCode || 'HBK23';
    const searchQuery = body.searchQuery || `from:sourhouse OR from:thesourhouse subject:(order OR commission OR ${affiliateCode})`;

    console.log(`[Commission Emails] Search query: ${searchQuery}`);

    // Refresh access token
    console.log('[Commission Emails] Refreshing access token...');
    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(gmailRefreshToken, gmailClientId, gmailClientSecret);
    } catch (tokenError) {
      console.error('[Commission Emails] Token refresh failed:', tokenError);
      throw new Error('Gmail authentication expired. Please re-authenticate with Google to continue tracking commissions.');
    }

    // Fetch emails
    console.log('[Commission Emails] Fetching emails from Gmail...');
    const emails = await fetchGmailEmails(accessToken, searchQuery);

    console.log(`[Commission Emails] Successfully fetched ${emails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        emails,
        count: emails.length,
        fetchedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Commission Emails] Error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        emails: [],
        count: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
