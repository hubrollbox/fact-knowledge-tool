import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || `${SUPABASE_URL}/functions/v1/oauth-callback`;

const SERVICE_SCOPES: Record<string, string[]> = {
  google_drive: ["https://www.googleapis.com/auth/drive.readonly"],
  gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
  google_calendar: ["https://www.googleapis.com/auth/calendar.readonly"],
  onedrive: ["Files.Read.All", "offline_access"],
  github: ["repo", "read:user"],
};

const PROVIDER_AUTH_URLS: Record<string, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  github: "https://github.com/login/oauth/authorize",
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

    const supabaseAuth = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { service, provider, serviceEmail } = await req.json();
    if (!service || !SERVICE_SCOPES[service]) {
      return new Response(
        JSON.stringify({ error: "Invalid service" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: creds, error: credsError } = await supabaseAdmin
      .from("user_oauth_credentials")
      .select("client_id")
      .eq("user_id", userId)
      .eq("provider", provider || "google")
      .maybeSingle();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ error: `Credenciais ${provider} não configuradas no teu Perfil.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scopes = SERVICE_SCOPES[service];
    const normalizedEmail = typeof serviceEmail === "string" ? serviceEmail.trim().toLowerCase() : "";
    const state = btoa(JSON.stringify({
      userId,
      service,
      provider: provider || "google",
      serviceEmail: normalizedEmail || null,
    }));

    const params = new URLSearchParams({
      client_id: creds.client_id,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      state,
    });

    if (provider === "google") {
      params.set("scope", ["openid", "email", ...scopes].join(" "));
      params.set("access_type", "offline");
      params.set("prompt", "consent select_account");
      if (normalizedEmail) params.set("login_hint", normalizedEmail);
    } else if (provider === "microsoft") {
      params.set("scope", ["openid", "email", "profile", ...scopes].join(" "));
      params.set("prompt", "select_account");
      if (normalizedEmail) params.set("login_hint", normalizedEmail);
    } else if (provider === "github") {
      params.set("scope", scopes.join(" "));
    }

    const authUrl = `${PROVIDER_AUTH_URLS[provider || "google"]}?${params.toString()}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
