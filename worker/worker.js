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
const WORKER_VERSION = "v147-dense-bg";

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
      if (url.pathname === "/api/moment/rsvp" && request.method === "POST") {
        return handleMomentRsvp(request, env);
      }
      if (url.pathname === "/api/moment/guestbook" && request.method === "GET") {
        return handleMomentGuestbookList(request, env, url);
      }
      if (url.pathname === "/api/moment/guestbook" && request.method === "POST") {
        return handleMomentGuestbookSubmit(request, env);
      }
      if (url.pathname === "/api/moment/support-notify" && request.method === "POST") {
        return handleMomentSupportNotify(request, env);
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
      if (url.pathname === "/api/cron/moment-anniversaries" && request.method === "POST") {
        return handleMomentAnniversariesCron(request, env);
      }
      return html(notFound("Pagina non trovata"), 404);
    } catch (error) {
      console.error(error);
      if (url.pathname.startsWith("/api/")) {
        return cors(json({ error: "Errore temporaneo del server." }, 500));
      }
      return html(notFound("Errore temporaneo"), 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([
      runMomentAnniversaryJob(env).catch(error => console.error("moment anniversaries cron", error)),
      runMomentLetterUnlockJob(env).catch(error => console.error("moment letter unlock cron", error)),
      runRateLimitCleanupJob(env).catch(error => console.error("rate limit cleanup cron", error))
    ]));
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
    "Cache-Control": "public, max-age=10, s-maxage=15"
  });
}

async function handleMomentPage(request, env, ctx, slug) {
  const url = new URL(request.url);
  const pin = String(url.searchParams.get("pin") || "");
  const momentVisitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  const rows = await rpc(env, "get_public_moment", {
    p_slug: slug,
    p_pin_hash: pin ? await momentPinHash(slug, pin) : null,
    p_visitor_key: momentVisitor
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
  const eventVisitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  if (!await checkRateLimit(env, `event:${businessId}:${eventVisitor}`, 120, 15)) {
    return tooManyRequests();
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

  const bookingVisitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  if (!await checkRateLimit(env, `booking:${businessId}:${bookingVisitor}`, 5, 15)) {
    return tooManyRequests();
  }

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

async function handleMomentRsvp(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return cors(json({ error: "Richiesta non valida" }, 400));

  const slug = String(body.slug || "").trim();
  const pin = String(body.pin || "").trim();
  const values = sanitizeRsvpValues(body.values || {});
  if (!slug || !values.name || !values.attending) {
    return cors(json({ error: "Nome e presenza sono obbligatori" }, 400));
  }

  const pinHash = pin ? await momentPinHash(slug, pin) : null;
  const rsvpVisitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  const rows = await rpc(env, "get_public_moment", { p_slug: slug, p_pin_hash: pinHash, p_visitor_key: rsvpVisitor });
  const page = rows?.[0];
  if (!page || !page.pin_valid) {
    return cors(json({ error: "Pagina non valida" }, 404));
  }

  const ingestKey = env.WEBHOOK_INGEST_KEY || env.ANALYTICS_INGEST_KEY;
  if (!ingestKey) return cors(json({ error: "Servizio RSVP non configurato" }, 503));

  if (!await checkRateLimit(env, `rsvp:${slug}:${rsvpVisitor}`, 5, 15)) {
    return tooManyRequests();
  }

  try {
    const result = await rpc(env, "submit_moment_rsvp", {
      p_slug: slug,
      p_values: values,
      p_ingest_key: ingestKey,
      p_user_agent: request.headers.get("user-agent") || ""
    });
    return cors(json({ ok: true, id: result?.id || null }));
  } catch (error) {
    console.error("submit_moment_rsvp", error);
    return cors(json({ error: "Salvataggio RSVP non riuscito" }, 500));
  }
}

async function handleMomentGuestbookList(request, env, url) {
  const slug = String(url.searchParams.get("slug") || "").trim();
  const pin = String(url.searchParams.get("pin") || "").trim();
  if (!slug) return cors(json({ error: "Slug obbligatorio" }, 400));

  const pinHash = pin ? await momentPinHash(slug, pin) : null;
  const guestbookVisitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  const rows = await rpc(env, "get_public_moment", { p_slug: slug, p_pin_hash: pinHash, p_visitor_key: guestbookVisitor });
  const page = rows?.[0];
  if (!page || !page.pin_valid) return cors(json({ error: "Pagina non valida" }, 404));

  try {
    const messages = await rpc(env, "list_public_moment_guestbook", { p_slug: slug });
    return cors(json({ ok: true, messages: Array.isArray(messages) ? messages : [] }));
  } catch (error) {
    console.error("list_public_moment_guestbook", error);
    return cors(json({ error: "Caricamento messaggi non riuscito" }, 500));
  }
}

async function handleMomentGuestbookSubmit(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return cors(json({ error: "Richiesta non valida" }, 400));

  const slug = String(body.slug || "").trim();
  const pin = String(body.pin || "").trim();
  const values = sanitizeGuestbookValues(body.values || {});
  if (!slug || !values.name || !values.message) {
    return cors(json({ error: "Nome e messaggio sono obbligatori" }, 400));
  }

  const pinHash = pin ? await momentPinHash(slug, pin) : null;
  const guestbookVisitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  const rows = await rpc(env, "get_public_moment", { p_slug: slug, p_pin_hash: pinHash, p_visitor_key: guestbookVisitor });
  const page = rows?.[0];
  if (!page || !page.pin_valid) return cors(json({ error: "Pagina non valida" }, 404));

  const ingestKey = env.WEBHOOK_INGEST_KEY || env.ANALYTICS_INGEST_KEY;
  if (!ingestKey) return cors(json({ error: "Servizio non configurato" }, 503));

  if (!await checkRateLimit(env, `guestbook:${slug}:${guestbookVisitor}`, 5, 15)) {
    return tooManyRequests();
  }

  try {
    const result = await rpc(env, "submit_moment_guestbook", {
      p_slug: slug,
      p_values: values,
      p_ingest_key: ingestKey,
      p_user_agent: request.headers.get("user-agent") || ""
    });
    return cors(json({ ok: true, id: result?.id || null, status: result?.status || "pending" }));
  } catch (error) {
    console.error("submit_moment_guestbook", error);
    return cors(json({ error: guestbookErrorMessage(error) }, 500));
  }
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
  const text = await response.text();
  if (!response.ok) {
    let message = `Supabase RPC ${name}: ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      message = String(parsed.message || parsed.error || parsed.details || message);
    } catch {
      if (text) message = text.slice(0, 240);
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

function guestbookErrorMessage(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("non attivo")) return "Il libro degli ospiti non è attivo. Attivalo nell'editor e salva la pagina.";
  if (msg.includes("non pubblicata")) return "Pagina non pubblicata. Pubblica la pagina prima di raccogliere messaggi.";
  if (msg.includes("ingest") || msg.includes("chiave ingest")) return "Servizio temporaneamente non disponibile. Riprova più tardi.";
  if (msg.includes("obbligatori")) return "Nome e messaggio sono obbligatori.";
  return "Invio messaggio non riuscito. Riprova tra poco.";
}

/** Avvisa lo staff per email quando un cliente Moments apre un ticket assistenza. */
async function handleMomentSupportNotify(request, env) {
  const jwt = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return cors(json({ error: "Accesso richiesto" }, 401));
  const user = await supabaseUser(env, jwt);
  if (!user?.email) return cors(json({ error: "Sessione non valida" }, 401));

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return cors(json({ error: "Richiesta non valida" }, 400));

  const subject = String(body.subject || "").trim().slice(0, 180);
  const description = String(body.description || "").trim().slice(0, 4000);
  const priority = String(body.priority || "normal").trim().slice(0, 40);
  if (!subject || !description) return cors(json({ error: "Oggetto e dettagli obbligatori" }, 400));

  const visitor = await visitorId(request, env.VISITOR_SALT || "khamakey");
  if (!await checkRateLimit(env, `support-notify:${user.id || visitor}`, 8, 60)) {
    return tooManyRequests();
  }

  if (!env.RESEND_API_KEY) {
    return cors(json({ ok: false, skipped: true, reason: "email_not_configured" }));
  }

  const extra = String(env.SUPPORT_NOTIFY_EMAIL || "").trim().toLowerCase();
  const recipients = [...ADMIN_EMAILS];
  if (extra && !recipients.includes(extra)) recipients.push(extra);
  if (!recipients.length) return cors(json({ ok: false, skipped: true, reason: "no_recipients" }));

  const adminBase = String(env.PAGES_ASSET_BASE || "https://app.khamakeymoments.com").replace(/\/$/, "");
  const consoleUrl = `${adminBase}/moments-admin.html#support`;
  const safeSubject = subject.replace(/[\r\n]+/g, " ");
  const text = [
    "Nuovo ticket assistenza Moments",
    "",
    `Cliente: ${user.email}`,
    `Priorità: ${priority}`,
    `Oggetto: ${safeSubject}`,
    "",
    description,
    "",
    `Apri consolle: ${consoleUrl}`
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#172036">
    <h2 style="margin:0 0 12px">Nuovo ticket Moments</h2>
    <p><strong>Cliente:</strong> ${escapeHtml(user.email)}<br>
    <strong>Priorità:</strong> ${escapeHtml(priority)}<br>
    <strong>Oggetto:</strong> ${escapeHtml(safeSubject)}</p>
    <pre style="white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;font:inherit">${escapeHtml(description)}</pre>
    <p><a href="${escapeHtml(consoleUrl)}">Apri Supporto in Officina NFC</a></p>
  </div>`;

  try {
    await sendResendEmail(env, {
      to: recipients,
      subject: `[Moments ${priority}] ${safeSubject}`,
      html,
      text,
      tags: [{ name: "type", value: "moments_support_ticket" }]
    });
    return cors(json({ ok: true }));
  } catch (error) {
    console.error("support-notify", error);
    return cors(json({ error: "Invio avviso non riuscito" }, 500));
  }
}

// Rate limiting su Postgres (check_rate_limit, sql/khamakey-rate-limit-v76.sql): niente infra nuova.
// Fail-open: se il limiter stesso non risponde, non blocchiamo il servizio per questo.
async function checkRateLimit(env, key, maxAttempts, windowMinutes, lockMinutes) {
  try {
    const allowed = await rpc(env, "check_rate_limit", {
      p_key: key,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
      p_lock_minutes: lockMinutes ?? null
    });
    return allowed !== false;
  } catch (error) {
    console.error("check_rate_limit", error);
    return true;
  }
}

function tooManyRequests() {
  return cors(json({ error: "Troppe richieste. Riprova tra qualche minuto." }, 429));
}

const MEDIA_LIMITS = {
  image: 8 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  audio: 12 * 1024 * 1024
};

const MEDIA_MIME = {
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime", "video/3gpp", "video/x-m4v"]),
  audio: new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/x-caf"])
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
  if (/\.3gp$/.test(file)) return "video/3gpp";
  if (/\.wav$/.test(file)) return "audio/wav";
  if (/\.ogg$/.test(file)) return "audio/ogg";
  if (/\.caf$/.test(file)) return "audio/x-caf";
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
    const accessResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/moment_events?id=eq.${encodeURIComponent(cleanId)}&select=id,owner_email`,
      { headers }
    );
    if (!accessResponse.ok) return false;
    const accessRows = await accessResponse.json();
    if (!Array.isArray(accessRows) || !accessRows.length) return false;
    const ownerEmail = String(accessRows[0].owner_email || "").trim().toLowerCase();
    if (ownerEmail && ownerEmail === email) return true;
    if (await verifyPlatformAdmin(env, jwt)) return true;
    return false;
  }
  if (cleanScope === "business") {
    // SICUREZZA: non rimuovere il filtro profile_id. La RLS "Pagine pubbliche B2B visibili a
    // tutti" rende visibile (select=id) qualunque attività pubblicata a chiunque sia
    // autenticato — "la riga esiste" non basta a verificare che sia la TUA attività (IDOR
    // confermato e corretto il 2026-07-11, vedi PROJECT_STATE.md).
    if (!user.id) return false;
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/businesses?id=eq.${encodeURIComponent(cleanId)}&profile_id=eq.${encodeURIComponent(user.id)}&select=id`,
      { headers }
    );
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0) return true;
    }
    return Boolean(await verifyPlatformAdmin(env, jwt));
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
    if (!await checkRateLimit(env, `media-upload:${user.email}`, 60, 60)) {
      return tooManyRequests();
    }

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
  const ip = request.headers.get("cf-connecting-ip") || "anon";
  if (!await checkRateLimit(env, `moment-preview:${ip}`, 45, 1)) {
    return tooManyRequests();
  }
  const raw = await request.text();
  if (raw.length > 900_000) {
    return cors(json({ error: "Anteprima troppo grande." }, 413));
  }
  const body = (() => {
    try { return JSON.parse(raw || "{}"); }
    catch { return {}; }
  })();
  const pageState = body.page_state && typeof body.page_state === "object" ? body.page_state : body;
  const page = {
    slug: String(body.slug || pageState.slug || "").trim(),
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
.actions{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px;border-bottom:1px solid #e5eaf1}.action{min-height:74px;border:1px solid #e5eaf1;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:9px 6px;font-size:12px;font-weight:800;color:#1b2a5e;background:#fff;text-align:center}.action svg{width:22px;height:22px;flex-shrink:0}
.buttons-solid .action{border-radius:10px;background:var(--accent);color:#fff;border-color:transparent}.buttons-solid .action svg{filter:brightness(0) invert(1)}.buttons-outline .action{border-radius:12px;box-shadow:none}
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
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://app.khamakeymoments.com").replace(/\/$/, "");
  const showCookieBanner = fields.tCookie !== false;
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
const showCookieBanner=${JSON.stringify(showCookieBanner)};
const consentKey="kk_analytics_"+businessId;
function analyticsAllowed(){
  if(!showCookieBanner) return true;
  try{return localStorage.getItem(consentKey)==="1";}catch(e){return false;}
}
function trackEvent(type){
  if(!type||!analyticsAllowed()) return;
  fetch(eventUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_id:businessId,event_type:type,source:"public_page"})}).catch(()=>{});
}
const eventForElement=el=>el.closest(".brand-action-whatsapp")?"click_whatsapp":el.closest(".brand-action-call")?"click_phone":el.closest(".brand-action-maps")?"click_maps":el.closest(".brand-action-google")?"click_reviews":el.closest("[data-booking-submit]")?"click_booking":el.closest("[data-add-cart]")?"add_to_cart":el.closest("[data-product-detail]")?"click_catalog":el.closest("[data-send-order]")?"order_sent":"";
document.addEventListener("click",event=>{
  const jump=event.target.closest("[data-jump]");
  if(jump){document.getElementById(jump.dataset.jump)?.scrollIntoView({behavior:"smooth"});return}
  if(event.target.closest("[data-cookie-accept]")){
    try{localStorage.setItem(consentKey,"1");}catch(e){}
    event.target.closest("[data-cookie-box]")?.remove();
    return;
  }
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
  if(type) trackEvent(type);
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
  const paletteKey = state.colorPalette || (state.theme === "celebration" ? "corallo" : state.theme === "minimal" ? "neve" : state.theme === "memorial" ? "perla" : "classic");
  const fonts = resolveMomentFontPair(state.fontPair);
  const heroStyle = ["classico", "profilo", "romantico", "intimo", "fullscreen"].includes(state.heroStyle) ? state.heroStyle : "classico";
  const sections = resolveMomentSections(state);
  const defaultOrder = ["intro","dedication","timeline","rsvp","guestbook","gallery","video","promises","dreams","countdown","music","letter_future","rituals","pet","numbers","quote","signature"];
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
    ? ordered.map(({ key, section }) => `<div class="moment-section-anchor" id="moment-section-${escapeHtml(key)}">${renderMomentSection(key, section, colors, momentType, fonts, page.slug || "")}</div>`).join("")
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

  let heroCut = state.heroCut;
  if (!heroCut) {
    const typeKey = String(state.momentType || momentType).trim().toLowerCase();
    if (typeKey === "travel" || typeKey === "love" || typeKey === "anniversary" || typeKey === "wedding") {
      heroCut = "divider";
    } else {
      heroCut = "dritto";
    }
  }

  let dividerHtml = "";
  if (heroCut === "divider") {
    const typeKey = String(state.momentType || momentType).trim().toLowerCase();
    if (typeKey === "travel") {
      dividerHtml = `
        <div class="moment-hero-divider" aria-hidden="true">
          <span class="moment-divider-line"></span>
          <span class="moment-divider-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></span>
          <span class="moment-divider-line"></span>
        </div>`;
    } else if (typeKey === "love" || typeKey === "anniversary" || typeKey === "wedding") {
      dividerHtml = `
        <div class="moment-hero-divider" aria-hidden="true">
          <span class="moment-divider-line"></span>
          <span class="moment-divider-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
          <span class="moment-divider-line"></span>
        </div>`;
    } else {
      dividerHtml = `
        <div class="moment-hero-divider" aria-hidden="true">
          <span class="moment-divider-line"></span>
          <span class="moment-divider-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
          <span class="moment-divider-line"></span>
        </div>`;
    }
  }

  const extraTypeClass = momentType === "valentine" ? " moment-type-love" : "";

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
<main class="moment-page hero-${attr(heroStyle)}${navClass} moment-type-${attr(momentType)}${extraTypeClass} moment-palette-${attr(paletteKey)} moment-cut-${attr(heroCut)}">
${decorHtml}
<section class="moment-hero" id="moment-hero">${heroCover}<div class="moment-hero-overlay"></div><div class="moment-hero-content hero-in">
${pill ? `<span class="moment-pill">${escapeHtml(pill)}</span>` : `<small>KhamaKey Moments</small>`}
${profileBlock}
<h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}
</div></section>
${dividerHtml}
<section class="moment-content">${counterHtml}${sectionHtml}</section>
<footer class="moment-footer">Creato con cura · KhamaKey Moments</footer>
</main>
<div class="moment-lightbox" id="momentLightbox" aria-hidden="true">
<button type="button" class="moment-lightbox-nav moment-lightbox-prev" id="momentLightboxPrev" aria-label="Precedente">‹</button>
<button type="button" class="moment-lightbox-nav moment-lightbox-next" id="momentLightboxNext" aria-label="Successivo">›</button>
<button type="button" class="moment-lightbox-close" id="momentLightboxClose" aria-label="Chiudi">×</button>
<div class="moment-lightbox-card"><div id="momentLightboxMedia"></div><p class="moment-lightbox-counter" id="momentLightboxCounter"></p><h3 class="moment-lightbox-title" id="momentLightboxTitle"></h3><p class="moment-lightbox-desc" id="momentLightboxDesc"></p></div></div>
<script>${momentPageScript(state, ordered, hasCounter, page.slug || "")}</script>
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
  guestbook:"Ospiti",
  gallery:"Foto",
  video:"Video",
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

function renderMomentDecor(_state){
  // Feature adesivi rimossa: nessuna decorazione emoji sulla pagina pubblica
  return "";
}

function resolveMomentPalette(state) {
  const palettes = {
    rosso:{bl:"#DC2626",g2:"#991B1B",hero:"#B91C1C",go:"#B91C1C",ro:"#F87171",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#FEE2E2"},
    rosa:{bl:"#DB2777",g2:"#9D174D",hero:"#BE185D",go:"#BE185D",ro:"#F472B6",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#FCE7F3"},
    bordeaux:{bl:"#7F1D1D",g2:"#450A0A",hero:"#991B1B",go:"#9F1239",ro:"#FB7185",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFF1F2",mu:"#FECDD3"},
    arancio:{bl:"#EA580C",g2:"#9A3412",hero:"#C2410C",go:"#C2410C",ro:"#FB923C",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#FFEDD5"},
    ambra:{bl:"#B45309",g2:"#78350F",hero:"#92400E",go:"#92400E",ro:"#FBBF24",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFBEB",mu:"#FEF3C7"},
    verde:{bl:"#15803D",g2:"#14532D",hero:"#166534",go:"#166534",ro:"#4ADE80",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#DCFCE7"},
    blu:{bl:"#1D4ED8",g2:"#1E3A8A",hero:"#1E40AF",go:"#1E40AF",ro:"#60A5FA",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#DBEAFE"},
    azzurro:{bl:"#0369A1",g2:"#0C4A6E",hero:"#0284C7",go:"#0C4A6E",ro:"#38BDF8",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#E0F2FE"},
    viola:{bl:"#7C3AED",g2:"#4C1D95",hero:"#6D28D9",go:"#5B21B6",ro:"#A78BFA",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FFFFFF",mu:"#EDE9FE"},
    nero:{bl:"#0A0A0A",g2:"#000000",hero:"#171717",go:"#334155",ro:"#94A3B8",bl2:"#FFFFFF",card:"#FFFFFF",in:"#FAFAFA",mu:"#CBD5E1"},
    antracite:{bl:"#1E293B",g2:"#020617",hero:"#0F172A",go:"#334155",ro:"#94A3B8",bl2:"#FFFFFF",card:"#FFFFFF",in:"#F8FAFC",mu:"#CBD5E1"},
    crema:{bl:"#FFF7ED",g2:"#FFEDD5",hero:"#FED7AA",go:"#C2410C",ro:"#FB923C",bl2:"#FFFFFF",card:"#FFFFFF",in:"#111111",mu:"#9A3412"}
  };
  const aliases = {
    amore:"rosso",rubino:"rosso",terracotta:"arancio",corallo:"arancio",
    cipria:"ambra",miele:"ambra",classic:"verde",salvia:"verde",
    uomo:"blu",neve:"azzurro",aurora:"viola",lavanda:"viola",
    notte:"nero",gentleman:"antracite",perla:"antracite"
  };
  const variants = {
    caldo:{
      rosso:{bl:"#EF4444",hero:"#DC2626",go:"#B91C1C"},
      rosa:{bl:"#EC4899",hero:"#DB2777",go:"#BE185D"},
      arancio:{bl:"#F97316",hero:"#EA580C",go:"#C2410C"},
      ambra:{bl:"#D97706",hero:"#B45309",go:"#92400E",in:"#FFFBEB"},
      verde:{bl:"#16A34A",hero:"#15803D",go:"#166534"},
      crema:{bl:"#FFEDD5",hero:"#FDBA74",go:"#C2410C",in:"#111111"}
    },
    scuro:{
      nero:{bl:"#000000",hero:"#0A0A0A",go:"#64748B"},
      antracite:{bl:"#020617",hero:"#0F172A",go:"#0284C7"},
      bordeaux:{bl:"#450A0A",hero:"#7F1D1D",go:"#BE123C"},
      rosso:{bl:"#991B1B",hero:"#7F1D1D",go:"#DC2626"}
    }
  };
  const legacy = { celebration:"arancio", minimal:"crema", memorial:"antracite" };
  const rawKey = state.colorPalette || legacy[state.theme] || "verde";
  const paletteKey = aliases[rawKey] || (palettes[rawKey] ? rawKey : "verde");
  const base = { ...(palettes[paletteKey] || palettes.verde) };
  const variant = state.themeVariant === "scuro" || state.themeVariant === "caldo" ? state.themeVariant : "chiaro";
  const overrides = variants[variant]?.[paletteKey];
  if(overrides) Object.assign(base, overrides);
  const lum = (hex)=>{
    const raw = String(hex||"").replace("#","");
    if(raw.length !== 6) return 255;
    const n = Number.parseInt(raw,16);
    if(Number.isNaN(n)) return 255;
    return (((n>>16)&255)*299 + ((n>>8)&255)*587 + (n&255)*114) / 1000;
  };
  const darkPage = lum(base.bl) < 160 || variant === "scuro";
  base.card = "#FFFFFF";
  base.bl2 = "#FFFFFF";
  base.cardInk = "#111111";
  base.cardSoft = "#FFFFFF";
  base.surface = base.bl;
  if(darkPage){
    base.ink = (base.in && lum(base.in) >= 160) ? base.in : "#F8FAFC";
    base.muted = base.mu || "#E2E8F0";
    base.line = "rgba(255,255,255,.14)";
    base.lineStrong = "rgba(255,255,255,.22)";
  }else{
    base.ink = "#111111";
    base.muted = base.mu || "#475569";
    base.line = "rgba(15,23,42,.08)";
    base.lineStrong = "rgba(15,23,42,.12)";
  }
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
    guestbook:{enabled:false,title:"",body:"",images:[]},
    gallery:{enabled:false,title:"",body:"",images:[]},
    video:{enabled:false,title:"",body:"",video_url:"",video_title:"",video_description:"",images:[]},
    promises:{enabled:false,title:"",body:"",images:[]},
    places:{enabled:false,title:"",body:"",images:[]},
    dreams:{enabled:false,title:"",body:"",images:[]},
    countdown:{enabled:false,title:"",body:"",event_label:"",target_date:"",image_url:"",images:[]},
    music:{enabled:false,title:"",body:"",spotify_url:"",youtube_url:"",audio_url:"",audio_title:"",audio_description:"",images:[]},
    letter_future:{enabled:false,title:"",body:"",recipient:"",unlock_date:"",media:[],media_type:"",media_url:"",media_title:"",images:[]},
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
    const allMedia = normalizeMomentMedia(base.gallery);
    const galleryVideos = allMedia.filter(item => item.type === "video");
    const galleryImages = allMedia.filter(item => item.type === "image");
    base.gallery.media = galleryImages;
    base.gallery.images = galleryImages.map(item => item.url);
    if (!base.video) base.video = { enabled: false, title: "", body: "", video_url: "", video_title: "", video_description: "", images: [] };
    if (galleryVideos.length && !String(base.video.video_url || "").trim()) {
      const first = galleryVideos[0];
      base.video.video_url = first.url;
      base.video.video_title = first.title || base.video.video_title || "";
      base.video.video_description = first.description || base.video.video_description || "";
    }
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
      return normalizeMomentMedia(section).some(item => item.type === "image");
    case "video":
      return Boolean(String(section.video_url || "").trim());
    case "rsvp":
      // RSVP pubblico solo con WhatsApp organizzatore (obbligatorio).
      return Boolean(normalizeWhatsAppDigits(section.whatsapp_number));
    case "guestbook":
      return true;
    case "promises":
    case "dreams":
    case "rituals":
    case "numbers":
      return resolveListItems(section, key === "promises" ? "promise" : key === "dreams" ? "dream" : key === "rituals" ? "ritual" : "number").length > 0 || Boolean(String(section.body || "").trim());
    case "countdown":
      return Boolean(section.target_date);
    case "music":
      return Boolean(section.spotify_url || section.youtube_url || section.audio_url || section.image_url);
    case "letter_future":
      return Boolean(section.body || section.unlock_date || letterMediaItems(section).length);
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

function resolveListItems(section, mode) {
  if (Array.isArray(section?.items) && section.items.length) {
    return section.items.map(item => {
      if (mode === "promise") return { emoji: String(item.emoji || "✦"), text: String(item.text || "").trim() };
      if (mode === "dream") return { done: Boolean(item.done), text: String(item.text || "").trim() };
      if (mode === "ritual") return { emoji: String(item.emoji || "🕯"), text: String(item.text || "").trim() };
      if (mode === "number") return { value: String(item.value || "").trim(), label: String(item.label || "").trim() };
      return { text: String(item.text || "").trim() };
    }).filter(item => Object.values(item).some(Boolean));
  }
  return parseMomentLines(section?.body || "", mode);
}

function listIntroHtml(body) {
  const intro = String(body || "").trim();
  return intro ? `<p class="moment-list-intro">${escapeHtml(intro)}</p>` : "";
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

function letterMediaItems(section) {
  if (Array.isArray(section.media) && section.media.length) {
    return section.media
      .map(item => ({
        type: ["image", "video", "audio"].includes(item?.type) ? item.type : "image",
        url: String(item?.url || "").trim(),
        title: String(item?.title || "").trim()
      }))
      .filter(item => item.url && safeUrl(item.url) !== "#")
      .slice(0, 4);
  }
  const type = String(section.media_type || "").trim();
  const url = String(section.media_url || "").trim();
  const title = String(section.media_title || "").trim();
  if (url && safeUrl(url) !== "#" && ["image", "video", "audio"].includes(type)) {
    return [{ type, url, title }];
  }
  return [];
}

function renderLetterFutureMedia(section) {
  const items = letterMediaItems(section);
  if (!items.length) return "";
  return items.map(item => {
    const title = item.title ? `<p class="moment-letter-media-title">${escapeHtml(item.title)}</p>` : "";
    if (item.type === "video") {
      return `<div class="moment-letter-media">${title}<video src="${attr(item.url)}" controls playsinline></video></div>`;
    }
    if (item.type === "audio") {
      return `<div class="moment-letter-media moment-audio">${title ? `<p class="moment-audio-title">${escapeHtml(item.title)}</p>` : ""}<audio src="${attr(item.url)}" controls></audio></div>`;
    }
    return `<div class="moment-letter-media">${title}<img src="${attr(item.url)}" alt="${attr(item.title || "Allegato")}" loading="lazy"></div>`;
  }).join("");
}

function renderTogetherCounter(state, colors) {
  if(!state.show_together_counter || !state.together_since) return "";
  const date = String(state.together_since).slice(0, 10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const live = Boolean(state.show_counter_hms);
  const label = String(state.counter_label || "").trim() || "Insieme da";
  const grid = live
    ? `<span class="moment-counter-unit"><b data-unit="days">0</b><small>giorni</small></span>
<span class="moment-counter-unit"><b data-unit="hours">0</b><small>ore</small></span>
<span class="moment-counter-unit"><b data-unit="minutes">0</b><small>minuti</small></span>
<span class="moment-counter-unit"><b data-unit="seconds">0</b><small>secondi</small></span>`
    : `<span class="moment-counter-unit"><b data-unit="years">0</b><small>anni</small></span>
<span class="moment-counter-unit"><b data-unit="months">0</b><small>mesi</small></span>
<span class="moment-counter-unit"><b data-unit="days">0</b><small>giorni</small></span>`;
  return `<section class="moment-counter rv" id="moment-section-counter" data-since="${attr(date)}" data-hms="${live ? "1" : "0"}">
<div class="moment-counter-label">${escapeHtml(label)}</div>
<div class="moment-counter-grid">${grid}</div></section>`;
}

function momentPageScript(state, ordered = [], hasCounter = false, slug = "") {
  const momentSlug = String(slug || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
var momentPageSlug="${momentSlug}";
var momentPin=(new URLSearchParams(location.search).get("pin")||"").trim();
if(momentPin&&history.replaceState){
  try{history.replaceState(null,"",location.pathname+location.hash);}catch(e){}
}
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
    var card=form.closest(".moment-rsvp")||form.closest("[data-rsvp-wa]");
    if(!card)return;
    var wa=(card.getAttribute("data-rsvp-wa")||"").replace(/\\D/g,"");
    var status=card.querySelector("[data-rsvp-status]");
    var submitBtn=form.querySelector(".moment-rsvp-submit");
    var fd=new FormData(form);
    var eventName=card.getAttribute("data-rsvp-event")||document.title.replace(/ · KhamaKey Moments$/,"");
    var intro=card.getAttribute("data-rsvp-intro")||("RSVP · "+eventName);
    var lines=[intro,"","👤 Nome: "+(fd.get("rsvp_name")||""),"✓ Presenza: "+(fd.get("rsvp_attending")||"")];
    if(fd.get("rsvp_guests"))lines.push("👥 Ospiti: "+fd.get("rsvp_guests"));
    if(fd.get("rsvp_notes"))lines.push("📝 Note: "+fd.get("rsvp_notes"));
    if(fd.get("rsvp_phone"))lines.push("📞 Tel.: "+fd.get("rsvp_phone"));
    if(fd.get("rsvp_email"))lines.push("✉️ Email: "+fd.get("rsvp_email"));
    var customPayload={};
    try{
      var custom=JSON.parse(card.getAttribute("data-rsvp-custom")||"[]");
      custom.forEach(function(field){
        var val=fd.get("rsvp_custom_"+field.id);
        if(val){lines.push(field.label+": "+val);customPayload[field.id]=val;}
      });
    }catch(err){}
    var pin=momentPin;
    var payload={
      slug:"${momentSlug}",
      pin:pin,
      values:{
        name:String(fd.get("rsvp_name")||"").trim(),
        attending:String(fd.get("rsvp_attending")||"").trim(),
        guests:fd.get("rsvp_guests")?String(fd.get("rsvp_guests")).trim():"",
        notes:fd.get("rsvp_notes")?String(fd.get("rsvp_notes")).trim():"",
        phone:fd.get("rsvp_phone")?String(fd.get("rsvp_phone")).trim():"",
        email:fd.get("rsvp_email")?String(fd.get("rsvp_email")).trim():"",
        custom:customPayload,
        source:"public_page"
      }
    };
    if(!payload.values.name||!payload.values.attending){
      if(status){status.hidden=false;status.textContent="Compila nome e presenza.";status.className="moment-rsvp-status error";}
      return;
    }
    if(submitBtn){submitBtn.disabled=true;submitBtn.textContent="Invio…";}
    if(status){status.hidden=false;status.textContent="Invio in corso…";status.className="moment-rsvp-status";}
    fetch("/api/moment/rsvp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
      .then(function(res){return res.json().then(function(data){return {ok:res.ok,data:data};});})
      .then(function(result){
        if(!result.ok)throw new Error((result.data&&result.data.error)||"Invio non riuscito");
        if(wa){
          if(status){status.hidden=false;status.textContent="Conferma salvata. Apro WhatsApp…";status.className="moment-rsvp-status ok";}
          window.open("https://wa.me/"+wa+"?text="+encodeURIComponent(lines.join("\\n")),"_blank","noopener");
        }else{
          if(status){status.hidden=false;status.textContent="Grazie! La tua conferma è stata inviata.";status.className="moment-rsvp-status ok";}
          form.reset();
        }
      })
      .catch(function(err){
        if(status){status.hidden=false;status.textContent=err.message||"Invio non riuscito. Riprova.";status.className="moment-rsvp-status error";}
      })
      .finally(function(){
        if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=wa?"Invia su WhatsApp":"Invia conferma";}
      });
  });
});
document.querySelectorAll(".moment-guestbook").forEach(function(section){
  var slug=(section.getAttribute("data-guestbook-slug")||momentPageSlug||"").trim();
  var list=section.querySelector("[data-guestbook-list]");
  var status=section.querySelector("[data-guestbook-status]");
  var form=section.querySelector("[data-guestbook-form]");
  var submitBtn=form?form.querySelector(".moment-guestbook-submit"):null;
  function showStatus(message,type){
    if(!status)return;
    status.hidden=false;
    status.textContent=message;
    status.className="moment-guestbook-status"+(type?" "+type:"");
    status.scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  if(!list)return;
  function escText(value){return String(value||"").replace(/[&<>"']/g,function(ch){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch];});}
  function formatDate(value){try{return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));}catch(e){return "";}}
  function paintMessages(messages){
    if(!messages||!messages.length){list.innerHTML='<p class="moment-guestbook-empty">Sii il primo a lasciare un pensiero.</p>';return;}
    list.innerHTML=messages.map(function(item){
      return '<article class="moment-guestbook-card"><p class="moment-guestbook-quote">“'+escText(item.message)+'”</p><p class="moment-guestbook-author">— '+escText(item.guest_name)+(item.created_at?' · '+escText(formatDate(item.created_at)):"")+'</p></article>';
    }).join("");
  }
  function loadMessages(){
    if(!slug)return;
    var pin=momentPin;
    var url="/api/moment/guestbook?slug="+encodeURIComponent(slug)+(pin?"&pin="+encodeURIComponent(pin):"");
    fetch(url).then(function(res){return res.json();}).then(function(data){if(data&&data.ok)paintMessages(data.messages||[]);}).catch(function(){});
  }
  loadMessages();
  if(form){
    form.addEventListener("submit",function(e){
      e.preventDefault();
      if(!slug){
        showStatus("Il guestbook funziona sulla pagina pubblicata. Pubblica la pagina e apri il link condiviso.","error");
        return;
      }
      var fd=new FormData(form);
      var pin=momentPin;
      var payload={
        slug:slug,
        pin:pin,
        values:{
          name:String(fd.get("guestbook_name")||"").trim(),
          message:String(fd.get("guestbook_message")||"").trim()
        }
      };
      if(!payload.values.name||!payload.values.message){
        showStatus("Scrivi nome e messaggio prima di inviare.","error");
        return;
      }
      if(submitBtn){submitBtn.disabled=true;submitBtn.textContent="Invio in corso…";}
      showStatus("Invio in corso…","");
      fetch("/api/moment/guestbook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})
        .then(function(res){return res.json().then(function(data){return {ok:res.ok,data:data};});})
        .then(function(result){
          if(!result.ok)throw new Error((result.data&&result.data.error)||"Invio non riuscito");
          form.reset();
          showStatus("Grazie! Il messaggio è stato inviato e apparirà dopo l'approvazione.","ok");
        })
        .catch(function(err){
          showStatus(err.message||"Invio non riuscito. Riprova.","error");
        })
        .finally(function(){
          if(submitBtn){submitBtn.disabled=false;submitBtn.textContent="Invia messaggio";}
        });
    });
  }
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
  const cardInk = c.cardInk || "#111111";
  return `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Special+Elite&family=Shadows+Into+Light&display=swap');
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:72px}
body{margin:0;font-family:${f.body};background:radial-gradient(circle at 12% 24%, color-mix(in srgb, ${c.go} 8%, transparent) 0%, transparent 45%), radial-gradient(circle at 88% 76%, color-mix(in srgb, ${c.go} 12%, transparent) 0%, transparent 52%), linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%)!important;color:${c.ink};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
#moment-hero,.moment-section-anchor,#moment-section-counter{scroll-margin-top:72px}
.moment-nav-backdrop{position:fixed;inset:0;background:rgba(12,16,24,.22);opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:38}
.moment-nav-backdrop.open{opacity:1;pointer-events:auto}
body.nav-open{overflow:hidden}
.moment-nav{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:max(8px,env(safe-area-inset-top)) 12px 8px;background:transparent;border-bottom:1px solid transparent;transition:background .28s ease,box-shadow .28s ease,border-color .28s ease,backdrop-filter .28s ease}
.moment-nav.on-hero:not(.scrolled) .moment-nav-links a{color:rgba(255,255,255,.9);text-shadow:0 1px 12px rgba(0,0,0,.28)}
.moment-nav.on-hero:not(.scrolled) .moment-nav-links a.active,.moment-nav.on-hero:not(.scrolled) .moment-nav-links a:hover{background:rgba(255,255,255,.14);color:#fff}
.moment-nav.on-hero:not(.scrolled) .moment-nav-burger{border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.08)}
.moment-nav.on-hero:not(.scrolled) .moment-nav-burger span{background:rgba(255,255,255,.92)}
.moment-nav.scrolled{background:rgba(255,255,255,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom-color:${c.line};box-shadow:0 4px 20px rgba(17,32,65,.04)}
.moment-nav.scrolled .moment-nav-links a{color:#475569}
.moment-nav.scrolled .moment-nav-links a.active,.moment-nav.scrolled .moment-nav-links a:hover{color:#0f172a;background:rgba(15,23,42,.06)}
.moment-nav.scrolled .moment-nav-burger{border-color:rgba(15,23,42,.12);background:rgba(255,255,255,.92)}
.moment-nav.scrolled .moment-nav-burger span{background:#334155}
.moment-nav-links{display:none;list-style:none;margin:0;padding:0;gap:2px;align-items:center}
.moment-nav-links a{display:inline-flex;align-items:center;min-height:32px;padding:0 9px;border-radius:999px;font-family:${f.ui};font-size:.64rem;font-weight:700;color:${c.muted};text-decoration:none;letter-spacing:.03em;transition:color .15s,background .15s}
.moment-nav-links a.active,.moment-nav-links a:hover{color:${c.ink};background:rgba(15,23,42,.06)}
.moment-nav-burger{width:38px;height:38px;border:1px solid ${c.line};border-radius:999px;background:rgba(255,255,255,.8);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-content:center;gap:4px;cursor:pointer;padding:0;transition:background .2s,border-color .2s}
.moment-nav-burger span{display:block;width:16px;height:1.5px;background:${c.ink};border-radius:999px;opacity:.88}
.moment-nav-sheet{position:fixed;left:10px;right:10px;bottom:10px;max-height:min(52vh,380px);background:rgba(255,255,255,.95);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid ${c.lineStrong};border-radius:20px;transform:translateY(105%);transition:transform .35s cubic-bezier(.22,1,.36,1);z-index:39;padding:0 16px max(16px,env(safe-area-inset-bottom));box-shadow:0 10px 40px rgba(17,32,65,.12);overflow:auto}
.moment-nav-sheet.open{transform:translateY(0)}
.moment-nav-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 4px 12px;border-bottom:1px solid ${c.line};margin-bottom:8px}
.moment-nav-sheet-head span{font-family:${f.ui};font-size:.78rem;font-weight:800;color:${c.ink};opacity:.82;text-transform:uppercase;letter-spacing:.05em}
.moment-nav-sheet-close{width:34px;height:34px;border:0;border-radius:999px;background:${c.cardSoft};color:${c.ink};font-size:1.25rem;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background .2s}
.moment-nav-sheet-close:hover{background:${c.line}}
.moment-nav-sheet ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.moment-nav-sheet a{display:flex;align-items:center;min-height:44px;padding:0 14px;border-radius:12px;font-family:${f.ui};font-size:.86rem;font-weight:600;color:${c.ink};text-decoration:none;background:transparent;border:0;transition:background .15s,color .15s}
.moment-nav-sheet a.active,.moment-nav-sheet a:hover{background:${c.cardSoft};color:${c.ink}}
@media(min-width:760px){.moment-nav-links{display:flex}.moment-nav-burger{display:none}.moment-nav-brand{max-width:160px}.moment-nav-sheet{display:none}.moment-nav-backdrop{display:none}}
.moment-decor{display:none!important}
.moment-decor-item{display:none!important}
@keyframes momentDecorFloat{0%,100%{transform:translate3d(0,0,0) rotate(0deg)}50%{transform:translate3d(0,-12px,0) rotate(6deg)}}
.moment-page{width:100%;max-width:100%;min-height:100dvh;margin:0;background:transparent;overflow-x:clip;position:relative}
.moment-hero{position:relative;min-height:min(94dvh,760px);padding:max(120px,env(safe-area-inset-top) + 40px) 24px max(80px,env(safe-area-inset-bottom));text-align:center;color:#fff;background:linear-gradient(145deg,${c.bl},${c.g2 || c.hero});overflow:hidden;display:grid;align-content:end}
.hero-fullscreen .moment-hero{min-height:min(100dvh,780px)}
.hero-romantico .moment-hero{min-height:min(88dvh,700px)}
.hero-romantico .moment-hero-overlay{background:linear-gradient(180deg,rgba(10,10,20,.1) 0%,rgba(10,10,20,.52) 60%,rgba(10,10,20,.85) 100%)}
.hero-intimo .moment-hero{min-height:min(78dvh,620px)}
.hero-intimo .moment-cover-wrap,.hero-intimo .moment-cover{object-position:center 32%}
.hero-profilo .moment-hero{padding-top:max(88px,env(safe-area-inset-top))}
.moment-cover-wrap{position:absolute;inset:0;transform-origin:center center;will-change:transform;z-index:0}
.moment-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:kenBurns 22s ease-in-out infinite alternate}
@keyframes kenBurns{0%{transform:scale(1)}100%{transform:scale(1.09)}}
.moment-hero-overlay{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(15,23,42,0.08) 0%,rgba(15,23,42,0.48) 55%,rgba(15,23,42,0.85) 100%)}
.moment-hero-content{position:relative;z-index:2;max-width:520px;margin:0 auto;isolation:isolate}
.hero-in,.rv{opacity:0;transform:translateY(24px) scale(0.98);transition:opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)}
.hero-in.on,.rv.on{opacity:1;transform:none}
.moment-pill{display:inline-block;font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.92);background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 18px;margin-bottom:16px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.moment-hero small{display:block;font-family:${f.ui};font-weight:800;text-transform:uppercase;letter-spacing:.16em;opacity:.88;margin-bottom:12px}
.moment-profile{width:104px;height:104px;border-radius:999px;object-fit:cover;border:4px solid rgba(255,255,255,0.9);box-shadow:0 12px 32px rgba(15,23,42,0.18);margin:0 auto 20px;display:block;transition:transform .3s ease}
.moment-profile:hover{transform:scale(1.05)}
.moment-hero h1{font-family:${f.display};font-size:clamp(2.4rem,9vw,4.2rem);font-weight:800;line-height:1.12;margin:8px 0;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.45),0 8px 32px rgba(0,0,0,0.35)}
.moment-hero p{font-family:${f.body};font-size:clamp(1.05rem,4vw,1.2rem);font-style:italic;line-height:1.75;margin:0 auto;max-width:480px;color:rgba(255,255,255,.98);text-shadow:0 1px 6px rgba(0,0,0,0.4),0 4px 16px rgba(0,0,0,0.28)}
@keyframes scrollPulse{0%,100%{opacity:.5;transform:scaleY(1)}50%{opacity:.15;transform:scaleY(.55)}}
@keyframes momentItemIn{from{opacity:0;transform:translateY(16px) scale(0.98)}to{opacity:1;transform:none}}
.moment-content{padding:24px 20px 48px;display:grid;gap:24px;background:transparent}

.moment-counter, .moment-card, .moment-countdown, .moment-quote-wrap, .moment-signature, .moment-rsvp-form, .moment-guestbook-form, .moment-sealed, .moment-letter {
  background: rgba(255,255,255,.82)!important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,.45)!important;
  box-shadow: 0 16px 36px -10px rgba(17,32,65,.05), inset 0 1px 0 rgba(255,255,255,.7)!important;
  border-radius: 24px!important;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
}

.moment-card:hover, .moment-counter:hover, .moment-countdown:hover, .moment-quote-wrap:hover, .moment-rsvp-form:hover, .moment-guestbook-form:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 48px -8px ${c.go}14, inset 0 1px 0 rgba(255,255,255,.8)!important;
  border-color: rgba(255,255,255,.65)!important;
}

.moment-card p, .moment-journey-text, .moment-rsvp-intro, .moment-guestbook-intro, .moment-letter p {
  opacity: 0.96 !important;
  color: ${cardInk} !important;
  line-height: 1.62;
}

.moment-counter {
  margin-bottom: 8px !important;
  background: rgba(255, 255, 255, 0.88) !important;
  border: 1px solid ${c.lineStrong} !important;
  box-shadow: 0 16px 36px -12px rgba(17,32,65,0.06), inset 0 1px 0 rgba(255,255,255,0.8) !important;
}

.moment-counter{padding:36px 20px;text-align:center}
.moment-counter-label{font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:${c.muted};margin-bottom:20px}
.moment-counter-grid{display:flex;justify-content:center;gap:0}
.moment-counter-unit{flex:1;max-width:100px;padding:0 14px}
.moment-counter-unit:not(:last-child){border-right:1px solid ${c.line}}
.moment-counter-unit b{display:block;font-size:clamp(1.8rem,8vw,2.4rem);font-weight:700;font-style:normal;line-height:1;color:${c.go}!important;font-family:${f.ui}}
.moment-counter-unit small{display:block;font-family:${f.ui};font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:${c.muted};margin-top:8px}
.moment-card{position:relative;overflow:hidden;padding:32px 20px 28px;margin:0;max-width:none}
.moment-card-gallery{overflow:visible}
.moment-card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,rgba(15,23,42,.03),rgba(15,23,42,.01))}
.moment-card-head{display:grid;justify-items:center;text-align:center;margin-bottom:20px;padding-top:4px}

.moment-card-icon {
  display:grid;
  place-items:center;
  width:48px;
  height:48px;
  border-radius:50% !important;
  background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.92), ${c.cardSoft} 80%) !important;
  border: 1.5px solid ${c.go}24 !important;
  font-size:1.2rem !important;
  color:${c.go} !important;
  margin-bottom:12px !important;
  box-shadow: 0 8px 20px -4px rgba(17,32,65,0.08), inset 0 1px 0 rgba(255,255,255,0.8) !important;
  transition: transform 0.4s cubic-bezier(.21,1.02,.43,1.01), box-shadow 0.4s ease;
}
.moment-card:hover .moment-card-icon {
  transform: translateY(-4px) scale(1.12) rotate(8deg);
  box-shadow: 0 12px 24px -4px rgba(17,32,65,0.14), inset 0 1px 0 rgba(255,255,255,0.8) !important;
}

.moment-card-head strong{display:block;color:${cardInk};font-size:clamp(1.1rem,4.5vw,1.3rem);font-family:${f.ui};font-weight:800;letter-spacing:.02em;line-height:1.25;text-transform:none}
.moment-card-head strong::before,.moment-card-head strong::after{content:"";display:inline-block;width:14px;height:1px;background:${c.lineStrong};opacity:0.8;vertical-align:middle;margin:0 8px;border-radius:999px}
.moment-card-empty{text-align:center;padding:48px 24px}
.moment-card-message p{font-style:italic;text-align:center;font-size:clamp(1.05rem,4vw,1.2rem)}
.rv.on .moment-journey-item,.rv.on .moment-promise,.rv.on .moment-ritual,.rv.on .moment-number,.rv.on .moment-dream{animation:momentItemIn .6s cubic-bezier(.22,1,.36,1) both}
.rv.on .moment-journey-item:nth-child(2),.rv.on .moment-promise:nth-child(2),.rv.on .moment-ritual:nth-child(2),.rv.on .moment-number:nth-child(2),.rv.on .moment-dream:nth-child(2){animation-delay:.07s}
.rv.on .moment-journey-item:nth-child(3),.rv.on .moment-promise:nth-child(3),.rv.on .moment-ritual:nth-child(3),.rv.on .moment-number:nth-child(3),.rv.on .moment-dream:nth-child(3){animation-delay:.14s}
.rv.on .moment-journey-item:nth-child(4),.rv.on .moment-promise:nth-child(4),.rv.on .moment-ritual:nth-child(4),.rv.on .moment-number:nth-child(4),.rv.on .moment-dream:nth-child(4){animation-delay:.21s}
.rv.on .moment-journey-item:nth-child(n+5),.rv.on .moment-promise:nth-child(n+5),.rv.on .moment-ritual:nth-child(n+5),.rv.on .moment-number:nth-child(n+5),.rv.on .moment-dream:nth-child(n+5){animation-delay:.28s}
.moment-journey{display:grid;gap:16px;margin-top:10px}
.moment-journey-item{display:grid;gap:12px;padding:16px;border-radius:18px;background:rgba(255,255,255,.74);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.45);position:relative;box-shadow:0 4px 16px rgba(17,32,65,.02)}
.moment-journey-item::before{content:"";position:absolute;left:20px;top:-16px;width:2px;height:16px;background:${c.go}55}
.moment-journey-item:first-child::before{display:none}
.moment-journey-photo{width:100%;max-height:220px;object-fit:cover;border-radius:14px;border:1px solid ${c.line};box-shadow:0 6px 18px rgba(0,0,0,.04)}
.moment-journey-copy{display:grid;gap:6px;min-width:0}
.moment-journey-date{font-family:${f.ui};font-size:.62rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${c.go}}
.moment-journey-place{display:block;font-size:1.08rem;color:${cardInk};font-weight:800;line-height:1.25;font-family:${f.ui}}
.moment-journey-map{display:inline-flex;align-items:center;gap:4px;font-family:${f.ui};font-size:.78rem;font-weight:700;color:${c.go};text-decoration:underline;text-underline-offset:3px;margin-top:4px;opacity:.88}
@media(min-width:560px){.moment-journey-item{grid-template-columns:120px minmax(0,1fr);align-items:start}.moment-journey-photo{width:120px;height:120px;max-height:none}}
.moment-meta{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}
.moment-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid ${c.line};border-radius:999px;padding:10px 18px;font-family:${f.ui};font-size:.78rem;color:${cardInk};background:#FFFFFF;text-decoration:none;font-weight:700;min-height:44px;transition:background .2s,border-color .2s}
.moment-chip:hover{background:${c.cardSoft};border-color:${c.lineStrong}}
.moment-chip-action{background:${c.go};color:#FFFFFF;border-color:${c.go};box-shadow:0 4px 12px ${c.go}33}
.moment-chip-action:hover{background:${c.g2};border-color:${c.g2}}
.moment-gallery-scroll{margin:14px -4px 0;padding:0 12px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x mandatory;scroll-padding-inline:12px;mask-image:linear-gradient(90deg,transparent,black 6%,black 94%,transparent)}
.moment-gallery-scroll::-webkit-scrollbar{display:none}
.moment-gallery-track{display:flex;gap:12px;width:max-content;padding-bottom:2px}
.moment-gallery-scroll img,.moment-gallery-scroll video,.moment-gallery-scroll .moment-media-card{width:min(72vw,240px);aspect-ratio:4/3;height:auto;max-height:none;object-fit:cover;border-radius:16px;scroll-snap-align:center;box-shadow:0 8px 22px rgba(0,0,0,.08);border:0;padding:0;background:${c.bl2};cursor:pointer;transition:transform .2s ease}
.moment-gallery-scroll .moment-gallery-figure{width:min(72vw,240px);height:auto;min-height:0;max-height:none;display:grid;align-content:start;gap:8px;background:transparent;box-shadow:none;scroll-snap-align:center;margin:0}
.moment-gallery-scroll .moment-gallery-figure img{width:100%;aspect-ratio:4/3;height:auto;max-height:none;border-radius:16px;box-shadow:0 8px 22px rgba(0,0,0,.08);object-fit:cover}
.moment-media-card{display:grid;place-items:center;color:${c.go};font-family:${f.ui};font-size:.78rem;font-weight:700;min-height:88px;border-radius:20px;border:1px solid ${c.line};transition:border-color .2s,background .2s}
.moment-media-card:hover{background:${c.cardSoft};border-color:${c.lineStrong}}
.moment-media-card small{display:block;margin-top:8px;opacity:.75;padding:0 10px;text-align:center}
.moment-lightbox{position:fixed;inset:0;background:rgba(8,10,20,.95);z-index:900;display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;transition:opacity .28s ease}
.moment-lightbox.open{opacity:1;pointer-events:auto}
.moment-lightbox-card{max-width:min(94vw,760px);width:100%;text-align:center;color:#fff;transform:scale(.95);transition:transform .28s cubic-bezier(.22,1,.36,1)}
.moment-lightbox.open .moment-lightbox-card{transform:scale(1)}
.moment-lightbox-card img,.moment-lightbox-card video{max-width:100%;max-height:62vh;border-radius:16px;object-fit:contain;background:#111;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.moment-lightbox-card audio{width:100%;margin-top:12px}
.moment-lightbox-title{font-family:${f.body};font-size:1.35rem;margin:14px 0 6px;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.moment-lightbox-desc{font-size:.95rem;opacity:.85;line-height:1.55;margin:0 auto;max-width:520px}
.moment-lightbox-close{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;width:44px;height:44px;border:0;border-radius:999px;background:#fff;color:#111;font-size:1.4rem;cursor:pointer;z-index:2;display:grid;place-items:center;transition:background .2s,transform .2s}
.moment-lightbox-close:hover{background:#eee;transform:scale(1.05)}
.moment-lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;border-radius:999px;background:rgba(255,255,255,.92);color:#111;font-size:1.8rem;line-height:1;cursor:pointer;z-index:2;display:grid;place-items:center;transition:background .2s,transform .2s}
.moment-lightbox-nav:hover{background:#fff;transform:translateY(-50%) scale(1.05)}
.moment-lightbox-prev{left:12px}
.moment-lightbox-next{right:12px}
.moment-lightbox-counter{font-family:${f.ui};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;opacity:.72;margin:0 0 8px}

.moment-video-wrap{margin-top:12px;display:grid;gap:10px}
.moment-video-wrap video{width:100%;border-radius:16px;border:1px solid ${c.line};background:#111;aspect-ratio:16/9;object-fit:cover}
.moment-video-title{font-family:${f.body};font-size:1.1rem;margin:0;color:${cardInk}}
.moment-video-desc{font-size:.92rem;opacity:.82;margin:0;line-height:1.5;color:${c.muted}}
.moment-youtube{margin-top:12px;border-radius:18px;overflow:hidden;border:1px solid ${c.line};aspect-ratio:16/9;background:#111}
.moment-youtube iframe{display:block;width:100%;height:100%;border:0}
.moment-audio{margin-top:12px;border-radius:18px;padding:16px;background:${c.cardSoft};border:1px solid ${c.line};box-shadow:none}
.moment-audio audio{width:100%}
.moment-audio-title{font-family:${f.body};font-size:1.1rem;margin:0 0 6px;color:${cardInk}}
.moment-audio-desc{font-size:.92rem;opacity:.82;margin:0 0 10px;line-height:1.5;color:${c.muted}}
.moment-sealed{text-align:center;padding:32px 20px;margin-top:8px}
.moment-sealed-icon{font-size:2rem;margin-bottom:10px;color:${c.go};opacity:.85;animation:scrollPulse 3s ease-in-out infinite}
.moment-sealed-date{font-family:${f.ui};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:${c.muted};margin-top:8px}
.moment-rituals{display:grid;gap:12px;margin-top:10px}
.moment-ritual{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;background:${c.cardSoft};border:1px solid ${c.line};border-left:3px solid ${c.go};box-shadow:none}
.moment-pet-card{display:grid;justify-items:center;text-align:center;gap:12px;margin-top:8px}
.moment-pet-photo{width:120px;height:120px;border-radius:999px;object-fit:cover;border:3px solid #FFFFFF;box-shadow:0 12px 32px rgba(15,23,42,.12)}
.moment-pet-name{font-family:${f.body};font-size:1.35rem;margin:0;color:${cardInk};font-weight:600}
.moment-numbers{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:12px}
.moment-number{flex:1 1 100px;max-width:140px;text-align:center;padding:16px 10px;border-radius:18px;background:${c.cardSoft};border:1px solid ${c.line};border-top:3px solid ${c.go};box-shadow:none}
.moment-number b{display:block;font-size:clamp(1.6rem,7vw,2rem);font-weight:700;font-style:normal;color:${c.go};line-height:1;font-family:${f.ui}}
.moment-number small{display:block;font-family:${f.ui};font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:${c.muted};margin-top:8px;line-height:1.35}
.moment-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.moment-gallery img,.moment-gallery .moment-gallery-figure img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;border:1px solid ${c.line};box-shadow:0 6px 18px rgba(0,0,0,.06);height:auto;max-height:none;display:block}
.moment-gallery .moment-gallery-figure{margin:0;display:grid;gap:6px;min-width:0;width:100%}
.moment-gallery .moment-gallery-caption{font-size:.68rem;max-width:100%;padding:0 2px}
.moment-letter{padding:26px 20px;margin-top:8px;border-left:3px solid ${c.go}!important;position:relative;box-shadow:none}
.moment-letter-to{font-style:italic;color:${c.muted};font-weight:600;margin:0 0 12px}
.moment-letter-sign{display:block;margin-top:18px;font-family:${f.display};font-size:1.6rem;color:${c.go}}
.moment-letter-heart{position:absolute;right:18px;bottom:14px;opacity:.15;color:${c.go};font-size:1.4rem}
.moment-letter-media{margin-top:18px;display:grid;gap:10px;justify-items:center}
.moment-letter-media img{width:100%;max-width:420px;border-radius:14px;border:1px solid ${c.ro};object-fit:cover}
.moment-letter-media video{width:100%;max-width:420px;border-radius:14px;border:1px solid ${c.ro};background:#111}
.moment-letter-media-title{font-family:${f.body};font-size:1.05rem;margin:0;color:${c.in}}
.moment-promises{display:grid;gap:12px;margin-top:10px}
.moment-promise{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;background:${c.cardSoft};border:1px solid ${c.line};border-left:3px solid ${c.go};box-shadow:none}
.moment-promise-emoji{font-size:1.2rem;line-height:1.2}
.moment-places{display:grid;gap:12px;margin-top:10px}
.moment-place{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:${c.surface}!important;border:1px solid ${c.lineStrong}!important;text-decoration:none;color:${c.ink}!important}
.moment-place-icon{font-size:1.15rem;color:${c.go}}
.moment-dreams{display:grid;gap:10px;margin-top:10px}
.moment-dream{display:flex;gap:10px;align-items:center;font-size:1.02rem;padding:8px 0;border-bottom:1px solid ${c.line}}
.moment-dream:last-child{border-bottom:0}
.moment-dream-mark{width:24px;height:24px;border-radius:999px;border:2px solid ${c.lineStrong};display:grid;place-items:center;font-size:.72rem;color:${cardInk};flex-shrink:0;background:#FFFFFF}
.moment-dream.done .moment-dream-mark{background:${c.go}!important;color:#FFFFFF!important;border-color:${c.go}!important}
.moment-dream.done .moment-dream-text{opacity:.55;text-decoration:line-through;color:${c.muted}}
.moment-countdown{text-align:center;padding:36px 20px}
.moment-countdown-photo{width:min(100%,280px);height:160px;object-fit:cover;border-radius:16px;margin:0 auto 16px;display:block;border:1px solid ${c.line};box-shadow:0 10px 28px rgba(0,0,0,.08)}
.moment-music-photo{width:min(100%,320px);height:180px;object-fit:cover;border-radius:16px;margin:0 auto 16px;display:block;border:1px solid ${c.line};box-shadow:0 10px 28px rgba(0,0,0,.08)}
.moment-list-intro{font-size:14px;color:${c.muted};margin:0 0 14px;line-height:1.5}
.moment-countdown-label{font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:${c.go};margin-bottom:14px}
.moment-countdown-event{font-size:1.15rem;font-style:italic;margin:0 0 18px;color:${cardInk}}
.moment-countdown-note{margin:0 0 16px;color:${cardInk};opacity:.82;line-height:1.6;font-size:.98rem}
.moment-rsvp-intro{margin:0 0 16px;line-height:1.75;color:${cardInk};font-size:1.02rem;font-weight:500;opacity:.88}
.moment-rsvp-event{text-align:center;margin:0 0 20px;padding:8px 0 0}
.moment-rsvp-event-eyebrow{font-family:${f.ui};font-size:.62rem;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:${c.muted};margin:0 0 8px}
.moment-rsvp-event-title{font-family:${f.display};font-size:clamp(1.65rem,7vw,2.35rem);color:${cardInk};margin:0;line-height:1.15;font-weight:400}
.moment-rsvp-form{padding:24px 20px}
.moment-rsvp-form label{display:grid;gap:8px;font-family:${f.ui};font-size:.88rem;font-weight:700;color:${cardInk}}
.moment-rsvp-form input,.moment-rsvp-form textarea,.moment-guestbook-form input,.moment-guestbook-form textarea{width:100%;border:1px solid ${c.lineStrong};border-radius:12px;padding:13px 14px;font:inherit;background:#FFFFFF;color:${cardInk};font-size:1rem;line-height:1.4;-webkit-text-fill-color:${cardInk};box-shadow:inset 0 1px 2px rgba(15,23,42,.02);transition:border-color .2s,box-shadow .2s}
.moment-rsvp-form input::placeholder,.moment-rsvp-form textarea::placeholder,.moment-guestbook-form input::placeholder,.moment-guestbook-form textarea::placeholder{color:${c.muted};opacity:1;-webkit-text-fill-color:${c.muted}}
.moment-rsvp-form input:focus,.moment-rsvp-form textarea:focus,.moment-guestbook-form input:focus,.moment-guestbook-form textarea:focus{outline:0;border-color:${c.go};box-shadow:0 0 0 4px ${c.go}24}
.moment-rsvp-attending{border:0;padding:0;margin:0;display:grid;gap:10px}
.moment-rsvp-attending legend{font-family:${f.ui};font-size:.78rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:${c.muted};margin-bottom:6px}
.moment-rsvp-attending label{font-weight:600;display:flex;align-items:center;gap:10px;color:${cardInk};font-size:.95rem}
.moment-rsvp-attending input[type=radio]{width:18px;height:18px;margin:0;flex-shrink:0;accent-color:${c.go}}
.moment-card-head strong{color:${cardInk}}

.moment-rsvp-submit, .moment-guestbook-submit {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  border:0;
  border-radius:14px;
  padding:14px 18px;
  background:linear-gradient(135deg, ${c.go} 0%, ${c.go} 50%, ${c.go} 100%) !important;
  position: relative;
  overflow: hidden;
  color:#fff!important;
  font-family:${f.ui};
  font-weight:800;
  font-size:.95rem;
  cursor:pointer;
  box-shadow:0 8px 20px ${c.go}33!important;
  transition:transform 0.28s cubic-bezier(.21,1.02,.43,1.01), box-shadow 0.28s cubic-bezier(.21,1.02,.43,1.01), filter 0.28s ease;
}

.moment-rsvp-submit::after, .moment-guestbook-submit::after {
  content: "";
  position: absolute;
  top: 0; left: -150%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transform: skewX(-20deg);
  animation: buttonShine 6s infinite ease-in-out;
}

@keyframes buttonShine {
  0% { left: -150%; }
  30% { left: 150%; }
  100% { left: 150%; }
}

.moment-rsvp-submit:hover, .moment-guestbook-submit:hover {
  filter:brightness(1.06);
  transform:translateY(-2px) scale(1.01);
  box-shadow:0 14px 28px -4px ${c.go}44!important;
}

.moment-rsvp-submit:active, .moment-guestbook-submit:active {
  transform:translateY(0);
}

.moment-guestbook-intro{margin:0 0 16px;line-height:1.75;color:${cardInk};font-size:1.02rem;font-weight:500;opacity:.88}
.moment-guestbook-form{padding:24px 20px}
.moment-guestbook-form label{display:grid;gap:8px;font-family:${f.ui};font-size:.88rem;font-weight:700;color:${cardInk}}
.moment-guestbook-form label{display:grid;gap:8px;font-family:${f.ui};font-size:.88rem;font-weight:700;color:${cardInk}}
.moment-guestbook-status{margin:12px 0 0;padding:10px 12px;border-radius:12px;font-size:.86rem;line-height:1.45}
.moment-guestbook-status.ok{background:#ECFDF3;border:1px solid #A7F3D0;color:#166534}
.moment-guestbook-status.error{background:#FEF2F2;border:1px solid #FECACA;color:#991B1B}
.moment-guestbook-list{display:grid;gap:12px;margin-top:18px}
.moment-guestbook-empty{margin:0;padding:14px;border-radius:14px;background:${c.cardSoft};border:1px dashed ${c.line};color:${c.muted};font-size:.92rem;text-align:center}
.moment-guestbook-card{padding:18px 16px;border-radius:16px;background:#FFFFFF;border:1px solid ${c.line};box-shadow:none}
.moment-guestbook-quote{margin:0 0 10px;font-family:${f.display};font-size:clamp(1.15rem,4.8vw,1.45rem);line-height:1.45;color:${cardInk}}
.moment-guestbook-author{margin:0;font-family:${f.ui};font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:${c.muted}}
.moment-card-head .moment-card-icon{font-size:1.15rem;line-height:1;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:${c.cardSoft};border:1px solid ${c.line};flex-shrink:0;color:${c.go}}
.moment-countdown-grid{display:flex;justify-content:center;gap:0}
.moment-countdown-unit{flex:1;max-width:100px;padding:0 14px}
.moment-countdown-unit b{display:block;font-size:clamp(1.8rem,8vw,2.4rem);font-weight:700;font-style:normal;line-height:1;color:${c.go};font-family:${f.ui}}
.moment-countdown-unit small{display:block;font-family:${f.ui};font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:${c.muted};margin-top:8px}
.moment-countdown-unit:not(:last-child){border-right:1px solid ${c.line}}

.moment-spotify, .moment-youtube {
  margin-top:16px;
  border-radius:20px;
  overflow:hidden;
  border:1px solid ${c.lineStrong};
  box-shadow:0 8px 24px -6px rgba(17,32,65,0.1);
}
.moment-spotify iframe{display:block;width:100%;border:0;min-height:152px}
.moment-quote-wrap{text-align:center;padding:42px 20px}
.moment-quote-wrap::before{content:"";display:block;width:40px;height:2px;margin:0 auto 18px;border-radius:999px;background:${c.lineStrong}}
.moment-quote-mark{font-family:${f.ui};font-size:2.4rem;line-height:1;color:${c.go};opacity:.55;margin-bottom:-8px;font-weight:800}
.moment-quote-text{font-size:clamp(1.05rem,4.5vw,1.28rem);font-style:italic;line-height:1.65;margin:0;color:${cardInk};font-family:${f.body};font-weight:500}
.moment-quote-author{display:block;margin-top:16px;font-family:${f.ui};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:${c.muted}}
.moment-signature{text-align:center;padding:42px 20px 48px}
.moment-signature-label{font-family:${f.ui};font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:${c.muted};margin:0 0 10px}
.moment-signature-name {
  font-family:${f.display}!important;
  font-size:clamp(2.2rem,9vw,3.2rem)!important;
  color:${c.go}!important;
  text-shadow: none !important;
  margin-bottom: 8px;
  position: relative;
  display: inline-block;
}
.moment-signature-name::after {
  content: "";
  display: block;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${c.go}, transparent);
  margin: 6px auto 0;
  border-radius: 999px;
}
.moment-signature-sub{font-style:italic;color:${c.muted};margin-top:10px;font-size:1rem}
.moment-gallery-empty,.moment-empty-hint{font-family:${f.ui};font-size:.88rem;line-height:1.55;color:${c.muted};font-style:italic;margin:12px 0 0;padding:14px 16px;border-radius:12px;background:${c.cardSoft};border:1px dashed ${c.lineStrong};text-align:center}
.moment-gallery-track{display:flex;gap:12px;width:max-content;padding-bottom:2px}
.moment-gallery-group{margin-top:20px}
.moment-gallery-group:first-child{margin-top:8px}
.moment-gallery-group-label{font-family:${f.ui};font-size:.62rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${c.muted};text-align:center;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid ${c.line}}
.moment-gallery-group-items{display:grid;gap:12px}
.moment-media-list{display:grid;gap:12px}
.moment-gallery-figure{margin:0;display:grid;gap:6px;justify-items:center}
.moment-gallery-caption{font-family:${f.ui};font-size:.72rem;font-weight:700;color:${cardInk};text-align:center;max-width:240px;line-height:1.35}
.moment-media-list .moment-media-card{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:76px;padding:12px;background:${c.cardSoft};border:1px solid ${c.line};border-radius:14px;box-shadow:none;transition:border-color .2s,background .2s}
.moment-media-list .moment-media-card:hover{background:${c.surface};border-color:${c.lineStrong}}
.moment-media-card-audio{min-height:88px}
.moment-footer{text-align:center;color:color-mix(in srgb, ${c.bl} 35%, ${c.in}) !important;opacity:0.75;font-family:${f.ui};font-size:12px;padding:16px 20px max(28px,env(safe-area-inset-bottom))}
@media(prefers-reduced-motion:reduce){.hero-in,.rv{opacity:1;transform:none;transition:none}.rv.on .moment-journey-item,.rv.on .moment-promise,.rv.on .moment-ritual,.rv.on .moment-number,.rv.on .moment-dream{animation:none}.moment-sealed-icon,.moment-decor-item{animation:none}.moment-decor{display:none}}
@media(min-width:720px){body{padding:24px;background:#eef2f7}.moment-page{width:min(100%,680px);margin:auto;border-radius:24px;box-shadow:0 24px 70px rgba(17,32,65,.08);background:${c.surface}}.moment-content{padding:20px 20px 36px}.moment-gallery-scroll img,.moment-gallery-scroll .moment-gallery-figure,.moment-gallery-scroll .moment-gallery-figure img{width:220px}.moment-gallery{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}}
.moment-cut-arco #moment-hero {
  clip-path: ellipse(95% 100% at 50% 0%) !important;
  margin-bottom: -15px !important;
}
.moment-cut-diagonale #moment-hero {
  clip-path: polygon(0 0, 100% 0, 100% 92%, 0 100%) !important;
  margin-bottom: -15px !important;
}

/* ==================== CATEGORY TEMPLATE OVERRIDES ==================== */

/* 1. WEDDING / LOVE / ANNIVERSARY: Ethereal & Emotional Layout (Template 3) */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Great+Vibes&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');

main.moment-type-love,
main.moment-type-wedding,
main.moment-type-anniversary {
  background: 
    radial-gradient(circle at 12% 24%, color-mix(in srgb, ${colors.go} 9%, transparent) 0%, transparent 45%),
    radial-gradient(circle at 88% 76%, color-mix(in srgb, ${colors.go} 13%, transparent) 0%, transparent 52%),
    linear-gradient(180deg, ${colors.surface} 0%, ${colors.bl} 100%) !important;
  padding-bottom: 80px !important;
}

.moment-type-love, .moment-type-love *,
.moment-type-wedding, .moment-type-wedding *,
.moment-type-anniversary, .moment-type-anniversary * {
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Hero Section: Dynamic Overlap, Gradient fade and Title styling */
.moment-type-love .moment-hero,
.moment-type-wedding .moment-hero,
.moment-type-anniversary .moment-hero {
  position: relative !important;
  height: 80vh !important;
  max-height: 660px !important;
  min-height: 420px !important;
  margin-bottom: 24px !important; /* Taglio dritto netto */
  z-index: 1 !important;
  display: flex !important;
  align-items: flex-end !important;
  padding-bottom: 80px !important;
}

.moment-type-love .moment-hero-overlay,
.moment-type-wedding .moment-hero-overlay,
.moment-type-anniversary .moment-hero-overlay {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.82) 100%) !important;
  z-index: 1 !important;
}

.moment-type-love .moment-hero-content,
.moment-type-wedding .moment-hero-content,
.moment-type-anniversary .moment-hero-content {
  z-index: 2 !important;
}

.moment-type-love .moment-hero h1,
.moment-type-wedding .moment-hero h1,
.moment-type-anniversary .moment-hero h1 {
  font-family: 'Playfair Display', serif !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  text-shadow: 0 4px 24px rgba(10,10,20,0.5) !important;
}

/* Glassmorphism Cards: White transluscent background with blurry ambient glows */
.moment-type-love .moment-card,
.moment-type-love .moment-counter,
.moment-type-love .moment-countdown,
.moment-type-love .moment-quote-wrap,
.moment-type-love .moment-signature,
.moment-type-wedding .moment-card,
.moment-type-wedding .moment-counter,
.moment-type-wedding .moment-countdown,
.moment-type-wedding .moment-quote-wrap,
.moment-type-wedding .moment-signature,
.moment-type-anniversary .moment-card,
.moment-type-anniversary .moment-counter,
.moment-type-anniversary .moment-countdown,
.moment-type-anniversary .moment-quote-wrap,
.moment-type-anniversary .moment-signature {
  background: rgba(255, 255, 255, 0.76) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border-radius: 32px !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  box-shadow: 
    0 24px 60px -18px color-mix(in srgb, ${colors.go} 8%, rgba(0,0,0,0.03)),
    inset 0 1px 0 rgba(255,255,255,0.95) !important;
  padding: 44px 28px !important;
  margin-bottom: 40px !important;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease !important;
}

.moment-type-love .moment-card:hover,
.moment-type-wedding .moment-card:hover,
.moment-type-anniversary .moment-card:hover {
  transform: translateY(-4px) !important;
  background: rgba(255, 255, 255, 0.85) !important;
  box-shadow: 
    0 35px 70px -12px color-mix(in srgb, ${colors.go} 14%, rgba(0,0,0,0.04)) !important;
}

.moment-type-love .moment-card-title,
.moment-type-wedding .moment-card-title,
.moment-type-anniversary .moment-card-title {
  font-family: 'Playfair Display', serif !important;
  font-size: 1.4rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  letter-spacing: 0.02em !important;
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  margin-bottom: 24px !important;
}

.moment-type-love .moment-card-title::after,
.moment-type-wedding .moment-card-title::after,
.moment-type-anniversary .moment-card-title::after {
  content: "" !important;
  flex-grow: 1 !important;
  height: 1px !important;
  background: linear-gradient(90deg, color-mix(in srgb, ${colors.go} 25%, transparent), transparent) !important;
}

/* Elegant Postcard Stamp for Love Icons */
.moment-type-love .moment-card-head .moment-card-icon,
.moment-type-love .moment-card-icon,
.moment-type-wedding .moment-card-head .moment-card-icon,
.moment-type-wedding .moment-card-icon,
.moment-type-anniversary .moment-card-head .moment-card-icon,
.moment-type-anniversary .moment-card-icon {
  background: color-mix(in srgb, ${colors.go} 6%, transparent) !important;
  border: 1px solid color-mix(in srgb, ${colors.go} 16%, transparent) !important;
  color: ${colors.go} !important;
  width: 48px !important;
  height: 48px !important;
  border-radius: 50% !important;
  display: grid !important;
  place-items: center !important;
  box-shadow: 0 4px 12px color-mix(in srgb, ${colors.go} 8%, transparent) !important;
  transform: none !important;
}

.moment-type-love .love-icon-svg,
.moment-type-wedding .love-icon-svg,
.moment-type-anniversary .love-icon-svg {
  width: 20px !important;
  height: 20px !important;
  stroke: ${colors.go} !important;
  stroke-width: 2px !important;
  display: block !important;
  animation: floatingLoveIcon 3s ease-in-out infinite alternate !important;
}

@keyframes floatingLoveIcon {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-3px) scale(1.05); }
}

/* Dedication Letter Overhaul */
.moment-type-love .moment-letter,
.moment-type-wedding .moment-letter,
.moment-type-anniversary .moment-letter {
  background: rgba(255, 255, 255, 0.45) !important;
  border-radius: 24px !important;
  border: 1px solid color-mix(in srgb, ${colors.go} 10%, transparent) !important;
  border-left: 4px solid ${colors.go} !important;
  padding: 32px 28px !important;
  position: relative !important;
  overflow: hidden !important;
  font-family: 'Playfair Display', serif !important;
  font-size: 1.12rem !important;
  line-height: 1.75 !important;
  font-style: italic !important;
  color: #334155 !important;
}

.moment-type-love .moment-letter-heart,
.moment-type-wedding .moment-letter-heart,
.moment-type-anniversary .moment-letter-heart {
  color: ${colors.go} !important;
  opacity: 0.07 !important;
  font-size: 8rem !important;
  position: absolute !important;
  bottom: -20px !important;
  right: -10px !important;
  pointer-events: none !important;
  transform: none !important;
}

/* Pulsing Rounded Buttons */
.moment-type-love .moment-rsvp-submit,
.moment-type-love .moment-guestbook-submit,
.moment-type-wedding .moment-rsvp-submit,
.moment-type-wedding .moment-guestbook-submit,
.moment-type-anniversary .moment-rsvp-submit,
.moment-type-anniversary .moment-guestbook-submit {
  background: ${colors.go} !important;
  color: #ffffff !important;
  border-radius: 999px !important;
  padding: 16px 36px !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
  border: none !important;
  cursor: pointer !important;
  box-shadow: 0 10px 30px color-mix(in srgb, ${colors.go} 30%, transparent) !important;
  transition: all 0.3s ease !important;
}

.moment-type-love .moment-rsvp-submit:hover,
.moment-type-love .moment-guestbook-submit:hover,
.moment-type-wedding .moment-rsvp-submit:hover,
.moment-type-wedding .moment-guestbook-submit:hover,
.moment-type-anniversary .moment-rsvp-submit:hover,
.moment-type-anniversary .moment-guestbook-submit:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 15px 35px color-mix(in srgb, ${colors.go} 45%, transparent) !important;
}


/* 2. TRAVEL & ADVENTURE: Immersive 2026 Design Overhaul */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;600;700&family=Special+Elite&family=Caveat:wght@600&display=swap');

main.moment-type-travel {
  background: 
    radial-gradient(color-mix(in srgb, ${colors.go} 5%, transparent) 1.5px, transparent 1.5px) 0 0 / 24px 24px,
    radial-gradient(circle at 12% 24%, color-mix(in srgb, ${colors.go} 9%, transparent) 0%, transparent 45%),
    radial-gradient(circle at 88% 76%, color-mix(in srgb, ${colors.go} 13%, transparent) 0%, transparent 52%),
    linear-gradient(180deg, ${colors.surface} 0%, ${colors.bl} 100%) !important;
  padding-bottom: 80px !important;
}

.moment-type-travel, .moment-type-travel * {
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Hero Section: Full-height cinematic header */
.moment-type-travel .moment-hero {
  position: relative !important;
  height: 80vh !important;
  max-height: 680px !important;
  min-height: 440px !important;
  clip-path: none !important;
  overflow: hidden !important;
  margin-bottom: 24px !important; /* Taglio dritto netto: distacco standard */
  z-index: 1 !important;
  display: flex !important;
  align-items: flex-end !important;
  padding-bottom: 80px !important;
  box-shadow: none !important;
}

.moment-type-travel .moment-hero-overlay {
  background: linear-gradient(180deg, rgba(16, 11, 38, 0.1) 0%, rgba(16, 11, 38, 0.4) 60%, rgba(16, 11, 38, 0.85) 100%) !important;
  z-index: 1 !important;
}



.moment-type-travel .moment-hero-content {
  position: relative !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  margin: 0 auto !important;
  max-width: 600px !important;
  width: calc(100% - 48px) !important;
  padding: 0 !important;
  color: #ffffff !important;
  text-align: center !important;
  z-index: 5 !important;
}

.moment-type-travel .moment-hero h1 {
  font-family: 'Playfair Display', serif !important;
  font-size: clamp(2.2rem, 9vw, 3.5rem) !important;
  font-weight: 700 !important;
  margin: 12px 0 !important;
  line-height: 1.15 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.02em !important;
  color: #ffffff !important;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.5) !important;
}

.moment-type-travel .moment-hero p {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 1.05rem !important;
  opacity: 0.9 !important;
  line-height: 1.6 !important;
  font-weight: 400 !important;
  letter-spacing: 0.05em !important;
  color: #ffffff !important;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4) !important;
}

.moment-type-travel .moment-profile {
  width: 80px !important;
  height: 80px !important;
  border-radius: 50% !important;
  border: 3px solid #ffffff !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
  margin: 0 auto 16px auto !important;
  display: block !important;
  object-fit: cover !important;
}

.moment-type-travel .moment-pill {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.15em !important;
  padding: 6px 18px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  display: inline-block !important;
}

/* Premium Spacious Cards */
.moment-type-travel .moment-card,
.moment-type-travel .moment-counter,
.moment-type-travel .moment-countdown,
.moment-type-travel .moment-quote-wrap,
.moment-type-travel .moment-signature {
  background: #ffffff !important;
  border-radius: 28px !important;
  padding: 48px 32px !important;
  margin-bottom: 48px !important;
  box-shadow: 0 30px 60px -15px rgba(139, 69, 19, 0.05) !important;
  border: 1px solid rgba(139, 69, 19, 0.03) !important;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.moment-type-travel .moment-card:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 40px 80px -12px rgba(139, 69, 19, 0.09) !important;
}

.moment-type-travel .moment-card-title {
  font-family: 'Playfair Display', serif !important;
  font-size: 1.45rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  margin-bottom: 24px !important;
}

.moment-type-travel .moment-card-title::after {
  content: "" !important;
  flex-grow: 1 !important;
  height: 1px !important;
  background: linear-gradient(90deg, color-mix(in srgb, ${colors.go} 20%, transparent), transparent) !important;
}

/* Timeline as Spacious Chapters */
.moment-type-travel .moment-journey {
  position: relative !important;
  padding-left: 0 !important;
}

.moment-type-travel .moment-journey::before {
  display: none !important;
}

.moment-type-travel .moment-journey-item {
  background: #ffffff !important;
  border-radius: 28px !important;
  padding: 32px !important;
  box-shadow: 0 30px 60px -15px rgba(139, 69, 19, 0.05) !important;
  border: 1px solid rgba(139, 69, 19, 0.03) !important;
  margin-bottom: 48px !important;
  margin-left: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 20px !important;
  transform: none !important;
  transition: transform 0.4s ease, box-shadow 0.4s ease !important;
  position: relative !important;
}

.moment-type-travel .moment-journey-item:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 40px 80px -12px rgba(139, 69, 19, 0.09) !important;
}

.moment-type-travel .moment-journey-photo {
  width: 100% !important;
  height: auto !important;
  max-height: 480px !important;
  object-fit: cover !important;
  border-radius: 18px !important;
  border: none !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03) !important;
}

.moment-type-travel .moment-journey-place {
  font-family: 'Playfair Display', serif !important;
  font-size: 1.6rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  margin-top: 4px !important;
}

.moment-type-travel .moment-journey-date {
  font-family: 'Special Elite', monospace !important;
  font-size: 0.85rem !important;
  color: ${colors.go} !important;
  background: color-mix(in srgb, ${colors.go} 6%, transparent) !important;
  padding: 4px 12px !important;
  border-radius: 6px !important;
  align-self: flex-start !important;
  border: 1px solid color-mix(in srgb, ${colors.go} 12%, transparent) !important;
}

.moment-type-travel .moment-journey-text {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 1.05rem !important;
  color: #334155 !important;
  line-height: 1.65 !important;
  font-weight: 400 !important;
}

.moment-type-travel .moment-journey-item::after,
.moment-type-travel .moment-journey-item::before {
  display: none !important;
}

/* Postcard Timbro e Icone */
.moment-type-travel .moment-card-head .moment-card-icon,
.moment-type-travel .moment-card-icon {
  background: transparent !important;
  border: 2px dashed color-mix(in srgb, ${colors.go} 40%, transparent) !important;
  color: color-mix(in srgb, ${colors.go} 75%, transparent) !important;
  width: 50px !important;
  height: 50px !important;
  border-radius: 50% !important;
  display: grid !important;
  place-items: center !important;
  transform: rotate(-6deg) !important;
  box-shadow: none !important;
}

.moment-type-travel .travel-icon-svg {
  width: 22px !important;
  height: 22px !important;
  stroke: ${colors.go} !important;
  stroke-width: 2px !important;
  display: block !important;
  animation: floatingIcon 3s ease-in-out infinite alternate !important;
}

.moment-type-travel .moment-card:hover .travel-icon-svg {
  stroke: color-mix(in srgb, ${colors.go} 85%, #000) !important;
}

@keyframes floatingIcon {
  0% { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(-3px) rotate(3deg); }
}

/* Postcard theme for RSVP & Guestbook form */
.moment-type-travel .moment-rsvp,
.moment-type-travel .moment-guestbook {
  position: relative !important;
  background: color-mix(in srgb, ${colors.surface} 40%, #ffffff) !important;
  border: 1px solid color-mix(in srgb, ${colors.go} 8%, transparent) !important;
  box-shadow: 0 20px 48px -10px rgba(139, 69, 19, 0.06) !important;
}

.moment-type-travel .moment-rsvp::after,
.moment-type-travel .moment-guestbook::after {
  content: "⛵" !important;
  position: absolute !important;
  top: 32px !important;
  right: 32px !important;
  width: 60px !important;
  height: 75px !important;
  background: 
    repeating-radial-gradient(circle, color-mix(in srgb, ${colors.go} 10%, transparent) 0, color-mix(in srgb, ${colors.go} 10%, transparent) 4px, transparent 4px, transparent 8px),
    linear-gradient(135deg, ${colors.surface}, ${colors.bl}) !important;
  border: 2px dashed ${colors.go} !important;
  border-radius: 4px !important;
  opacity: 0.8 !important;
  transform: rotate(6deg) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 2rem !important;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03) !important;
  z-index: 2 !important;
}

/* Forms input fields styled like paper lines */
.moment-type-travel .moment-rsvp-form input[type="text"],
.moment-type-travel .moment-rsvp-form textarea,
.moment-type-travel .moment-guestbook-form input[type="text"],
.moment-type-travel .moment-guestbook-form textarea {
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  border-bottom: 1.5px solid color-mix(in srgb, ${colors.go} 20%, transparent) !important;
  border-radius: 0 !important;
  padding: 8px 0 !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 0.98rem !important;
  color: #0f172a !important;
  transition: border-bottom-color 0.25s ease !important;
}

.moment-type-travel .moment-rsvp-form input[type="text"]:focus,
.moment-type-travel .moment-rsvp-form textarea:focus,
.moment-type-travel .moment-guestbook-form input[type="text"]:focus,
.moment-type-travel .moment-guestbook-form textarea:focus {
  border-bottom-color: ${colors.go} !important;
  outline: none !important;
}

.moment-type-travel .moment-rsvp-attending {
  border: none !important;
  padding: 0 !important;
  margin: 20px 0 !important;
}

.moment-type-travel .moment-rsvp-attending legend {
  font-family: 'Playfair Display', serif !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  margin-bottom: 12px !important;
}

/* Boarding Pass stamp style RSVP / Guestbook submit buttons */
.moment-type-travel .moment-rsvp-submit,
.moment-type-travel .moment-guestbook-submit {
  background: ${colors.go} !important;
  color: #ffffff !important;
  box-shadow: 0 10px 24px -4px color-mix(in srgb, ${colors.go} 30%, transparent) !important;
  border-radius: 12px !important;
  padding: 16px 24px !important;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 700 !important;
  font-size: 0.9rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  margin-top: 20px !important;
}

.moment-type-travel .moment-rsvp-submit:hover,
.moment-type-travel .moment-guestbook-submit:hover {
  background: color-mix(in srgb, ${colors.go} 80%, #000) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 14px 28px -2px color-mix(in srgb, ${colors.go} 40%, transparent) !important;
}

/* Widescreen Asymmetric Gallery */
.moment-type-travel .moment-gallery {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 20px !important;
}

.moment-type-travel .moment-gallery figure {
  margin: 0 !important;
  overflow: hidden !important;
  border-radius: 20px !important;
  box-shadow: 0 15px 35px -5px rgba(15,23,42,0.06) !important;
  border: 1px solid rgba(255,255,255,0.8) !important;
}

.moment-type-travel .moment-gallery figure:nth-child(3n) {
  grid-column: span 2 !important;
}

.moment-type-travel .moment-gallery img {
  border-radius: 0 !important;
  aspect-ratio: 1.1 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.moment-type-travel .moment-gallery figure:nth-child(3n) img {
  aspect-ratio: 1.8 !important;
}

.moment-type-travel .moment-gallery figure:hover img {
  transform: scale(1.05) !important;
}

/* Dreams Bucket List */
.moment-type-travel .moment-dreams {
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  margin-top: 24px !important;
}

.moment-type-travel .moment-dream {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 20px 24px !important;
  background: color-mix(in srgb, ${colors.surface} 30%, #ffffff) !important;
  border-radius: 18px !important;
  border: 1px solid color-mix(in srgb, ${colors.go} 6%, transparent) !important;
  transition: all 0.25s ease !important;
}

.moment-type-travel .moment-dream:hover {
  background: #ffffff !important;
  border-color: color-mix(in srgb, ${colors.go} 15%, transparent) !important;
  transform: translateX(6px) !important;
}

.moment-type-travel .moment-dream-text {
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 1rem !important;
  color: #1e293b !important;
  font-weight: 600 !important;
}

.moment-type-travel .moment-dream.done .moment-dream-text {
  color: #94a3b8 !important;
  text-decoration: line-through !important;
}

.moment-type-travel .moment-dream-mark {
  width: 24px !important;
  height: 24px !important;
  border-radius: 6px !important;
  border: 2px solid #cbd5e1 !important;
  display: grid !important;
  place-items: center !important;
  font-size: 0.78rem !important;
  font-weight: bold !important;
  background: #ffffff !important;
  color: transparent !important;
  order: 2 !important;
  transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.2) !important;
}

.moment-type-travel .moment-dream.done .moment-dream-mark {
  background: ${colors.go} !important;
  color: #ffffff !important;
  border-color: ${colors.go} !important;
  transform: scale(1.08) !important;
}



/* Global Hero Divider for Continuity */
.moment-hero-divider {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  max-width: 600px !important;
  margin: 32px auto 8px auto !important;
  padding: 0 24px !important;
  box-sizing: border-box !important;
}
.moment-divider-line {
  flex-grow: 1 !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, ${colors.go} 25%, transparent) 50%, transparent) !important;
}
.moment-divider-icon {
  display: grid !important;
  place-items: center !important;
  padding: 0 16px !important;
  color: ${colors.go} !important;
  opacity: 0.75 !important;
}
.moment-divider-icon svg {
  width: 18px !important;
  height: 18px !important;
  display: block !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 2px !important;
}


/* 3. BABY & KIDS: Cloudland & Playful cloud-shapes */
.moment-type-baby .moment-card,
.moment-type-kids .moment-card,
.moment-type-child .moment-card,
.moment-type-baby .moment-counter,
.moment-type-kids .moment-counter,
.moment-type-baby .moment-countdown,
.moment-type-kids .moment-countdown,
.moment-type-baby .moment-quote-wrap,
.moment-type-kids .moment-quote-wrap,
.moment-type-baby .moment-signature,
.moment-type-kids .moment-signature,
.moment-type-baby .moment-rsvp-form,
.moment-type-kids .moment-rsvp-form,
.moment-type-baby .moment-guestbook-form,
.moment-type-kids .moment-guestbook-form {
  border-radius: 36px !important;
  border: 2px dashed ${c.go}66 !important;
  background: rgba(255,255,255,0.85) !important;
  box-shadow: 0 16px 36px -12px ${c.go}12 !important;
}
.moment-type-baby .moment-card-icon,
.moment-type-kids .moment-card-icon {
  animation: kidsFloat 4s ease-in-out infinite;
  background: ${c.go}18 !important;
  border-radius: 50% !important;
  border: 0 !important;
}
@keyframes kidsFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.moment-type-baby input, .moment-type-baby textarea,
.moment-type-kids input, .moment-type-kids textarea {
  border-radius: 20px !important;
}

/* 4. BIRTHDAY & PARTY: Neon Glow & Confetti Shadows */
.moment-type-birthday .moment-card,
.moment-type-party .moment-card,
.moment-type-graduation .moment-card,
.moment-type-birthday .moment-counter,
.moment-type-party .moment-counter,
.moment-type-birthday .moment-countdown,
.moment-type-party .moment-countdown,
.moment-type-birthday .moment-quote-wrap,
.moment-type-party .moment-quote-wrap,
.moment-type-birthday .moment-signature,
.moment-type-party .moment-signature {
  box-shadow: 0 16px 40px -10px ${c.go}33, inset 0 1px 0 rgba(255,255,255,0.7) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
}
.moment-type-birthday .moment-countdown,
.moment-type-party .moment-countdown {
  animation: partyPulse 3.5s infinite alternate;
}
@keyframes partyPulse {
  0% { box-shadow: 0 16px 40px -10px ${c.go}24, inset 0 1px 0 rgba(255,255,255,0.7) !important; }
  100% { box-shadow: 0 16px 48px -4px ${c.go}44, inset 0 1px 0 rgba(255,255,255,0.7) !important; }
}

/* 5. MEMORIAL / REMEMBRANCE: Dignified Quiet Serenity */
.moment-type-memorial .moment-card,
.moment-type-remembrance .moment-card,
.moment-type-memorial .moment-counter,
.moment-type-remembrance .moment-counter,
.moment-type-memorial .moment-countdown,
.moment-type-remembrance .moment-countdown,
.moment-type-memorial .moment-quote-wrap,
.moment-type-remembrance .moment-quote-wrap,
.moment-type-memorial .moment-signature,
.moment-type-remembrance .moment-signature {
  background: rgba(255, 255, 255, 0.94) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: 0 6px 16px rgba(0,0,0,0.03) !important;
  border: 1px solid ${c.line} !important;
  border-radius: 12px !important;
}
.moment-type-memorial *, .moment-type-remembrance * {
  animation: none !important;
  text-shadow: none !important;
}
.moment-type-memorial .moment-card-icon,
.moment-type-remembrance .moment-card-icon {
  color: ${c.muted} !important;
  background: transparent !important;
  border: 0 !important;
}

/* 6. FAMILY / MOM / DAD (Warm & Cozy) */
main.moment-type-family,
main.moment-type-mom,
main.moment-type-dad {
  background: 
    radial-gradient(circle at 12% 24%, color-mix(in srgb, ${c.go} 6%, transparent) 0%, transparent 45%),
    radial-gradient(circle at 88% 76%, color-mix(in srgb, ${c.go} 8%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-family .moment-card,
main.moment-type-mom .moment-card,
main.moment-type-dad .moment-card,
main.moment-type-family .moment-counter,
main.moment-type-mom .moment-counter,
main.moment-type-dad .moment-counter,
main.moment-type-family .moment-countdown,
main.moment-type-mom .moment-countdown,
main.moment-type-dad .moment-countdown,
main.moment-type-family .moment-quote-wrap,
main.moment-type-mom .moment-quote-wrap,
main.moment-type-dad .moment-quote-wrap,
main.moment-type-family .moment-signature,
main.moment-type-mom .moment-signature,
main.moment-type-dad .moment-signature {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 16px 40px -12px color-mix(in srgb, ${c.go} 5%, rgba(0,0,0,0.03)) !important;
  border-radius: 20px !important;
}

/* 7. PET (Playful & Round) */
main.moment-type-pet {
  background: 
    radial-gradient(circle at 25% 25%, color-mix(in srgb, ${c.go} 8%, transparent) 0%, transparent 40%),
    radial-gradient(circle at 75% 75%, color-mix(in srgb, ${c.go} 10%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-pet .moment-card,
main.moment-type-pet .moment-counter,
main.moment-type-pet .moment-countdown,
main.moment-type-pet .moment-quote-wrap,
main.moment-type-pet .moment-signature {
  background: #ffffff !important;
  border-radius: 30px !important;
  border: 1px solid color-mix(in srgb, ${c.go} 8%, transparent) !important;
  box-shadow: 0 12px 32px -8px color-mix(in srgb, ${c.go} 6%, rgba(0,0,0,0.02)) !important;
}
main.moment-type-pet .moment-card-icon {
  background: color-mix(in srgb, ${c.go} 10%, transparent) !important;
  border-radius: 50% !important;
  padding: 8px !important;
  display: inline-flex !important;
}

/* 8. MEMORIES & PHOTO ALBUMS (Polaroid Retro) */
main.moment-type-memory,
main.moment-type-photo {
  background: 
    radial-gradient(circle at 10% 20%, color-mix(in srgb, ${c.go} 5%, transparent) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, color-mix(in srgb, ${c.go} 8%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-memory .moment-card,
main.moment-type-photo .moment-card,
main.moment-type-memory .moment-counter,
main.moment-type-photo .moment-counter,
main.moment-type-memory .moment-countdown,
main.moment-type-photo .moment-countdown,
main.moment-type-memory .moment-quote-wrap,
main.moment-type-photo .moment-quote-wrap,
main.moment-type-memory .moment-signature,
main.moment-type-photo .moment-signature {
  background: #ffffff !important;
  border-radius: 8px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  padding: 24px 24px 44px 24px !important;
  box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.06), 0 8px 16px -6px rgba(0, 0, 0, 0.04) !important;
  position: relative !important;
}
main.moment-type-memory .moment-card::after,
main.moment-type-photo .moment-card::after,
main.moment-type-memory .moment-counter::after,
main.moment-type-photo .moment-counter::after,
main.moment-type-memory .moment-countdown::after,
main.moment-type-photo .moment-countdown::after,
main.moment-type-memory .moment-quote-wrap::after,
main.moment-type-photo .moment-quote-wrap::after,
main.moment-type-memory .moment-signature::after,
main.moment-type-photo .moment-signature::after {
  content: "" !important;
  position: absolute !important;
  bottom: 12px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: 40px !important;
  height: 4px !important;
  background: color-mix(in srgb, ${c.go} 15%, transparent) !important;
  border-radius: 99px !important;
  opacity: 0.5 !important;
}

/* 9. SACRED CELEBRATIONS (Ethereal Grace) */
main.moment-type-communion,
main.moment-type-baptism {
  background: 
    radial-gradient(circle at 50% 0%, color-mix(in srgb, ${c.go} 8%, transparent) 0%, transparent 50%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-communion .moment-card,
main.moment-type-baptism .moment-card,
main.moment-type-communion .moment-counter,
main.moment-type-baptism .moment-counter,
main.moment-type-communion .moment-countdown,
main.moment-type-baptism .moment-countdown,
main.moment-type-communion .moment-quote-wrap,
main.moment-type-baptism .moment-quote-wrap,
main.moment-type-communion .moment-signature,
main.moment-type-baptism .moment-signature {
  background: rgba(255, 255, 255, 0.96) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 10px 30px -10px color-mix(in srgb, ${c.go} 6%, rgba(0, 0, 0, 0.03)) !important;
}

/* 10. FRIENDSHIP & PORTFOLIOS (Modern Collage) */
main.moment-type-friendship,
main.moment-type-portfolio {
  background: 
    radial-gradient(circle at 15% 15%, color-mix(in srgb, ${c.go} 10%, transparent) 0%, transparent 45%),
    radial-gradient(circle at 85% 85%, color-mix(in srgb, ${c.go} 12%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-friendship .moment-card,
main.moment-type-portfolio .moment-card,
main.moment-type-friendship .moment-counter,
main.moment-type-portfolio .moment-counter,
main.moment-type-friendship .moment-countdown,
main.moment-type-portfolio .moment-countdown,
main.moment-type-friendship .moment-quote-wrap,
main.moment-type-portfolio .moment-quote-wrap,
main.moment-type-friendship .moment-signature,
main.moment-type-portfolio .moment-signature {
  background: #ffffff !important;
  border-radius: 24px 8px 24px 8px !important;
  border: 1.5px solid color-mix(in srgb, ${c.go} 6%, transparent) !important;
  box-shadow: 0 16px 36px -12px color-mix(in srgb, ${c.go} 8%, rgba(0,0,0,0.03)) !important;
}

/* 11. CHRISTMAS (Warm Festive Glow) */
main.moment-type-christmas {
  background: 
    radial-gradient(circle at 10% 20%, color-mix(in srgb, ${c.go} 12%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 90% 80%, color-mix(in srgb, ${c.go} 15%, transparent) 0%, transparent 50%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-christmas .moment-card,
main.moment-type-christmas .moment-counter,
main.moment-type-christmas .moment-countdown,
main.moment-type-christmas .moment-quote-wrap,
main.moment-type-christmas .moment-signature {
  background: rgba(255, 255, 255, 0.90) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  border-radius: 24px !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  box-shadow: 0 20px 40px -10px color-mix(in srgb, ${c.go} 12%, rgba(0,0,0,0.04)) !important;
}

/* 12. GENERAL EVENT (Sophisticated Minimalist) */
main.moment-type-free {
  background: 
    radial-gradient(circle at 20% 20%, color-mix(in srgb, ${c.go} 4%, transparent) 0%, transparent 45%),
    radial-gradient(circle at 80% 80%, color-mix(in srgb, ${c.go} 6%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, ${c.surface} 0%, ${c.bl} 100%) !important;
  padding-bottom: 80px !important;
}
main.moment-type-free .moment-card,
main.moment-type-free .moment-counter,
main.moment-type-free .moment-countdown,
main.moment-type-free .moment-quote-wrap,
main.moment-type-free .moment-signature {
  background: #ffffff !important;
  border-radius: 12px !important;
  border: 1px solid ${c.line} !important;
  box-shadow: 0 8px 24px -6px rgba(0,0,0,0.03) !important;
}
`;
}


const MOMENT_SECTION_ICONS = {
  intro: "✨",
  dedication: "💌",
  timeline: "🗺️",
  rsvp: "📲",
  guestbook: "📖",
  gallery: "📸",
  video: "🎬",
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

function renderMomentSection(key, section, colors, momentType = "free", fonts = null, slug = "") {
  const images = Array.isArray(section.images) ? section.images.filter(url => safeUrl(url) !== "#").slice(0, 24) : [];
  let icon = MOMENT_SECTION_ICONS[key] || "•";
  if (momentType === "travel") {
    const travelSvgs = {
      intro: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, // Shield / Badge
      dedication: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2H2v20h20V2z"/><path d="M22 2L12 13 2 2"/></svg>`, // Envelope Letter
      timeline: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`, // Compass navigation
      rsvp: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`, // Boarding ticket stub calendar
      guestbook: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, // Book/Journal
      gallery: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`, // Polaroid Camera Outline
      promises: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`, // Heart/Promises
      dreams: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, // Star / Dream
      countdown: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, // Map scale or clock
      music: `<svg class="travel-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>` // Music note
    };
    if (travelSvgs[key]) {
      icon = travelSvgs[key];
    }
  } else if (momentType === "love" || momentType === "anniversary" || momentType === "wedding") {
    const loveSvgs = {
      intro: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      dedication: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2H2v20h20V2z"/><path d="M22 2L12 13 2 2"/></svg>`,
      timeline: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
      rsvp: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
      guestbook: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
      gallery: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
      promises: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="6"/><path d="M12 8V2l4 2-4 2z"/></svg>`,
      dreams: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      countdown: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      music: `<svg class="love-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
    };
    if (loveSvgs[key]) {
      icon = loveSvgs[key];
    }
  }
  const head = (title) => `<div class="moment-card-head"><span class="moment-card-icon">${icon}</span><strong>${escapeHtml(title || "Sezione")}</strong></div>`;
  const rv = `moment-card moment-card-${escapeHtml(key)} rv`;

  if (key === "quote" && section.body) {
    const titleHead = section.title ? head(section.title) : "";
    return `<article class="${rv} moment-quote-wrap">${titleHead}<span class="moment-quote-mark">"</span><p class="moment-quote-text">${escapeHtml(section.body)}</p>${section.author ? `<span class="moment-quote-author">— ${escapeHtml(section.author)}</span>` : ""}</article>`;
  }

  if (key === "signature") {
    const label = section.title || "Questo momento appartiene a";
    return `<article class="${rv} moment-signature"><p class="moment-signature-label">${escapeHtml(label)}</p><p class="moment-signature-name">${escapeHtml(section.sign_name || "Voi")}</p>${section.sign_subtitle ? `<p class="moment-signature-sub">${escapeHtml(section.sign_subtitle)}</p>` : section.body ? `<p class="moment-signature-sub">${escapeHtml(section.body)}</p>` : ""}</article>`;
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
      return `<article class="${rv}">${head(section.title || "Conferma presenza")}<p class="moment-empty-hint">Inserisci il numero WhatsApp dell'organizzatore nell'editor e salva: senza WhatsApp la sezione non appare agli invitati.</p></article>`;
    }
    const { html: optionalFields, customFields } = renderRsvpOptionalFields(section);
    const eventBadge = renderRsvpEventBadge(eventName, fonts);
    const rsvpIntro = rsvpWhatsAppIntro(momentType, eventName);
    const customAttr = attr(JSON.stringify(customFields.map(field => ({ id: field.id, label: field.label }))));
    return `<article class="${rv} moment-rsvp" data-rsvp-wa="${attr(wa)}" data-rsvp-event="${attr(eventName)}" data-rsvp-intro="${attr(rsvpIntro)}" data-rsvp-custom="${customAttr}">${head(section.title || "Conferma presenza")}${eventBadge}${section.body ? `<p class="moment-rsvp-intro">${escapeHtml(section.body)}</p>` : ""}<p class="moment-rsvp-status" data-rsvp-status hidden role="status" aria-live="polite"></p><form class="moment-rsvp-form" data-rsvp-form><label>Nome e cognome<input type="text" name="rsvp_name" required placeholder="Es. Marco Rossi" autocomplete="name"></label><fieldset class="moment-rsvp-attending"><legend>Vieni?</legend><label><input type="radio" name="rsvp_attending" value="Sì, ci sarò" checked> Sì, ci sarò</label><label><input type="radio" name="rsvp_attending" value="No, non posso"> No, non posso</label><label><input type="radio" name="rsvp_attending" value="Forse"> Forse</label></fieldset>${optionalFields}<button type="submit" class="moment-rsvp-submit">Invia su WhatsApp</button></form></article>`;
  }

  if (key === "guestbook") {
    const pageSlug = String(slug || "").trim();
    return `<article class="${rv} moment-guestbook" data-guestbook-slug="${attr(pageSlug)}">${head(section.title || "Libro degli ospiti")}${section.body ? `<p class="moment-guestbook-intro">${escapeHtml(section.body)}</p>` : ""}<p class="moment-guestbook-status" data-guestbook-status hidden role="status" aria-live="polite"></p><form class="moment-guestbook-form" data-guestbook-form><label>Il tuo nome<input type="text" name="guestbook_name" required placeholder="Es. Laura Bianchi" autocomplete="name"></label><label>Il tuo messaggio<textarea name="guestbook_message" rows="4" required placeholder="Scrivi un pensiero, un augurio o un ricordo…"></textarea></label><button type="submit" class="moment-guestbook-submit">Invia messaggio</button></form><div class="moment-guestbook-list" data-guestbook-list aria-live="polite"></div></article>`;
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

  if (key === "promises") {
    const items = resolveListItems(section, "promise");
    if (!items.length) return `<article class="${rv}">${head(section.title || "Promesse")}<p class="moment-empty-hint">Aggiungi le promesse, una card ciascuna.</p></article>`;
    return `<article class="${rv}">${head(section.title || "Promesse")}${listIntroHtml(section.body)}<div class="moment-promises">${items.map(item => `<div class="moment-promise"><span class="moment-promise-emoji">${escapeHtml(item.emoji)}</span><span>${escapeHtml(item.text)}</span></div>`).join("")}</div></article>`;
  }

  if (key === "dreams") {
    const items = resolveListItems(section, "dream");
    if (!items.length) return `<article class="${rv}">${head(section.title || "Sogni")}<p class="moment-empty-hint">Aggiungi i sogni da realizzare insieme.</p></article>`;
    return `<article class="${rv}">${head(section.title || "Sogni")}${listIntroHtml(section.body)}<div class="moment-dreams">${items.map(item => `<div class="moment-dream ${item.done ? "done" : ""}"><span class="moment-dream-mark">${item.done ? "✓" : ""}</span><span class="moment-dream-text">${escapeHtml(item.text)}</span></div>`).join("")}</div></article>`;
  }

  if (key === "rituals") {
    const items = resolveListItems(section, "ritual");
    if (!items.length) return `<article class="${rv}">${head(section.title || "Rituali")}<p class="moment-empty-hint">Aggiungi i rituali quotidiani.</p></article>`;
    return `<article class="${rv}">${head(section.title)}${listIntroHtml(section.body)}<div class="moment-rituals">${items.map(item => `<div class="moment-ritual"><span class="moment-promise-emoji">${escapeHtml(item.emoji)}</span><span>${escapeHtml(item.text)}</span></div>`).join("")}</div></article>`;
  }

  if (key === "numbers") {
    const items = resolveListItems(section, "number");
    if (!items.length) return `<article class="${rv}">${head(section.title || "I nostri numeri")}<p class="moment-empty-hint">Es. «365 · giorni insieme».</p></article>`;
    return `<article class="${rv}">${head(section.title)}${listIntroHtml(section.body)}<div class="moment-numbers">${items.map(item => `<div class="moment-number">${item.value ? `<b>${escapeHtml(item.value)}</b>` : ""}${item.label ? `<small>${escapeHtml(item.label)}</small>` : ""}</div>`).join("")}</div></article>`;
  }

  if (key === "countdown" && section.target_date) {
    const target = String(section.target_date).replace(" ", "T");
    const imageUrl = safeUrl(section.image_url || section.images?.[0] || "") !== "#" ? safeUrl(section.image_url || section.images?.[0] || "") : "";
    const photo = imageUrl ? `<img class="moment-countdown-photo" src="${attr(imageUrl)}" alt="">` : "";
    return `<section class="moment-countdown rv" data-target="${attr(target.length > 10 ? target : target + "T12:00:00")}">${photo}<p class="moment-countdown-label">${escapeHtml(section.title || "Conto alla rovescia")}</p>${section.event_label ? `<p class="moment-countdown-event">${escapeHtml(section.event_label)}</p>` : ""}${section.body ? `<p class="moment-countdown-note">${escapeHtml(section.body)}</p>` : ""}<div class="moment-countdown-grid"><span class="moment-countdown-unit"><b data-cd="days">0</b><small>giorni</small></span><span class="moment-countdown-unit"><b data-cd="hours">0</b><small>ore</small></span><span class="moment-countdown-unit"><b data-cd="minutes">0</b><small>minuti</small></span></div></section>`;
  }

  if (key === "music" && (section.spotify_url || section.youtube_url || section.audio_url || section.image_url)) {
    const spotify = spotifyEmbedFromUrl(section.spotify_url);
    const youtube = youtubeEmbedFromUrl(section.youtube_url);
    const imageUrl = safeUrl(section.image_url || "") !== "#" ? safeUrl(section.image_url || "") : "";
    const photo = imageUrl ? `<img class="moment-music-photo" src="${attr(imageUrl)}" alt="" loading="lazy">` : "";
    const audioBlock = section.audio_url
      ? `<div class="moment-audio">${section.audio_title ? `<p class="moment-audio-title">${escapeHtml(section.audio_title)}</p>` : ""}${section.audio_description ? `<p class="moment-audio-desc">${escapeHtml(section.audio_description)}</p>` : ""}<audio src="${attr(section.audio_url)}" controls></audio></div>`
      : "";
    return `<article class="${rv}">${head(section.title || "La nostra canzone")}${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}${photo}${spotify ? `<div class="moment-spotify"><iframe src="${attr(spotify)}" loading="lazy" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe></div>` : ""}${youtube ? `<div class="moment-youtube"><iframe src="${attr(youtube)}" loading="lazy" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen title="Video YouTube"></iframe></div>` : ""}${audioBlock}</article>`;
  }

  if (key === "letter_future" && (section.body || section.unlock_date || letterMediaItems(section).length)) {
    const unlocked = isLetterUnlocked(section.unlock_date);
    const when = formatUnlockDate(section.unlock_date);
    if (!unlocked) {
      return `<article class="${rv}">${head(section.title || "Lettera al futuro")}<div class="moment-sealed"><div class="moment-sealed-icon" aria-hidden="true">🔒</div><p>Questa lettera è sigillata${when ? ` fino al <strong>${escapeHtml(when)}</strong>` : ""}.</p><p class="moment-sealed-date">Torna in quella data per rileggerla.</p></div></article>`;
    }
    const recipient = section.recipient ? `<p class="moment-letter-to">Caro/a ${escapeHtml(section.recipient)},</p>` : "";
    const media = renderLetterFutureMedia(section);
    return `<article class="${rv}">${head(section.title || "Lettera al futuro")}<div class="moment-letter">${recipient}${section.body ? `<p>${escapeHtml(section.body)}</p>` : ""}${media}<span class="moment-letter-heart" aria-hidden="true">♥</span></div></article>`;
  }

  if (key === "pet" && (section.pet_name || section.body || section.pet_photo)) {
    const photo = safeUrl(section.pet_photo || "") !== "#" ? `<img class="moment-pet-photo" src="${attr(section.pet_photo)}" alt="${attr(section.pet_name || "Pet")}">` : "";
    const name = section.pet_name ? `<p class="moment-pet-name">${escapeHtml(section.pet_emoji || "🐾")} ${escapeHtml(section.pet_name)}</p>` : "";
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    return `<article class="${rv}">${head(section.title || "Il nostro compagno")}<div class="moment-pet-card">${photo}${name}${body}</div></article>`;
  }

  if (key === "gallery") {
    const media = normalizeMomentMedia(section).filter(item => item.type === "image");
    const headBlock = head(section.title || "Galleria foto");
    if (!media.length) {
      return `<article class="${rv}">${headBlock}<p class="moment-gallery-empty">Le foto verranno aggiunte presto.</p></article>`;
    }
    const cards = media.map((item, idx) => {
      const caption = item.title ? `<span class="moment-gallery-caption">${escapeHtml(item.title)}</span>` : "";
      return `<figure class="moment-gallery-figure"><img src="${attr(item.url)}" alt="${attr(item.title || "")}" loading="lazy" data-media-open="${idx}">${caption}</figure>`;
    }).join("");
    const json = escapeHtml(JSON.stringify(media));
    return `<article class="${rv}">${head(section.title || "Galleria foto")}<div class="moment-gallery">${cards}</div><script type="application/json" class="moment-gallery-data">${json}</script></article>`;
  }

  if (key === "video") {
    const videoUrl = safeUrl(section.video_url || "") !== "#" ? safeUrl(section.video_url || "") : "";
    if (!videoUrl) {
      return `<article class="${rv}">${head(section.title || "Video")}<p class="moment-empty-hint">Carica un video MP4 o MOV nell'editor.</p></article>`;
    }
    const title = section.video_title ? `<p class="moment-video-title">${escapeHtml(section.video_title)}</p>` : "";
    const desc = section.video_description ? `<p class="moment-video-desc">${escapeHtml(section.video_description)}</p>` : "";
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    return `<article class="${rv}">${head(section.title || "Video")}${body}<div class="moment-video-wrap"><video src="${attr(videoUrl)}" controls playsinline preload="metadata"></video>${title}${desc}</div></article>`;
  }

  if (key === "quote" && !section.body) {
    const titleHead = section.title ? head(section.title) : "";
    return `<article class="${rv} moment-quote-wrap">${titleHead}<span class="moment-quote-mark">"</span><p class="moment-quote-text moment-empty-hint">Aggiungi la citazione nell'editor.</p></article>`;
  }

  if (key === "music" && !section.spotify_url && !section.youtube_url && !section.audio_url && !section.image_url) {
    return `<article class="${rv}">${head(section.title || "Musica")}<p class="moment-empty-hint">Aggiungi Spotify, YouTube, un audio o un'immagine.</p></article>`;
  }

  if (key === "pet" && !section.pet_name && !section.body && !section.pet_photo) {
    return `<article class="${rv}">${head(section.title || "Il nostro compagno")}<p class="moment-empty-hint">Aggiungi nome, foto e racconto.</p></article>`;
  }

  if (key === "letter_future" && !section.body && !section.unlock_date && !letterMediaItems(section).length) {
    return `<article class="${rv}">${head(section.title || "Lettera al futuro")}<p class="moment-empty-hint">Scrivi la lettera, scegli la data di apertura e opzionalmente allega fino a 2 foto, 1 video e 1 audio.</p></article>`;
  }

  if (key === "countdown" && !section.target_date) {
    return `<article class="${rv}">${head(section.title || "Countdown")}<p class="moment-empty-hint">Imposta data e ora dell'evento.</p></article>`;
  }

  if (key === "dedication" && !section.body && !section.recipient) {
    return `<article class="${rv}">${head(section.title || "Dedica")}<p class="moment-empty-hint">Scrivi la dedica personale.</p></article>`;
  }

  if (key === "signature" && !section.sign_name && !section.sign_subtitle) {
    const label = section.title || "Questo momento appartiene a";
    return `<article class="${rv} moment-signature"><p class="moment-signature-label">${escapeHtml(label)}</p><p class="moment-empty-hint">Aggiungi i nomi nella firma finale.</p></article>`;
  }

  if (key === "intro" && !section.body) {
    return `<article class="${rv}">${head(section.title || "Introduzione")}<p class="moment-empty-hint">Racconta chi siete e perché questo momento conta.</p></article>`;
  }

  let gallery = "";
  if (images.length) {
    gallery = `<div class="moment-gallery">${images.map(url => `<img src="${attr(url)}" alt="" loading="lazy">`).join("")}</div>`;
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
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://app.khamakeymoments.com").replace(/\/$/, "");
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

function actionIcon(kind){
  const icons = {
    wa:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="#25D366"/><path fill="#fff" d="M16.1 7.6a8.3 8.3 0 0 0-7.2 12.4l-1.1 4.2 4.3-1.1a8.3 8.3 0 1 0 4-15.5Zm0 15a6.8 6.8 0 0 1-3.5-1l-.25-.15-2.55.67.68-2.48-.17-.26A6.78 6.78 0 1 1 16.1 22.6Z"/></svg>',
    phone:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#1B2A5E" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.11a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92Z"/></svg>',
    maps:'<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#4285F4" d="M16 3a10 10 0 0 0-10 10c0 7.5 10 16 10 16s10-8.5 10-16A10 10 0 0 0 16 3Z"/><circle cx="16" cy="13" r="4" fill="#fff"/></svg>',
    reviews:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#fff"/><path fill="#4285F4" d="M27 16.3c0-.9-.1-1.7-.2-2.5H16v4.5h6.2a5.3 5.3 0 0 1-2.3 3.4v3h3.8c2.2-2.1 3.3-5 3.3-8.4Z"/></svg>'
  };
  return icons[kind] || '';
}

function action(label, href, eventType, className) {
  return `<a class="action brand-action-${className}" href="${attr(href)}" data-event="${eventType}">${actionIcon(className)}<span>${escapeHtml(label)}</span></a>`;
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

// Pagine pubbliche renderizzate dal Worker (/p/, /m/): stessa famiglia di header di
// pages/_headers, con una CSP dedicata (qui non serve esm.sh, servono gli embed YouTube/Spotify).
// cuxlwaocjqwzluycznyp.supabase.co in img-src/media-src: pagine più vecchie hanno foto caricate
// direttamente su Supabase Storage prima della migrazione a R2 (verificato via query sui dati
// reali il 2026-07-11 — NON un wildcard, solo questo dominio specifico. Non allargare a "https:".)
const PUBLIC_PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://app.khamakeymoments.com https://khamakey-app.pages.dev",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://img.youtube.com https://cuxlwaocjqwzluycznyp.supabase.co https://link.khamakeymoments.com https://khamakey-nfc.khamakey-nfc.workers.dev",
  "media-src 'self' blob: https://cuxlwaocjqwzluycznyp.supabase.co https://link.khamakeymoments.com https://khamakey-nfc.khamakey-nfc.workers.dev",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://open.spotify.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests"
].join("; ");

function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "SAMEORIGIN",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": PUBLIC_PAGE_CSP,
      ...extra
    }
  });
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

function sanitizeRsvpValues(values) {
  const custom = values.custom && typeof values.custom === "object" ? values.custom : {};
  const safeCustom = {};
  for (const [key, value] of Object.entries(custom)) {
    const safeKey = String(key || "").trim().slice(0, 40);
    if (!safeKey) continue;
    safeCustom[safeKey] = String(value || "").trim().slice(0, 400);
  }
  return {
    name: String(values.name || "").trim().slice(0, 160),
    attending: String(values.attending || "").trim().slice(0, 80),
    guests: String(values.guests || "").trim().slice(0, 8),
    notes: String(values.notes || "").trim().slice(0, 1200),
    phone: String(values.phone || "").trim().slice(0, 40),
    email: String(values.email || "").trim().slice(0, 160),
    custom: safeCustom,
    source: String(values.source || "public_page").trim().slice(0, 40)
  };
}

function sanitizeGuestbookValues(values) {
  return {
    name: String(values.name || "").trim().slice(0, 160),
    message: String(values.message || "").trim().slice(0, 1200)
  };
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

// Traduce verso TUTTE le lingue richieste in UNA sola chiamata OpenAI (invece di una per lingua):
// stesso risultato, −75% di chiamate a pagamento. Ritorna { locale: { fieldPath: testo } }.
async function translateStringsAllLocales(env, strings, locales) {
  const entries = Object.entries(strings || {});
  if (!entries.length || !locales.length) return {};
  if (!openaiConfigured(env)) {
    throw new Error("Servizio traduzioni non ancora attivo. Riprova tra poco.");
  }
  const localeList = locales.map(l => `${l} (${LOCALE_LABELS[l] || l})`).join(", ");
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
          content: `Translate the given Italian business page fields into these languages: ${localeList}. Return ONLY valid JSON shaped as { "<localeCode>": { "<fieldKey>": "<translation>" } } covering every requested locale code and every field key. Keep brand names, prices, phone numbers, emails and URLs unchanged. Use natural tourist-friendly language.`
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
    console.error("OpenAI translate-all error", response.status, detail.slice(0, 300));
    throw new Error("Traduzione temporaneamente non disponibile.");
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("OpenAI JSON parse error (all locales)", error, content.slice(0, 300));
    throw new Error("Risposta traduzione non valida.");
  }
  const result = {};
  for (const locale of locales) {
    const localeMap = parsed[locale] && typeof parsed[locale] === "object" ? parsed[locale] : {};
    const out = {};
    entries.forEach(([path]) => {
      const translated = String(localeMap[path] || "").trim();
      if (translated) out[path] = translated;
    });
    result[locale] = out;
  }
  return result;
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
  const user = await supabaseUser(env, jwt);
  if (!user?.id) return false;
  // SICUREZZA: non rimuovere il filtro profile_id — vedi verifyMediaScope sopra, stesso IDOR.
  const response = await supabaseUserRest(
    env,
    jwt,
    `businesses?id=eq.${encodeURIComponent(cleanId)}&profile_id=eq.${encodeURIComponent(user.id)}&select=id`,
    { method: "GET", headers: { Accept: "application/json" } }
  );
  if (response.ok) {
    const rows = await response.json();
    if (Array.isArray(rows) && rows.length > 0) return true;
  }
  return Boolean(await verifyPlatformAdmin(env, jwt));
}

// Traduzioni già salvate, indicizzate come existing[locale][fieldPath] = { hash, text }.
async function fetchExistingBusinessTranslations(env, jwt, businessId) {
  const response = await supabaseUserRest(
    env,
    jwt,
    `business_page_i18n?business_id=eq.${encodeURIComponent(businessId)}&select=locale,field_path,source_hash,translated_text`,
    { method: "GET", headers: { Accept: "application/json" } }
  );
  if (!response.ok) return {};
  const rows = await response.json().catch(() => []);
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach(row => {
    if (!row?.locale || !row?.field_path) return;
    map[row.locale] = map[row.locale] || {};
    map[row.locale][row.field_path] = {
      hash: String(row.source_hash || ""),
      text: String(row.translated_text || "")
    };
  });
  return map;
}

// Risparmio: traduce SOLO i campi cambiati o mancanti (confronto source_hash), in una sola
// chiamata batch. Ritorna le traduzioni complete (fresche + esistenti riusate) e le sole righe
// nuove da salvare. Se nulla è cambiato, zero chiamate OpenAI.
async function buildIncrementalTranslations(env, jwt, businessId, strings, locales) {
  const existing = await fetchExistingBusinessTranslations(env, jwt, businessId);
  const fields = Object.keys(strings);
  const currentHash = {};
  fields.forEach(field => { currentHash[field] = hashText(strings[field]); });

  // Un campo va (ri)tradotto se per QUALCHE lingua manca o l'hash della sorgente è diverso.
  const staleFields = fields.filter(field =>
    locales.some(locale => (existing[locale]?.[field]?.hash || "") !== currentHash[field])
  );

  let fresh = {};
  if (staleFields.length) {
    const staleStrings = {};
    staleFields.forEach(field => { staleStrings[field] = strings[field]; });
    fresh = await translateStringsAllLocales(env, staleStrings, locales);
  }

  const translations = {};
  const rows = [];
  const nowIso = new Date().toISOString();
  for (const locale of locales) {
    translations[locale] = {};
    for (const field of fields) {
      const freshText = fresh[locale]?.[field];
      if (freshText) {
        translations[locale][field] = freshText;
        rows.push({
          business_id: businessId,
          locale,
          field_path: field,
          source_text: String(strings[field] || ""),
          source_hash: currentHash[field],
          translated_text: freshText,
          updated_at: nowIso
        });
      } else if (existing[locale]?.[field]?.text) {
        translations[locale][field] = existing[locale][field].text;
      }
    }
  }
  return { translations, rows, translatedFields: staleFields.length, skippedFields: fields.length - staleFields.length };
}

async function upsertBusinessTranslationRows(env, jwt, rows) {
  if (!rows.length) return;
  const response = await supabaseUserRest(env, jwt, "business_page_i18n", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("business_page_i18n upsert skipped", response.status, detail.slice(0, 200));
  }
}

async function enableBusinessI18nSettings(env, jwt, businessId) {
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
    if (!await checkRateLimit(env, `i18n:${businessId}`, 10, 60)) {
      return tooManyRequests();
    }

    const strings = body?.strings && typeof body.strings === "object"
      ? body.strings
      : extractTranslatableStrings(body?.state || {});
    const entries = Object.entries(strings);
    if (!entries.length) {
      return cors(json({ error: "Aggiungi almeno nome o descrizione prima di attivare le lingue." }, 400));
    }

    const { translations, rows, translatedFields, skippedFields } =
      await buildIncrementalTranslations(env, jwt, businessId, strings, TARGET_LOCALES);
    await upsertBusinessTranslationRows(env, jwt, rows).catch(error => console.warn("upsert i18n", error));
    await enableBusinessI18nSettings(env, jwt, businessId).catch(error => console.warn("enable i18n", error));

    return cors(json({
      ok: true,
      locales: TARGET_LOCALES,
      translations,
      stringsCount: entries.length,
      translatedFields,
      skippedFields
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

    const { translations, rows, translatedFields, skippedFields } =
      await buildIncrementalTranslations(env, jwt, businessId, strings, TARGET_LOCALES);
    await upsertBusinessTranslationRows(env, jwt, rows);
    return cors(json({ ok: true, translations, translatedFields, skippedFields }));
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

function paypalWebhookConfigured(env) {
  return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID);
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
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://app.khamakeymoments.com").replace(/\/$/, "");
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

// PayPal non firma con un semplice HMAC locale: la verifica richiede una chiamata autenticata
// alla sua stessa API (verify-webhook-signature). https://developer.paypal.com/api/rest/webhooks/
function paypalApiBase(env) {
  return env.PAYPAL_ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function paypalAccessToken(env) {
  const response = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) throw new Error(`PayPal oauth ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

async function verifyPayPalWebhook(request, webhookEvent, env) {
  if (!env.PAYPAL_WEBHOOK_ID) return false;
  const transmissionId = request.headers.get("paypal-transmission-id") || "";
  const transmissionTime = request.headers.get("paypal-transmission-time") || "";
  const certUrl = request.headers.get("paypal-cert-url") || "";
  const authAlgo = request.headers.get("paypal-auth-algo") || "";
  const transmissionSig = request.headers.get("paypal-transmission-sig") || "";
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

  const accessToken = await paypalAccessToken(env);
  const response = await fetch(`${paypalApiBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: webhookEvent
    })
  });
  if (!response.ok) return false;
  const result = await response.json().catch(() => ({}));
  return result?.verification_status === "SUCCESS";
}

// Resend firma i webhook con lo standard Svix: svix-id/svix-timestamp/svix-signature.
// https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
async function verifyResendWebhook(request, rawBody, secret) {
  if (!secret) return false;
  const svixId = request.headers.get("svix-id") || "";
  const svixTimestamp = request.headers.get("svix-timestamp") || "";
  const svixSignature = request.headers.get("svix-signature") || "";
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = Number(svixTimestamp);
  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (!Number.isFinite(age) || age > 300 || age < -300) return false;

  const secretBody = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const secretBytes = Uint8Array.from(atob(secretBody), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));

  const provided = svixSignature
    .split(" ")
    .map(part => part.split(",")[1])
    .filter(Boolean);
  return provided.some(sig => timingSafeEqual(sig, expected));
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
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://app.khamakeymoments.com").replace(/\/$/, "");
  const workerBase = String(env.WORKER_PUBLIC_BASE || "https://link.khamakeymoments.com").replace(/\/$/, "");
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

  const eventType = payload?.event_type || "unknown";
  const externalId = payload?.id || payload?.resource?.id || null;

  if (!paypalWebhookConfigured(env)) {
    await logWebhookEvent(env, "paypal", eventType, externalId, { note: "paypal webhook not configured" }, "skipped");
    return json({ ok: true, skipped: true, reason: "paypal_webhook_not_configured" });
  }

  let verified = false;
  try {
    verified = await verifyPayPalWebhook(request, payload, env);
  } catch (error) {
    console.error("verifyPayPalWebhook", error);
  }
  if (!verified) return json({ error: "Firma PayPal non valida." }, 401);

  await logWebhookEvent(env, "paypal", eventType, externalId, payload, "received");
  return json({ ok: true, received: true, type: eventType });
}

async function handleResendWebhook(request, env) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return json({ error: "RESEND_WEBHOOK_SECRET non configurata nel Worker." }, 503);
  }
  const rawBody = await request.text();
  if (!await verifyResendWebhook(request, rawBody, env.RESEND_WEBHOOK_SECRET)) {
    return json({ error: "Firma webhook non valida." }, 401);
  }
  let payload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "JSON non valido." }, 400);
  }
  const eventType = payload?.type || "email.event";
  const externalId = payload?.data?.email_id || payload?.created_at || null;
  await logWebhookEvent(env, "resend", eventType, externalId ? String(externalId) : null, payload, "processed");
  return json({ ok: true, received: true });
}

async function handleMomentAnniversariesCron(request, env) {
  const ingestKey = env.WEBHOOK_INGEST_KEY || env.ANALYTICS_INGEST_KEY;
  const headerKey = request.headers.get("x-khamakey-cron-key") || "";
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const provided = String(body.ingest_key || headerKey || "").trim();
  if (!ingestKey || !timingSafeEqual(provided, ingestKey)) {
    return json({ error: "Non autorizzato" }, 401);
  }
  const result = await runMomentAnniversaryJob(env, body.day || null);
  const letter = await runMomentLetterUnlockJob(env, body.day || null);
  const cleanup = await runRateLimitCleanupJob(env);
  return json({ anniversaries: result, letter_unlock: letter, rate_limit_cleanup: cleanup });
}

async function runMomentAnniversaryJob(env, dayOverride = null) {
  const ingestKey = env.WEBHOOK_INGEST_KEY || env.ANALYTICS_INGEST_KEY;
  if (!ingestKey) return { ok: false, error: "ingest_key_missing" };
  if (!env.RESEND_API_KEY) return { ok: false, error: "resend_not_configured" };

  const day = dayOverride || new Date().toISOString().slice(0, 10);
  const due = await rpc(env, "due_moment_anniversaries", {
    p_day: day,
    p_ingest_key: ingestKey
  }).catch(error => {
    console.error("due_moment_anniversaries", error);
    return null;
  });
  const rows = Array.isArray(due) ? due : [];
  const origin = env.WORKER_PUBLIC_BASE || "https://link.khamakeymoments.com";
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const years = Number(row.years) || 1;
      const title = String(row.title || "Il tuo Moment").trim();
      const slug = String(row.slug || "").trim();
      const pageUrl = slug ? `${origin}/m/${encodeURIComponent(slug)}` : origin;
      const yearLabel = years === 1 ? "1 anno" : `${years} anni`;
      const anchor = String(row.anchor_label || "Questo giorno").trim();
      const email = String(row.owner_email || "").trim();
      if (!email) continue;

      const subject = `💫 ${yearLabel} fa — ${title}`;
      const text = [
        `Ciao,`,
        ``,
        `Oggi ricorre ${yearLabel} da «${anchor}» per la tua pagina KhamaKey Moments «${title}».`,
        ``,
        `Rileggi il ricordo o aggiungi qualcosa di nuovo:`,
        pageUrl,
        ``,
        `— KhamaKey Moments`
      ].join("\n");
      const html = `<div style="font-family:Georgia,serif;color:#172036;line-height:1.6;max-width:560px">
        <p>Ciao,</p>
        <p>Oggi ricorre <strong>${escapeHtml(yearLabel)}</strong> da «${escapeHtml(anchor)}» per la tua pagina <strong>${escapeHtml(title)}</strong>.</p>
        <p><a href="${attr(pageUrl)}" style="display:inline-block;background:#1b2a5e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Apri il tuo Moment</a></p>
        <p style="color:#64748b;font-size:14px">Puoi disattivare questi promemoria da editor → Pubblica → Email anniversario.</p>
      </div>`;

      const mail = await sendResendEmail(env, {
        to: email,
        subject,
        html,
        text,
        tags: [{ name: "type", value: "moment_anniversary" }]
      });

      await rpc(env, "record_moment_anniversary_send", {
        p_event_id: row.event_id,
        p_anchor_type: row.anchor_type,
        p_years: years,
        p_owner_email: email,
        p_ingest_key: ingestKey,
        p_resend_id: mail?.id || null
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("moment anniversary send", row?.event_id, error);
    }
  }

  return { ok: true, day, due: rows.length, sent, failed };
}

async function runMomentLetterUnlockJob(env, dayOverride = null) {
  const ingestKey = env.WEBHOOK_INGEST_KEY || env.ANALYTICS_INGEST_KEY;
  if (!ingestKey) return { ok: false, error: "ingest_key_missing" };
  if (!env.RESEND_API_KEY) return { ok: false, error: "resend_not_configured" };

  const day = dayOverride || new Date().toISOString().slice(0, 10);
  const due = await rpc(env, "due_moment_letter_unlocks", {
    p_day: day,
    p_ingest_key: ingestKey
  }).catch(error => {
    console.error("due_moment_letter_unlocks", error);
    return null;
  });
  const rows = Array.isArray(due) ? due : [];
  const origin = env.WORKER_PUBLIC_BASE || "https://link.khamakeymoments.com";
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const title = String(row.title || "Il tuo Moment").trim();
      const slug = String(row.slug || "").trim();
      const pageUrl = slug ? `${origin}/m/${encodeURIComponent(slug)}#moment-section-letter_future` : origin;
      const email = String(row.owner_email || "").trim();
      const when = formatUnlockDate(row.unlock_date) || "oggi";
      const recipient = String(row.recipient || "").trim();
      if (!email) continue;

      const subject = `🔓 La tua lettera al futuro si apre — ${title}`;
      const text = [
        `Ciao,`,
        ``,
        `Oggi (${when}) si apre la lettera al futuro della pagina «${title}».`,
        recipient ? `Destinatario: ${recipient}` : "",
        ``,
        `Apri il momento e rileggi il messaggio:`,
        pageUrl,
        ``,
        `— KhamaKey Moments`
      ].filter(Boolean).join("\n");
      const html = `<div style="font-family:Georgia,serif;color:#172036;line-height:1.6;max-width:560px">
        <p>Ciao,</p>
        <p>Oggi <strong>${escapeHtml(when)}</strong> si apre la <strong>lettera al futuro</strong> di «${escapeHtml(title)}».</p>
        ${recipient ? `<p>Destinatario: <em>${escapeHtml(recipient)}</em></p>` : ""}
        <p><a href="${attr(pageUrl)}" style="display:inline-block;background:#1b2a5e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Apri la lettera</a></p>
      </div>`;

      const mail = await sendResendEmail(env, {
        to: email,
        subject,
        html,
        text,
        tags: [{ name: "type", value: "moment_letter_unlock" }]
      });

      await rpc(env, "record_moment_letter_unlock_send", {
        p_event_id: row.event_id,
        p_unlock_date: row.unlock_date,
        p_owner_email: email,
        p_ingest_key: ingestKey,
        p_resend_id: mail?.id || null
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("moment letter unlock send", row?.event_id, error);
    }
  }

  return { ok: true, day, due: rows.length, sent, failed };
}

async function runRateLimitCleanupJob(env) {
  const ingestKey = env.WEBHOOK_INGEST_KEY || env.ANALYTICS_INGEST_KEY;
  if (!ingestKey) return { ok: false, error: "ingest_key_missing" };
  return rpc(env, "cleanup_rate_limit_tables", { p_ingest_key: ingestKey });
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
