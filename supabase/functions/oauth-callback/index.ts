import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://fact-knowledge-tool.lovable.app";
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || `${SUPABASE_URL}/functions/v1/oauth-callback`;

const decodeJwtPayload = (token: string) => {
  const [, payload] = token.split(".");
  if (!payload) return null;
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
};

const PROVIDER_TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  github: "https://github.com/login/oauth/access_token",
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error from provider:", error);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=missing_params`, 302);
    }

    // Decode state
    let state: { userId: string; service: string; provider: string; serviceEmail?: string | null };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=invalid_state`, 302);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: creds, error: credsError } = await supabase
      .from("user_oauth_credentials")
      .select("client_id, client_secret")
      .eq("user_id", state.userId)
      .eq("provider", state.provider)
      .maybeSingle();

    if (credsError || !creds) {
      console.error("No OAuth credentials found for user:", state.userId);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=no_credentials`, 302);
    }

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(PROVIDER_TOKEN_URLS[state.provider], {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json" 
      },
      body: tokenParams,
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || (!tokenData.access_token && !tokenData.error)) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=token_exchange_failed`, 302);
    }

    if (state.serviceEmail && state.provider !== 'github') {
      const idTokenEmail = tokenData.id_token
        ? (decodeJwtPayload(tokenData.id_token)?.email as string | undefined)?.toLowerCase()
        : null;

      if (!idTokenEmail || idTokenEmail !== state.serviceEmail.toLowerCase()) {
        console.error("OAuth email mismatch", {
          expected: state.serviceEmail,
          received: idTokenEmail,
        });
        return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=email_mismatch`, 302);
      }
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Upsert token
    const { error: upsertError } = await supabase.from("oauth_tokens").upsert(
      {
        user_id: state.userId,
        provider: state.service, // Use service as provider for token storage (gmail, onedrive, etc)
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt,
        scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
      },
      { onConflict: "user_id,provider" }
    );

    if (upsertError) {
      console.error("Token storage error:", upsertError);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=storage_failed`, 302);
    }

    // Update user_services to mark as connected
    await supabase.from("user_services").upsert(
      {
        user_id: state.userId,
        service: state.service,
        connected: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,service" }
    );

    return Response.redirect(`${APP_URL}/gestao/perfil?oauth=success&service=${state.service}`, 302);
  } catch (error) {
    console.error("Callback error:", error);
    return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=internal_error`, 302);
  }
});
