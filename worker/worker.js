const ALLOWED_EVENTS = new Set([
  "page_view",
  "nfc_tap",
  "click_whatsapp",
  "click_phone",
  "click_maps",
  "click_reviews",
  "click_booking",
  "click_catalog",
  "add_to_cart",
  "order_sent"
]);
const WORKER_VERSION = "v104-business-i18n";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    try {
      if (url.pathname.startsWith("/k/")) {
        return handleNfc(request, env, ctx, url.pathname.split("/")[2] || "");
      }
      if (url.pathname.startsWith("/p/")) {
        return handlePublicPage(request, env, ctx, decodeURIComponent(url.pathname.split("/")[2] || ""));
      }
      if (url.pathname.startsWith("/m/")) {
        return handleMomentPage(request, env, ctx, decodeURIComponent(url.pathname.split("/")[2] || ""));
      }
      if (url.pathname === "/event" && request.method === "POST") {
        return handleEvent(request, env);
      }
      if (url.pathname === "/booking" && request.method === "POST") {
        return handleBooking(request, env);
      }
      if (url.pathname === "/api/media/upload" && request.method === "POST") {
        return handleMediaUpload(request, env);
      }
      if (url.pathname === "/api/media/delete" && request.method === "POST") {
        return handleMediaDelete(request, env);
      }
      if (url.pathname === "/api/moment/preview" && request.method === "POST") {
        return handleMomentPreview(request, env);
      }
      if (url.pathname.startsWith("/cdn/")) {
        return handleMediaServe(request, env, url.pathname.slice(5));
      }
      if (url.pathname === "/webhooks/shopify/orders" && request.method === "POST") {
        return handleShopifyOrderWebhook(request, env);
      }
      if (url.pathname === "/webhooks/stripe" && request.method === "POST") {
        return handleStripeWebhook(request, env);
      }
      if (url.pathname === "/webhooks/paypal" && request.method === "POST") {
        return handlePayPalWebhook(request, env);
      }
      if (url.pathname === "/webhooks/resend" && request.method === "POST") {
        return handleResendWebhook(request, env);
      }
      if (url.pathname === "/api/integrations/status" && request.method === "GET") {
        return handleIntegrationsStatus(request, env);
      }
      if (url.pathname === "/api/channels/shopify/sync" && request.method === "POST") {
        return handleShopifyCatalogSync(request, env);
      }
      if (url.pathname === "/api/channels/shopify/register-webhooks" && request.method === "POST") {
        return handleShopifyRegisterWebhooks(request, env);
      }
      if (url.pathname === "/api/billing/stripe/checkout-session" && request.method === "POST") {
        return handleStripeCheckoutSession(request, env);
      }
      if (url.pathname === "/api/business/internationalize" && request.method === "POST") {
        return handleBusinessInternationalize(request, env);
      }
      if (url.pathname === "/api/business/sync-translations" && request.method === "POST") {
        return handleBusinessSyncTranslations(request, env);
      }
      if (url.pathname === "/health") {
        return json(buildIntegrationsHealth(env));
      }
      return html(notFound("Pagina non trovata"), 404);
    } catch (error) {
      console.error(error);
      if (url.pathname.startsWith("/api/")) {
        return cors(json({ error: "Errore temporaneo del server." }, 500));
      }
      return html(notFound("Errore temporaneo"), 500);
    }
  }
};

async function handleNfc(request, env, ctx, code) {
  if (!/^[A-Z0-9]{8,32}$/i.test(code)) return html(notFound("Link NFC non valido"), 404);
  try {
    const resolved = await rpc(env, "resolve_khamakey_code", { p_code: code.toUpperCase() });
    const target = resolved?.[0];
    if ((target?.target_type === "moment" || target?.target_type === "moment_activation") && target.slug) {
      return Response.redirect(`${new URL(request.url).origin}/m/${encodeURIComponent(target.slug)}`, 302);
    }
    if (target?.target_type === "business" && target.slug) {
      ctx.waitUntil(track(env, request, target.business_id, "nfc_tap", "nfc").catch(() => {}));
      return Response.redirect(`${new URL(request.url).origin}/p/${encodeURIComponent(target.slug)}`, 302);
    }
  } catch (error) {
    console.warn("resolve_khamakey_code non disponibile, uso resolve_nfc", error);
  }
  const rows = await rpc(env, "resolve_nfc", { p_code: code.toUpperCase() });
  const item = rows?.[0];
  if (!item) return html(notFound("Prodotto NFC non ancora associato"), 404);

  ctx.waitUntil(track(env, request, item.business_id, "nfc_tap", "nfc").catch(() => {}));
  return Response.redirect(`${new URL(request.url).origin}/p/${encodeURIComponent(item.slug)}`, 302);
}

async function handlePublicPage(request, env, ctx, slug) {
  const rows = await rpc(env, "get_public_business", { p_slug: slug });
  const page = rows?.[0];
  if (!page) return html(notFound("Pagina non pubblicata"), 404);

  const locale = resolveVisitorLocale(request, page.state || {});
  const localizedPage = { ...page, state: localizePublicState(page.state || {}, locale) };

  ctx.waitUntil(track(env, request, page.business_id, "page_view", "public_page").catch(() => {}));
  return html(renderPage(localizedPage, new URL(request.url).origin, env, locale), 200, {
    "Cache-Control": "public, max-age=30, s-maxage=60"
  });
}

async function handleMomentPage(request, env, ctx, slug) {
  const url = new URL(request.url);
  const pin = String(url.searchParams.get("pin") || "");
  const rows = await rpc(env, "get_public_moment", {
    p_slug: slug,
    p_pin_hash: pin ? await momentPinHash(slug, pin) : null
  });
  const page = rows?.[0];
  if (!page) {
    const activationRows = await rpc(env, "get_moment_activation_page", { p_slug: slug }).catch(() => null);
    const activation = activationRows?.[0];
    if (activation) {
      return html(renderMomentActivationPage(activation, url.origin, env), 200, { "Cache-Control": "public, max-age=30, s-maxage=60" });
    }
    return html(notFound("Moment non pubblicato"), 404);
  }

  const pinRequired = Boolean(page.pin_required);
  if (pinRequired && !page.pin_valid) {
    return html(renderMomentPinGate(page, url.origin, Boolean(pin)), 401, { "Cache-Control": "no-store" });
  }

  return html(renderMomentPage(page, url.origin), 200, {
    "Cache-Control": pinRequired ? "private, no-store" : "public, max-age=30, s-maxage=60"
  });
}

async function handleEvent(request, env) {
  const body = await request.json();
  const eventType = String(body.event_type || "");
  const businessId = String(body.business_id || "");
  if (!ALLOWED_EVENTS.has(eventType) || !businessId) {
    return cors(json({ error: "Evento non valido" }, 400));
  }
  await track(env, request, businessId, eventType, String(body.source || "public_page"), body.metadata || {});
  return cors(json({ ok: true }));
}

async function handleBooking(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return cors(json({ error: "Richiesta non valida" }, 400));
  const businessId = String(body.business_id || "");
  const pageSlug = String(body.slug || "");
  const values = sanitizeBookingValues(body.values || {});
  if (!businessId || !pageSlug || !values.name || !values.phone) {
    return cors(json({ error: "Nome e telefono sono obbligatori" }, 400));
  }

  const rows = await rpc(env, "get_public_business", { p_slug: pageSlug });
  const page = rows?.[0];
  if (!page || page.business_id !== businessId) {
    return cors(json({ error: "Pagina non valida" }, 404));
  }

  const state = page.state || {};
  const fields = state.fields || {};
  const recipient = validEmail(fields.email) ? String(fields.email).trim() : "";
  if (!recipient) return cors(json({ error: "Email attività non configurata" }, 400));

  let resendId = "";
  if (env.RESEND_API_KEY) {
    const emailResult = await sendBookingEmail(env, {
      to: recipient,
      from: env.RESEND_FROM_EMAIL || "KhamaKey <noreply@khamakey.com>",
      replyTo: validEmail(values.email) ? values.email : undefined,
      businessName: String(fields.nome || "KhamaKey"),
      requestType: String(fields.bookingType || "Richiesta"),
      values,
      pageUrl: `${new URL(request.url).origin}/p/${encodeURIComponent(pageSlug)}`
    });
    resendId = emailResult?.id || "";
  }

  await rpc(env, "create_public_lead", {
    p_business_id: businessId,
    p_lead_type: "booking",
    p_source: "public_page",
    p_payload: {
      slug: pageSlug,
      values,
      recipient,
      resend_id: resendId,
      user_agent: request.headers.get("user-agent") || "",
      country: request.cf?.country || "",
      city: request.cf?.city || ""
    },
    p_ingest_key: env.ANALYTICS_INGEST_KEY
  }).catch(error => console.error(error));

  await track(env, request, businessId, "click_booking", "public_page", { channel: "resend", resend_id: resendId }).catch(() => {});
  return cors(json({ ok: true, sent: Boolean(resendId) }));
}

async function track(env, request, businessId, eventType, source, metadata = {}) {
  return rpc(env, "track_business_event", {
    p_business_id: businessId,
    p_event_type: eventType,
    p_source: source,
    p_device: deviceType(request),
    p_visitor_id: await visitorId(request, env.VISITOR_SALT || "khamakey"),
    p_metadata: {
      ...metadata,
      country: request.cf?.country || "",
      city: request.cf?.city || "",
      referer: request.headers.get("referer") || ""
    },
    p_ingest_key: env.ANALYTICS_INGEST_KEY
  });
}

async function rpc(env, name, body) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase RPC ${name}: ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const MEDIA_LIMITS = {
  image: 8 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  audio: 12 * 1024 * 1024
};

const MEDIA_MIME = {
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  audio: new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/x-m4a", "audio/aac"])
};

function mediaKindFromMime(mime) {
  const type = String(mime || "").toLowerCase();
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("image/")) return "image";
  return "";
}

function mimeFromFilename(name) {
  const file = String(name || "").toLowerCase();
  if (/\.(jpe?g)$/.test(file)) return "image/jpeg";
  if (/\.png$/.test(file)) return "image/png";
  if (/\.webp$/.test(file)) return "image/webp";
  if (/\.gif$/.test(file)) return "image/gif";
  if (/\.webm$/.test(file)) return "video/webm";
  if (/\.mov$/.test(file)) return "video/quicktime";
  if (/\.(mp4|m4v)$/.test(file)) return "video/mp4";
  if (/\.wav$/.test(file)) return "audio/wav";
  if (/\.ogg$/.test(file)) return "audio/webm";
  if (/\.aac$/.test(file)) return "audio/aac";
  if (/\.m4a$/.test(file)) return "audio/x-m4a";
  if (/\.mp3$/.test(file)) return "audio/mpeg";
  return "";
}

function resolveUploadMime(file) {
  const direct = String(file?.type || "").toLowerCase();
  if (direct && mediaKindFromMime(direct)) return direct;
  return mimeFromFilename(file?.name || "") || direct;
}

function mediaExtFromMime(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/aac": "aac"
  };
  return map[String(mime || "").toLowerCase()] || "bin";
}

async function supabaseUser(env, jwt) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${jwt}`
    }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.user || data || null;
}

async function verifyMediaScope(env, jwt, scope, scopeId) {
  const cleanScope = String(scope || "").trim().toLowerCase();
  const cleanId = String(scopeId || "").trim();
  if (!cleanScope || !cleanId) return false;
  const user = await supabaseUser(env, jwt);
  if (!user?.email) return false;
  const email = String(user.email).trim().toLowerCase();
  const headers = {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${jwt}`
  };
  if (cleanScope === "moments") {
    const ownerResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/moment_events?id=eq.${encodeURIComponent(cleanId)}&owner_email=eq.${encodeURIComponent(email)}&select=id`, { headers });
    if (ownerResponse.ok) {
      const ownerRows = await ownerResponse.json();
      if (Array.isArray(ownerRows) && ownerRows.length) return true;
    }
    const accessResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/moment_events?id=eq.${encodeURIComponent(cleanId)}&select=id`, { headers });
    if (!accessResponse.ok) return false;
    const accessRows = await accessResponse.json();
    return Array.isArray(accessRows) && accessRows.length > 0;
  }
  if (cleanScope === "business") {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/businesses?id=eq.${encodeURIComponent(cleanId)}&select=id`, {
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${jwt}`
      }
    });
    if (!response.ok) return false;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0;
  }
  return false;
}

async function handleMediaUpload(request, env) {
  try {
    if (!env.MEDIA) return cors(json({ error: "Storage Cloudflare non configurato (R2)." }, 503));
    const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
    const user = await supabaseUser(env, jwt);
    if (!user?.email) return cors(json({ error: "Sessione non valida." }, 401));

    const form = await request.formData();
    const file = form.get("file");
    const scope = String(form.get("scope") || "moments").trim().toLowerCase();
    const scopeId = String(form.get("scopeId") || "").trim();
    if (!(file instanceof File)) return cors(json({ error: "File mancante." }, 400));
    if (!await verifyMediaScope(env, jwt, scope, scopeId)) {
      return cors(json({ error: "Non puoi caricare media su questa pagina." }, 403));
    }

    const kind = mediaKindFromMime(resolveUploadMime(file));
    const mime = resolveUploadMime(file);
    if (!kind || !MEDIA_MIME[kind]?.has(mime)) {
      return cors(json({ error: "Formato file non supportato." }, 400));
    }
    if (file.size > MEDIA_LIMITS[kind]) {
      return cors(json({ error: `File troppo grande per ${kind}.` }, 413));
    }

    const folder = kind === "image" ? "images" : kind === "video" ? "videos" : "audio";
    const ext = mediaExtFromMime(mime);
    const key = `${scope}/${scopeId}/${folder}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: mime },
      customMetadata: { scope, scopeId, kind, uploader: user.email }
    });

    const origin = new URL(request.url).origin;
    const url = `${origin}/cdn/${key}`;
    return cors(json({ ok: true, url, type: kind, key }));
  } catch (error) {
    console.error("handleMediaUpload", error);
    return cors(json({ error: "Upload non riuscito. Riprova tra poco." }, 500));
  }
}

async function handleMediaDelete(request, env) {
  if (!env.MEDIA) return cors(json({ error: "Storage Cloudflare non configurato (R2)." }, 503));
  const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
  const user = await supabaseUser(env, jwt);
  if (!user?.email) return cors(json({ error: "Sessione non valida." }, 401));

  const body = await request.json().catch(() => ({}));
  const rawUrl = String(body.url || "").trim();
  if (!rawUrl) return cors(json({ error: "URL mancante." }, 400));

  let key = "";
  try {
    const parsed = new URL(rawUrl);
    const match = parsed.pathname.match(/^\/cdn\/(.+)$/);
    key = match ? decodeURIComponent(match[1]) : "";
  } catch {
    return cors(json({ error: "URL non valido." }, 400));
  }
  if (!key || key.includes("..")) return cors(json({ error: "Percorso non valido." }, 400));

  const parts = key.split("/");
  const scope = parts[0];
  const scopeId = parts[1];
  if (!await verifyMediaScope(env, jwt, scope, scopeId)) {
    return cors(json({ error: "Non puoi eliminare media da questa pagina." }, 403));
  }

  await env.MEDIA.delete(key);
  return cors(json({ ok: true }));
}

async function handleMomentPreview(request, env) {
  const body = await request.json().catch(() => ({}));
  const pageState = body.page_state && typeof body.page_state === "object" ? body.page_state : body;
  const page = {
    title: String(body.title || pageState.title || "KhamaKey Moments").trim(),
    description: String(body.description || pageState.subtitle || pageState.description || "").trim(),
    state: pageState
  };
  const origin = new URL(request.url).origin;
  const html = renderMomentPage(page, origin);
  return cors(new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  }));
}

async function handleMediaServe(request, env, keyPath) {
  if (!env.MEDIA) return new Response("Media non disponibile", { status: 503 });
  const key = decodeURIComponent(String(keyPath || "")).replace(/^\/+/, "");
  if (!key || key.includes("..")) return new Response("Non trovato", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Non trovato", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(object.body, { headers });
}

function renderPage(page, origin, env = {}, locale = "it") {
  const state = page.state || {};
  const fields = state.fields || {};
  if (state.publicSnapshot?.html) return renderSnapshotPage(page, origin, env, locale);
  const rawName = String(fields.nome || "").trim();
  const description = String(fields.desc || "").trim();
  const name = rawName || "KhamaKey";
  const primary = safeColor(fields.c1, "#1B2A5E");
  const accent = safeColor(fields.c2, "#2F7F1D");
  const showLogo = fields.showLogo !== false && Boolean(state.logoSrc);
  const showCover = fields.showCover !== false && Boolean(state.coverSrc);
  const showHeroName = fields.showHeroName !== false && Boolean(rawName);
  const showHeroText = fields.showHeroText !== false && Boolean(description);
  const hasHeroContent = showLogo || showHeroName || showHeroText;
  const logoFit = fields.pubLogoFit === "cover" ? "cover" : "contain";
  const coverFit = fields.pubCoverFit === "contain" ? "contain" : "cover";
  const coverPosition = ["top","center","bottom"].includes(fields.pubCoverPosition) ? fields.pubCoverPosition : "center";
  const logoSize = ["small","medium","large"].includes(fields.pubLogoSize) ? fields.pubLogoSize : "medium";
  const logoScale = clampNumber(fields.pubLogoScale, 60, 160, 100);
  const logoPixels = Math.round(({ small:58, medium:76, large:96 }[logoSize] || 76) * logoScale / 100);
  const heroHeight = clampNumber(fields.pubHeroHeight, 220, 560, 300);
  const coverZoom = clampNumber(fields.pubCoverZoom, 100, 200, 100);
  const coverPositionX = clampNumber(fields.pubCoverPositionX, 0, 100, 50);
  const coverPositionY = clampNumber(fields.pubCoverPositionY, 0, 100, coverPosition === "top" ? 0 : coverPosition === "bottom" ? 100 : 50);
  const heroStyle = ["premium","soft","minimal"].includes(fields.pubHeroStyle) ? fields.pubHeroStyle : "premium";
  const cardStyle = ["soft","sharp","glass"].includes(fields.pubCardStyle) ? fields.pubCardStyle : "soft";
  const buttonStyle = ["pill","solid","outline"].includes(fields.pubButtonStyle) ? fields.pubButtonStyle : "pill";
  const logo = showLogo
    ? `<img class="logo" style="width:${logoPixels}px;height:${logoPixels}px;object-fit:${logoFit};padding:${logoFit === "cover" ? "0" : "5px"}" src="${attr(state.logoSrc)}" alt="${attr(name)}">`
    : "";
  const cover = showCover
    ? `<img class="cover" style="object-fit:${coverFit};object-position:${coverPositionX}% ${coverPositionY}%;transform:scale(${coverZoom / 100})" src="${attr(state.coverSrc)}" alt="">`
    : "";
  const phone = String(fields.tel || "").replace(/\s/g, "");
  const whatsapp = String(fields.wa || "").replace(/\D/g, "");
  const actions = [
    fields.aWhatsApp ? action("WhatsApp", whatsapp ? `https://wa.me/${whatsapp}` : "#", "click_whatsapp", "wa") : "",
    fields.aChiama ? action("Chiama", phone ? `tel:${attr(phone)}` : "#", "click_phone", "phone") : "",
    fields.aIndicazioni ? action("Indicazioni", fields.maps ? safeUrl(fields.maps) : "#", "click_maps", "maps") : "",
    fields.aRecensioni ? action("Recensioni", fields.recensioni ? safeUrl(fields.recensioni) : "#", "click_reviews", "reviews") : ""
  ].filter(Boolean).join("");

  return `<!doctype html>
<html lang="${attr(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(name)}</title>
<style>
:root{--primary:${primary};--accent:${accent}}
*{box-sizing:border-box}html,body{margin:0;font-family:Arial,sans-serif;background:#eef2f6;color:#172036}
a{text-decoration:none;color:inherit}.page{width:min(100%,520px);min-height:100vh;margin:auto;background:white}
.hero{position:relative;min-height:${heroHeight}px;display:flex;align-items:flex-end;justify-content:center;padding:18px 14px;color:white;text-align:center;background:linear-gradient(145deg,var(--primary),var(--accent));overflow:hidden}
.hero.soft{color:#1b2a5e;background:linear-gradient(145deg,#fff,#eef8ea)}.hero.minimal{min-height:${heroHeight}px;color:#1b2a5e;background:#fff;border-bottom:1px solid #e5eaf1}
.cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:var(--primary)}.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,16,36,.08),rgba(9,16,36,.45))}
.hero.clean:after{background:transparent}.hero-content{position:relative;z-index:1;width:100%}.hero.clean .hero-content{display:none}
.logo{display:block;width:76px;height:76px;object-fit:contain;padding:5px;border:1px solid rgba(255,255,255,.78);border-radius:22px;margin:0 auto 12px;background:#fff;box-shadow:0 12px 28px rgba(0,0,0,.2)}
.logo-small .logo{width:58px;height:58px;border-radius:17px}.logo-large .logo{width:96px;height:96px;border-radius:26px}.hero h1{margin:0 0 9px;font-size:27px;line-height:1.08}.hero p{margin:0 auto;line-height:1.46;max-width:390px;font-weight:600}
.actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px;border-bottom:1px solid #e5eaf1}.action{min-height:74px;border:1px solid #e5eaf1;border-radius:14px;display:grid;place-items:center;padding:9px 6px;font-size:12px;font-weight:800;color:#1b2a5e;background:#fff}
.buttons-solid .action{border-radius:10px;background:var(--accent);color:#fff;border-color:transparent}.buttons-outline .action{border-radius:12px;box-shadow:none}
.content{padding:0 12px 40px}.block{border:1px solid #e5eaf1;border-radius:18px;padding:17px;margin:12px 0;box-shadow:0 8px 24px rgba(27,42,94,.06);background:#fff}.cards-sharp .block{border-radius:8px;box-shadow:none}.cards-glass .block{background:rgba(255,255,255,.78);box-shadow:0 14px 34px rgba(27,42,94,.09)}.block h2{font-size:18px;margin:0 0 9px}.block p{color:#5c6880;line-height:1.6;margin:0}.footer{text-align:center;color:#7b879b;font-size:12px;padding:25px}
@media(min-width:700px){body{padding:22px}.page{border-radius:8px;overflow:hidden;box-shadow:0 20px 60px rgba(17,32,65,.15)}}
</style>
</head>
<body>
<main class="page buttons-${buttonStyle} cards-${cardStyle} logo-${logoSize}">
  <section class="hero ${heroStyle === "soft" ? "soft" : heroStyle === "minimal" ? "minimal" : ""} ${hasHeroContent ? "" : "clean"}">${cover}<div class="hero-content">${logo}${showHeroName ? `<h1>${escapeHtml(name)}</h1>` : ""}${showHeroText ? `<p>${escapeHtml(description)}</p>` : ""}</div></section>
  <nav class="actions">${actions || `<div class="action">Contatti in aggiornamento</div>`}</nav>
  <section class="content">
    ${fields.aboutText ? `<div class="block"><h2>${escapeHtml(fields.aboutTitle || "Chi siamo")}</h2><p>${escapeHtml(fields.aboutText)}</p></div>` : ""}
    ${fields.indirizzo ? `<div class="block"><h2>Dove siamo</h2><p>${escapeHtml(fields.indirizzo)}</p></div>` : ""}
  </section>
  <div class="footer">Powered by KhamaKey</div>
</main>
<script>
const businessId=${JSON.stringify(page.business_id)};
document.querySelectorAll("[data-event]").forEach(el=>el.addEventListener("click",()=>fetch(${JSON.stringify(origin + "/event")},{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_id:businessId,event_type:el.dataset.event,source:"public_page"})}).catch(()=>{})));
</script>
</body></html>`;
}

function renderSnapshotPage(page, origin, env = {}, locale = "it") {
  const state = page.state || {};
  const fields = state.fields || {};
  const snapshot = state.publicSnapshot || {};
  const title = String(fields.nome || "KhamaKey").trim() || "KhamaKey";
  const className = String(snapshot.className || "phone-preview-inner").replace(/[^a-zA-Z0-9 _-]/g, "");
  const style = String(snapshot.style || "").replace(/[^a-zA-Z0-9:#;().,% _-]/g, "");
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://khamakey-app.pages.dev").replace(/\/$/, "");
  return `<!doctype html>
<html lang="${attr(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${attr(pagesBase)}/public-page.css?v=${attr(snapshot.version || "95")}">
</head>
<body>
<main class="public-page-root ${attr(className)}" style="${attr(style)}">${snapshot.html}</main>
<script>
const businessId=${JSON.stringify(page.business_id)};
const pageSlug=${JSON.stringify(page.slug || "")};
const eventUrl=${JSON.stringify(origin + "/event")};
const bookingUrl=${JSON.stringify(origin + "/booking")};
const eventForElement=el=>el.closest(".brand-action-whatsapp")?"click_whatsapp":el.closest(".brand-action-call")?"click_phone":el.closest(".brand-action-maps")?"click_maps":el.closest(".brand-action-google")?"click_reviews":el.closest("[data-booking-submit]")?"click_booking":el.closest("[data-add-cart]")?"add_to_cart":el.closest("[data-product-detail]")?"click_catalog":"";
document.addEventListener("click",event=>{
  const jump=event.target.closest("[data-jump]");
  if(jump){document.getElementById(jump.dataset.jump)?.scrollIntoView({behavior:"smooth"});return}
  if(event.target.closest("[data-cookie-accept]")){event.target.closest("[data-cookie-box]")?.remove();return}
  const booking=event.target.closest("[data-booking-submit]");
  if(booking&&booking.dataset.bookingChannel==="resend"){
    event.preventDefault();
    const root=booking.closest(".pub-booking-card")||document;
    const value=name=>root.querySelector("[data-booking='"+name+"']")?.value?.trim()||"";
    const values={date:value("date"),slot:value("slot"),people:value("people"),name:value("name"),phone:value("phone"),email:value("email"),notes:value("notes")};
    if(!values.name||!values.phone){alert("Inserisci nome e telefono.");return}
    booking.setAttribute("aria-busy","true");
    booking.textContent="Invio in corso...";
    fetch(bookingUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_id:businessId,slug:pageSlug,values})})
      .then(r=>r.json().then(data=>({ok:r.ok,data})))
      .then(result=>{booking.textContent=result.ok?"Richiesta inviata":"Errore invio"; if(!result.ok) alert(result.data?.error||"Invio non riuscito");})
      .catch(()=>{booking.textContent="Errore invio";alert("Invio non riuscito. Riprova più tardi.")})
      .finally(()=>booking.removeAttribute("aria-busy"));
    return;
  }
  const type=eventForElement(event.target);
  if(type) fetch(eventUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_id:businessId,event_type:type,source:"public_page"})}).catch(()=>{});
});
</script>
</body>
</html>`;
}

function renderMomentPinGate(page, origin, failed = false) {
  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.title || "KhamaKey Moments")}</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;background:#f5f7fa;color:#172036}.card{width:min(92vw,420px);background:white;border:1px solid #e2e8f0;border-radius:18px;padding:26px;box-shadow:0 18px 60px rgba(27,42,94,.12);text-align:center}h1{color:#1b2a5e;margin:0 0 8px}p{color:#64748b;line-height:1.5}input{width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:13px;margin:12px 0;text-align:center;font-size:1.2rem;letter-spacing:.16em}button{width:100%;border:0;border-radius:10px;background:#1b2a5e;color:white;padding:12px;font-weight:800}.error{color:#d92d20;font-weight:800}</style></head>
<body><form class="card" method="GET"><h1>${escapeHtml(page.title || "Moment protetto")}</h1><p>Inserisci il PIN per aprire questa pagina KhamaKey Moments.</p>${failed ? `<p class="error">PIN non corretto.</p>` : ""}<input name="pin" inputmode="numeric" autocomplete="one-time-code" placeholder="PIN" required><button type="submit">Apri pagina</button></form></body></html>`;
}

function renderMomentPage(page, origin) {
  const state = page.state || {};
  const title = String(state.title || page.title || "KhamaKey Moments").trim();
  const description = String(state.subtitle || page.description || state.description || "").trim();
  const pill = String(state.pill || "").trim();
  const coverUrl = safeUrl(state.cover_url || "") !== "#" ? safeUrl(state.cover_url || "") : "";
  const profileUrl = safeUrl(state.profile_photo || "") !== "#" ? safeUrl(state.profile_photo || "") : "";
  const colors = resolveMomentPalette(state);
  const fonts = resolveMomentFontPair(state.fontPair);
  const heroStyle = ["classico", "profilo", "romantico", "intimo", "fullscreen"].includes(state.heroStyle) ? state.heroStyle : "classico";
  const sections = resolveMomentSections(state);
  const defaultOrder = ["intro","dedication","timeline","rsvp","gallery","promises","dreams","countdown","music","letter_future","rituals","pet","numbers","quote","signature"];
  const rawOrder = Array.isArray(state.sectionOrder) && state.sectionOrder.length ? state.sectionOrder : defaultOrder;
  const legacyMap = { schedule:"timeline", location:"places", places:null, message:"dedication", details:"intro", contacts:null };
  const mapped = [...new Set(rawOrder.map(key => legacyMap[key] ?? key).filter(key => key && key !== "places" && sections[key]))];
  const sectionOrder = [...mapped, ...defaultOrder.filter(key => !mapped.includes(key))];
  const ordered = sectionOrder
    .map(key => ({ key, section: sections[key] }))
    .filter(({ key, section }) => momentSectionVisible(key, section));
  const hasCounter = Boolean(state.show_together_counter && state.together_since);
  const counterHtml = renderTogetherCounter(state, colors);
  const momentType = String(state.type || page.moment_type || "free").trim().toLowerCase();
  const sectionHtml = ordered.length
    ? ordered.map(({ key, section }) => `<div class="moment-section-anchor" id="moment-section-${escapeHtml(key)}">${renderMomentSection(key, section, colors, momentType, fonts)}</div>`).join("")
    : `<div class="moment-card moment-card-empty rv"><strong>Pagina in preparazione</strong><p>Il proprietario sta ancora scegliendo i contenuti da mostrare.</p></div>`;
  const navHtml = renderMomentNav(title, ordered, hasCounter);
  const decorHtml = renderMomentDecor(state);
  const coverFocusX = clampNumber(state.cover_focus_x, 0, 100, 50);
  const coverFocusY = clampNumber(state.cover_focus_y, 0, 100, 50);
  const coverZoom = clampNumber(state.cover_zoom, 100, 150, 100);
  const heroCover = coverUrl
    ? `<div class="moment-cover-wrap" style="transform:scale(${coverZoom / 100})"><img class="moment-cover" src="${attr(coverUrl)}" alt="" style="object-position:${coverFocusX}% ${coverFocusY}%"></div>`
    : "";
  const profileBlock = profileUrl && heroStyle === "profilo"
    ? `<img class="moment-profile" src="${attr(profileUrl)}" alt="">` : "";
  const ogImage = coverUrl || profileUrl || "";
  const navClass = navHtml ? " has-nav" : "";
  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${attr(colors.bl)}">
<title>${escapeHtml(title)} · KhamaKey Moments</title>
<meta name="description" content="${escapeHtml(description || "Un ricordo da custodire nel tempo.")}">
${ogImage ? `<meta property="og:image" content="${attr(ogImage)}">` : ""}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description || "Un ricordo da custodire nel tempo.")}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fonts.google}&display=swap" rel="stylesheet">
<style>${momentPageCss(colors, fonts)}</style></head>
<body>${navHtml}
<main class="moment-page hero-${attr(heroStyle)}${navClass}">
${decorHtml}
<section class="moment-hero" id="moment-hero">${heroCover}<div class="moment-hero-overlay"></div><div class="moment-hero-content hero-in">
${pill ? `<span class="moment-pill">${escapeHtml(pill)}</span>` : `<small>KhamaKey Moments</small>`}
${profileBlock}
<h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}
</div></section>
<section class="moment-content">${counterHtml}${sectionHtml}</section>
<footer class="moment-footer">Creato con cura · KhamaKey Moments</footer>
</main>
<div class="moment-lightbox" id="momentLightbox" aria-hidden="true">
<button type="button" class="moment-lightbox-nav moment-lightbox-prev" id="momentLightboxPrev" aria-label="Precedente">‹</button>
<button type="button" class="moment-lightbox-nav moment-lightbox-next" id="momentLightboxNext" aria-label="Successivo">›</button>
<button type="button" class="moment-lightbox-close" id="momentLightboxClose" aria-label="Chiudi">×</button>
<div class="moment-lightbox-card"><div id="momentLightboxMedia"></div><p class="moment-lightbox-counter" id="momentLightboxCounter"></p><h3 class="moment-lightbox-title" id="momentLightboxTitle"></h3><p class="moment-lightbox-desc" id="momentLightboxDesc"></p></div></div>
<script>${momentPageScript(state, ordered, hasCounter)}</script>
</body></html>`;
}

const PAGE_DECOR_PRESETS = {
  none:{ emojis:[] },
  sparkle:{ emojis:["✨","⭐","💫","✦"] },
  hearts:{ emojis:["💕","♥","💗","✨"] },
  festive:{ emojis:["🎉","🎊","🥳","✨"] },
  christmas:{ emojis:["🎄","❄","⭐","🎁"] },
  playful:{ emojis:["🌈","🎈","😊","⭐"] }
};

const MOMENT_NAV_LABELS = {
  intro:"Intro",
  dedication:"Dedica",
  timeline:"Programma",
  rsvp:"RSVP",
  gallery:"Foto",
  promises:"Promesse",
  dreams:"Sogni",
  countdown:"Conto",
  music:"Musica",
  letter_future:"Lettera",
  rituals:"Rituali",
  pet:"Pet",
  numbers:"Numeri",
  quote:"Citazione",
  signature:"Firma"
};

function shortenMomentNavLabel(text, max = 20){
  const clean = String(text || "").trim();
  if(!clean) return "";
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function buildMomentNavItems(ordered, hasCounter){
  const items = [{ id:"moment-hero", label:"Home" }];
  if(hasCounter) items.push({ id:"moment-section-counter", label:"Contatore" });
  ordered.forEach(({ key, section })=>{
    const fallback = MOMENT_NAV_LABELS[key] || key;
    const label = shortenMomentNavLabel(section.title) || fallback;
    items.push({ id:`moment-section-${key}`, label });
  });
  return items;
}

function renderMomentNav(title, ordered, hasCounter){
  if(!ordered.length && !hasCounter) return "";
  const items = buildMomentNavItems(ordered, hasCounter);
  if(items.length < 2) return "";
  const links = items.map(item => `<li><a href="#${attr(item.id)}" data-sec="${attr(item.id)}">${escapeHtml(item.label)}</a></li>`).join("");
  const drawerLinks = items.map(item => `<li><a href="#${attr(item.id)}" data-sec="${attr(item.id)}" data-drawer-link>${escapeHtml(item.label)}</a></li>`).join("");
  return `<div class="moment-nav-backdrop" id="momentNavBackdrop" aria-hidden="true"></div>
<nav class="moment-nav on-hero" id="momentNav" aria-label="Sezioni pagina">
<ul class="moment-nav-links">${links}</ul>
<button type="button" class="moment-nav-burger" id="momentNavBurger" aria-label="Menu sezioni" aria-expanded="false"><span></span><span></span><span></span></button>
</nav>
<div class="moment-nav-sheet" id="momentNavDrawer" aria-hidden="true">
<div class="moment-nav-sheet-head"><span>Sezioni</span><button type="button" class="moment-nav-sheet-close" id="momentNavClose" aria-label="Chiudi">×</button></div>
<ul>${drawerLinks}</ul>
</div>`;
}

function renderMomentDecor(state){
  const preset = PAGE_DECOR_PRESETS[state.pageDecor] || PAGE_DECOR_PRESETS.none;
  if(!preset.emojis.length) return "";
  const items = Array.from({ length: 14 }, (_, index) => {
    const emoji = preset.emojis[index % preset.emojis.length];
    const left = (index * 17 + 7) % 94 + 3;
    const top = (index * 23 + 11) % 88 + 6;
    const delay = ((index * 0.65) % 5).toFixed(2);
    const duration = 4 + (index % 3);
    return `<span class="moment-decor-item" style="left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${duration}s">${emoji}</span>`;
  }).join("");
  return `<div class="moment-decor" aria-hidden="true">${items}</div>`;
}

function resolveMomentPalette(state) {
  const palettes = {
    amore:{go:"#DC143C",g2:"#B22222",ro:"#CCCCCC",bl:"#CC0000",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#CC0000",mu:"#666666"},
    rubino:{go:"#B22222",g2:"#CC0000",ro:"#DDDDDD",bl:"#5C0000",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#8B0000",mu:"#666666"},
    gentleman:{go:"#666666",g2:"#333333",ro:"#DDDDDD",bl:"#EEEEEE",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#333333",mu:"#666666"},
    uomo:{go:"#003366",g2:"#000080",ro:"#CCCCCC",bl:"#E8ECF0",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#000080",mu:"#666666"},
    aurora:{go:"#663399",g2:"#4B0082",ro:"#DDDDDD",bl:"#EDE7F6",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#4B0082",mu:"#666666"},
    terracotta:{go:"#A0522D",g2:"#8B4513",ro:"#DDDDDD",bl:"#F5E6D3",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#8B4513",mu:"#666666"},
    rosa:{go:"#C71585",g2:"#DB2777",ro:"#DDDDDD",bl:"#8B0045",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#C71585",mu:"#666666"},
    blu:{go:"#0066CC",g2:"#003366",ro:"#CCCCCC",bl:"#E6EEF7",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#003366",mu:"#666666"},
    salvia:{go:"#228B22",g2:"#006400",ro:"#CCCCCC",bl:"#E8F5E9",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#228B22",mu:"#666666"},
    bordeaux:{go:"#800020",g2:"#660019",ro:"#DDDDDD",bl:"#4A0010",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#660019",mu:"#666666"},
    perla:{go:"#666666",g2:"#555555",ro:"#DDDDDD",bl:"#F0F0F0",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#555555",mu:"#666666"},
    lavanda:{go:"#663399",g2:"#7B68EE",ro:"#DDDDDD",bl:"#F0E6FF",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#663399",mu:"#666666"},
    cipria:{go:"#A0522D",g2:"#8B4513",ro:"#DDDDDD",bl:"#FAF0E6",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#8B4513",mu:"#666666"},
    corallo:{go:"#FF6600",g2:"#CC5500",ro:"#DDDDDD",bl:"#FFF0E6",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#CC5500",mu:"#666666"},
    miele:{go:"#DAA520",g2:"#006400",ro:"#DDDDDD",bl:"#006400",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#006400",mu:"#666666"},
    notte:{go:"#444444",g2:"#222222",ro:"#DDDDDD",bl:"#111111",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#000000",mu:"#888888"},
    neve:{go:"#666666",g2:"#999999",ro:"#DDDDDD",bl:"#F5F5F5",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#696969",mu:"#666666"},
    classic:{go:"#4CAF27",g2:"#1B2A5E",ro:"#DDDDDD",bl:"#F0F0F0",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",hero:"#1B2A5E",mu:"#666666"}
  };
  const variants = {
    caldo:{
      amore:{bl:"#B22222",hero:"#B22222"},
      rubino:{bl:"#4A0000"},
      rosa:{bl:"#7A0040"},
      bordeaux:{bl:"#3A0008"},
      miele:{bl:"#004400"}
    },
    scuro:{
      notte:{bl:"#000000",hero:"#000000"}
    }
  };
  const legacy = { celebration:"corallo", minimal:"neve", memorial:"perla" };
  const paletteKey = state.colorPalette || legacy[state.theme] || "classic";
  const base = { ...(palettes[paletteKey] || palettes.classic) };
  const variant = state.themeVariant === "scuro" || state.themeVariant === "caldo" ? state.themeVariant : "chiaro";
  const overrides = variants[variant]?.[paletteKey];
  if(overrides) Object.assign(base, overrides);
  const surfaceTints = {
    amore:"#FBF3F3", rubino:"#FAF2F2", rosa:"#FBF2F7", bordeaux:"#FAF2F4", miele:"#F3F8F3",
    corallo:"#FFF7F2", terracotta:"#FBF6F1", cipria:"#FBF7F2", classic:"#F4F6FA", blu:"#F2F6FB",
    salvia:"#F2F8F3", aurora:"#F6F2FB", lavanda:"#F7F2FC", perla:"#F7F7F7", neve:"#F8F8F8",
    notte:"#F2F2F2", uomo:"#F0F3F8", gentleman:"#F4F4F4"
  };
  base.card = "#FFFFFF";
  base.bl2 = "#FFFFFF";
  base.surface = surfaceTints[paletteKey] || "#F8FAFC";
  base.cardSoft = "#F8FAFC";
  base.ink = "#1F2937";
  base.muted = "#64748B";
  base.line = "rgba(15,23,42,.08)";
  base.lineStrong = "rgba(15,23,42,.12)";
  base.in = base.ink;
  base.mu = base.muted;
  return base;
}

function resolveMomentFontPair(key) {
  const pairs = {
    classic:{display:'"Great Vibes", cursive',body:'"Cormorant Infant", Georgia, serif',ui:'"DM Sans", sans-serif',google:"family=Great+Vibes&family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700"},
    romantic:{display:'"Great Vibes", cursive',body:'"Cormorant Infant", Georgia, serif',ui:'"DM Sans", sans-serif',google:"family=Great+Vibes&family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700"},
    elegant:{display:'"Cormorant Infant", Georgia, serif',body:'"Cormorant Infant", Georgia, serif',ui:'"DM Sans", sans-serif',google:"family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700"},
    modern:{display:'"DM Sans", sans-serif',body:'"DM Sans", sans-serif',ui:'"DM Sans", sans-serif',google:"family=DM+Sans:wght@400;600;700"}
  };
  return pairs[key] || pairs.classic;
}

function normalizeJourneyStepWorker(raw = {}) {
  return {
    date: String(raw.date || "").trim(),
    place: String(raw.place || raw.name || "").trim(),
    text: String(raw.text || raw.description || "").trim(),
    image_url: String(raw.image_url || raw.image || "").trim(),
    maps_url: String(raw.maps_url || raw.url || "").trim()
  };
}

function parseJourneyStepsWorker(value) {
  if (Array.isArray(value)) return value.map(normalizeJourneyStepWorker).filter(step => step.date || step.place || step.text || step.image_url || step.maps_url);
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(normalizeJourneyStepWorker).filter(step => step.date || step.place || step.text || step.image_url || step.maps_url) : [];
  } catch {
    return [];
  }
}

function parseLegacyJourneyBody(body) {
  return String(body || "").split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split("·").map(part => part.trim());
    if (parts.length >= 2 && /^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(parts[0] || "")) {
      parts.shift();
      const url = parts.find(part => /^https?:\/\//i.test(part)) || "";
      const name = parts.filter(part => part !== url).join(" · ");
      return normalizeJourneyStepWorker({ place: name || line, maps_url: url });
    }
    if (parts.length >= 2) return normalizeJourneyStepWorker({ date: parts[0], text: parts.slice(1).join(" · ") });
    return normalizeJourneyStepWorker({ text: line });
  });
}

function resolveJourneyStepsWorker(timelineSection = {}, placesSection = null) {
  const fromItems = parseJourneyStepsWorker(timelineSection.items);
  if (fromItems.length) return fromItems.slice(0, 24);
  const fromTimeline = parseLegacyJourneyBody(timelineSection.body);
  const fromPlaces = placesSection?.body ? parseLegacyJourneyBody(placesSection.body) : [];
  return [...fromTimeline, ...fromPlaces].slice(0, 24);
}

function resolveMomentSections(state) {
  const raw = state.sections && typeof state.sections === "object" ? state.sections : {};
  const base = {};
  const defaults = {
    intro:{enabled:true,title:"",body:"",images:[]},
    dedication:{enabled:false,title:"",body:"",recipient:"",signature:"",images:[]},
    timeline:{enabled:false,title:"",body:"",items:[],images:[]},
    rsvp:{enabled:false,title:"",body:"",whatsapp_number:"",event_name:"",ask_guests:true,ask_notes:true,images:[]},
    gallery:{enabled:false,title:"",body:"",images:[]},
    promises:{enabled:false,title:"",body:"",images:[]},
    places:{enabled:false,title:"",body:"",images:[]},
    dreams:{enabled:false,title:"",body:"",images:[]},
    countdown:{enabled:false,title:"",body:"",event_label:"",target_date:"",image_url:"",images:[]},
    music:{enabled:false,title:"",body:"",spotify_url:"",youtube_url:"",audio_url:"",audio_title:"",audio_description:"",images:[]},
    letter_future:{enabled:false,title:"",body:"",recipient:"",unlock_date:"",media_type:"",media_url:"",media_title:"",images:[]},
    rituals:{enabled:false,title:"",body:"",images:[]},
    pet:{enabled:false,title:"",body:"",pet_name:"",pet_emoji:"🐾",pet_photo:"",images:[]},
    numbers:{enabled:false,title:"",body:"",images:[]},
    quote:{enabled:false,title:"",body:"",author:"",images:[]},
    signature:{enabled:false,title:"",body:"",sign_name:"",sign_subtitle:"",images:[]}
  };
  for (const key of Object.keys(defaults)) {
    const incoming = raw[key] || {};
    base[key] = { ...defaults[key], ...incoming, images: Array.isArray(incoming.images) ? incoming.images.filter(Boolean) : [] };
  }
  if (raw.schedule && !raw.timeline) base.timeline = { ...base.timeline, ...raw.schedule };
  if (raw.message && !raw.dedication) base.dedication = { ...base.dedication, ...raw.message };
  if (raw.location && !raw.places?.body) {
    const loc = raw.location;
    const line = loc.address ? `📍 · ${loc.address}${loc.maps_url ? ` · ${loc.maps_url}` : ""}` : "";
    base.places = { ...base.places, enabled: Boolean(loc.enabled || base.places.enabled), title: loc.title || base.places.title, body: [loc.body, line].filter(Boolean).join("\n") };
  }
  if (raw.details?.body && !base.intro.body) base.intro.body = [base.intro.body, raw.details.body].filter(Boolean).join("\n\n");
  if (base.gallery) {
    const media = normalizeMomentMedia(base.gallery);
    base.gallery.media = media;
    base.gallery.images = media.filter(item => item.type === "image").map(item => item.url);
  }
  const journeySteps = resolveJourneyStepsWorker(base.timeline, base.places);
  base.timeline.items = journeySteps;
  if (base.places?.enabled) base.timeline.enabled = true;
  if (!base.timeline.title && base.places?.title) base.timeline.title = base.places.title;
  base.places = { ...base.places, enabled: false, body: "" };
  return base;
}

function momentSectionVisible(key, section) {
  if (!section?.enabled) return false;
  return momentSectionHasContent(key, section);
}

function normalizeWhatsAppDigits(raw) {
  let wa = String(raw || "").replace(/\D/g, "");
  if (!wa) return "";
  if (wa.startsWith("0")) wa = wa.replace(/^0+/, "");
  if ((wa.length === 9 || wa.length === 10) && wa.startsWith("3")) wa = `39${wa}`;
  return wa;
}

function momentSectionHasContent(key, section) {
  if (!section) return false;
  switch (key) {
    case "intro":
      return Boolean(String(section.body || "").trim());
    case "dedication":
      return Boolean(section.body || section.recipient || section.signature);
    case "timeline":
      return resolveJourneyStepsWorker(section).length > 0;
    case "gallery":
      return normalizeMomentMedia(section).length > 0;
    case "rsvp":
      return Boolean(normalizeWhatsAppDigits(section.whatsapp_number));
    case "promises":
    case "dreams":
    case "rituals":
    case "numbers":
      return Boolean(String(section.body || "").trim());
    case "countdown":
      return Boolean(section.target_date);
    case "music":
      return Boolean(section.spotify_url || section.youtube_url || section.audio_url);
    case "letter_future":
      return Boolean(section.body || section.unlock_date || section.media_url);
    case "pet":
      return Boolean(section.pet_name || section.body || section.pet_photo);
    case "quote":
      return Boolean(section.body || section.author);
    case "signature":
      return Boolean(section.sign_name || section.sign_subtitle || section.body);
    default:
      return Boolean(section.title || section.body || (Array.isArray(section.images) && section.images.length));
  }
}

function parseMomentLines(body, mode) {
  return String(body || "").split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split("·").map(part => part.trim());
    if (mode === "promise") {
      const emoji = /^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(parts[0] || "") ? parts.shift() : "✦";
      return { emoji, text: parts.join(" · ") || line };
    }
    if (mode === "place") {
      const icon = /^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(parts[0] || "") ? parts.shift() : "📍";
      const url = parts.find(part => /^https?:\/\//i.test(part)) || "";
      const name = parts.filter(part => part !== url).join(" · ");
      return { icon, name: name || line, url };
    }
    if (mode === "dream") {
      const done = /^✓/.test(parts[0] || "");
      if (done) parts.shift();
      return { done, text: parts.join(" · ") || line.replace(/^✓\s*/, "") };
    }
    if (mode === "timeline") {
      if (parts.length >= 2) return { date: parts[0], text: parts.slice(1).join(" · ") };
      return { date: "", text: line };
    }
    if (mode === "ritual") {
      const emoji = /^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(parts[0] || "") ? parts.shift() : "🕯";
      return { emoji, text: parts.join(" · ") || line };
    }
    if (mode === "number") {
      if (parts.length >= 2) return { value: parts[0], label: parts.slice(1).join(" · ") };
      return { value: "", label: line };
    }
    return { text: line };
  });
}

function spotifyEmbedFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("open.spotify.com")) {
      const path = parsed.pathname.replace("/embed/", "/");
      return `https://open.spotify.com/embed${path}${parsed.search}`;
    }
  } catch {}
  return "";
}

function youtubeVideoId(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1).split("/")[0];
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || "";
      return parsed.searchParams.get("v") || "";
    }
  } catch {}
  const short = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return short ? short[1] : "";
}

function youtubeEmbedFromUrl(raw) {
  const id = youtubeVideoId(raw);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

function formatUnlockDate(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const date = new Date(value.length > 10 ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function isLetterUnlocked(unlockDate) {
  const raw = String(unlockDate || "").trim();
  if (!raw) return true;
  const target = new Date(raw.length > 10 ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(target.getTime())) return true;
  return Date.now() >= target.getTime();
}

function renderLetterFutureMedia(section) {
  const type = String(section.media_type || "").trim();
  const url = String(section.media_url || "").trim();
  const title = String(section.media_title || "").trim();
  if (!url || !["image", "video", "audio"].includes(type)) return "";
  if (type === "video") {
    return `<div class="moment-letter-media">${title ? `<p class="moment-letter-media-title">${escapeHtml(title)}</p>` : ""}<video src="${attr(url)}" controls playsinline></video></div>`;
  }
  if (type === "audio") {
    return `<div class="moment-letter-media moment-audio">${title ? `<p class="moment-audio-title">${escapeHtml(title)}</p>` : ""}<audio src="${attr(url)}" controls></audio></div>`;
  }
  return `<div class="moment-letter-media">${title ? `<p class="moment-letter-media-title">${escapeHtml(title)}</p>` : ""}<img src="${attr(url)}" alt="${attr(title || "Allegato")}" loading="lazy"></div>`;
}

function renderTogetherCounter(state, colors) {
  if(!state.show_together_counter || !state.together_since) return "";
  const date = String(state.together_since).slice(0, 10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const live = Boolean(state.show_counter_hms);
  const grid = live
    ? `<span class="moment-counter-unit"><b data-unit="days">0</b><small>giorni</small></span>
<span class="moment-counter-unit"><b data-unit="hours">0</b><small>ore</small></span>
<span class="moment-counter-unit"><b data-unit="minutes">0</b><small>minuti</small></span>
<span class="moment-counter-unit"><b data-unit="seconds">0</b><small>secondi</small></span>`
    : `<span class="moment-counter-unit"><b data-unit="years">0</b><small>anni</small></span>
<span class="moment-counter-unit"><b data-unit="months">0</b><small>mesi</small></span>
<span class="moment-counter-unit"><b data-unit="days">0</b><small>giorni</small></span>`;
  return `<section class="moment-counter rv" id="moment-section-counter" data-since="${attr(date)}" data-hms="${live ? "1" : "0"}">
<div class="moment-counter-label">Insieme da</div>
<div class="moment-counter-grid">${grid}</div></section>`;
}

function momentPageScript(state, ordered = [], hasCounter = false) {
  const navItems = buildMomentNavItems(ordered, hasCounter);
  const navIds = navItems.map(item => item.id);
  const navScript = navIds.length >= 2 ? `
(function(){
  var nav=document.getElementById("momentNav");
  if(!nav)return;
  var drawer=document.getElementById("momentNavDrawer");
  var backdrop=document.getElementById("momentNavBackdrop");
  var burger=document.getElementById("momentNavBurger");
  var navClose=document.getElementById("momentNavClose");
  var heroEl=document.getElementById("moment-hero");
  var navIds=${JSON.stringify(navIds)};
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function closeNavDrawer(){if(drawer){drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true");}if(backdrop){backdrop.classList.remove("open");backdrop.setAttribute("aria-hidden","true");}if(burger){burger.setAttribute("aria-expanded","false");}document.body.classList.remove("nav-open");}
  function openNavDrawer(){if(drawer){drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");}if(backdrop){backdrop.classList.add("open");backdrop.setAttribute("aria-hidden","false");}if(burger){burger.setAttribute("aria-expanded","true");}document.body.classList.add("nav-open");}
  if(burger){burger.addEventListener("click",function(e){e.preventDefault();drawer&&drawer.classList.contains("open")?closeNavDrawer():openNavDrawer();});}
  if(navClose){navClose.addEventListener("click",function(e){e.preventDefault();closeNavDrawer();});}
  if(backdrop){backdrop.addEventListener("click",closeNavDrawer);}
  function scrollToSection(id){
    var el=id&&document.getElementById(id);
    if(!el)return false;
    var navH=nav.offsetHeight||56;
    var y=el.getBoundingClientRect().top+(window.pageYOffset||window.scrollY||0)-navH-12;
    window.scrollTo({top:Math.max(0,y),behavior:reduced?"auto":"smooth"});
    if(history.replaceState){try{history.replaceState(null,"", "#"+id);}catch(e){}}
    return true;
  }
  document.body.addEventListener("click",function(e){
    var link=e.target.closest(".moment-nav-links a, .moment-nav-sheet a");
    if(!link)return;
    var id=link.getAttribute("data-sec");
    if(!id||!document.getElementById(id))return;
    e.preventDefault();
    scrollToSection(id);
    closeNavDrawer();
  }, true);
  function syncNavState(){
    var y=window.pageYOffset||window.scrollY||0;
    var heroBottom=heroEl?heroEl.offsetTop+heroEl.offsetHeight*0.62:320;
    nav.classList.toggle("scrolled",y>48);
    nav.classList.toggle("on-hero",y<heroBottom-72);
    var navH=nav.offsetHeight||56;
    var sy=y+navH+12,current=navIds[0];
    navIds.forEach(function(id){
      var node=document.getElementById(id);
      if(node&&node.getBoundingClientRect().top+(window.pageYOffset||window.scrollY||0)-navH<=sy)current=id;
    });
    document.querySelectorAll(".moment-nav-links a,.moment-nav-sheet a").forEach(function(a){
      a.classList.toggle("active",a.getAttribute("data-sec")===current);
    });
  }
  window.addEventListener("scroll",syncNavState,{passive:true});
  window.addEventListener("resize",syncNavState,{passive:true});
  var hash=(location.hash||"").replace(/^#/,"");
  if(hash&&navIds.indexOf(hash)>=0){setTimeout(function(){scrollToSection(hash);},120);}
  syncNavState();
})();` : "";
  return `(function(){
var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
${navScript}
function reveal(node,delay){if(!node)return;setTimeout(function(){node.classList.add("on")},delay||0);}
var hero=document.querySelector(".moment-hero-content");
if(hero){reveal(hero,reduced?0:100);}
if(reduced){
  document.querySelectorAll(".rv").forEach(function(n){n.classList.add("on");});
}else if("IntersectionObserver" in window){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      entry.target.classList.add("on");
      io.unobserve(entry.target);
    });
  },{root:null,rootMargin:"0px 0px -6% 0px",threshold:0.1});
  document.querySelectorAll(".rv").forEach(function(n){io.observe(n);});
}else{
  document.querySelectorAll(".rv").forEach(function(n,i){reveal(n,120+i*70);});
}
var box=document.querySelector(".moment-counter");
if(box){
  var since=new Date(box.dataset.since+"T00:00:00");
  if(!isNaN(since)){
    var live=box.dataset.hms==="1";
    var values=live?{days:0,hours:0,minutes:0,seconds:0}:{years:0,months:0,days:0};
    function paint(){
      var now=new Date();
      if(live){
        var diff=Math.max(0,now-since);
        values={
          days:Math.floor(diff/86400000),
          hours:Math.floor((diff%86400000)/3600000),
          minutes:Math.floor((diff%3600000)/60000),
          seconds:Math.floor((diff%60000)/1000)
        };
      }else{
        var y=now.getFullYear()-since.getFullYear();
        var m=now.getMonth()-since.getMonth();
        var d=now.getDate()-since.getDate();
        if(d<0){m--;d+=new Date(now.getFullYear(),now.getMonth(),0).getDate();}
        if(m<0){y--;m+=12;}
        values={years:y,months:m,days:d};
      }
      Object.keys(values).forEach(function(k){
        var n=box.querySelector('[data-unit="'+k+'"]');
        if(n&&(!box.dataset.animated||live))n.textContent=values[k];
      });
    }
    function animateCounter(){
      if(box.dataset.animated)return;
      box.dataset.animated="1";
      var start=Date.now(),dur=900;
      function tick(){
        var p=Math.min(1,(Date.now()-start)/dur);
        var ease=1-Math.pow(1-p,3);
        Object.keys(values).forEach(function(k){
          var n=box.querySelector('[data-unit="'+k+'"]');
          if(n)n.textContent=Math.round(values[k]*ease);
        });
        if(p<1)requestAnimationFrame(tick);
        else paint();
      }
      paint();tick();
    }
    if("IntersectionObserver" in window && !reduced){
      new IntersectionObserver(function(entries,obs){
        if(entries[0].isIntersecting){animateCounter();obs.disconnect();}
      },{threshold:0.35}).observe(box);
    }else{paint();}
    setInterval(paint,live?1000:60000);
  }
}
var cd=document.querySelector(".moment-countdown");if(cd){var target=new Date(cd.dataset.target);if(!isNaN(target)){function tick(){var diff=target-new Date();if(diff<0)diff=0;var d=Math.floor(diff/86400000);var h=Math.floor((diff%86400000)/3600000);var m=Math.floor((diff%3600000)/60000);var map={days:d,hours:h,minutes:m};Object.keys(map).forEach(function(k){var n=cd.querySelector('[data-cd="'+k+'"]');if(n)n.textContent=map[k];});}tick();setInterval(tick,1000);}}
document.querySelectorAll("[data-rsvp-form]").forEach(function(form){
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var card=form.closest("[data-rsvp-wa]");
    var wa=card&&card.getAttribute("data-rsvp-wa");
    if(!wa)return;
    var fd=new FormData(form);
    var eventName=card.getAttribute("data-rsvp-event")||document.title.replace(/ · KhamaKey Moments$/,"");
    var intro=card.getAttribute("data-rsvp-intro")||("RSVP · "+eventName);
    var lines=[intro,"","👤 Nome: "+(fd.get("rsvp_name")||""),"✓ Presenza: "+(fd.get("rsvp_attending")||"")];
    if(fd.get("rsvp_guests"))lines.push("👥 Ospiti: "+fd.get("rsvp_guests"));
    if(fd.get("rsvp_notes"))lines.push("📝 Note: "+fd.get("rsvp_notes"));
    if(fd.get("rsvp_phone"))lines.push("📞 Tel.: "+fd.get("rsvp_phone"));
    if(fd.get("rsvp_email"))lines.push("✉️ Email: "+fd.get("rsvp_email"));
    try{
      var custom=JSON.parse(card.getAttribute("data-rsvp-custom")||"[]");
      custom.forEach(function(field){
        var val=fd.get("rsvp_custom_"+field.id);
        if(val)lines.push(field.label+": "+val);
      });
    }catch(e){}
    window.open("https://wa.me/"+wa+"?text="+encodeURIComponent(lines.join("\\n")),"_blank","noopener");
  });
});
var lb=document.getElementById("momentLightbox");
if(lb){
var media=[];document.querySelectorAll(".moment-gallery-data").forEach(function(node){try{media=media.concat(JSON.parse(node.textContent||"[]"));}catch(e){}});
var currentIndex=0;
function paintMedia(){var item=media[currentIndex];if(!item)return;var wrap=document.getElementById("momentLightboxMedia");document.getElementById("momentLightboxTitle").textContent=item.title||"";document.getElementById("momentLightboxDesc").textContent=item.description||"";var counter=document.getElementById("momentLightboxCounter");if(counter)counter.textContent=media.length>1?(currentIndex+1)+" / "+media.length:"";wrap.innerHTML=item.type==="video"?'<video src="'+item.url+'" controls playsinline autoplay></video>':item.type==="audio"?'<audio src="'+item.url+'" controls autoplay></audio>':'<img src="'+item.url+'" alt="">';}
function openMedia(i){if(!media.length)return;currentIndex=(i+media.length)%media.length;paintMedia();lb.classList.add("open");lb.setAttribute("aria-hidden","false");}
function closeLightbox(){lb.classList.remove("open");lb.setAttribute("aria-hidden","true");document.getElementById("momentLightboxMedia").innerHTML="";}
document.querySelectorAll("[data-media-open]").forEach(function(node){node.addEventListener("click",function(){openMedia(Number(node.getAttribute("data-media-open")));});});
document.getElementById("momentLightboxClose")?.addEventListener("click",closeLightbox);
document.getElementById("momentLightboxPrev")?.addEventListener("click",function(e){e.stopPropagation();openMedia(currentIndex-1);});
document.getElementById("momentLightboxNext")?.addEventListener("click",function(e){e.stopPropagation();openMedia(currentIndex+1);});
lb.addEventListener("click",function(e){if(e.target===lb)closeLightbox();});
document.addEventListener("keydown",function(e){if(!lb.classList.contains("open"))return;if(e.key==="Escape")closeLightbox();if(e.key==="ArrowLeft")openMedia(currentIndex-1);if(e.key==="ArrowRight")openMedia(currentIndex+1);});
}
})();`;
}

function momentPageCss(colors, fonts) {
  const c = colors;
  const f = fonts || resolveMomentFontPair("classic");
  return `*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:72px}body{margin:0;font-family:${f.body};background:${c.surface};color:${c.ink};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
#moment-hero,.moment-section-anchor,#moment-section-counter{scroll-margin-top:72px}
.moment-nav-backdrop{position:fixed;inset:0;background:rgba(12,16,24,.22);opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:38}
.moment-nav-backdrop.open{opacity:1;pointer-events:auto}
body.nav-open{overflow:hidden}
.moment-nav{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:max(8px,env(safe-area-inset-top)) 12px 8px;background:transparent;border-bottom:1px solid transparent;transition:background .28s ease,box-shadow .28s ease,border-color .28s ease,backdrop-filter .28s ease}
.moment-nav.on-hero:not(.scrolled) .moment-nav-links a{color:rgba(255,255,255,.9);text-shadow:0 1px 12px rgba(0,0,0,.28)}
.moment-nav.on-hero:not(.scrolled) .moment-nav-links a.active,.moment-nav.on-hero:not(.scrolled) .moment-nav-links a:hover{background:rgba(255,255,255,.14);color:#fff}
.moment-nav.on-hero:not(.scrolled) .moment-nav-burger{border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.08)}
.moment-nav.on-hero:not(.scrolled) .moment-nav-burger span{background:rgba(255,255,255,.92)}
.moment-nav.scrolled{background:rgba(255,255,255,.97);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom-color:rgba(17,32,65,.08);box-shadow:0 4px 18px rgba(17,32,65,.08)}
.moment-nav.scrolled .moment-nav-links a{color:#475569}
.moment-nav.scrolled .moment-nav-links a.active,.moment-nav.scrolled .moment-nav-links a:hover{color:#0f172a;background:rgba(15,23,42,.06)}
.moment-nav.scrolled .moment-nav-burger{border-color:rgba(15,23,42,.12);background:rgba(255,255,255,.92)}
.moment-nav.scrolled .moment-nav-burger span{background:#334155}
.moment-nav-links{display:none;list-style:none;margin:0;padding:0;gap:2px;align-items:center}
.moment-nav-links a{display:inline-flex;align-items:center;min-height:32px;padding:0 9px;border-radius:999px;font-family:${f.ui};font-size:.64rem;font-weight:700;color:${c.mu};text-decoration:none;letter-spacing:.03em;transition:color .15s,background .15s}
.moment-nav-links a.active,.moment-nav-links a:hover{color:${c.in};background:${c.ro}88}
.moment-nav-burger{width:38px;height:38px;border:1px solid ${c.ro};border-radius:999px;background:${c.bl}88;display:grid;place-content:center;gap:4px;cursor:pointer;padding:0;transition:background .2s,border-color .2s}
.moment-nav-burger span{display:block;width:16px;height:1.5px;background:${c.in};border-radius:999px;opacity:.88}
.moment-nav-sheet{position:fixed;left:10px;right:10px;bottom:0;max-height:min(52vh,380px);background:#FFFFFF;border:1px solid ${c.lineStrong};border-bottom:0;border-radius:18px 18px 0 0;transform:translateY(105%);transition:transform .3s cubic-bezier(.22,1,.36,1);z-index:39;padding:0 12px max(16px,env(safe-area-inset-bottom));box-shadow:0 -10px 36px rgba(17,32,65,.08);overflow:auto}
.moment-nav-sheet.open{transform:translateY(0)}
.moment-nav-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 4px 10px;border-bottom:1px solid ${c.line};margin-bottom:8px}
.moment-nav-sheet-head span{font-family:${f.ui};font-size:.78rem;font-weight:700;color:${c.ink};opacity:.82}
.moment-nav-sheet-close{width:34px;height:34px;border:0;border-radius:999px;background:${c.cardSoft};color:${c.ink};font-size:1.25rem;line-height:1;cursor:pointer}
.moment-nav-sheet ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.moment-nav-sheet a{display:flex;align-items:center;min-height:42px;padding:0 12px;border-radius:12px;font-family:${f.ui};font-size:.86rem;font-weight:600;color:${c.ink};text-decoration:none;background:transparent;border:0;transition:background .15s,color .15s}
.moment-nav-sheet a.active,.moment-nav-sheet a:hover{background:${c.cardSoft};color:${c.ink}}
@media(min-width:760px){.moment-nav-links{display:flex}.moment-nav-burger{display:none}.moment-nav-brand{max-width:160px}.moment-nav-sheet{display:none}.moment-nav-backdrop{display:none}}
.moment-decor{position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden}
.moment-decor-item{position:absolute;font-size:clamp(.95rem,2.8vw,1.35rem);opacity:.09;animation:momentDecorFloat linear infinite;filter:drop-shadow(0 2px 6px rgba(0,0,0,.08))}
@keyframes momentDecorFloat{0%,100%{transform:translate3d(0,0,0) rotate(0deg)}50%{transform:translate3d(0,-16px,0) rotate(8deg)}}
.moment-page{width:100%;max-width:100%;min-height:100dvh;margin:0;background:${c.surface};overflow-x:clip;position:relative}
.moment-hero{position:relative;min-height:min(94dvh,760px);padding:max(72px,env(safe-area-inset-top)) 20px max(56px,env(safe-area-inset-bottom));text-align:center;color:#fff;background:linear-gradient(145deg,${c.hero},${c.go});overflow:hidden;display:grid;align-content:end}
.hero-fullscreen .moment-hero{min-height:min(100dvh,780px)}
.hero-romantico .moment-hero{min-height:min(88dvh,700px)}
.hero-romantico .moment-hero-overlay{background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(10,10,20,.72))}
.hero-intimo .moment-hero{min-height:min(78dvh,620px)}
.hero-intimo .moment-cover-wrap,.hero-intimo .moment-cover{object-position:center 32%}
.hero-profilo .moment-hero{padding-top:max(88px,env(safe-area-inset-top))}
.moment-cover-wrap{position:absolute;inset:0;transform-origin:center center;will-change:transform}
.moment-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.moment-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(10,10,20,.84))}
.moment-hero-content{position:relative;z-index:1;max-width:520px;margin:0 auto}
.hero-in,.rv{opacity:0;transform:translateY(24px);transition:opacity .85s cubic-bezier(.22,1,.36,1),transform .85s cubic-bezier(.22,1,.36,1)}
.hero-in.on,.rv.on{opacity:1;transform:none}
.moment-pill{display:inline-block;font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.92);background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 18px;margin-bottom:16px;backdrop-filter:blur(6px)}
.moment-hero small{display:block;font-family:${f.ui};font-weight:800;text-transform:uppercase;letter-spacing:.16em;opacity:.88;margin-bottom:12px}
.moment-profile{width:96px;height:96px;border-radius:999px;object-fit:cover;border:3px solid rgba(255,255,255,.85);box-shadow:0 12px 40px rgba(0,0,0,.25);margin:0 auto 16px;display:block}
.moment-hero h1{font-family:${f.display};font-size:clamp(2.2rem,11vw,3.6rem);font-weight:400;line-height:1.06;margin:8px 0;text-shadow:0 2px 24px rgba(0,0,0,.35)}
.moment-hero p{font-family:${f.body};font-size:clamp(1rem,4vw,1.12rem);font-style:italic;line-height:1.7;margin:0 auto;max-width:480px;opacity:.94}
@keyframes scrollPulse{0%,100%{opacity:.5;transform:scaleY(1)}50%{opacity:.15;transform:scaleY(.55)}}
@keyframes momentItemIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.moment-content{padding:16px 14px 32px;display:grid;gap:16px;background:${c.surface}}
.moment-counter{background:#FFFFFF;padding:36px 18px;text-align:center;border-radius:22px;border:1px solid ${c.line};box-shadow:0 8px 28px rgba(17,32,65,.05)}
.moment-counter-label{font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:${c.muted};margin-bottom:20px}
.moment-counter-grid{display:flex;justify-content:center;gap:0}
.moment-counter-unit{flex:1;max-width:100px;padding:0 14px}
.moment-counter-unit:not(:last-child){border-right:1px solid ${c.line}}
.moment-counter-unit b{display:block;font-size:clamp(1.8rem,8vw,2.4rem);font-weight:700;font-style:normal;line-height:1;color:${c.ink};font-family:${f.ui}}
.moment-counter-unit small{display:block;font-family:${f.ui};font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:${c.muted};margin-top:8px}
.moment-card{position:relative;overflow:hidden;border:1px solid ${c.line};border-radius:22px;padding:32px 18px 26px;margin:0;background:#FFFFFF;max-width:none;box-shadow:0 8px 28px rgba(17,32,65,.05)}
.moment-card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,rgba(15,23,42,.06),rgba(15,23,42,.02))}
.moment-card:nth-child(even){background:#FFFFFF}
.moment-card-head{display:grid;justify-items:center;text-align:center;margin-bottom:16px;padding-top:4px}
.moment-card-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:999px;background:${c.cardSoft};border:1px solid ${c.line};font-size:1.05rem;color:${c.ink};margin-bottom:10px;box-shadow:none}
.moment-card-head strong{display:block;color:${c.ink};font-size:clamp(1.08rem,4.2vw,1.28rem);font-family:${f.ui};font-weight:800;letter-spacing:.01em;line-height:1.25;text-transform:none}
.moment-card-head strong::before,.moment-card-head strong::after{content:"";display:inline-block;width:18px;height:1px;background:${c.lineStrong};opacity:1;vertical-align:middle;margin:0 8px;border-radius:999px}
.moment-card p{color:${c.ink};opacity:.88;line-height:1.75;white-space:pre-wrap;margin:0;font-size:clamp(.98rem,3.8vw,1.05rem);font-family:${f.ui}}
.moment-card-empty{text-align:center;padding:48px 24px}
.moment-card-message p{font-style:italic;text-align:center;font-size:clamp(1.05rem,4vw,1.2rem)}
.rv.on .moment-journey-item,.rv.on .moment-promise,.rv.on .moment-ritual,.rv.on .moment-number,.rv.on .moment-dream{animation:momentItemIn .6s cubic-bezier(.22,1,.36,1) both}
.rv.on .moment-journey-item:nth-child(2),.rv.on .moment-promise:nth-child(2),.rv.on .moment-ritual:nth-child(2),.rv.on .moment-number:nth-child(2),.rv.on .moment-dream:nth-child(2){animation-delay:.07s}
.rv.on .moment-journey-item:nth-child(3),.rv.on .moment-promise:nth-child(3),.rv.on .moment-ritual:nth-child(3),.rv.on .moment-number:nth-child(3),.rv.on .moment-dream:nth-child(3){animation-delay:.14s}
.rv.on .moment-journey-item:nth-child(4),.rv.on .moment-promise:nth-child(4),.rv.on .moment-ritual:nth-child(4),.rv.on .moment-number:nth-child(4),.rv.on .moment-dream:nth-child(4){animation-delay:.21s}
.rv.on .moment-journey-item:nth-child(n+5),.rv.on .moment-promise:nth-child(n+5),.rv.on .moment-ritual:nth-child(n+5),.rv.on .moment-number:nth-child(n+5),.rv.on .moment-dream:nth-child(n+5){animation-delay:.28s}
.moment-journey{display:grid;gap:14px;margin-top:10px}
.moment-journey-item{display:grid;gap:12px;padding:16px;border-radius:16px;background:${c.card || c.bl2};border:1px solid ${c.ro};position:relative;box-shadow:0 4px 16px rgba(17,32,65,.04)}
.moment-journey-item::before{content:"";position:absolute;left:20px;top:-14px;width:2px;height:14px;background:${c.line}}
.moment-journey-item:first-child::before{display:none}
.moment-journey-photo{width:100%;max-height:220px;object-fit:cover;border-radius:14px;border:1px solid ${c.line};box-shadow:0 6px 18px rgba(0,0,0,.06)}
.moment-journey-copy{display:grid;gap:6px;min-width:0}
.moment-journey-date{font-family:${f.ui};font-size:.62rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${c.muted}}
.moment-journey-place{display:block;font-size:1.08rem;color:${c.ink};font-weight:800;line-height:1.25;font-family:${f.ui}}
.moment-journey-text{margin:0;color:${c.ink};opacity:.82;line-height:1.7;font-size:.96rem;font-family:${f.ui}}
.moment-journey-map{display:inline-flex;align-items:center;gap:4px;font-family:${f.ui};font-size:.78rem;font-weight:700;color:${c.ink};text-decoration:underline;text-underline-offset:3px;margin-top:4px;opacity:.78}
@media(min-width:560px){.moment-journey-item{grid-template-columns:120px minmax(0,1fr);align-items:start}.moment-journey-photo{width:120px;height:120px;max-height:none}}
.moment-meta{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}
.moment-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid ${c.line};border-radius:999px;padding:10px 16px;font-family:${f.ui};font-size:.78rem;color:${c.ink};background:#FFFFFF;text-decoration:none;font-weight:700;min-height:44px}
.moment-chip-action{background:${c.ink};color:#FFFFFF;border-color:${c.ink}}
.moment-gallery-scroll{margin:14px -4px 0;padding:0 12px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x mandatory;scroll-padding-inline:12px;mask-image:linear-gradient(90deg,transparent,black 6%,black 94%,transparent)}
.moment-gallery-scroll::-webkit-scrollbar{display:none}
.moment-gallery-track{display:flex;gap:12px;width:max-content;padding-bottom:2px}
.moment-gallery-scroll img,.moment-gallery-scroll video,.moment-gallery-scroll .moment-media-card,.moment-gallery-scroll .moment-gallery-figure{width:78vw;max-width:280px;height:calc(78vw * 1.22);max-height:340px;object-fit:cover;border-radius:20px;scroll-snap-align:center;box-shadow:0 14px 36px rgba(0,0,0,.12);border:0;padding:0;background:${c.bl2};cursor:pointer;transition:transform .2s ease}
.moment-gallery-scroll img:active,.moment-gallery-scroll .moment-media-card:active{transform:scale(.98)}
.moment-gallery-scroll .moment-gallery-figure{height:auto;min-height:calc(78vw * 1.22);max-height:none;display:grid;align-content:start;gap:8px;background:transparent;box-shadow:none}
.moment-gallery-scroll .moment-gallery-figure img{width:78vw;max-width:280px;height:calc(78vw * 1.22);max-height:340px;border-radius:20px;box-shadow:0 14px 36px rgba(0,0,0,.12)}
.moment-media-card{display:grid;place-items:center;color:${c.in};font-family:${f.ui};font-size:.78rem;font-weight:700;min-height:88px}
.moment-media-card small{display:block;margin-top:8px;opacity:.75;padding:0 10px;text-align:center}
.moment-lightbox{position:fixed;inset:0;background:rgba(8,10,20,.88);z-index:900;display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;transition:opacity .25s ease}
.moment-lightbox.open{opacity:1;pointer-events:auto}
.moment-lightbox-card{max-width:min(94vw,760px);width:100%;text-align:center;color:#fff;transform:scale(.96);transition:transform .25s cubic-bezier(.22,1,.36,1)}
.moment-lightbox.open .moment-lightbox-card{transform:scale(1)}
.moment-lightbox-card img,.moment-lightbox-card video{max-width:100%;max-height:62vh;border-radius:16px;object-fit:contain;background:#111}
.moment-lightbox-card audio{width:100%;margin-top:12px}
.moment-lightbox-title{font-family:${f.body};font-size:1.35rem;margin:14px 0 6px}
.moment-lightbox-desc{font-size:.95rem;opacity:.85;line-height:1.55;margin:0 auto;max-width:520px}
.moment-lightbox-close{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;width:44px;height:44px;border:0;border-radius:999px;background:#fff;color:#111;font-size:1.4rem;cursor:pointer;z-index:2}
.moment-lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(255,255,255,.92);color:#111;font-size:1.8rem;line-height:1;cursor:pointer;z-index:2}
.moment-lightbox-prev{left:12px}
.moment-lightbox-next{right:12px}
.moment-lightbox-counter{font-family:${f.ui};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;opacity:.72;margin:0 0 8px}
.moment-youtube{margin-top:12px;border-radius:16px;overflow:hidden;border:1px solid ${c.ro};aspect-ratio:16/9;background:#111}
.moment-youtube iframe{display:block;width:100%;height:100%;border:0}
.moment-audio{margin-top:12px;border-radius:16px;padding:16px;background:${c.cardSoft};border:1px solid ${c.line};box-shadow:none}
.moment-audio audio{width:100%}
.moment-audio-title{font-family:${f.body};font-size:1.1rem;margin:0 0 6px;color:${c.ink}}
.moment-audio-desc{font-size:.92rem;opacity:.82;margin:0 0 10px;line-height:1.5;color:${c.muted}}
.moment-sealed{text-align:center;padding:32px 20px;background:#FFFFFF;border:1px dashed ${c.lineStrong};border-radius:18px;margin-top:8px}
.moment-sealed-icon{font-size:2rem;margin-bottom:10px;color:${c.ink};opacity:.55;animation:scrollPulse 3s ease-in-out infinite}
.moment-sealed-date{font-family:${f.ui};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:${c.muted};margin-top:8px}
.moment-rituals{display:grid;gap:10px;margin-top:10px}
.moment-ritual{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;background:${c.cardSoft};border:1px solid ${c.line};border-left:3px solid ${c.lineStrong};box-shadow:none}
.moment-card:nth-child(even) .moment-ritual,.moment-card:nth-child(even) .moment-promise,.moment-card:nth-child(even) .moment-number{background:${c.cardSoft}}
.moment-pet-card{display:grid;justify-items:center;text-align:center;gap:12px;margin-top:8px}
.moment-pet-photo{width:120px;height:120px;border-radius:999px;object-fit:cover;border:3px solid #FFFFFF;box-shadow:0 12px 32px rgba(15,23,42,.12)}
.moment-pet-name{font-family:${f.body};font-size:1.35rem;margin:0;color:${c.ink};font-weight:600}
.moment-numbers{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:12px}
.moment-number{flex:1 1 100px;max-width:140px;text-align:center;padding:16px 10px;border-radius:16px;background:${c.cardSoft};border:1px solid ${c.line};border-top:3px solid ${c.lineStrong};box-shadow:none}
.moment-number b{display:block;font-size:clamp(1.6rem,7vw,2rem);font-weight:400;font-style:italic;color:${c.ink};line-height:1}
.moment-number small{display:block;font-family:${f.ui};font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:${c.muted};margin-top:8px;line-height:1.35}
.moment-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.moment-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;border:2px solid ${c.ro};box-shadow:0 10px 28px rgba(0,0,0,.1)}
.moment-letter{background:#FFFFFF;border-radius:18px;padding:26px 20px;margin-top:8px;border:1px solid ${c.line};border-left:3px solid ${c.lineStrong};position:relative;box-shadow:none}
.moment-letter p{line-height:1.95;letter-spacing:.01em;color:${c.ink}}
.moment-letter-to{font-style:italic;color:${c.muted};font-weight:600;margin:0 0 12px}
.moment-letter-sign{display:block;margin-top:18px;font-family:${f.display};font-size:1.6rem;color:${c.ink}}
.moment-letter-heart{position:absolute;right:18px;bottom:14px;opacity:.12;color:${c.ink};font-size:1.4rem}
.moment-letter-media{margin-top:18px;display:grid;gap:10px;justify-items:center}
.moment-letter-media img{width:100%;max-width:420px;border-radius:14px;border:1px solid ${c.ro};object-fit:cover}
.moment-letter-media video{width:100%;max-width:420px;border-radius:14px;border:1px solid ${c.ro};background:#111}
.moment-letter-media-title{font-family:${f.body};font-size:1.05rem;margin:0;color:${c.in}}
.moment-promises{display:grid;gap:10px;margin-top:10px}
.moment-promise{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;background:${c.cardSoft};border:1px solid ${c.line};border-left:3px solid ${c.lineStrong};box-shadow:none}
.moment-promise-emoji{font-size:1.2rem;line-height:1.2}
.moment-places{display:grid;gap:10px;margin-top:10px}
.moment-place{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:${c.bl};border:1px solid ${c.ro};text-decoration:none;color:${c.in}}
.moment-place-icon{font-size:1.15rem}
.moment-dreams{display:grid;gap:8px;margin-top:10px}
.moment-dream{display:flex;gap:10px;align-items:center;font-size:1.02rem;padding:8px 0;border-bottom:1px solid ${c.ro}}
.moment-dream:last-child{border-bottom:0}
.moment-dream-mark{width:24px;height:24px;border-radius:999px;border:2px solid ${c.lineStrong};display:grid;place-items:center;font-size:.72rem;color:${c.ink};flex-shrink:0;background:#FFFFFF}
.moment-dream.done .moment-dream-mark{background:${c.ink};color:#FFFFFF;border-color:${c.ink}}
.moment-dream.done .moment-dream-text{opacity:.55;text-decoration:line-through;color:${c.muted}}
.moment-countdown{text-align:center;padding:36px 18px;background:#FFFFFF;border-radius:22px;border:1px solid ${c.line};box-shadow:0 8px 28px rgba(17,32,65,.05)}
.moment-countdown-photo{width:min(100%,280px);height:160px;object-fit:cover;border-radius:16px;margin:0 auto 16px;display:block;border:1px solid ${c.line};box-shadow:0 10px 28px rgba(0,0,0,.08)}
.moment-countdown-label{font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:${c.muted};margin-bottom:14px}
.moment-countdown-event{font-size:1.15rem;font-style:italic;margin:0 0 18px;color:${c.ink}}
.moment-countdown-note{margin:0 0 16px;color:${c.ink};opacity:.82;line-height:1.6;font-size:.98rem}
.moment-rsvp-intro{margin:0 0 16px;line-height:1.75;color:${c.ink};font-size:1.02rem;font-weight:500;opacity:.88}
.moment-rsvp-event{text-align:center;margin:0 0 20px;padding:8px 0 0}
.moment-rsvp-event-eyebrow{font-family:${f.ui};font-size:.62rem;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:${c.muted};margin:0 0 8px}
.moment-rsvp-event-title{font-family:${f.display};font-size:clamp(1.65rem,7vw,2.35rem);color:${c.ink};margin:0;line-height:1.15;font-weight:400}
.moment-rsvp-form{display:grid;gap:16px;margin-top:4px;padding:18px;border-radius:18px;background:${c.cardSoft};border:1px solid ${c.line}}
.moment-rsvp-form label{display:grid;gap:8px;font-family:${f.ui};font-size:.88rem;font-weight:700;color:${c.ink}}
.moment-rsvp-form input,.moment-rsvp-form textarea{width:100%;border:1px solid ${c.lineStrong};border-radius:12px;padding:13px 14px;font:inherit;background:#FFFFFF;color:${c.ink};font-size:1rem;line-height:1.4;-webkit-text-fill-color:${c.ink};box-shadow:inset 0 1px 2px rgba(15,23,42,.03)}
.moment-rsvp-form input::placeholder,.moment-rsvp-form textarea::placeholder{color:${c.muted};opacity:1;-webkit-text-fill-color:${c.muted}}
.moment-rsvp-attending{border:0;padding:0;margin:0;display:grid;gap:10px}
.moment-rsvp-attending legend{font-family:${f.ui};font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${c.muted};margin-bottom:6px}
.moment-rsvp-attending label{font-weight:600;display:flex;align-items:center;gap:10px;color:${c.ink};font-size:.95rem}
.moment-rsvp-attending input[type=radio]{width:18px;height:18px;margin:0;flex-shrink:0;accent-color:${c.ink}}
.moment-card-head strong{color:${c.ink}}
.moment-rsvp-submit{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:14px;padding:14px 18px;background:#25D366;color:#fff;font-family:${f.ui};font-weight:800;font-size:.95rem;cursor:pointer;box-shadow:0 10px 24px rgba(37,211,102,.25)}
.moment-card-head .moment-card-icon{font-size:1.15rem;line-height:1;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:${c.cardSoft};border:1px solid ${c.line};flex-shrink:0;color:${c.ink}}
.moment-countdown-grid{display:flex;justify-content:center;gap:0}
.moment-countdown-unit{flex:1;max-width:100px;padding:0 14px}
.moment-countdown-unit b{display:block;font-size:clamp(1.8rem,8vw,2.4rem);font-weight:400;font-style:italic;line-height:1;color:${c.ink}}
.moment-countdown-unit small{display:block;font-family:${f.ui};font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:${c.muted};margin-top:8px}
.moment-countdown-unit:not(:last-child){border-right:1px solid ${c.line}}
.moment-spotify{margin-top:12px;border-radius:16px;overflow:hidden;border:1px solid ${c.line}}
.moment-spotify iframe{display:block;width:100%;border:0;min-height:152px}
.moment-quote-wrap{text-align:center;padding:42px 20px;background:#FFFFFF;border-radius:22px;border:1px solid ${c.line};box-shadow:0 8px 28px rgba(17,32,65,.05)}
.moment-quote-wrap::before{content:"";display:block;width:48px;height:2px;margin:0 auto 18px;border-radius:999px;background:${c.lineStrong}}
.moment-quote-mark{font-family:${f.ui};font-size:2.4rem;line-height:1;color:${c.muted};opacity:.55;margin-bottom:-8px;font-weight:800}
.moment-quote-text{font-size:clamp(1.05rem,4.5vw,1.28rem);font-style:italic;line-height:1.65;margin:0;color:${c.ink};font-family:${f.body};font-weight:500}
.moment-quote-author{display:block;margin-top:16px;font-family:${f.ui};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:${c.muted}}
.moment-signature{text-align:center;padding:42px 20px 48px;border-radius:22px;background:#FFFFFF;border:1px solid ${c.line};box-shadow:0 8px 28px rgba(17,32,65,.05)}
.moment-signature-label{font-family:${f.ui};font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:${c.muted};margin:0 0 10px}
.moment-signature-name{font-family:${f.display};font-size:clamp(2rem,8vw,2.8rem);color:${c.ink};margin:0;line-height:1.1}
.moment-signature-sub{font-style:italic;color:${c.muted};margin-top:10px;font-size:1rem}
.moment-gallery-empty,.moment-empty-hint{font-family:${f.ui};font-size:.88rem;line-height:1.55;color:${c.muted};font-style:italic;margin:12px 0 0;padding:14px 16px;border-radius:12px;background:${c.cardSoft};border:1px dashed ${c.lineStrong};text-align:center}
.moment-gallery-group{margin-top:20px}
.moment-gallery-group:first-child{margin-top:8px}
.moment-gallery-group-label{font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${c.muted};text-align:center;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid ${c.line}}
.moment-gallery-group-items{display:grid;gap:10px}
.moment-media-list{display:grid;gap:10px}
.moment-gallery-figure{margin:0;display:grid;gap:6px;justify-items:center}
.moment-gallery-caption{font-family:${f.ui};font-size:.72rem;font-weight:700;color:${c.in};text-align:center;max-width:240px;line-height:1.35}
.moment-media-card-audio{min-height:88px}
.moment-footer{text-align:center;color:${c.mu};font-family:${f.ui};font-size:12px;padding:16px 20px max(28px,env(safe-area-inset-bottom))}
@media(prefers-reduced-motion:reduce){.hero-in,.rv{opacity:1;transform:none;transition:none}.rv.on .moment-journey-item,.rv.on .moment-promise,.rv.on .moment-ritual,.rv.on .moment-number,.rv.on .moment-dream{animation:none}.moment-sealed-icon,.moment-decor-item{animation:none}.moment-decor{display:none}}
@media(min-width:720px){body{padding:24px;background:#eef2f7}.moment-page{width:min(100%,680px);margin:auto;border-radius:20px;box-shadow:0 24px 70px rgba(17,32,65,.12);background:${c.surface}}.moment-content{padding:16px 16px 32px}.moment-gallery-scroll img,.moment-gallery-scroll .moment-gallery-figure img{width:260px;height:320px}}`;
}

const MOMENT_SECTION_ICONS = {
  intro: "✨",
  dedication: "💌",
  timeline: "🗺️",
  rsvp: "📲",
  gallery: "📸",
  promises: "💍",
  places: "📍",
  dreams: "🌟",
  countdown: "⏳",
  music: "🎵",
  letter_future: "🔐",
  rituals: "🕯️",
  pet: "🐾",
  numbers: "🔢",
  quote: "✍️",
  signature: "💫"
};

function renderSectionTag(title, colors) {
  return title ? `<p class="moment-tag">${escapeHtml(title)}</p>` : "";
}

function normalizeRsvpSectionWorker(section = {}) {
  const next = { ...section };
  const optional = {
    guests: { label: "Quanti siete?", type: "number", placeholder: "1" },
    notes: { label: "Note (allergie, bambini…)", type: "textarea", placeholder: "Facoltativo" },
    phone: { label: "Telefono", type: "tel", placeholder: "Es. 333 1234567" },
    email: { label: "Email", type: "email", placeholder: "Es. marco@email.it" }
  };
  if (!Array.isArray(next.field_keys)) {
    next.field_keys = [];
    if (next.ask_guests !== false) next.field_keys.push("guests");
    if (next.ask_notes !== false) next.field_keys.push("notes");
  }
  next.field_keys = [...new Set(next.field_keys.filter(key => optional[key]))];
  if (!Array.isArray(next.custom_fields)) next.custom_fields = [];
  next.custom_fields = next.custom_fields
    .map((field, index) => ({
      id: String(field?.id || `custom_${index + 1}`).trim() || `custom_${index + 1}`,
      label: String(field?.label || "").trim(),
      placeholder: String(field?.placeholder || "").trim(),
      type: field?.type === "textarea" ? "textarea" : "text",
      enabled: field?.enabled !== false
    }))
    .filter(field => field.label && field.enabled !== false)
    .slice(0, 8);
  return next;
}

function renderRsvpOptionalFields(section) {
  const safe = normalizeRsvpSectionWorker(section);
  const optional = {
    guests: { label: "Quanti siete?", type: "number", placeholder: "1" },
    notes: { label: "Note (allergie, bambini…)", type: "textarea", placeholder: "Facoltativo" },
    phone: { label: "Telefono", type: "tel", placeholder: "Es. 333 1234567" },
    email: { label: "Email", type: "email", placeholder: "Es. marco@email.it" }
  };
  let html = "";
  safe.field_keys.forEach(key => {
    const spec = optional[key];
    if (!spec) return;
    if (spec.type === "number") {
      html += `<label>${escapeHtml(spec.label)}<input type="number" name="rsvp_${escapeHtml(key)}" min="1" max="30" placeholder="${attr(spec.placeholder)}"></label>`;
      return;
    }
    if (spec.type === "textarea") {
      html += `<label>${escapeHtml(spec.label)}<textarea name="rsvp_${escapeHtml(key)}" rows="2" placeholder="${attr(spec.placeholder)}"></textarea></label>`;
      return;
    }
    const inputMode = key === "phone" ? ' inputmode="tel"' : "";
    const auto = key === "email" ? ' autocomplete="email"' : key === "phone" ? ' autocomplete="tel"' : "";
    html += `<label>${escapeHtml(spec.label)}<input type="${attr(spec.type)}" name="rsvp_${escapeHtml(key)}"${inputMode}${auto} placeholder="${attr(spec.placeholder)}"></label>`;
  });
  safe.custom_fields.forEach(field => {
    if (field.type === "textarea") {
      html += `<label>${escapeHtml(field.label)}<textarea name="rsvp_custom_${attr(field.id)}" rows="2" placeholder="${attr(field.placeholder || "Facoltativo")}"></textarea></label>`;
      return;
    }
    html += `<label>${escapeHtml(field.label)}<input type="text" name="rsvp_custom_${attr(field.id)}" placeholder="${attr(field.placeholder || "Facoltativo")}"></label>`;
  });
  return { html, customFields: safe.custom_fields };
}

function renderRsvpEventBadge(eventName, fonts) {
  const label = String(eventName || "").trim();
  if (!label) return "";
  const f = fonts || resolveMomentFontPair("classic");
  return `<div class="moment-rsvp-event"><p class="moment-rsvp-event-eyebrow">RSVP</p><p class="moment-rsvp-event-title">${escapeHtml(label)}</p></div>`;
}

function rsvpWhatsAppIntro(momentType, eventName) {
  const type = String(momentType || "free").trim().toLowerCase();
  const label = String(eventName || "Evento").trim();
  const emojiMap = {
    wedding: "💍", birthday: "🎂", baptism: "🕊️", communion: "✨", graduation: "🎓",
    party: "🎉", anniversary: "💑", memorial: "🕯️", travel: "✈️"
  };
  const emoji = emojiMap[type] || "👋";
  const hooks = {
    wedding: `Ciao! ${emoji} RSVP matrimonio · ${label}`,
    birthday: `Ciao! ${emoji} RSVP compleanno · ${label}`,
    baptism: `Ciao! ${emoji} RSVP battesimo · ${label}`,
    communion: `Ciao! ${emoji} RSVP comunione · ${label}`,
    graduation: `Ciao! ${emoji} RSVP laurea · ${label}`,
    party: `Ciao! ${emoji} RSVP festa · ${label}`,
    anniversary: `Ciao! ${emoji} RSVP anniversario · ${label}`,
    memorial: `Ciao! ${emoji} Partecipazione · ${label}`,
    travel: `Ciao! ${emoji} RSVP viaggio · ${label}`
  };
  return hooks[type] || `Ciao! ${emoji} RSVP · ${label}`;
}

function renderMomentSection(key, section, colors, momentType = "free", fonts = null) {
  const images = Array.isArray(section.images) ? section.images.filter(url => safeUrl(url) !== "#").slice(0, 24) : [];
  const icon = MOMENT_SECTION_ICONS[key] || "•";
  const head = (title) => `<div class="moment-card-head"><span class="moment-card-icon">${icon}</span><strong>${escapeHtml(title || "Sezione")}</strong></div>`;
  const rv = `moment-card moment-card-${escapeHtml(key)} rv`;

  if (key === "quote" && section.body) {
    return `<article class="${rv} moment-quote-wrap"><span class="moment-quote-mark">"</span><p class="moment-quote-text">${escapeHtml(section.body)}</p>${section.author ? `<span class="moment-quote-author">— ${escapeHtml(section.author)}</span>` : ""}</article>`;
  }

  if (key === "signature") {
    return `<article class="${rv} moment-signature"><p class="moment-signature-label">Questo momento appartiene a</p><p class="moment-signature-name">${escapeHtml(section.sign_name || section.title || "Voi")}</p>${section.sign_subtitle ? `<p class="moment-signature-sub">${escapeHtml(section.sign_subtitle)}</p>` : section.body ? `<p class="moment-signature-sub">${escapeHtml(section.body)}</p>` : ""}</article>`;
  }

  if (key === "dedication" && (section.body || section.recipient)) {
    const recipient = section.recipient ? `<p class="moment-letter-to">Caro/a ${escapeHtml(section.recipient)},</p>` : "";
    const sign = section.signature ? `<span class="moment-letter-sign">${escapeHtml(section.signature)}</span>` : "";
    return `<article class="${rv}">${head(section.title || "Dedica")}${renderSectionTag("", colors)}<div class="moment-letter">${recipient}${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}${sign}<span class="moment-letter-heart" aria-hidden="true">♥</span></div></article>`;
  }

  if (key === "places") return "";

  if (key === "rsvp") {
    const wa = normalizeWhatsAppDigits(section.whatsapp_number);
    const eventName = String(section.event_name || section.title || "Evento").trim();
    if (!wa) {
      return `<article class="${rv}">${head(section.title || "Conferma presenza")}<p class="moment-empty-hint">Aggiungi il numero WhatsApp dell'organizzatore nell'editor.</p></article>`;
    }
    const { html: optionalFields, customFields } = renderRsvpOptionalFields(section);
    const eventBadge = renderRsvpEventBadge(eventName, fonts);
    const rsvpIntro = rsvpWhatsAppIntro(momentType, eventName);
    const customAttr = attr(JSON.stringify(customFields.map(field => ({ id: field.id, label: field.label }))));
    return `<article class="${rv} moment-rsvp" data-rsvp-wa="${attr(wa)}" data-rsvp-event="${attr(eventName)}" data-rsvp-intro="${attr(rsvpIntro)}" data-rsvp-custom="${customAttr}">${head(section.title || "Conferma presenza")}${eventBadge}${section.body ? `<p class="moment-rsvp-intro">${escapeHtml(section.body)}</p>` : ""}<form class="moment-rsvp-form" data-rsvp-form><label>Nome e cognome<input type="text" name="rsvp_name" required placeholder="Es. Marco Rossi" autocomplete="name"></label><fieldset class="moment-rsvp-attending"><legend>Vieni?</legend><label><input type="radio" name="rsvp_attending" value="Sì, ci sarò" checked> Sì, ci sarò</label><label><input type="radio" name="rsvp_attending" value="No, non posso"> No, non posso</label><label><input type="radio" name="rsvp_attending" value="Forse"> Forse</label></fieldset>${optionalFields}<button type="submit" class="moment-rsvp-submit">Invia su WhatsApp</button></form></article>`;
  }

  if (key === "timeline") {
    const steps = resolveJourneyStepsWorker(section);
    const headBlock = head(section.title || "Tappe & luoghi");
    if (!steps.length) {
      return `<article class="${rv}">${headBlock}<p class="moment-empty-hint">Aggiungi tappe con data, luogo, descrizione e foto nell'editor.</p></article>`;
    }
    const items = steps.map(step => {
      const photo = step.image_url && safeUrl(step.image_url) !== "#"
        ? `<img class="moment-journey-photo" src="${attr(step.image_url)}" alt="${attr(step.place || step.text || "Tappa")}" loading="lazy">`
        : "";
      const date = step.date ? `<span class="moment-journey-date">${escapeHtml(step.date)}</span>` : "";
      const place = step.place ? `<strong class="moment-journey-place">${escapeHtml(step.place)}</strong>` : "";
      const text = step.text ? `<p class="moment-journey-text">${escapeHtml(step.text)}</p>` : "";
      const mapLink = step.maps_url && safeUrl(step.maps_url) !== "#"
        ? `<a class="moment-journey-map" href="${attr(step.maps_url)}" target="_blank" rel="noopener">Apri mappa ↗</a>`
        : "";
      return `<div class="moment-journey-item">${photo}<div class="moment-journey-copy">${date}${place}${text}${mapLink}</div></div>`;
    }).join("");
    return `<article class="${rv}">${head(section.title || "Tappe & luoghi")}<div class="moment-journey">${items}</div></article>`;
  }

  if (key === "promises" && section.body) {
    const items = parseMomentLines(section.body, "promise");
    return `<article class="${rv}">${head(section.title)}<div class="moment-promises">${items.map(item => `<div class="moment-promise"><span class="moment-promise-emoji">${escapeHtml(item.emoji)}</span><span>${escapeHtml(item.text)}</span></div>`).join("")}</div></article>`;
  }

  if (key === "dreams" && section.body) {
    const items = parseMomentLines(section.body, "dream");
    return `<article class="${rv}">${head(section.title)}<div class="moment-dreams">${items.map(item => `<div class="moment-dream ${item.done ? "done" : ""}"><span class="moment-dream-mark">${item.done ? "✓" : ""}</span><span class="moment-dream-text">${escapeHtml(item.text)}</span></div>`).join("")}</div></article>`;
  }

  if (key === "countdown" && section.target_date) {
    const target = String(section.target_date).replace(" ", "T");
    const imageUrl = safeUrl(section.image_url || section.images?.[0] || "") !== "#" ? safeUrl(section.image_url || section.images?.[0] || "") : "";
    const photo = imageUrl ? `<img class="moment-countdown-photo" src="${attr(imageUrl)}" alt="">` : "";
    return `<section class="moment-countdown rv" data-target="${attr(target.length > 10 ? target : target + "T12:00:00")}">${photo}<p class="moment-countdown-label">${escapeHtml(section.title || "Conto alla rovescia")}</p>${section.event_label ? `<p class="moment-countdown-event">${escapeHtml(section.event_label)}</p>` : ""}${section.body ? `<p class="moment-countdown-note">${escapeHtml(section.body)}</p>` : ""}<div class="moment-countdown-grid"><span class="moment-countdown-unit"><b data-cd="days">0</b><small>giorni</small></span><span class="moment-countdown-unit"><b data-cd="hours">0</b><small>ore</small></span><span class="moment-countdown-unit"><b data-cd="minutes">0</b><small>minuti</small></span></div></section>`;
  }

  if (key === "music" && (section.spotify_url || section.youtube_url || section.audio_url)) {
    const spotify = spotifyEmbedFromUrl(section.spotify_url);
    const youtube = youtubeEmbedFromUrl(section.youtube_url);
    const audioBlock = section.audio_url
      ? `<div class="moment-audio">${section.audio_title ? `<p class="moment-audio-title">${escapeHtml(section.audio_title)}</p>` : ""}${section.audio_description ? `<p class="moment-audio-desc">${escapeHtml(section.audio_description)}</p>` : ""}<audio src="${attr(section.audio_url)}" controls></audio></div>`
      : "";
    return `<article class="${rv}">${head(section.title || "La nostra canzone")}${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}${spotify ? `<div class="moment-spotify"><iframe src="${attr(spotify)}" loading="lazy" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe></div>` : ""}${youtube ? `<div class="moment-youtube"><iframe src="${attr(youtube)}" loading="lazy" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen title="Video YouTube"></iframe></div>` : ""}${audioBlock}</article>`;
  }

  if (key === "letter_future" && (section.body || section.unlock_date || section.media_url)) {
    const unlocked = isLetterUnlocked(section.unlock_date);
    const when = formatUnlockDate(section.unlock_date);
    if (!unlocked) {
      return `<article class="${rv}">${head(section.title || "Lettera al futuro")}<div class="moment-sealed"><div class="moment-sealed-icon" aria-hidden="true">🔒</div><p>Questa lettera è sigillata${when ? ` fino al <strong>${escapeHtml(when)}</strong>` : ""}.</p><p class="moment-sealed-date">Torna in quella data per rileggerla.</p></div></article>`;
    }
    const recipient = section.recipient ? `<p class="moment-letter-to">Caro/a ${escapeHtml(section.recipient)},</p>` : "";
    const media = renderLetterFutureMedia(section);
    return `<article class="${rv}">${head(section.title || "Lettera al futuro")}<div class="moment-letter">${recipient}${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}${media}<span class="moment-letter-heart" aria-hidden="true">♥</span></div></article>`;
  }

  if (key === "rituals" && section.body) {
    const items = parseMomentLines(section.body, "ritual");
    return `<article class="${rv}">${head(section.title)}<div class="moment-rituals">${items.map(item => `<div class="moment-ritual"><span class="moment-promise-emoji">${escapeHtml(item.emoji)}</span><span>${escapeHtml(item.text)}</span></div>`).join("")}</div></article>`;
  }

  if (key === "pet" && (section.pet_name || section.body || section.pet_photo)) {
    const photo = safeUrl(section.pet_photo || "") !== "#" ? `<img class="moment-pet-photo" src="${attr(section.pet_photo)}" alt="${attr(section.pet_name || "Pet")}">` : "";
    const name = section.pet_name ? `<p class="moment-pet-name">${escapeHtml(section.pet_emoji || "🐾")} ${escapeHtml(section.pet_name)}</p>` : "";
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    return `<article class="${rv}">${head(section.title || "Il nostro compagno")}<div class="moment-pet-card">${photo}${name}${body}</div></article>`;
  }

  if (key === "numbers" && section.body) {
    const items = parseMomentLines(section.body, "number");
    return `<article class="${rv}">${head(section.title)}<div class="moment-numbers">${items.map(item => `<div class="moment-number">${item.value ? `<b>${escapeHtml(item.value)}</b>` : ""}${item.label ? `<small>${escapeHtml(item.label)}</small>` : ""}</div>`).join("")}</div></article>`;
  }


  if (key === "gallery") {
    const media = normalizeMomentMedia(section);
    const headBlock = head(section.title || "Foto & video");
    if (!media.length) {
      return `<article class="${rv}">${headBlock}<p class="moment-gallery-empty">I ricordi verranno aggiunti presto.</p></article>`;
    }
    const groups = [
      { type: "image", label: "Foto" },
      { type: "video", label: "Video" },
      { type: "audio", label: "Audio" }
    ];
    const blocks = groups.map(group => {
      const items = media.map((item, idx) => ({ item, idx })).filter(({ item }) => item.type === group.type);
      if (!items.length) return "";
      const cards = items.map(({ item, idx }) => {
        if (item.type === "video") {
          return `<button type="button" class="moment-media-card" data-media-open="${idx}" aria-label="${escapeHtml(item.title || "Video")}"><span>▶ ${escapeHtml(item.title || "Video")}</span>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</button>`;
        }
        if (item.type === "audio") {
          return `<button type="button" class="moment-media-card moment-media-card-audio" data-media-open="${idx}" aria-label="${escapeHtml(item.title || "Audio")}"><span>♫ ${escapeHtml(item.title || "Audio")}</span>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</button>`;
        }
        const caption = item.title ? `<span class="moment-gallery-caption">${escapeHtml(item.title)}</span>` : "";
        return `<figure class="moment-gallery-figure"><img src="${attr(item.url)}" alt="${attr(item.title || "")}" loading="lazy" data-media-open="${idx}">${caption}</figure>`;
      }).join("");
      const track = group.type === "image" && items.length >= 2
        ? `<div class="moment-gallery-scroll"><div class="moment-gallery-track">${cards}</div></div>`
        : `<div class="moment-gallery-group-items ${group.type === "image" ? "moment-gallery" : "moment-media-list"}">${cards}</div>`;
      return `<div class="moment-gallery-group"><p class="moment-gallery-group-label">${escapeHtml(group.label)}</p>${track}</div>`;
    }).filter(Boolean).join("");
    const json = escapeHtml(JSON.stringify(media));
    return `<article class="${rv}">${head(section.title)}${blocks}<script type="application/json" class="moment-gallery-data">${json}</script></article>`;
  }

  if (key === "quote" && !section.body) {
    return `<article class="${rv} moment-quote-wrap"><span class="moment-quote-mark">"</span><p class="moment-quote-text moment-empty-hint">Aggiungi la citazione nell'editor.</p></article>`;
  }

  if (key === "promises" && !section.body) {
    return `<article class="${rv}">${head(section.title || "Promesse")}<p class="moment-empty-hint">Aggiungi le promesse, una riga ciascuna.</p></article>`;
  }

  if (key === "dreams" && !section.body) {
    return `<article class="${rv}">${head(section.title || "Sogni")}<p class="moment-empty-hint">Aggiungi i sogni da realizzare insieme.</p></article>`;
  }

  if (key === "music" && !section.spotify_url && !section.youtube_url && !section.audio_url) {
    return `<article class="${rv}">${head(section.title || "Musica")}<p class="moment-empty-hint">Aggiungi Spotify, YouTube o un audio.</p></article>`;
  }

  if (key === "rituals" && !section.body) {
    return `<article class="${rv}">${head(section.title || "Rituali")}<p class="moment-empty-hint">Aggiungi i rituali quotidiani.</p></article>`;
  }

  if (key === "numbers" && !section.body) {
    return `<article class="${rv}">${head(section.title || "I nostri numeri")}<p class="moment-empty-hint">Es. «365 · giorni insieme».</p></article>`;
  }

  if (key === "pet" && !section.pet_name && !section.body && !section.pet_photo) {
    return `<article class="${rv}">${head(section.title || "Il nostro compagno")}<p class="moment-empty-hint">Aggiungi nome, foto e racconto.</p></article>`;
  }

  if (key === "letter_future" && !section.body && !section.unlock_date && !section.media_url) {
    return `<article class="${rv}">${head(section.title || "Lettera al futuro")}<p class="moment-empty-hint">Scrivi la lettera, scegli la data di apertura e opzionalmente allega foto, video o audio.</p></article>`;
  }

  if (key === "countdown" && !section.target_date) {
    return `<article class="${rv}">${head(section.title || "Countdown")}<p class="moment-empty-hint">Imposta data e ora dell'evento.</p></article>`;
  }

  if (key === "dedication" && !section.body && !section.recipient) {
    return `<article class="${rv}">${head(section.title || "Dedica")}<p class="moment-empty-hint">Scrivi la dedica personale.</p></article>`;
  }

  if (key === "signature" && !section.sign_name && !section.sign_subtitle) {
    return `<article class="${rv} moment-signature"><p class="moment-signature-label">Questo momento appartiene a</p><p class="moment-empty-hint">Aggiungi i nomi nella firma finale.</p></article>`;
  }

  if (key === "intro" && !section.body) {
    return `<article class="${rv}">${head(section.title || "Introduzione")}<p class="moment-empty-hint">Racconta chi siete e perché questo momento conta.</p></article>`;
  }

  let gallery = "";
  if (images.length) {
    gallery = images.length >= 2
      ? `<div class="moment-gallery-scroll"><div class="moment-gallery-track">${images.map(url => `<img src="${attr(url)}" alt="" loading="lazy">`).join("")}</div></div>`
      : `<div class="moment-gallery">${images.map(url => `<img src="${attr(url)}" alt="" loading="lazy">`).join("")}</div>`;
  }
  const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
  return `<article class="${rv}">${head(section.title)}${body}${gallery}</article>`;
}

function normalizeMomentMedia(section) {
  if (Array.isArray(section.media) && section.media.length) {
    return section.media.map(item => ({
      type: ["image", "video", "audio"].includes(item.type) ? item.type : "image",
      url: String(item.url || "").trim(),
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim()
    })).filter(item => item.url);
  }
  const images = Array.isArray(section.images) ? section.images.filter(Boolean) : [];
  return images.map(url => ({ type: "image", url: String(url), title: "", description: "" }));
}

function renderMomentActivationPage(product, origin, env = {}) {
  const code = String(product.code || "");
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://khamakey-app.pages.dev").replace(/\/$/, "");
  const typeLabel = {
    free: "Evento generale",
    love: "Amore",
    mom: "Mamma",
    dad: "Papà",
    child: "Figlio / Figlia",
    kids: "Bambini",
    memory: "Ricordi",
    photo: "Album foto",
    pet: "Animali",
    communion: "Comunione",
    baptism: "Battesimo",
    friendship: "Amicizia",
    family: "Famiglia",
    valentine: "San Valentino",
    christmas: "Natale",
    birthday: "Compleanno",
    wedding: "Matrimonio",
    party: "Festa",
    travel: "Viaggio",
    memorial: "Memoriale",
    portfolio: "Portfolio"
  }[product.product_type] || "KhamaKey Moments";
  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Attiva KhamaKey Moments</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;background:#f5f7fa;color:#172036;padding:18px}.card{width:min(100%,460px);background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:26px;box-shadow:0 18px 60px rgba(27,42,94,.12);text-align:center}.eyebrow{color:#4caf27;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}h1{color:#1b2a5e;font-size:34px;line-height:1;margin:8px 0 12px}p{color:#64748b;line-height:1.55}.code{display:block;margin:18px 0;padding:13px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#1b2a5e;font-size:20px;font-weight:900;letter-spacing:.08em}.button{display:inline-flex;justify-content:center;width:100%;border-radius:12px;background:#1b2a5e;color:#fff;padding:13px 16px;text-decoration:none;font-weight:900}.hint{font-size:13px}</style></head>
<body><main class="card"><div class="eyebrow">KhamaKey Moments</div><h1>Prodotto pronto da attivare</h1><p>Questo oggetto NFC è già collegato al suo link pubblico. Crea o apri il tuo account Moments e inserisci questo codice per iniziare a costruire la pagina privata.</p><span class="code">${escapeHtml(code)}</span><p><strong>${escapeHtml(typeLabel)}</strong></p><a class="button" href="${attr(pagesBase)}/moments.html">Attiva in Area Moments</a><p class="hint">Dopo l’attivazione, questo stesso link mostrerà la pagina creata con l’editor.</p></main></body></html>`;
}

function action(label, href, eventType, className) {
  return `<a class="action ${className}" href="${attr(href)}" data-event="${eventType}">${escapeHtml(label)}</a>`;
}

function notFound(message) {
  return `<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f4f7fa;color:#1b2a5e;text-align:center"><main><h1>${escapeHtml(message)}</h1><p>KhamaKey</p></main></body></html>`;
}

function deviceType(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (/iphone|android|mobile/.test(ua)) return "mobile";
  if (/ipad|tablet/.test(ua)) return "tablet";
  return "desktop";
}

async function visitorId(request, salt) {
  const value = `${request.headers.get("cf-connecting-ip") || ""}:${request.headers.get("user-agent") || ""}:${salt}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function momentPinHash(slug, pin) {
  const value = `moment:${slug}:${pin}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, { status: response.status, headers });
}

function html(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { "Content-Type": "text/html;charset=utf-8", ...extra } });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "#";
  } catch {
    return "#";
  }
}

function sanitizeBookingValues(values) {
  const output = {};
  for (const key of ["date", "slot", "people", "name", "phone", "email", "notes"]) {
    output[key] = String(values[key] || "").trim().slice(0, key === "notes" ? 1200 : 160);
  }
  return output;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function sendBookingEmail(env, { to, from, replyTo, businessName, requestType, values, pageUrl }) {
  const subject = `${requestType} da pagina KhamaKey - ${businessName}`;
  const rows = [
    ["Attività", businessName],
    ["Tipo richiesta", requestType],
    ["Nome", values.name],
    ["Telefono", values.phone],
    ["Email", values.email],
    ["Data", values.date],
    ["Orario", values.slot],
    ["Persone / partecipanti", values.people],
    ["Note", values.notes],
    ["Pagina", pageUrl]
  ].filter(([, value]) => value);
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlBody = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#172036"><h2 style="color:#1b2a5e">${escapeHtml(subject)}</h2><table cellpadding="6" cellspacing="0">${rows.map(([label,value])=>`<tr><td style="font-weight:bold;color:#526078">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      html: htmlBody,
      text,
      tags: [{ name: "source", value: "khamakey_booking" }]
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend: ${response.status} ${JSON.stringify(result)}`);
  return result;
}

function initials(value) {
  return String(value).split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function attr(value) {
  return escapeHtml(String(value || ""));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

const ADMIN_EMAILS = new Set([
  "kristianperelli@gmail.com",
  "info.khamakey@gmail.com"
]);

async function verifyPlatformAdmin(env, jwt) {
  const user = await supabaseUser(env, jwt);
  if (!user?.email) return null;
  const email = String(user.email).trim().toLowerCase();
  if (ADMIN_EMAILS.has(email)) return user;
  const headers = {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${jwt}`
  };
  const response = await fetch(
    `${env.SUPABASE_URL}/rest/v1/platform_members?email=eq.${encodeURIComponent(email)}&status=eq.active&select=permissions,role`,
    { headers }
  );
  if (!response.ok) return null;
  const rows = await response.json();
  const member = rows?.[0];
  if (!member) return null;
  const perms = new Set(Array.isArray(member.permissions) ? member.permissions : []);
  if (member.role === "owner" || member.role === "admin" || perms.has("admin.full") || perms.has("inventory.write")) {
    return user;
  }
  return null;
}

async function verifyShopifyWebhook(request, secret) {
  if (!secret) return false;
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";
  const body = await request.clone().arrayBuffer();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, body);
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return timingSafeEqual(hmacHeader, computed);
}

function timingSafeEqual(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

function shopifyClientSecret(env) {
  return env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_WEBHOOK_SECRET || "";
}

function shopifyConfigured(env) {
  if (!env.SHOPIFY_SHOP_DOMAIN) return false;
  if (env.SHOPIFY_ACCESS_TOKEN) return true;
  return Boolean(env.SHOPIFY_CLIENT_ID && shopifyClientSecret(env));
}

function shopifyShopDomain(env) {
  return String(env.SHOPIFY_SHOP_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function shopifyAdminUrl(env, path) {
  return `https://${shopifyShopDomain(env)}/admin/api/2024-10${path}`;
}

async function getShopifyAccessToken(env) {
  if (env.SHOPIFY_ACCESS_TOKEN) return env.SHOPIFY_ACCESS_TOKEN;
  const clientId = String(env.SHOPIFY_CLIENT_ID || "").trim();
  const clientSecret = String(shopifyClientSecret(env)).trim();
  if (!clientId || !clientSecret) {
    throw new Error("Shopify non configurato: manca token Admin API o coppia client id/secret.");
  }
  const response = await fetch(`https://${shopifyShopDomain(env)}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    throw new Error(`Shopify OAuth ${response.status}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function shopifyAdminFetch(env, path, options = {}) {
  const accessToken = await getShopifyAccessToken(env);
  const response = await fetch(shopifyAdminUrl(env, path), {
    ...options,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Shopify ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function supabaseRest(env, jwt, path, options = {}) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

function shopifyOrderPayload(order, topic) {
  const customer = order?.customer || {};
  const lineItems = (order?.line_items || []).map(item => ({
    sku: item?.sku || "",
    quantity: Number(item?.quantity || 1),
    price: item?.price || "0",
    title: item?.title || "",
    variant_id: item?.variant_id ? String(item.variant_id) : null,
    product_id: item?.product_id ? String(item.product_id) : null
  }));
  return {
    topic: topic || "orders/create",
    shopify_order_id: String(order?.id || ""),
    order_number: String(order?.order_number || order?.name || ""),
    customer_email: customer?.email || order?.email || "",
    customer_name: [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || order?.shipping_address?.name || "",
    customer_phone: customer?.phone || order?.phone || order?.shipping_address?.phone || "",
    subtotal: order?.subtotal_price || order?.total_line_items_price || "0",
    shipping_total: order?.total_shipping_price_set?.shop_money?.amount || order?.shipping_lines?.[0]?.price || "0",
    total: order?.total_price || "0",
    financial_status: order?.financial_status || "pending",
    line_items: lineItems
  };
}

async function handleShopifyOrderWebhook(request, env) {
  if (!env.WEBHOOK_INGEST_KEY) {
    return json({ error: "WEBHOOK_INGEST_KEY non configurata nel Worker." }, 503);
  }
  const verified = await verifyShopifyWebhook(request, shopifyClientSecret(env));
  if (!verified) return json({ error: "Firma Shopify non valida." }, 401);

  const topic = request.headers.get("X-Shopify-Topic") || "orders/create";
  const order = await request.json();
  const payload = shopifyOrderPayload(order, topic);

  if (!payload.shopify_order_id) return json({ error: "Ordine Shopify non valido." }, 400);
  if (!["orders/create", "orders/paid", "orders/updated"].includes(topic)) {
    return json({ ok: true, skipped: true, topic });
  }

  try {
    const result = await rpc(env, "ingest_shopify_order", {
      p_ingest_key: env.WEBHOOK_INGEST_KEY,
      p_payload: payload
    });
    if (shouldSendMomentOrderEmail(result, payload)) {
      sendMomentOrderEmail(env, payload, result)
        .then(async () => {
          if (result?.order_id) {
            await rpc(env, "mark_order_activation_email_sent", {
              p_ingest_key: env.WEBHOOK_INGEST_KEY,
              p_order_id: result.order_id
            }).catch(err => console.warn("mark email sent", err));
          }
        })
        .catch(err => console.warn("order email", err));
    }
    return json({ ok: true, result });
  } catch (error) {
    console.error("ingest_shopify_order", error);
    return json({ error: error.message || "Errore ingest ordine." }, 500);
  }
}

function resolveShopifyProductStatus(catalog) {
  if (catalog?.shopify_live !== true) return "draft";
  if (catalog?.status !== "active") return "draft";
  const description = String(catalog?.description || "").trim();
  const imageUrl = String(catalog?.image_url || "").trim();
  if (description.length < 20 || !imageUrl) return "draft";
  return "active";
}

async function handleShopifyCatalogSync(request, env) {
  const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
  const admin = await verifyPlatformAdmin(env, jwt);
  if (!admin) return cors(json({ error: "Permesso admin richiesto." }, 403));
  if (!shopifyConfigured(env)) {
    return cors(json({ error: "Shopify non configurato nel Worker. Vedi SHOPIFY-SETUP.md." }, 503));
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return cors(json({ error: "JSON non valido." }, 400));
  }
  const catalogId = String(body.catalog_id || "").trim();
  if (!catalogId) return cors(json({ error: "catalog_id obbligatorio." }, 400));

  try {
    const rows = await supabaseRest(
      env,
      jwt,
      `platform_moment_catalog?id=eq.${encodeURIComponent(catalogId)}&select=*`
    );
    const catalog = rows?.[0];
    if (!catalog) return cors(json({ error: "Prodotto catalogo non trovato." }, 404));

    const listingRows = await supabaseRest(
      env,
      jwt,
      `platform_product_listings?catalog_id=eq.${encodeURIComponent(catalogId)}&channel_key=eq.shopify&select=*`
    );
    let listing = listingRows?.[0] || null;

    const shopifyStatus = resolveShopifyProductStatus(catalog);
    const productPayload = {
      product: {
        title: catalog.name,
        body_html: catalog.description || "",
        vendor: "KhamaKey",
        product_type: "Moments",
        status: shopifyStatus,
        variants: [{
          sku: catalog.sku,
          price: String(Number(catalog.sale_price || 0).toFixed(2)),
          inventory_management: null,
          requires_shipping: true
        }]
      }
    };
    if (catalog.image_url) {
      productPayload.product.images = [{ src: catalog.image_url }];
    }

    let shopifyProduct;
    if (listing?.external_product_id) {
      shopifyProduct = await shopifyAdminFetch(env, `/products/${listing.external_product_id}.json`, {
        method: "PUT",
        body: JSON.stringify(productPayload)
      });
    } else {
      shopifyProduct = await shopifyAdminFetch(env, "/products.json", {
        method: "POST",
        body: JSON.stringify(productPayload)
      });
    }

    const product = shopifyProduct?.product;
    const variant = product?.variants?.[0];
    if (!product?.id || !variant?.id) throw new Error("Risposta Shopify incompleta.");

    const listingPayload = {
      catalog_id: catalogId,
      channel_key: "shopify",
      external_product_id: String(product.id),
      external_variant_id: String(variant.id),
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      last_error: null
    };

    if (listing?.id) {
      await supabaseRest(env, jwt, `platform_product_listings?id=eq.${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify(listingPayload)
      });
    } else {
      await supabaseRest(env, jwt, "platform_product_listings", {
        method: "POST",
        body: JSON.stringify(listingPayload)
      });
    }

    await supabaseRest(env, jwt, `platform_moment_catalog?id=eq.${encodeURIComponent(catalogId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        sync_status: "synced",
        sync_error: null,
        last_synced_at: new Date().toISOString(),
        shopify_handle: product.handle || catalog.shopify_handle,
        publish_shopify: true
      })
    });

    await supabaseRest(env, jwt, "platform_sync_log", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        channel_key: "shopify",
        catalog_id: catalogId,
        action: listing?.external_product_id ? "update_product" : "create_product",
        success: true,
        payload: { shopify_product_id: product.id, shopify_variant_id: variant.id }
      })
    });

    return cors(json({
      ok: true,
      shopify_product_id: product.id,
      shopify_variant_id: variant.id,
      handle: product.handle,
      shopify_status: shopifyStatus
    }));
  } catch (error) {
    console.error("shopify sync", error);
    try {
      await supabaseRest(env, jwt, `platform_moment_catalog?id=eq.${encodeURIComponent(catalogId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          sync_status: "error",
          sync_error: String(error.message || error).slice(0, 500)
        })
      });
      await supabaseRest(env, jwt, "platform_sync_log", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({
          channel_key: "shopify",
          catalog_id: catalogId,
          action: "sync_product",
          success: false,
          error_message: String(error.message || error).slice(0, 500)
        })
      });
    } catch (logError) {
      console.error("sync log failed", logError);
    }
    return cors(json({ error: error.message || "Sync Shopify fallita." }, 500));
  }
}

const SHOPIFY_ORDER_WEBHOOKS = [
  "orders/create",
  "orders/paid",
  "orders/updated"
];

async function handleShopifyRegisterWebhooks(request, env) {
  const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
  const admin = await verifyPlatformAdmin(env, jwt);
  if (!admin) return cors(json({ error: "Permesso admin richiesto." }, 403));
  if (!shopifyConfigured(env)) {
    return cors(json({ error: "Shopify non configurato nel Worker." }, 503));
  }

  const webhookBase = new URL(request.url).origin;
  const address = `${webhookBase}/webhooks/shopify/orders`;

  try {
    const existing = await shopifyAdminFetch(env, "/webhooks.json");
    const current = existing?.webhooks || [];
    const created = [];
    const skipped = [];

    for (const topic of SHOPIFY_ORDER_WEBHOOKS) {
      const found = current.find(row => row.topic === topic && row.address === address);
      if (found) {
        skipped.push({ topic, id: found.id });
        continue;
      }
      const result = await shopifyAdminFetch(env, "/webhooks.json", {
        method: "POST",
        body: JSON.stringify({
          webhook: { topic, address, format: "json" }
        })
      });
      created.push({ topic, id: result?.webhook?.id });
    }

    return cors(json({ ok: true, address, created, skipped }));
  } catch (error) {
    console.error("register webhooks", error);
    return cors(json({
      error: error.message || "Registrazione webhook fallita.",
      manual: "Admin Shopify → Impostazioni → Notifiche → Webhook → Creazione ordine → " + address
    }, 500));
  }
}

const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"];
const TARGET_LOCALES = ["en", "fr", "de", "es"];
const LOCALE_LABELS = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish"
};

function openaiConfigured(env) {
  return Boolean(env.OPENAI_API_KEY);
}

function parseAcceptLanguage(header = "") {
  return String(header || "")
    .split(",")
    .map(part => {
      const [tag, weight = "q=1"] = part.trim().split(";");
      const q = Number(String(weight).replace(/[^\d.]/g, "")) || 1;
      const code = String(tag || "").trim().toLowerCase().slice(0, 2);
      return { code, q };
    })
    .filter(item => SUPPORTED_LOCALES.includes(item.code))
    .sort((a, b) => b.q - a.q)
    .map(item => item.code);
}

function resolveVisitorLocale(request, state = {}) {
  const i18n = state.i18n || {};
  if (!i18n.enabled) return "it";
  const enabled = TARGET_LOCALES.filter(code => i18n.snapshots?.[code]?.html);
  if (!enabled.length) return "it";
  const fallback = enabled.includes(i18n.fallback) ? i18n.fallback : enabled[0];
  const preferred = parseAcceptLanguage(request.headers.get("Accept-Language"));
  for (const code of preferred) {
    if (enabled.includes(code)) return code;
  }
  return fallback || "it";
}

function localizePublicState(state = {}, locale = "it") {
  if (!state?.i18n?.enabled || locale === "it") return state;
  const snapshot = state.i18n?.snapshots?.[locale];
  if (snapshot?.html) return { ...state, publicSnapshot: snapshot };
  const fallback = state.i18n?.fallback || "en";
  const fallbackSnapshot = state.i18n?.snapshots?.[fallback];
  if (fallbackSnapshot?.html) return { ...state, publicSnapshot: fallbackSnapshot };
  return state;
}

function hashText(text) {
  let hash = 0;
  const value = String(text || "");
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function extractTranslatableStrings(state = {}) {
  const map = {};
  const add = (path, value) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length >= 2) map[path] = text;
  };
  const fields = state.fields || {};
  ["nome", "desc", "aboutTitle", "aboutText", "bookingTitle", "bookingDesc", "welcomeTitle", "welcomeIntro"].forEach(key => {
    add(`fields.${key}`, fields[key]);
  });
  const walkCatalog = (prefix, catalogs = []) => {
    catalogs.forEach((cat, ci) => {
      add(`${prefix}.${ci}.nome`, cat?.nome);
      (cat?.voci || cat?.piatti || []).forEach((item, vi) => {
        add(`${prefix}.${ci}.voci.${vi}.nome`, item?.nome || item?.name);
        add(`${prefix}.${ci}.voci.${vi}.desc`, item?.desc || item?.description);
        add(`${prefix}.${ci}.voci.${vi}.ingredienti`, item?.ingredienti || item?.ingredients);
      });
    });
  };
  walkCatalog("cats", state.cats);
  walkCatalog("extraCatalogs", state.extraCatalogs);
  (state.promoItems || []).forEach((item, i) => {
    add(`promoItems.${i}.title`, item?.title);
    add(`promoItems.${i}.desc`, item?.desc);
    add(`promoItems.${i}.label`, item?.label);
    add(`promoItems.${i}.cta`, item?.cta);
    add(`promoItems.${i}.note`, item?.note);
  });
  (state.eventItems || []).forEach((item, i) => {
    add(`eventItems.${i}.title`, item?.title);
    add(`eventItems.${i}.desc`, item?.desc);
    add(`eventItems.${i}.location`, item?.location);
  });
  (state.documentItems || []).forEach((item, i) => {
    add(`documentItems.${i}.title`, item?.title);
    add(`documentItems.${i}.desc`, item?.desc);
  });
  (state.welcomeQuickItems || []).forEach((item, i) => {
    add(`welcomeQuickItems.${i}.title`, item?.title);
    add(`welcomeQuickItems.${i}.text`, item?.text);
  });
  (state.welcomePlaces || []).forEach((item, i) => {
    add(`welcomePlaces.${i}.title`, item?.title);
    add(`welcomePlaces.${i}.desc`, item?.desc);
  });
  (state.welcomeDocs || []).forEach((item, i) => {
    add(`welcomeDocs.${i}.title`, item?.title);
    add(`welcomeDocs.${i}.desc`, item?.desc);
  });
  return map;
}

async function translateStringsWithOpenAI(env, strings, targetLocale) {
  const entries = Object.entries(strings || {});
  if (!entries.length) return {};
  if (!openaiConfigured(env)) {
    throw new Error("Servizio traduzioni non ancora attivo. Riprova tra poco.");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: String(env.OPENAI_MODEL || "gpt-4o-mini"),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Translate Italian business page content to ${LOCALE_LABELS[targetLocale] || targetLocale}. Return ONLY valid JSON where each key is the input key and each value is the translated string. Keep brand names, prices, phone numbers, emails and URLs unchanged. Use natural tourist-friendly language.`
        },
        {
          role: "user",
          content: JSON.stringify(Object.fromEntries(entries))
        }
      ]
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("OpenAI translate error", targetLocale, response.status, detail.slice(0, 300));
    throw new Error("Traduzione temporaneamente non disponibile.");
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("OpenAI JSON parse error", error, content.slice(0, 300));
    throw new Error("Risposta traduzione non valida.");
  }
  const out = {};
  entries.forEach(([path]) => {
    const translated = String(parsed[path] || "").trim();
    if (translated) out[path] = translated;
  });
  return out;
}

async function supabaseUserRest(env, jwt, path, options = {}) {
  const headers = {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
}

async function verifyBusinessOwner(env, jwt, businessId) {
  const cleanId = String(businessId || "").trim();
  if (!cleanId) return false;
  const response = await supabaseUserRest(env, jwt, `businesses?id=eq.${encodeURIComponent(cleanId)}&select=id`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function persistBusinessTranslations(env, jwt, businessId, translationsByLocale = {}, sourceStrings = {}) {
  const rows = [];
  Object.entries(translationsByLocale).forEach(([locale, map]) => {
    Object.entries(map || {}).forEach(([fieldPath, translatedText]) => {
      const sourceText = String(sourceStrings[fieldPath] || "");
      rows.push({
        business_id: businessId,
        locale,
        field_path: fieldPath,
        source_text: sourceText,
        source_hash: hashText(sourceText),
        translated_text: translatedText,
        updated_at: new Date().toISOString()
      });
    });
  });
  if (!rows.length) return;
  await supabaseUserRest(env, jwt, `business_page_i18n?business_id=eq.${encodeURIComponent(businessId)}`, {
    method: "DELETE"
  });
  const insertResponse = await supabaseUserRest(env, jwt, "business_page_i18n", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows)
  });
  if (!insertResponse.ok) {
    const detail = await insertResponse.text().catch(() => "");
    console.warn("business_page_i18n insert skipped", insertResponse.status, detail.slice(0, 200));
  }
  await supabaseUserRest(env, jwt, "business_i18n_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      business_id: businessId,
      enabled: true,
      fallback_locale: "en",
      locales: SUPPORTED_LOCALES,
      updated_at: new Date().toISOString()
    })
  });
}

async function handleBusinessInternationalize(request, env) {
  try {
    const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
    const user = await supabaseUser(env, jwt);
    if (!user?.email) return cors(json({ error: "Sessione non valida." }, 401));

    const body = await request.json();
    const businessId = String(body?.business_id || "").trim();
    if (!businessId) return cors(json({ error: "Attività non valida." }, 400));
    if (!await verifyBusinessOwner(env, jwt, businessId)) {
      return cors(json({ error: "Non puoi modificare questa attività." }, 403));
    }

    const strings = body?.strings && typeof body.strings === "object"
      ? body.strings
      : extractTranslatableStrings(body?.state || {});
    const entries = Object.entries(strings);
    if (!entries.length) {
      return cors(json({ error: "Aggiungi almeno nome o descrizione prima di attivare le lingue." }, 400));
    }

    const translations = {};
    for (const locale of TARGET_LOCALES) {
      translations[locale] = await translateStringsWithOpenAI(env, strings, locale);
    }
    await persistBusinessTranslations(env, jwt, businessId, translations, strings).catch(error => {
      console.warn("persistBusinessTranslations", error);
    });

    return cors(json({
      ok: true,
      locales: TARGET_LOCALES,
      translations,
      stringsCount: entries.length
    }));
  } catch (error) {
    console.error("handleBusinessInternationalize", error);
    return cors(json({ error: error.message || "Traduzione non riuscita." }, 500));
  }
}

async function handleBusinessSyncTranslations(request, env) {
  try {
    const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
    const user = await supabaseUser(env, jwt);
    if (!user?.email) return cors(json({ error: "Sessione non valida." }, 401));

    const body = await request.json();
    const businessId = String(body?.business_id || "").trim();
    const strings = body?.strings || {};
    if (!businessId) return cors(json({ error: "Attività non valida." }, 400));
    if (!Object.keys(strings).length) return cors(json({ ok: true, translations: {} }));
    if (!await verifyBusinessOwner(env, jwt, businessId)) {
      return cors(json({ error: "Non puoi modificare questa attività." }, 403));
    }

    const translations = {};
    for (const locale of TARGET_LOCALES) {
      translations[locale] = await translateStringsWithOpenAI(env, strings, locale);
    }
    const rows = [];
    Object.entries(translations).forEach(([locale, map]) => {
      Object.entries(map || {}).forEach(([fieldPath, translatedText]) => {
        rows.push({
          business_id: businessId,
          locale,
          field_path: fieldPath,
          source_text: String(strings[fieldPath] || ""),
          source_hash: hashText(strings[fieldPath]),
          translated_text: translatedText,
          updated_at: new Date().toISOString()
        });
      });
    });
    if (rows.length) {
      await supabaseUserRest(env, jwt, "business_page_i18n", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows)
      });
    }
    return cors(json({ ok: true, translations }));
  } catch (error) {
    console.error("handleBusinessSyncTranslations", error);
    return cors(json({ error: error.message || "Aggiornamento traduzioni non riuscito." }, 500));
  }
}

function stripeConfigured(env) {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function stripeWebhookConfigured(env) {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

function paypalConfigured(env) {
  return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

function resendConfigured(env) {
  return Boolean(env.RESEND_API_KEY);
}

function buildIntegrationsHealth(env) {
  return {
    ok: true,
    service: "khamakey-nfc",
    version: WORKER_VERSION,
    media: Boolean(env.MEDIA),
    locales: SUPPORTED_LOCALES,
    openai: { configured: openaiConfigured(env), status: openaiConfigured(env) ? "active" : "not_configured" },
    integrations: {
      shopify: { configured: shopifyConfigured(env), status: shopifyConfigured(env) ? "active" : "not_configured" },
      resend: { configured: resendConfigured(env), status: resendConfigured(env) ? "active" : "not_configured" },
      stripe: { configured: stripeConfigured(env), webhook: stripeWebhookConfigured(env), status: stripeConfigured(env) ? "active" : "not_configured" },
      paypal: { configured: paypalConfigured(env), status: paypalConfigured(env) ? "active" : "not_configured" }
    }
  };
}

async function handleIntegrationsStatus(request, env) {
  const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
  const admin = await verifyPlatformAdmin(env, jwt);
  if (!admin) return cors(json({ error: "Permesso admin richiesto." }, 403));
  return cors(json(buildIntegrationsHealth(env)));
}

async function logWebhookEvent(env, provider, eventType, externalId, payload, status = "received") {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.info("[webhook]", provider, eventType, status, externalId);
    return;
  }
  try {
    await supabaseRest(env, serviceKey, "platform_webhook_events", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        provider,
        environment: "live",
        event_type: eventType,
        external_event_id: externalId || null,
        payload: payload || {},
        status,
        received_at: new Date().toISOString(),
        processed_at: status === "processed" ? new Date().toISOString() : null
      })
    });
  } catch (error) {
    console.warn("logWebhookEvent", provider, error);
  }
}

async function handleStripeWebhook(request, env) {
  const signature = request.headers.get("Stripe-Signature") || "";
  const rawBody = await request.text();
  let event = {};
  try {
    event = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return json({ error: "JSON non valido." }, 400);
  }

  if (!stripeWebhookConfigured(env)) {
    await logWebhookEvent(env, "stripe", event?.type || "unknown", event?.id, { note: "stripe webhook not configured" }, "skipped");
    return json({ ok: true, skipped: true, reason: "stripe_webhook_not_configured" });
  }

  const verified = await verifyStripeWebhook(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) return json({ error: "Firma Stripe non valida." }, 401);

  const eventType = event?.type || "unknown";
  await logWebhookEvent(env, "stripe", eventType, event?.id, event, "received");

  if (eventType === "checkout.session.completed") {
    const session = event?.data?.object || {};
    try {
      const result = await rpc(env, "ingest_stripe_checkout_event", {
        p_ingest_key: env.WEBHOOK_INGEST_KEY,
        p_payload: stripeCheckoutPayload(session, eventType)
      });
      return json({ ok: true, received: true, type: eventType, result });
    } catch (error) {
      console.error("ingest_stripe_checkout_event", error);
      return json({ error: error.message || "Errore ingest Stripe." }, 500);
    }
  }

  return json({ ok: true, received: true, type: eventType, handled: false });
}

function stripeCheckoutPayload(session, eventType) {
  return {
    event_type: eventType,
    session_id: String(session?.id || ""),
    payment_status: session?.payment_status || "unpaid",
    customer_email: session?.customer_details?.email || session?.customer_email || "",
    customer_name: session?.customer_details?.name || "",
    amount_total: session?.amount_total ?? 0,
    currency: session?.currency || "eur",
    plan_key: session?.metadata?.plan_key || session?.metadata?.planKey || "",
    billing_cycle: session?.metadata?.billing_cycle || ""
  };
}

async function handleStripeCheckoutSession(request, env) {
  const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return cors(json({ error: "Accesso non autorizzato." }, 401));
  const admin = await verifyPlatformAdmin(env, jwt);
  if (!admin) return cors(json({ error: "Permesso admin richiesto." }, 403));
  if (!stripeConfigured(env)) {
    return cors(json({ error: "Stripe non configurato nel Worker (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET)." }, 503));
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return cors(json({ error: "JSON non valido." }, 400));
  }

  const planKey = String(body.plan_key || "").trim();
  const billingCycle = String(body.billing_cycle || "monthly").trim();
  const customerEmail = String(body.customer_email || admin.email || "").trim();
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://khamakey-app.pages.dev").replace(/\/$/, "");
  const successUrl = String(body.success_url || `${pagesBase}/index.html?stripe=success`).trim();
  const cancelUrl = String(body.cancel_url || `${pagesBase}/index.html?stripe=cancel`).trim();

  if (!planKey) return cors(json({ error: "plan_key obbligatorio." }, 400));

  try {
    const plans = await supabaseRest(
      env,
      jwt,
      `platform_plans?plan_key=eq.${encodeURIComponent(planKey)}&select=plan_key,name,stripe_price_monthly_id,stripe_price_yearly_id,setup_fee,active`
    );
    const plan = plans?.[0];
    if (!plan) return cors(json({ error: "Piano non trovato." }, 404));
    if (!plan.active) return cors(json({ error: "Piano non attivo." }, 400));

    const priceId = billingCycle === "yearly"
      ? plan.stripe_price_yearly_id
      : plan.stripe_price_monthly_id;
    if (!priceId) {
      return cors(json({ error: `Stripe price ID mancante per ciclo ${billingCycle}. Configura in Admin → Piani.` }, 400));
    }

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[plan_key]", planKey);
    params.set("metadata[billing_cycle]", billingCycle);
    params.set("metadata[source]", "khamakey_admin");
    if (customerEmail) params.set("customer_email", customerEmail);

    const session = await stripeApiFetch(env, "/checkout/sessions", {
      method: "POST",
      body: params.toString()
    });

    if (!session?.id || !session?.url) {
      throw new Error("Risposta Stripe incompleta.");
    }

    return cors(json({
      ok: true,
      session_id: session.id,
      checkout_url: session.url,
      plan_key: planKey,
      billing_cycle: billingCycle
    }));
  } catch (error) {
    console.error("stripe checkout", error);
    return cors(json({ error: error.message || "Errore creazione checkout Stripe." }, 500));
  }
}

async function stripeApiFetch(env, path, options = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options.headers || {})
    },
    body: options.body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Stripe ${response.status}: ${result?.error?.message || JSON.stringify(result)}`);
  }
  return result;
}

async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map(item => {
      const idx = item.indexOf("=");
      return idx === -1 ? [item, ""] : [item.slice(0, idx), item.slice(idx + 1)];
    })
  );
  const timestamp = parts.t;
  if (!timestamp) return false;
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || age > 300) return false;

  const signatures = signatureHeader
    .split(",")
    .filter(item => item.startsWith("v1="))
    .map(item => item.slice(3));

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  return signatures.some(sig => timingSafeEqual(sig, expected));
}

function shouldSendMomentOrderEmail(result, payload) {
  if (!result?.ok) return false;
  if (result.activation_email_sent) return false;
  if (result.should_send_email === false) return false;
  const email = String(payload?.customer_email || "").trim();
  if (!email) return false;
  const paid = result.payment_status === "paid"
    || String(payload?.financial_status || "").toLowerCase() === "paid";
  return paid;
}

const ORDER_EMAIL_I18N = {
  it: {
    subject: code => `KhamaKey Moments — ordine ${code} confermato`,
    greeting: name => `Ciao ${name},`,
    thanks: code => `Grazie per il tuo ordine KhamaKey Moments (${code}).`,
    codesIntro: "Ecco i tuoi codici di attivazione NFC:",
    codeLine: (code, url) => `• ${code} → ${url}`,
    noCodes: "Stiamo preparando il tuo codice di attivazione NFC. Ti invieremo un aggiornamento appena pronto.",
    activate: "Attiva la pagina Moments",
    footer: "Il team KhamaKey"
  },
  en: {
    subject: code => `KhamaKey Moments — order ${code} confirmed`,
    greeting: name => `Hi ${name},`,
    thanks: code => `Thank you for your KhamaKey Moments order (${code}).`,
    codesIntro: "Your NFC activation codes:",
    codeLine: (code, url) => `• ${code} → ${url}`,
    noCodes: "We are preparing your NFC activation code and will email you when it is ready.",
    activate: "Activate your Moments page",
    footer: "The KhamaKey team"
  }
};

function orderEmailLocale(payload) {
  const locale = String(payload?.customer_locale || payload?.locale || "it").slice(0, 2).toLowerCase();
  return ORDER_EMAIL_I18N[locale] || ORDER_EMAIL_I18N.it;
}

async function sendMomentOrderEmail(env, orderPayload, ingestResult) {
  if (!resendConfigured(env)) return null;
  const to = String(orderPayload.customer_email || "").trim();
  if (!to) return null;

  const t = orderEmailLocale(orderPayload);
  const orderCode = ingestResult?.order_code || orderPayload.order_number || "";
  const customerName = orderPayload.customer_name || "Cliente";
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://khamakey-app.pages.dev").replace(/\/$/, "");
  const workerBase = String(env.WORKER_PUBLIC_BASE || "https://khamakey-nfc.khamakey-nfc.workers.dev").replace(/\/$/, "");
  const codes = Array.isArray(ingestResult?.activation_codes) ? ingestResult.activation_codes : [];
  const subject = t.subject(orderCode);

  const codeLines = codes.map(item => {
    const code = item?.code || "";
    const activateUrl = `${pagesBase}/moments.html?code=${encodeURIComponent(code)}`;
    return t.codeLine(code, activateUrl);
  });

  const text = [
    t.greeting(customerName),
    "",
    t.thanks(orderCode),
    "",
    codes.length ? t.codesIntro : t.noCodes,
    ...codeLines,
    "",
    `${t.activate}: ${pagesBase}/moments.html`,
    "",
    t.footer
  ].join("\n");

  const codeHtml = codes.length
    ? `<ul>${codes.map(item => {
      const code = escapeHtml(item?.code || "");
      const activateUrl = `${pagesBase}/moments.html?code=${encodeURIComponent(item?.code || "")}`;
      const nfcUrl = `${workerBase}/k/${encodeURIComponent(item?.code || "")}`;
      return `<li><strong>${code}</strong><br><a href="${escapeHtml(activateUrl)}">${escapeHtml(t.activate)}</a> · <a href="${escapeHtml(nfcUrl)}">Link NFC</a></li>`;
    }).join("")}</ul>`
    : `<p>${escapeHtml(t.noCodes)}</p>`;

  const htmlBody = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#172036;max-width:560px">
    <h2 style="color:#1b2a5e;margin:0 0 12px">${escapeHtml(t.thanks(orderCode))}</h2>
    <p>${escapeHtml(t.greeting(customerName))}</p>
    ${codes.length ? `<p>${escapeHtml(t.codesIntro)}</p>${codeHtml}` : `<p>${escapeHtml(t.noCodes)}</p>`}
    <p style="margin-top:20px"><a href="${escapeHtml(`${pagesBase}/moments.html`)}" style="background:#1b2a5e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${escapeHtml(t.activate)}</a></p>
  </div>`;

  return sendResendEmail(env, {
    to,
    subject,
    html: htmlBody,
    text,
    tags: [{ name: "source", value: "khamakey_moment_order" }]
  });
}

async function handlePayPalWebhook(request, env) {
  const rawBody = await request.text();
  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return json({ error: "JSON non valido." }, 400);
  }

  const eventType = payload?.event_type || payload?.event_type || "unknown";
  const externalId = payload?.id || payload?.resource?.id || null;

  if (!paypalConfigured(env)) {
    await logWebhookEvent(env, "paypal", eventType, externalId, { note: "paypal not configured" }, "skipped");
    return json({ ok: true, skipped: true, reason: "paypal_not_configured" });
  }

  await logWebhookEvent(env, "paypal", eventType, externalId, payload, "received");
  return json({ ok: true, received: true, type: eventType });
}

async function handleResendWebhook(request, env) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return json({ error: "JSON non valido." }, 400);
  }
  const eventType = payload?.type || "email.event";
  const externalId = payload?.data?.email_id || payload?.created_at || null;
  await logWebhookEvent(env, "resend", eventType, externalId ? String(externalId) : null, payload, "processed");
  return json({ ok: true, received: true });
}

async function sendResendEmail(env, { to, subject, html, text, tags = [] }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID()
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "KhamaKey <noreply@khamakey.com>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      tags
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend: ${response.status} ${JSON.stringify(result)}`);
  return result;
}
