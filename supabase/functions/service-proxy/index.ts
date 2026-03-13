import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROVIDER_TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  github: "https://github.com/login/oauth/access_token",
};

const SERVICE_TO_PROVIDER: Record<string, string> = {
  gmail: "google",
  google_drive: "google",
  google_calendar: "google",
  onedrive: "microsoft",
  github: "github",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { service, action, params } = await req.json();

    if (!service || !SERVICE_TO_PROVIDER[service]) {
      return new Response(JSON.stringify({ error: "Invalid service" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = SERVICE_TO_PROVIDER[service];
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current token
    const { data: oauthToken, error: oauthTokenError } = await supabaseAdmin
      .from("oauth_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", service)
      .maybeSingle();

    if (oauthTokenError || !oauthToken) {
      return new Response(JSON.stringify({ error: "Service not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = oauthToken.access_token;
    const isExpired = oauthToken.expires_at ? new Date(oauthToken.expires_at) < new Date() : true;

    if (isExpired && oauthToken.refresh_token && provider !== 'github') {
      // Need refresh. Get credentials first.
      const { data: creds, error: credsError } = await supabaseAdmin
        .from("user_oauth_credentials")
        .select("client_id, client_secret")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();

      if (credsError || !creds) {
        return new Response(JSON.stringify({ error: `No ${provider} credentials found for user` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh token
      const tokenRes = await fetch(PROVIDER_TOKEN_URLS[provider], {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          refresh_token: oauthToken.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Refresh failed:", tokenData);
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = tokenData.access_token;
      const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null;

      // Update stored tokens
      await supabaseAdmin.from("oauth_tokens").update({
        access_token: accessToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("provider", service);
    }

    // Perform action
    let result;
    if (service === "gmail") {
      if (action === "list_recent") {
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const listData = await res.json();
        const messages = await Promise.all((listData.messages || []).map(async (msg: any) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const detail = await detailRes.json();
          const headers = detail.payload?.headers || [];
          return {
            id: msg.id,
            from: headers.find((h: any) => h.name === "From")?.value || "Unknown",
            subject: headers.find((h: any) => h.name === "Subject")?.value || "(No Subject)",
            snippet: detail.snippet,
            date: headers.find((h: any) => h.name === "Date")?.value,
          };
        }));
        result = messages;
      }
    } else if (service === "google_calendar") {
      if (action === "list_upcoming") {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=5&singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
      }
    } else if (service === "onedrive") {
      if (action === "list_files") {
        const res = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
      }
    } else if (service === "github") {
      if (action === "list_repos") {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=5", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
