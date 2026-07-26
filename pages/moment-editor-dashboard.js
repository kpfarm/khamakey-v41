/** Dashboard organizzatore — riepilogo rapido nell'editor Moments. */

import { summarizeRsvpResponses, fetchMomentRsvpResponses } from "./moment-rsvp-responses.js";
import { summarizeGuestbookMessages, fetchMomentGuestbookMessages } from "./moment-guestbook-kit.js";
import { getUiLocale } from "./moments-i18n.js?v=219";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=219";

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function lf(text){
  const raw = String(text || "");
  if(!raw || getUiLocale() === "it") return raw;
  return FIELD_PHRASE_EN[raw] || raw;
}

function lfFill(it, vars = {}){
  let out = lf(it);
  for(const [key, value] of Object.entries(vars)){
    out = out.split(`{${key}}`).join(String(value ?? ""));
  }
  return out;
}

function formatDate(value){
  if(!value) return "";
  const locale = getUiLocale() === "en" ? "en-GB" : "it-IT";
  try{
    return new Intl.DateTimeFormat(locale,{day:"numeric",month:"long",year:"numeric"}).format(new Date(value));
  }catch{
    return String(value);
  }
}

function daysUntil(value){
  if(!value) return null;
  const target = new Date(value);
  if(Number.isNaN(target.getTime())) return null;
  const diff = Math.ceil((target - new Date()) / 86400000);
  return diff;
}

let lastDashboardCtx = null;

export function renderMomentDashboardShell({ publicUrl = "", published = false, slug = "" } = {}){
  const liveIt = "Pubblicata";
  const draftIt = "Bozza";
  const titleIt = "📊 Il tuo evento a colpo d'occhio";
  const copyIt = "Copia";
  const openIt = "Apri";
  const loadingIt = "Caricamento dati…";
  const statusChip = published
    ? `<span class="dash-chip live" data-lf="${esc(liveIt)}">${esc(lf(liveIt))}</span>`
    : `<span class="dash-chip draft" data-lf="${esc(draftIt)}">${esc(lf(draftIt))}</span>`;
  return `<div class="editor-card smart-card moment-dashboard" id="momentDashboard" data-moment-dashboard>
    <p class="ecard-title" data-lf="${esc(titleIt)}">${esc(lf(titleIt))}</p>
    <div class="dash-head">
      ${statusChip}
      <span class="dash-slug">${esc(slug || "—")}</span>
    </div>
    <div class="dash-link-row">
      <input type="text" readonly value="${esc(publicUrl)}" id="dashPublicUrl" aria-label="${esc(lf("Link pagina pubblica"))}">
      <button type="button" class="ghost" id="dashCopyLinkBtn" data-lf="${esc(copyIt)}">${esc(lf(copyIt))}</button>
      <button type="button" class="ghost" id="dashOpenPageBtn" data-lf="${esc(openIt)}">${esc(lf(openIt))}</button>
    </div>
    <div class="dash-stats" id="dashStats">
      <span class="dash-stat" data-lf="${esc(loadingIt)}">${esc(lf(loadingIt))}</span>
    </div>
    <ul class="dash-checklist" id="dashChecklist"></ul>
  </div>`;
}

function buildChecklist({ published, rsvpEnabled, rsvpWa, guestbookEnabled, letterEnabled, letterUnlock, rsvpTotal, guestPending }){
  const items = [];
  if(!published) items.push({ ok:false, text:lf("Pubblica la pagina quando sei pronto") });
  else items.push({ ok:true, text:lf("Pagina pubblicata — condividi il link") });
  if(rsvpEnabled){
    items.push({ ok:Boolean(rsvpWa), text: rsvpWa ? lf("RSVP attivo con WhatsApp") : lf("RSVP: aggiungi numero WhatsApp") });
    if(rsvpTotal) items.push({ ok:true, text:lfFill("{n} risposta/e RSVP registrata/e", { n: rsvpTotal }) });
  }
  if(guestbookEnabled){
    items.push({
      ok:guestPending === 0,
      text: guestPending
        ? lfFill("{n} messaggio/i da approvare", { n: guestPending })
        : lf("Libro ospiti aggiornato")
    });
  }
  if(letterEnabled && letterUnlock){
    const days = daysUntil(letterUnlock);
    if(days === null) items.push({ ok:false, text:lf("Lettera al futuro: controlla la data di apertura") });
    else if(days > 0) items.push({ ok:true, text:lfFill("Lettera si apre tra {n} giorno/i ({date})", { n: days, date: formatDate(letterUnlock) }) });
    else items.push({ ok:true, text:lf("La lettera al futuro è aperta oggi") });
  }
  return items.map(item=>`<li class="${item.ok ? "ok" : "todo"}">${esc(item.text)}</li>`).join("");
}

export async function paintMomentDashboard({
  supabase,
  eventId,
  publicUrl,
  published,
  slug,
  state = {},
  copyText
} = {}){
  lastDashboardCtx = { supabase, eventId, publicUrl, published, slug, state, copyText };
  const panel = document.getElementById("momentDashboard");
  if(!panel) return;
  const stats = panel.querySelector("#dashStats");
  const checklist = panel.querySelector("#dashChecklist");
  const sections = state.sections || {};
  let rsvpSummary = { total:0, yes:0, pending:0 };
  let guestSummary = { total:0, pending:0 };

  if(supabase && eventId){
    try{
      const [rsvpRows, guestRows] = await Promise.all([
        sections.rsvp?.enabled ? fetchMomentRsvpResponses(supabase, eventId).catch(()=>[]) : Promise.resolve([]),
        sections.guestbook?.enabled ? fetchMomentGuestbookMessages(supabase, eventId).catch(()=>[]) : Promise.resolve([])
      ]);
      rsvpSummary = summarizeRsvpResponses(rsvpRows);
      guestSummary = summarizeGuestbookMessages(guestRows);
    }catch{
      /* dashboard opzionale */
    }
  }

  const chips = [
    sections.rsvp?.enabled ? `<span class="dash-stat"><strong>${rsvpSummary.total}</strong> RSVP</span>` : "",
    sections.rsvp?.enabled && rsvpSummary.yes ? `<span class="dash-stat yes"><strong>${rsvpSummary.yes}</strong> ${esc(lf("sì"))}</span>` : "",
    sections.guestbook?.enabled ? `<span class="dash-stat"><strong>${guestSummary.total}</strong> ${esc(lf("messaggi"))}</span>` : "",
    sections.guestbook?.enabled && guestSummary.pending ? `<span class="dash-stat warn"><strong>${guestSummary.pending}</strong> ${esc(lf("da approvare"))}</span>` : ""
  ].filter(Boolean);

  if(stats){
    const emptyIt = "Attiva RSVP o libro ospiti per vedere le statistiche.";
    stats.innerHTML = chips.length
      ? chips.join("")
      : `<span class="dash-stat muted" data-lf="${esc(emptyIt)}">${esc(lf(emptyIt))}</span>`;
  }
  if(checklist){
    checklist.innerHTML = buildChecklist({
      published,
      rsvpEnabled:Boolean(sections.rsvp?.enabled),
      rsvpWa:Boolean(String(sections.rsvp?.whatsapp_number || "").replace(/\D/g, "")),
      guestbookEnabled:Boolean(sections.guestbook?.enabled),
      letterEnabled:Boolean(sections.letter_future?.enabled),
      letterUnlock:sections.letter_future?.unlock_date || "",
      rsvpTotal:rsvpSummary.total,
      guestPending:guestSummary.pending
    });
  }

  panel.querySelectorAll("[data-lf]").forEach(el=>{
    const src = el.getAttribute("data-lf");
    if(src == null) return;
    el.textContent = lf(src);
  });

  const copyBtn = panel.querySelector("#dashCopyLinkBtn");
  const openBtn = panel.querySelector("#dashOpenPageBtn");
  if(copyBtn && copyBtn.dataset.dashBound !== "1"){
    copyBtn.dataset.dashBound = "1";
    copyBtn.addEventListener("click",()=>{
      if(publicUrl && typeof copyText === "function") copyText(publicUrl, copyBtn);
    });
  }
  if(openBtn && openBtn.dataset.dashBound !== "1"){
    openBtn.dataset.dashBound = "1";
    openBtn.addEventListener("click",()=>{
      if(publicUrl) window.open(publicUrl,"_blank","noopener");
    });
  }
}

export function refreshMomentDashboardLocale(){
  if(!lastDashboardCtx) return;
  return paintMomentDashboard(lastDashboardCtx);
}

export function bindMomentDashboard(ctx){
  return paintMomentDashboard(ctx);
}
