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
const WORKER_VERSION = "v25-moments-emotional";

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
  const pill = String(state.pill || "").trim();
  const coverUrl = safeUrl(state.cover_url || "") !== "#" ? safeUrl(state.cover_url || "") : "";
  const profileUrl = safeUrl(state.profile_photo || "") !== "#" ? safeUrl(state.profile_photo || "") : "";
  const colors = resolveMomentPalette(state);
  const heroStyle = ["classico", "profilo", "romantico", "intimo", "fullscreen"].includes(state.heroStyle) ? state.heroStyle : "classico";
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
  const counterHtml = renderTogetherCounter(state, colors);
  const sectionHtml = ordered.length
    ? ordered.map(({ key, section }) => renderMomentSection(key, section, colors)).join("")
    : `<div class="moment-card moment-card-empty rv"><strong>Pagina in preparazione</strong><p>Il proprietario sta ancora scegliendo i contenuti da mostrare.</p></div>`;
  const heroCover = coverUrl ? `<img class="moment-cover" src="${attr(coverUrl)}" alt="">` : "";
  const profileBlock = profileUrl && heroStyle === "profilo"
    ? `<img class="moment-profile" src="${attr(profileUrl)}" alt="">` : "";
  const ogImage = coverUrl || profileUrl || "";
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
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700&family=Great+Vibes&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>${momentPageCss(colors)}</style></head>
<body><main class="moment-page hero-${attr(heroStyle)}">
<section class="moment-hero">${heroCover}<div class="moment-hero-overlay"></div><div class="moment-hero-content">
${pill ? `<span class="moment-pill">${escapeHtml(pill)}</span>` : `<small>KhamaKey Moments</small>`}
${profileBlock}
<h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}
</div><div class="moment-scroll-hint" aria-hidden="true"><span>Scorri</span><i></i></div></section>
<section class="moment-content">${counterHtml}${sectionHtml}</section>
<footer class="moment-footer">Creato con cura · KhamaKey Moments</footer>
</main>
<script>${momentPageScript(state.together_since, Boolean(state.show_together_counter))}</script>
</body></html>`;
}

function resolveMomentPalette(state) {
  const palettes = {
    rosa:{go:"#C8A977",g2:"#E8CC95",ro:"#F2C4B8",bl:"#FFF8F5",bl2:"#FDEEE8",in:"#1C1C1E",hero:"#FDE8E0",mu:"#8E8E93"},
    blu:{go:"#4A7CBF",g2:"#8BB5E8",ro:"#B8D0F2",bl:"#F5F8FF",bl2:"#EAF0FB",in:"#1A2A3A",hero:"#1A2A4A",mu:"#64748B"},
    salvia:{go:"#5A7A5A",g2:"#8AB58A",ro:"#B8D4B0",bl:"#F5FAF5",bl2:"#E8F4E8",in:"#1E2E1E",hero:"#2A4A2A",mu:"#64748B"},
    bordeaux:{go:"#8C3A4A",g2:"#C47A87",ro:"#E8B0BB",bl:"#FFF5F7",bl2:"#FDEAE0",in:"#2A1018",hero:"#3A1020",mu:"#64748B"},
    perla:{go:"#6A6A7A",g2:"#9A9AAA",ro:"#C8C8D8",bl:"#F8F8FA",bl2:"#EEEEEE",in:"#1E1E2E",hero:"#2A2A3A",mu:"#64748B"},
    lavanda:{go:"#7B68AE",g2:"#A694D4",ro:"#C8B8E8",bl:"#F8F5FF",bl2:"#EEE8F8",in:"#1E1828",hero:"#2A1E3A",mu:"#64748B"},
    cipria:{go:"#C4917A",g2:"#E0B8A4",ro:"#F0D0C4",bl:"#FFF7F4",bl2:"#FDE8E0",in:"#2A1E18",hero:"#3A2820",mu:"#64748B"},
    corallo:{go:"#D4756A",g2:"#E8A098",ro:"#F0C0B8",bl:"#FFF6F4",bl2:"#FDE8E4",in:"#2A1614",hero:"#3A2018",mu:"#64748B"},
    miele:{go:"#B8922E",g2:"#D4B05A",ro:"#E8D0A0",bl:"#FFFBF2",bl2:"#F8F0E0",in:"#2A2210",hero:"#3A3018",mu:"#64748B"},
    notte:{go:"#8AA0C8",g2:"#B0C4E0",ro:"#C8D4E8",bl:"#F0F4FA",bl2:"#E0E8F4",in:"#101828",hero:"#0E1420",mu:"#64748B"},
    neve:{go:"#A0A0AE",g2:"#C0C0CC",ro:"#D8D8E0",bl:"#FAFAFA",bl2:"#F0F0F2",in:"#18181E",hero:"#E8E8EE",mu:"#64748B"},
    classic:{go:"#4CAF27",g2:"#3A8E1E",ro:"#EBF7E4",bl:"#F5F7FA",bl2:"#E2E8F0",in:"#172036",hero:"#1B2A5E",mu:"#64748B"}
  };
  const variants = {
    caldo:{
      rosa:{bl:"#F8EDE4",bl2:"#F0E0D2",in:"#2A1E14"},
      blu:{bl:"#E8EEF8",bl2:"#D8E4F0",in:"#1A2440"},
      salvia:{bl:"#E8F0E4",bl2:"#D8E8D0",in:"#1E2E1A"},
      bordeaux:{bl:"#F8E4E8",bl2:"#F0D4D8",in:"#2E1018"},
      perla:{bl:"#F0EEE8",bl2:"#E4E0D8",in:"#22201A"},
      lavanda:{bl:"#EEE8F4",bl2:"#E0D8EC",in:"#201828"},
      cipria:{bl:"#F4E4DA",bl2:"#ECD8CC",in:"#2E1E14"},
      corallo:{bl:"#F8E2DC",bl2:"#F0D4CC",in:"#2E1A14"},
      miele:{bl:"#F4ECDA",bl2:"#ECE0C8",in:"#2E2410"},
      notte:{bl:"#E4E8F0",bl2:"#D4D8E4",in:"#141820"},
      neve:{bl:"#EEEEE4",bl2:"#E0E0D8",in:"#1E1E18"}
    },
    scuro:{
      rosa:{bl:"#1E1814",bl2:"#2A2018",in:"#F0E4DA",go:"#D4B888",g2:"#E8CC95",ro:"#C4947A",mu:"#A09080"},
      blu:{bl:"#0E1420",bl2:"#182030",in:"#D8E4F0",go:"#6A9CD8",g2:"#8BB5E8",ro:"#8AA0C0",mu:"#7888A0"},
      salvia:{bl:"#121E14",bl2:"#1A2A1C",in:"#D4E8D0",go:"#7AA07A",g2:"#8AB58A",ro:"#90B488",mu:"#789878"},
      bordeaux:{bl:"#1A0E14",bl2:"#281420",in:"#F0D4DA",go:"#B05060",g2:"#C47A87",ro:"#A06A78",mu:"#987080"},
      perla:{bl:"#141418",bl2:"#1E1E24",in:"#E0E0E8",go:"#8888A0",g2:"#9A9AAA",ro:"#9898A8",mu:"#787888"},
      lavanda:{bl:"#141020",bl2:"#1E1830",in:"#D8D0E8",go:"#9480C0",g2:"#A694D4",ro:"#9888B8",mu:"#807098"},
      cipria:{bl:"#1E1410",bl2:"#2A1E18",in:"#F0DCD0",go:"#D4A088",g2:"#E0B8A4",ro:"#C0988A",mu:"#A08878"},
      corallo:{bl:"#1E1210",bl2:"#2A1A18",in:"#F0DAD4",go:"#E08878",g2:"#E8A098",ro:"#C08878",mu:"#A08078"},
      miele:{bl:"#1A1608",bl2:"#282010",in:"#F0E4C8",go:"#D0A840",g2:"#D4B05A",ro:"#C0A870",mu:"#A09060"},
      notte:{bl:"#080C14",bl2:"#0E1420",in:"#C8D4E4",go:"#90A8D0",g2:"#B0C4E0",ro:"#8898B8",mu:"#607090"},
      neve:{bl:"#141414",bl2:"#1E1E1E",in:"#E0E0E0",go:"#B0B0B8",g2:"#C0C0CC",ro:"#989898",mu:"#808088"}
    }
  };
  const legacy = { celebration:"corallo", minimal:"neve", memorial:"perla" };
  const paletteKey = state.colorPalette || legacy[state.theme] || "classic";
  const base = { ...(palettes[paletteKey] || palettes.classic) };
  const variant = state.themeVariant === "scuro" || state.themeVariant === "caldo" ? state.themeVariant : "chiaro";
  const overrides = variants[variant]?.[paletteKey];
  if(overrides) Object.assign(base, overrides);
  return base;
}

function renderTogetherCounter(state, colors) {
  if(!state.show_together_counter || !state.together_since) return "";
  const date = String(state.together_since).slice(0, 10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  return `<section class="moment-counter rv" data-since="${attr(date)}" data-hms="${state.show_counter_hms ? "1" : "0"}">
<div class="moment-counter-label">Insieme da</div>
<div class="moment-counter-grid">
<span class="moment-counter-unit"><b data-unit="years">0</b><small>anni</small></span>
<span class="moment-counter-unit"><b data-unit="months">0</b><small>mesi</small></span>
<span class="moment-counter-unit"><b data-unit="days">0</b><small>giorni</small></span>
</div></section>`;
}

function momentPageScript(since, enabled) {
  if(!enabled || !since) return `(function(){document.querySelectorAll(".rv").forEach(function(n,i){setTimeout(function(){n.classList.add("on")},80*i)});})();`;
  return `(function(){
var nodes=document.querySelectorAll(".rv");nodes.forEach(function(n,i){setTimeout(function(){n.classList.add("on")},80*i)});
var box=document.querySelector(".moment-counter");if(!box)return;
var since=new Date(box.dataset.since+"T00:00:00");if(isNaN(since))return;
function paint(){
var now=new Date();var y=now.getFullYear()-since.getFullYear();var m=now.getMonth()-since.getMonth();var d=now.getDate()-since.getDate();
if(d<0){m--;d+=new Date(now.getFullYear(),now.getMonth(),0).getDate()}if(m<0){y--;m+=12}
var map={years:y,months:m,days:d};Object.keys(map).forEach(function(k){var n=box.querySelector('[data-unit="'+k+'"]');if(n)n.textContent=map[k]});
}
paint();setInterval(paint,box.dataset.hms==="1"?1000:60000);
})();`;
}

function momentPageCss(colors) {
  const c = colors;
  return `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:"Cormorant Infant",Georgia,serif;background:${c.bl};color:${c.in};-webkit-font-smoothing:antialiased}
.moment-page{width:min(100%,680px);min-height:100vh;margin:auto;background:${c.bl};box-shadow:0 24px 70px rgba(17,32,65,.12);overflow:hidden}
.moment-hero{position:relative;min-height:min(92svh,720px);padding:72px 24px 56px;text-align:center;color:#fff;background:linear-gradient(145deg,${c.hero},${c.go});overflow:hidden;display:grid;align-content:end}
.hero-fullscreen .moment-hero{min-height:100svh}
.moment-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.02);animation:heroZoom 14s ease forwards}
@keyframes heroZoom{to{transform:scale(1)}}
.moment-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(10,10,20,.82))}
.moment-hero-content{position:relative;z-index:1;max-width:520px;margin:0 auto}
.moment-pill{display:inline-block;font-family:"DM Sans",sans-serif;font-size:.62rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.92);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 18px;margin-bottom:16px}
.moment-hero small{display:block;font-family:"DM Sans",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.16em;opacity:.88;margin-bottom:12px}
.moment-profile{width:96px;height:96px;border-radius:999px;object-fit:cover;border:3px solid rgba(255,255,255,.85);box-shadow:0 12px 40px rgba(0,0,0,.25);margin:0 auto 16px;display:block}
.moment-hero h1{font-family:"Great Vibes","Cormorant Infant",cursive;font-size:clamp(2.4rem,10vw,3.8rem);font-weight:400;line-height:1.08;margin:8px 0;text-shadow:0 2px 24px rgba(0,0,0,.35)}
.moment-hero p{font-family:"Cormorant Infant",serif;font-size:clamp(1rem,3.8vw,1.15rem);font-style:italic;line-height:1.65;margin:0 auto;max-width:480px;opacity:.92}
.moment-scroll-hint{position:absolute;left:0;right:0;bottom:18px;display:grid;justify-items:center;gap:6px;opacity:.7}
.moment-scroll-hint span{font-family:"DM Sans",sans-serif;font-size:.58rem;letter-spacing:.22em;text-transform:uppercase}
.moment-scroll-hint i{display:block;width:1px;height:28px;background:linear-gradient(#fff,transparent);animation:scrollPulse 2.4s ease-in-out infinite}
@keyframes scrollPulse{0%,100%{opacity:.5;transform:scaleY(1)}50%{opacity:.15;transform:scaleY(.55)}}
.moment-content{padding:8px 0 28px}
.moment-counter{background:${c.bl2};padding:40px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,.04)}
.moment-counter-label{font-family:"DM Sans",sans-serif;font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:${c.go};margin-bottom:20px}
.moment-counter-grid{display:flex;justify-content:center;gap:0}
.moment-counter-unit{flex:1;max-width:100px;padding:0 14px}
.moment-counter-unit:not(:last-child){border-right:1px solid ${c.ro}}
.moment-counter-unit b{display:block;font-size:clamp(1.8rem,8vw,2.4rem);font-weight:300;font-style:italic;line-height:1;color:${c.in}}
.moment-counter-unit small{display:block;font-family:"DM Sans",sans-serif;font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:${c.mu};margin-top:8px}
.moment-card{border:none;border-radius:0;padding:36px 22px;margin:0;background:transparent;max-width:460px;margin-inline:auto}
.moment-card:nth-child(even){background:${c.bl2}}
.moment-card-head{display:grid;justify-items:center;text-align:center;margin-bottom:18px}
.moment-card-icon{width:auto;height:auto;border-radius:0;background:transparent;border:none;font-size:1rem;color:${c.go};margin-bottom:8px}
.moment-card strong{display:block;color:${c.in};font-size:clamp(1.15rem,4vw,1.35rem);font-family:"Cormorant Infant",serif;font-weight:600;letter-spacing:.02em}
.moment-card strong::before,.moment-card strong::after{content:"";display:inline-block;width:18px;height:1px;background:${c.go};opacity:.35;vertical-align:middle;margin:0 10px}
.moment-card p{color:${c.in};opacity:.82;line-height:1.85;white-space:pre-wrap;margin:0;font-size:clamp(1rem,3.6vw,1.08rem)}
.moment-card-empty{text-align:center;padding:48px 24px}
.moment-card-message p{font-style:italic;text-align:center;font-size:clamp(1.05rem,4vw,1.2rem)}
.moment-timeline{display:grid;gap:0;margin-top:8px;padding-left:20px;border-left:1px solid ${c.ro}}
.moment-timeline-item{padding:0 0 28px 24px;position:relative}
.moment-timeline-item:last-child{padding-bottom:0}
.moment-timeline-dot{position:absolute;left:-5px;top:6px;width:9px;height:9px;border-radius:999px;background:${c.go};box-shadow:0 0 0 4px ${c.bl}}
.moment-timeline-text{color:${c.in};line-height:1.65;font-size:1.02rem}
.moment-meta{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}
.moment-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid ${c.ro};border-radius:999px;padding:8px 14px;font-family:"DM Sans",sans-serif;font-size:.78rem;color:${c.in};background:${c.bl};text-decoration:none;font-weight:700}
.moment-chip-action{background:${c.in};color:${c.bl};border-color:${c.in}}
.moment-gallery-scroll{margin:16px -22px 0;padding:0 22px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x mandatory}
.moment-gallery-scroll::-webkit-scrollbar{display:none}
.moment-gallery-track{display:flex;gap:12px;width:max-content}
.moment-gallery-scroll img{width:70vw;max-width:240px;height:calc(70vw * 1.25);max-height:300px;object-fit:cover;border-radius:18px;scroll-snap-align:start;box-shadow:0 10px 32px rgba(0,0,0,.1)}
.moment-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.moment-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;border:1px solid ${c.ro}}
.moment-footer{text-align:center;color:${c.mu};font-family:"DM Sans",sans-serif;font-size:12px;padding:16px 20px 28px}
.rv{opacity:0;transform:translateY(24px);transition:opacity .9s ease,transform .9s ease}
.rv.on{opacity:1;transform:none}
@media(min-width:720px){body{padding:24px;background:#eef2f7}.moment-page{border-radius:16px;overflow:hidden}.moment-gallery-scroll img{width:240px;height:300px}}`;
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

function renderMomentSection(key, section, colors) {
  const images = Array.isArray(section.images) ? section.images.filter(url => safeUrl(url) !== "#").slice(0, 24) : [];
  const icon = MOMENT_SECTION_ICONS[key] || "•";
  const head = `<div class="moment-card-head"><span class="moment-card-icon">${icon}</span><strong>${escapeHtml(section.title || "Sezione")}</strong></div>`;
  const rv = `moment-card moment-card-${escapeHtml(key)} rv`;

  if (key === "schedule" && section.body) {
    const items = String(section.body).split("\n").map(line => line.trim()).filter(Boolean);
    const timeline = items.length
      ? `<div class="moment-timeline">${items.map(line => {
          const parts = line.match(/^(.+?)[\s·\-–—]+(.+)$/);
          const date = parts ? parts[1] : "";
          const text = parts ? parts[2] : line;
          return `<div class="moment-timeline-item"><span class="moment-timeline-dot"></span><span class="moment-timeline-text">${date ? `<span style="font-family:DM Sans,sans-serif;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:${colors.go};display:block;margin-bottom:4px">${escapeHtml(date)}</span>` : ""}${escapeHtml(text)}</span></div>`;
        }).join("")}</div>`
      : "";
    return `<article class="${rv}">${head}${timeline}</article>`;
  }

  if (key === "location") {
    const chips = [];
    if (section.address) chips.push(`<span class="moment-chip">${escapeHtml(section.address)}</span>`);
    const mapsUrl = safeUrl(section.maps_url || "");
    if (mapsUrl !== "#") chips.push(`<a class="moment-chip moment-chip-action" href="${attr(mapsUrl)}" target="_blank" rel="noopener">Apri mappe</a>`);
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    const meta = chips.length ? `<div class="moment-meta">${chips.join("")}</div>` : "";
    return `<article class="${rv}">${head}${body}${meta}</article>`;
  }

  if (key === "contacts") {
    const chips = [];
    if (section.email) chips.push(`<a class="moment-chip" href="mailto:${attr(section.email)}">${escapeHtml(section.email)}</a>`);
    if (section.phone) chips.push(`<a class="moment-chip moment-chip-action" href="tel:${attr(section.phone.replace(/\s+/g, ""))}">${escapeHtml(section.phone)}</a>`);
    const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
    const meta = chips.length ? `<div class="moment-meta">${chips.join("")}</div>` : "";
    return `<article class="${rv}">${head}${body}${meta}</article>`;
  }

  let gallery = "";
  if (key === "gallery" && images.length) {
    gallery = images.length >= 2
      ? `<div class="moment-gallery-scroll"><div class="moment-gallery-track">${images.map(url => `<img src="${attr(url)}" alt="" loading="lazy">`).join("")}</div></div>`
      : `<div class="moment-gallery">${images.map(url => `<img src="${attr(url)}" alt="" loading="lazy">`).join("")}</div>`;
  }
  const body = section.body ? `<p>${escapeHtml(section.body)}</p>` : "";
  return `<article class="${rv}${key === "message" ? " moment-card-message" : ""}">${head}${body}${gallery}</article>`;
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
