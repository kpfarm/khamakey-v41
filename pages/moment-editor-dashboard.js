/** Dashboard organizzatore — riepilogo rapido nell'editor Moments. */

import { summarizeRsvpResponses, fetchMomentRsvpResponses } from "./moment-rsvp-responses.js";
import { summarizeGuestbookMessages, fetchMomentGuestbookMessages } from "./moment-guestbook-kit.js";

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function formatDate(value){
  if(!value) return "";
  try{
    return new Intl.DateTimeFormat("it-IT",{day:"numeric",month:"long",year:"numeric"}).format(new Date(value));
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

export function renderMomentDashboardShell({ publicUrl = "", published = false, slug = "" } = {}){
  const statusChip = published
    ? `<span class="dash-chip live">Pubblicata</span>`
    : `<span class="dash-chip draft">Bozza</span>`;
  return `<div class="editor-card smart-card moment-dashboard" id="momentDashboard" data-moment-dashboard>
    <p class="ecard-title">📊 Il tuo evento a colpo d'occhio</p>
    <div class="dash-head">
      ${statusChip}
      <span class="dash-slug">${esc(slug || "—")}</span>
    </div>
    <div class="dash-link-row">
      <input type="text" readonly value="${esc(publicUrl)}" id="dashPublicUrl" aria-label="Link pagina pubblica">
      <button type="button" class="ghost" id="dashCopyLinkBtn">Copia</button>
      <button type="button" class="ghost" id="dashOpenPageBtn">Apri</button>
    </div>
    <div class="dash-stats" id="dashStats">
      <span class="dash-stat">Caricamento dati…</span>
    </div>
    <ul class="dash-checklist" id="dashChecklist"></ul>
  </div>`;
}

function buildChecklist({ published, rsvpEnabled, rsvpWa, guestbookEnabled, letterEnabled, letterUnlock, rsvpTotal, guestPending }){
  const items = [];
  if(!published) items.push({ ok:false, text:"Pubblica la pagina quando sei pronto" });
  else items.push({ ok:true, text:"Pagina pubblicata — condividi il link" });
  if(rsvpEnabled){
    items.push({ ok:Boolean(rsvpWa), text: rsvpWa ? "RSVP attivo con WhatsApp" : "RSVP: aggiungi numero WhatsApp" });
    if(rsvpTotal) items.push({ ok:true, text:`${rsvpTotal} risposta/e RSVP registrata/e` });
  }
  if(guestbookEnabled){
    items.push({ ok:guestPending === 0, text: guestPending ? `${guestPending} messaggio/i da approvare` : "Libro ospiti aggiornato" });
  }
  if(letterEnabled && letterUnlock){
    const days = daysUntil(letterUnlock);
    if(days === null) items.push({ ok:false, text:"Lettera al futuro: controlla la data di apertura" });
    else if(days > 0) items.push({ ok:true, text:`Lettera si apre tra ${days} giorno/i (${formatDate(letterUnlock)})` });
    else items.push({ ok:true, text:"La lettera al futuro è aperta oggi" });
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
    sections.rsvp?.enabled && rsvpSummary.yes ? `<span class="dash-stat yes"><strong>${rsvpSummary.yes}</strong> sì</span>` : "",
    sections.guestbook?.enabled ? `<span class="dash-stat"><strong>${guestSummary.total}</strong> messaggi</span>` : "",
    sections.guestbook?.enabled && guestSummary.pending ? `<span class="dash-stat warn"><strong>${guestSummary.pending}</strong> da approvare</span>` : ""
  ].filter(Boolean);

  if(stats){
    stats.innerHTML = chips.length ? chips.join("") : `<span class="dash-stat muted">Attiva RSVP o libro ospiti per vedere le statistiche.</span>`;
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

  panel.querySelector("#dashCopyLinkBtn")?.addEventListener("click",()=>{
    if(publicUrl && typeof copyText === "function") copyText(publicUrl, panel.querySelector("#dashCopyLinkBtn"));
  },{ once:true });
  panel.querySelector("#dashOpenPageBtn")?.addEventListener("click",()=>{
    if(publicUrl) window.open(publicUrl,"_blank","noopener");
  },{ once:true });
}

export function bindMomentDashboard(ctx){
  return paintMomentDashboard(ctx);
}
