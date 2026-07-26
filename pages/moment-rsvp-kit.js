const RSVP_INVITE_COPY = {
  wedding:"Siamo felici di condividere con te il nostro grande giorno!",
  birthday:"Ti aspettiamo per festeggiare insieme!",
  baptism:"Conferma la tua presenza al battesimo.",
  communion:"Conferma la tua presenza alla comunione.",
  graduation:"Conferma la tua presenza alla laurea.",
  party:"Conferma se ci sarai alla festa!",
  anniversary:"Conferma la tua presenza al nostro anniversario.",
  memorial:"Partecipa al ricordo con noi.",
  travel:"Conferma se vieni con noi in viaggio!",
  default:"Apri la pagina e conferma la tua presenza."
};

const RSVP_INVITE_COPY_EN = {
  wedding:"We’re so happy to share our big day with you!",
  birthday:"We can’t wait to celebrate with you!",
  baptism:"Please confirm your attendance at the baptism.",
  communion:"Please confirm your attendance at the communion.",
  graduation:"Please confirm your attendance at the graduation.",
  party:"Let us know if you’ll be at the party!",
  anniversary:"Please confirm your attendance at our anniversary.",
  memorial:"Join us in remembering.",
  travel:"Let us know if you’re joining the trip!",
  default:"Open the page and confirm your attendance."
};

const RSVP_INVITE_EMOJI = {
  wedding:"💍",
  birthday:"🎂",
  baptism:"🕊️",
  communion:"✨",
  graduation:"🎓",
  party:"🎉",
  anniversary:"💑",
  memorial:"🕯️",
  travel:"✈️",
  default:"📲"
};

import { rsvpGuestPreviewLines, readRsvpFieldsFromForm } from "./moment-rsvp-fields.js?v=221";
import { renderRsvpResponsesShell } from "./moment-rsvp-responses.js?v=221";
import { getUiLocale } from "./moments-i18n.js?v=221";
import { FIELD_PHRASE_EN } from "./moments-i18n-fields.js?v=221";

let lastShareCtx = null;

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

function lfSpan(itText){
  const it = String(itText || "");
  return `<span data-lf="${esc(it)}">${esc(lf(it))}</span>`;
}

function inviteLocale(){
  return getUiLocale() === "en" ? "en" : "it";
}

function syncShareChromeI18n(root){
  if(!root) return;
  root.querySelectorAll("[data-lf]").forEach(el=>{
    const src = el.getAttribute("data-lf");
    if(src == null) return;
    el.textContent = lf(src);
  });
  root.querySelectorAll("[data-lf-placeholder]").forEach(el=>{
    const src = el.getAttribute("data-lf-placeholder");
    if(src == null) return;
    el.setAttribute("placeholder", lf(src));
  });
}

function inviteHook(type){
  const map = inviteLocale() === "en" ? RSVP_INVITE_COPY_EN : RSVP_INVITE_COPY;
  return map[type] || map.default;
}

export function rsvpSectionUrl(publicUrl){
  const base = String(publicUrl || "").trim();
  if(!base) return "";
  return `${base.replace(/#.*$/,"")}#moment-section-rsvp`;
}

export function rsvpInviteMessage({ momentType = "free", eventName = "", pageTitle = "", inviteUrl = "" } = {}){
  const type = String(momentType || "free").trim().toLowerCase();
  const emoji = RSVP_INVITE_EMOJI[type] || RSVP_INVITE_EMOJI.default;
  const hook = inviteHook(type);
  const en = inviteLocale() === "en";
  const label = String(eventName || pageTitle || (en ? "Our event" : "Il nostro evento")).trim();
  const link = String(inviteUrl || "").trim();
  const footer = en
    ? "Fill in the RSVP form at the bottom of the page and send on WhatsApp."
    : "Compila il modulo RSVP in fondo alla pagina e invia su WhatsApp.";
  const lines = [
    `${emoji} ${label}`,
    "",
    hook,
    link ? `👉 ${link}` : "",
    "",
    footer
  ];
  return lines.filter(Boolean).join("\n");
}

export function rsvpGuestPreviewMessage(section = {}){
  return rsvpGuestPreviewLines(section);
}

function rsvpAdminSummaryHtml({ eventName = "", pageTitle = "", fieldKeys = [], customCount = 0 } = {}){
  const label = eventName || pageTitle || lf("evento");
  const tipIt = "Consiglio: crea un'etichetta o chat «RSVP · {label}» per tenere tutto in ordine.";
  const tip = lfFill(tipIt, { label });
  let moduleLine = lf("Modulo attivo: nome, presenza");
  if(fieldKeys.length) moduleLine += lfFill(", {n} voce/i extra", { n: fieldKeys.length });
  if(customCount) moduleLine += lfFill(", {n} voce/i personalizzata/e", { n: customCount });
  const waIt = "Le risposte arrivano sul tuo WhatsApp e vengono salvate anche nel riepilogo sotto.";
  const previewHint = "Anteprima messaggio che riceverai:";
  return `<summary data-lf="Riepilogo organizzatore">${esc(lf("Riepilogo organizzatore"))}</summary>
      <ul class="rsvp-admin-list" id="rsvpAdminList">
        <li data-lf="${esc(waIt)}">${esc(lf(waIt))}</li>
        <li data-rsvp-admin-tip data-lf-template="${esc(tipIt)}" data-lf-label="${esc(label)}">${esc(tip)}</li>
        <li data-rsvp-admin-module>${esc(moduleLine)}</li>
      </ul>
      <p class="field-hint" data-lf="${esc(previewHint)}">${esc(lf(previewHint))}</p>`;
}

export function renderRsvpSharePanel({ publicUrl, momentType, section = {}, pageTitle = "", published = true } = {}){
  const inviteUrl = rsvpSectionUrl(publicUrl);
  const eventName = String(section.event_name || pageTitle || "").trim();
  const inviteText = rsvpInviteMessage({ momentType, eventName, pageTitle, inviteUrl });
  const guestPreview = rsvpGuestPreviewLines({ ...section, event_name:eventName });
  const fieldKeys = Array.isArray(section.field_keys) ? section.field_keys : [];
  const customCount = Array.isArray(section.custom_fields) ? section.custom_fields.length : 0;
  const warnIt = "⚠️ La pagina è in bozza: pubblicala prima di inviare il link agli invitati.";
  const publishHint = published
    ? ""
    : `<p class="rsvp-share-warn" data-lf="${esc(warnIt)}">${esc(lf(warnIt))}</p>`;
  const titleIt = "Condividi con gli invitati";
  const linkIt = "Link invito RSVP";
  const copyIt = "Copia";
  const linkHint = "Il link apre la pagina direttamente sulla sezione RSVP.";
  const shareIt = "Condividi invito";
  const copyMsgIt = "Copia messaggio";
  return `<div class="editor-card smart-card rsvp-share-panel" id="rsvpSharePanel" data-rsvp-share>
    <p class="ecard-title"><span class="step-badge">3</span> ${lfSpan(titleIt)}</p>
    ${publishHint}
    <label>${lfSpan(linkIt)}
      <div class="rsvp-link-row">
        <input type="text" readonly value="${esc(inviteUrl)}" id="rsvpInviteLinkInput" aria-label="${esc(lf(linkIt))}">
        <button type="button" class="ghost" id="rsvpCopyInviteBtn" data-lf="${esc(copyIt)}">${esc(lf(copyIt))}</button>
      </div>
    </label>
    <p class="field-hint" data-lf="${esc(linkHint)}">${esc(lf(linkHint))}</p>
    <div class="rsvp-share-actions">
      <button type="button" class="primary" id="rsvpShareInviteBtn" data-lf="${esc(shareIt)}">${esc(lf(shareIt))}</button>
      <button type="button" class="ghost" id="rsvpCopyInviteTextBtn" data-lf="${esc(copyMsgIt)}">${esc(lf(copyMsgIt))}</button>
    </div>
    <textarea hidden id="rsvpInviteTextStore">${esc(inviteText)}</textarea>
    <details class="rsvp-admin-summary" id="rsvpAdminSummary">
      ${rsvpAdminSummaryHtml({ eventName, pageTitle, fieldKeys, customCount })}
      <pre class="rsvp-preview-msg" id="rsvpGuestPreview">${esc(guestPreview)}</pre>
    </details>
    ${renderRsvpResponsesShell()}
  </div>`;
}

export function syncRsvpSharePanel(formNode, { publicUrl, momentType, pageTitle, published = true } = {}){
  const panel = document.getElementById("rsvpSharePanel");
  if(!panel || !formNode) return;
  const form = new FormData(formNode);
  const eventName = String(form.get("section_rsvp_event_name") || pageTitle || "").trim();
  const extra = readRsvpFieldsFromForm(form, formNode);
  const inviteUrl = rsvpSectionUrl(publicUrl);
  const linkInput = panel.querySelector("#rsvpInviteLinkInput");
  const textStore = panel.querySelector("#rsvpInviteTextStore");
  const preview = panel.querySelector("#rsvpGuestPreview");
  if(linkInput) linkInput.value = inviteUrl;
  if(textStore){
    textStore.value = rsvpInviteMessage({ momentType, eventName, pageTitle, inviteUrl });
  }
  if(preview){
    preview.textContent = rsvpGuestPreviewLines({ ...extra, event_name:eventName });
  }
  const fieldKeys = Array.isArray(extra.field_keys) ? extra.field_keys : [];
  const customCount = Array.isArray(extra.custom_fields) ? extra.custom_fields.length : 0;
  const label = eventName || pageTitle || lf("evento");
  const warn = panel.querySelector(".rsvp-share-warn");
  if(warn) warn.hidden = Boolean(published);
  syncShareChromeI18n(panel);
  const tip = panel.querySelector("[data-rsvp-admin-tip]");
  if(tip){
    const tipTpl = tip.getAttribute("data-lf-template") || "Consiglio: crea un'etichetta o chat «RSVP · {label}» per tenere tutto in ordine.";
    tip.setAttribute("data-lf-label", label);
    tip.textContent = lfFill(tipTpl, { label });
  }
  const moduleEl = panel.querySelector("[data-rsvp-admin-module]");
  if(moduleEl){
    let moduleLine = lf("Modulo attivo: nome, presenza");
    if(fieldKeys.length) moduleLine += lfFill(", {n} voce/i extra", { n: fieldKeys.length });
    if(customCount) moduleLine += lfFill(", {n} voce/i personalizzata/e", { n: customCount });
    moduleEl.textContent = moduleLine;
  }
}

export function refreshRsvpShareLocale(formNode){
  if(!formNode || !lastShareCtx) return;
  syncRsvpSharePanel(formNode, lastShareCtx);
}

export function bindRsvpSharePanel(formNode, { publicUrl, momentType, pageTitle, published = true, copyText, sharePageUrl } = {}){
  const panel = document.getElementById("rsvpSharePanel");
  if(!panel || !formNode) return;
  lastShareCtx = { publicUrl, momentType, pageTitle, published };
  const sync = ()=>syncRsvpSharePanel(formNode,{ publicUrl, momentType, pageTitle, published });
  ["section_rsvp_event_name"].forEach(name=>{
    formNode.querySelector(`[name="${name}"]`)?.addEventListener("input",sync);
    formNode.querySelector(`[name="${name}"]`)?.addEventListener("change",sync);
  });
  formNode.querySelectorAll("[data-rsvp-field-key], [name^='section_rsvp_custom_label_'], [name^='section_rsvp_custom_placeholder_']").forEach(node=>{
    node.addEventListener("input",sync);
    node.addEventListener("change",sync);
  });
  panel.querySelector("#rsvpCopyInviteBtn")?.addEventListener("click",()=>{
    const url = panel.querySelector("#rsvpInviteLinkInput")?.value || rsvpSectionUrl(publicUrl);
    copyText?.(url, panel.querySelector("#rsvpCopyInviteBtn"));
  });
  panel.querySelector("#rsvpCopyInviteTextBtn")?.addEventListener("click",()=>{
    const text = panel.querySelector("#rsvpInviteTextStore")?.value || "";
    copyText?.(text, panel.querySelector("#rsvpCopyInviteTextBtn"));
  });
  panel.querySelector("#rsvpShareInviteBtn")?.addEventListener("click",async()=>{
    sync();
    const url = panel.querySelector("#rsvpInviteLinkInput")?.value || rsvpSectionUrl(publicUrl);
    const text = panel.querySelector("#rsvpInviteTextStore")?.value || "";
    if(navigator.share){
      try{
        await navigator.share({
          title:`RSVP · ${eventNameFromForm(formNode, pageTitle)}`,
          text,
          url
        });
        return;
      }catch(error){
        if(error?.name === "AbortError") return;
      }
    }
    await copyText?.(text, panel.querySelector("#rsvpShareInviteBtn"));
  });
  sync();
}

function eventNameFromForm(formNode, pageTitle){
  return String(formNode.querySelector('[name="section_rsvp_event_name"]')?.value || pageTitle || "Evento").trim();
}

/** Messaggio RSVP lato pagina pubblica — allineato al Worker (IT|EN). */
export function rsvpPublicWhatsAppIntro(momentType, eventName){
  const type = String(momentType || "free").trim().toLowerCase();
  const en = inviteLocale() === "en";
  const label = String(eventName || (en ? "Event" : "Evento")).trim();
  const emoji = RSVP_INVITE_EMOJI[type] || "👋";
  if(en){
    const hooks = {
      wedding:`Hi! ${emoji} Wedding RSVP · ${label}`,
      birthday:`Hi! ${emoji} Birthday RSVP · ${label}`,
      baptism:`Hi! ${emoji} Baptism RSVP · ${label}`,
      communion:`Hi! ${emoji} Communion RSVP · ${label}`,
      graduation:`Hi! ${emoji} Graduation RSVP · ${label}`,
      party:`Hi! ${emoji} Party RSVP · ${label}`,
      anniversary:`Hi! ${emoji} Anniversary RSVP · ${label}`,
      memorial:`Hi! ${emoji} Attendance · ${label}`,
      travel:`Hi! ${emoji} Travel RSVP · ${label}`
    };
    return hooks[type] || `Hi! ${emoji} RSVP · ${label}`;
  }
  const hooks = {
    wedding:`Ciao! ${emoji} RSVP matrimonio · ${label}`,
    birthday:`Ciao! ${emoji} RSVP compleanno · ${label}`,
    baptism:`Ciao! ${emoji} RSVP battesimo · ${label}`,
    communion:`Ciao! ${emoji} RSVP comunione · ${label}`,
    graduation:`Ciao! ${emoji} RSVP laurea · ${label}`,
    party:`Ciao! ${emoji} RSVP festa · ${label}`,
    anniversary:`Ciao! ${emoji} RSVP anniversario · ${label}`,
    memorial:`Ciao! ${emoji} Partecipazione · ${label}`,
    travel:`Ciao! ${emoji} RSVP viaggio · ${label}`
  };
  return hooks[type] || `Ciao! ${emoji} RSVP · ${label}`;
}
