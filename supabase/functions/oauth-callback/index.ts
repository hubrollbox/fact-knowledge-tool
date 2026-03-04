import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://fact-knowledge-tool.lovable.app";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error from Google:", error);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=missing_params`, 302);
    }

    // Decode state
    let state: { userId: string; service: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=invalid_state`, 302);
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=token_exchange_failed`, 302);
    }

    // Use service role to store tokens (user isn't authenticated in this redirect flow)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Upsert token
    const { error: upsertError } = await supabase.from("oauth_tokens").upsert(
      {
        user_id: state.userId,
        provider: state.service,
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
    const APP_URL = Deno.env.get("APP_URL") || "https://fact-knowledge-tool.lovable.app";
    return Response.redirect(`${APP_URL}/gestao/perfil?oauth=error&message=internal_error`, 302);
  }
});
