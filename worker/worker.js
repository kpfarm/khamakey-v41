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
const WORKER_VERSION = "v24-moments-sections";

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
      if (url.pathname === "/health") return json({ ok: true, service: "khamakey-nfc", version: WORKER_VERSION, resend: Boolean(env.RESEND_API_KEY) });
      return html(notFound("Pagina non trovata"), 404);
    } catch (error) {
      console.error(error);
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

  ctx.waitUntil(track(env, request, page.business_id, "page_view", "public_page").catch(() => {}));
  return html(renderPage(page, new URL(request.url).origin, env), 200, {
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

function renderPage(page, origin, env = {}) {
  const state = page.state || {};
  const fields = state.fields || {};
  if (state.publicSnapshot?.html) return renderSnapshotPage(page, origin, env);
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
<html lang="it">
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

function renderSnapshotPage(page, origin, env = {}) {
  const state = page.state || {};
  const fields = state.fields || {};
  const snapshot = state.publicSnapshot || {};
  const title = String(fields.nome || "KhamaKey").trim() || "KhamaKey";
  const className = String(snapshot.className || "phone-preview-inner").replace(/[^a-zA-Z0-9 _-]/g, "");
  const style = String(snapshot.style || "").replace(/[^a-zA-Z0-9:#;().,% _-]/g, "");
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://khamakey-app.pages.dev").replace(/\/$/, "");
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${attr(pagesBase)}/public-page.css?v=${attr(snapshot.version || "41")}">
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
  const coverUrl = safeUrl(state.cover_url || "") !== "#" ? safeUrl(state.cover_url || "") : "";
  const theme = ["classic", "celebration", "minimal", "memorial"].includes(state.theme) ? state.theme : "classic";
  const sections = state.sections && typeof state.sections === "object" ? state.sections : {};
  const sectionOrder = Array.isArray(state.sectionOrder) && state.sectionOrder.length
    ? state.sectionOrder
    : ["intro", "details", "gallery", "schedule", "location", "contacts", "message"];
  const ordered = sectionOrder
    .map(key => ({ key, section: sections[key] }))
    .filter(({ section }) => section && section.enabled && (
      section.title || section.body || section.address || section.email || section.phone ||
      (Array.isArray(section.images) && section.images.length)
    ));
  const sectionHtml = ordered.length
    ? ordered.map(({ key, section }) => renderMomentSection(key, section)).join("")
    : `<div class="moment-card moment-card-empty"><strong>Pagina in preparazione</strong><p>Il proprietario sta ancora scegliendo i contenuti da mostrare.</p></div>`;
  const heroCover = coverUrl ? `<img class="moment-cover" src="${attr(coverUrl)}" alt="">` : "";
  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>${momentPageCss()}</style></head>
<body><main class="moment-page theme-${attr(theme)}">
<section class="moment-hero">${heroCover}<div class="moment-hero-overlay"></div><div class="moment-hero-content"><small>KhamaKey Moments</small><h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div></section>
<section class="moment-content">${sectionHtml}</section>
<footer class="moment-footer">Powered by KhamaKey Moments</footer>
</main></body></html>`;
}

function momentPageCss() {
  return `*{box-sizing:border-box}body{margin:0;font-family:"DM Sans",Arial,sans-serif;background:#eef2f7;color:#172036}
.moment-page{width:min(100%,680px);min-height:100vh;margin:auto;background:#fff;box-shadow:0 24px 70px rgba(17,32,65,.12)}
.moment-hero{position:relative;min-height:320px;padding:72px 24px 42px;text-align:center;color:#fff;background:linear-gradient(145deg,#1b2a5e 0%,#4caf27 100%);overflow:hidden;display:grid;align-content:end}
.theme-celebration .moment-hero{background:linear-gradient(145deg,#6d28d9 0%,#f59e0b 100%)}
.theme-minimal .moment-hero{background:linear-gradient(145deg,#334155 0%,#94a3b8 100%)}
.theme-memorial .moment-hero{background:linear-gradient(145deg,#475569 0%,#1e293b 100%)}
.moment-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.moment-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,16,36,.08),rgba(9,16,36,.68))}
.moment-hero-content{position:relative;z-index:1;max-width:520px;margin:0 auto}
.moment-hero small{display:block;font-weight:800;text-transform:uppercase;letter-spacing:.16em;opacity:.92}
.moment-hero h1{font-family:"Syne",sans-serif;font-size:clamp(2rem,8vw,3.6rem);line-height:1.02;margin:12px 0}
.moment-hero p{line-height:1.6;margin:0 auto;max-width:480px;opacity:.95}
.moment-content{padding:20px 18px 28px}
.moment-card{border:1px solid #e2e8f0;border-radius:20px;padding:18px 18px 16px;margin:14px 0;background:#fff;box-shadow:0 10px 28px rgba(27,42,94,.06)}
.moment-card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.moment-card-icon{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;background:#f8fafc;border:1px solid #e2e8f0;font-size:.9rem}
.moment-card strong{display:block;color:#1b2a5e;font-size:1.08rem;font-family:"Syne",sans-serif}
.moment-card p{color:#526078;line-height:1.7;white-space:pre-wrap;margin:0}
.moment-card-empty strong{margin-bottom:8px}
.moment-timeline{display:grid;gap:10px;margin-top:4px}
.moment-timeline-item{display:grid;grid-template-columns:10px 1fr;gap:12px;align-items:start}
.moment-timeline-dot{width:10px;height:10px;border-radius:999px;background:#4caf27;margin-top:7px;box-shadow:0 0 0 4px rgba(76,175,39,.16)}
.theme-celebration .moment-timeline-dot{background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.18)}
.theme-memorial .moment-timeline-dot{background:#94a3b8;box-shadow:0 0 0 4px rgba(148,163,184,.18)}
.moment-timeline-text{color:#334155;line-height:1.55;font-weight:600}
.moment-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.moment-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;border-radius:999px;padding:7px 12px;font-size:.84rem;color:#1b2a5e;background:#f8fafc;text-decoration:none;font-weight:700}
.moment-chip-action{background:#1b2a5e;color:#fff;border-color:#1b2a5e}
.moment-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.moment-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;border:1px solid #e2e8f0}
.moment-footer{text-align:center;color:#64748b;font-size:12px;padding:8px 20px 24px}
@media(min-width:720px){body{padding:24px}.moment-page{border-radius:12px;overflow:hidden}.moment-gallery{grid-template-columns:repeat(3,minmax(0,1fr))}}`;
}

const MOMENT_SECTION_ICONS = {
  intro: "✦",
  details: "◎",
  gallery: "▣",
  schedule: "◷",
  location: "⌖",
  contacts: "☎",
  message: "❝"
};

function renderMomentSection(key, section) {
  const images = Array.isArray(section.images) ? section.images.filter(url => safeUrl(url) !== "#").slice(0, 24) : [];
  const icon = MOMENT_SECTION_ICONS[key] || "•";
  const head = `<div class="moment-card-head"><span class="moment-card-icon">${icon}</span><strong>${escapeHtml(section.title || "Sezione")}</strong></div>`;

  if (key === "schedule" && section.body) {
    const items = String(section.body).split("\n").map(line => line.trim()).filter(Boolean);
    const timeline = items.length
      ? `<div class="moment-timeline">${items.map(line => `<div class="moment-timeline-item"><span class="moment-timeline-dot"></span><span class="moment-timeline-text">${escapeHtml(line)}</span></div>`).join("")}</div>`
      : "";
    return `<article class="moment-card moment-card-schedule">${head}${timeline}</article>`;
  }

  if (key === "location") {
    const chips = [];
    if (section.address) chips.push(`<span class="moment-chip">${escapeHtml(section.address)}</span>`);
    const mapsUrl = safeUrl(section.maps_url || "");
    if (mapsUrl !== "#") chips.push(`<a class="moment-chip moment-chip-action" href="${attr(mapsUrl)}" target="_blank" rel="noopener">Apri mappe</a>`);
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    const meta = chips.length ? `<div class="moment-meta">${chips.join("")}</div>` : "";
    return `<article class="moment-card moment-card-location">${head}${body}${meta}</article>`;
  }

  if (key === "contacts") {
    const chips = [];
    if (section.email) chips.push(`<a class="moment-chip" href="mailto:${attr(section.email)}">${escapeHtml(section.email)}</a>`);
    if (section.phone) chips.push(`<a class="moment-chip moment-chip-action" href="tel:${attr(section.phone.replace(/\s+/g, ""))}">${escapeHtml(section.phone)}</a>`);
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    const meta = chips.length ? `<div class="moment-meta">${chips.join("")}</div>` : "";
    return `<article class="moment-card moment-card-contacts">${head}${body}${meta}</article>`;
  }

  const gallery = key === "gallery" && images.length
    ? `<div class="moment-gallery">${images.map(url => `<img src="${attr(url)}" alt="">`).join("")}</div>`
    : "";
  const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
  return `<article class="moment-card moment-card-${escapeHtml(key)}">${head}${body}${gallery}</article>`;
}

function renderMomentActivationPage(product, origin, env = {}) {
  const code = String(product.code || "");
  const pagesBase = String(env.PAGES_ASSET_BASE || "https://khamakey-app.pages.dev").replace(/\/$/, "");
  const typeLabel = {
    free: "Uso libero",
    wedding: "Matrimonio",
    party: "Festa",
    travel: "Viaggio",
    memory: "Ricordo",
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
  headers.set("Access-Control-Allow-Headers", "Content-Type");
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
