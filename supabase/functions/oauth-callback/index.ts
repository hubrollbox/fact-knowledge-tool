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

    // Decode state — now only contains nonce
    let state: { nonce: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=invalid_state`, 302);
    }

    if (!state.nonce) {
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=missing_nonce`, 302);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify nonce exists, hasn't expired, and retrieve user info from it
    const { data: nonceRecord, error: nonceError } = await supabase
      .from("oauth_state_nonces")
      .select("*")
      .eq("nonce", state.nonce)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (nonceError || !nonceRecord) {
      console.error("Invalid or expired nonce:", state.nonce);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=invalid_or_expired_state`, 302);
    }

    // Delete nonce immediately (single-use)
    await supabase.from("oauth_state_nonces").delete().eq("id", nonceRecord.id);

    // Use user_id from the verified nonce record — never from client
    const userId = nonceRecord.user_id;
    const service = nonceRecord.service;
    const provider = nonceRecord.provider;
    const serviceEmail = nonceRecord.service_email;

    const { data: creds, error: credsError } = await supabase
      .from("user_oauth_credentials")
      .select("client_id, client_secret")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    if (credsError || !creds) {
      console.error("No OAuth credentials found for user:", userId);
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

    const tokenRes = await fetch(PROVIDER_TOKEN_URLS[provider], {
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

    if (serviceEmail && provider !== 'github') {
      const idTokenEmail = tokenData.id_token
        ? (decodeJwtPayload(tokenData.id_token)?.email as string | undefined)?.toLowerCase()
        : null;

      if (!idTokenEmail || idTokenEmail !== serviceEmail.toLowerCase()) {
        console.error("OAuth email mismatch", {
          expected: serviceEmail,
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
        user_id: userId,
        provider: service,
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
        user_id: userId,
        service,
        connected: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,service" }
    );

    return Response.redirect(`${APP_URL}/gestao/perfil?oauth=success&service=${service}`, 302);
  } catch (error) {
    console.error("Callback error:", error);
    return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=internal_error`, 302);
  }
});
