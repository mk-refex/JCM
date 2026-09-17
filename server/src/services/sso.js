const MASKED_SECRET = "••••••";

export function normalizeProviderSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatSsoProvider(row) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    displayName: row.display_name,
    iconUrl: row.icon_url,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    clientId: row.client_id || "",
    clientSecret: row.client_secret ? MASKED_SECRET : "",
    hasClientSecret: Boolean(row.client_secret),
    redirectUri: row.redirect_uri || "",
    frontendBaseUrl: row.frontend_base_url || "",
    authorizationUrl: row.authorization_url || "",
    tokenUrl: row.token_url || "",
    userInfoUrl: row.user_info_url || "",
    discoveryUrl: row.discovery_url || "",
    scopes: row.scopes || "openid email profile",
  };
}

export function buildSsoPayload(body, { requireProvider = false } = {}) {
  const provider = normalizeProviderSlug(body.provider);
  if (requireProvider && !provider) {
    throw new Error("Provider slug is required (e.g. refex-one, azure)");
  }

  const payload = {};
  if (body.provider !== undefined) payload.provider = provider;
  if (body.displayName !== undefined) {
    payload.display_name = String(body.displayName || "").trim() || null;
  }
  if (body.iconUrl !== undefined) {
    payload.icon_url = String(body.iconUrl || "").trim() || null;
  }
  if (body.sortOrder !== undefined) payload.sort_order = Number(body.sortOrder) || 0;
  if (body.isActive !== undefined) payload.is_active = body.isActive ? 1 : 0;
  if (body.clientId !== undefined) {
    payload.client_id = body.clientId == null ? "" : String(body.clientId);
  }
  if (body.redirectUri !== undefined) {
    payload.redirect_uri = String(body.redirectUri || "").trim() || null;
  }
  if (body.frontendBaseUrl !== undefined) {
    payload.frontend_base_url = String(body.frontendBaseUrl || "").trim() || null;
  }
  if (body.authorizationUrl !== undefined) {
    payload.authorization_url = String(body.authorizationUrl || "").trim() || null;
  }
  if (body.tokenUrl !== undefined) {
    payload.token_url = String(body.tokenUrl || "").trim() || null;
  }
  if (body.userInfoUrl !== undefined) {
    payload.user_info_url = String(body.userInfoUrl || "").trim() || null;
  }
  if (body.discoveryUrl !== undefined) {
    payload.discovery_url = String(body.discoveryUrl || "").trim() || null;
  }
  if (body.scopes !== undefined) {
    payload.scopes = String(body.scopes || "").trim() || "openid email profile";
  }
  if (
    body.clientSecret !== undefined &&
    body.clientSecret !== "" &&
    body.clientSecret !== MASKED_SECRET
  ) {
    payload.client_secret = String(body.clientSecret);
  }
  return payload;
}

export function loginErrorRedirect(state, error) {
  const base = String(state || "").replace(/\/$/, "");
  return base ? `${base}/login?error=${error}` : `/login?error=${error}`;
}

export function buildCallbackRedirect(config, state, token, userData) {
  const frontendBase = String(state || config.frontend_base_url || "").replace(/\/$/, "");
  const qs = `token=${encodeURIComponent(token)}&user_data=${encodeURIComponent(JSON.stringify(userData))}`;
  return frontendBase ? `${frontendBase}/sso/callback?${qs}` : `/sso/callback?${qs}`;
}

export function resolveRedirectUri(config, req, provider) {
  if (config.redirect_uri?.trim()) return config.redirect_uri.trim();
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();
  return `${proto}://${host}/api/auth/sso/${encodeURIComponent(provider)}/callback`;
}

export async function resolveOidcEndpoints(config) {
  const scopes = (config.scopes || "openid email profile").trim() || "openid email profile";

  if (config.discovery_url?.trim()) {
    try {
      const res = await fetch(config.discovery_url.trim());
      if (res.ok) {
        const disc = await res.json();
        return {
          authorizationUrl: config.authorization_url?.trim() || disc.authorization_endpoint,
          tokenUrl: config.token_url?.trim() || disc.token_endpoint,
          userInfoUrl: config.user_info_url?.trim() || disc.userinfo_endpoint,
          scopes,
        };
      }
    } catch (error) {
      console.error("OIDC discovery error:", error?.message || error);
    }
  }

  return {
    authorizationUrl: config.authorization_url?.trim() || null,
    tokenUrl: config.token_url?.trim() || null,
    userInfoUrl: config.user_info_url?.trim() || null,
    scopes,
  };
}

export function extractEmailFromProfile(profile) {
  const candidates = [
    profile?.email,
    profile?.preferred_username,
    profile?.upn,
    profile?.mail,
  ];
  for (const value of candidates) {
    const email = String(value || "").toLowerCase().trim();
    if (email.includes("@")) return email;
  }
  return null;
}

export { MASKED_SECRET };
