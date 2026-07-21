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

import { rsvpGuestPreviewLines, readRsvpFieldsFromForm } from "./moment-rsvp-fields.js?v=177";
import { renderRsvpResponsesShell } from "./moment-rsvp-responses.js";

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

export function rsvpSectionUrl(publicUrl){
  const base = String(publicUrl || "").trim();
  if(!base) return "";
  return `${base.replace(/#.*$/,"")}#moment-section-rsvp`;
}

export function rsvpInviteMessage({ momentType = "free", eventName = "", pageTitle = "", inviteUrl = "" } = {}){
  const type = String(momentType || "free").trim().toLowerCase();
  const emoji = RSVP_INVITE_EMOJI[type] || RSVP_INVITE_EMOJI.default;
  const hook = RSVP_INVITE_COPY[type] || RSVP_INVITE_COPY.default;
  const label = String(eventName || pageTitle || "Il nostro evento").trim();
  const link = String(inviteUrl || "").trim();
  const lines = [
    `${emoji} ${label}`,
    "",
    hook,
    link ? `👉 ${link}` : "",
    "",
    "Compila il modulo RSVP in fondo alla pagina e invia su WhatsApp."
  ];
  return lines.filter(Boolean).join("\n");
}

export function rsvpGuestPreviewMessage(section = {}){
  return rsvpGuestPreviewLines(section);
}

export function renderRsvpSharePanel({ publicUrl, momentType, section = {}, pageTitle = "", published = true } = {}){
  const inviteUrl = rsvpSectionUrl(publicUrl);
  const eventName = String(section.event_name || pageTitle || "").trim();
  const inviteText = rsvpInviteMessage({ momentType, eventName, pageTitle, inviteUrl });
  const guestPreview = rsvpGuestPreviewLines({ ...section, event_name:eventName });
  const fieldKeys = Array.isArray(section.field_keys) ? section.field_keys : [];
  const customCount = Array.isArray(section.custom_fields) ? section.custom_fields.length : 0;
  const publishHint = published
    ? ""
    : `<p class="rsvp-share-warn">⚠️ La pagina è in bozza: pubblicala prima di inviare il link agli invitati.</p>`;
  return `<div class="editor-card smart-card rsvp-share-panel" id="rsvpSharePanel" data-rsvp-share>
    <p class="ecard-title"><span class="step-badge">3</span> Condividi con gli invitati</p>
    ${publishHint}
    <label>Link invito RSVP
      <div class="rsvp-link-row">
        <input type="text" readonly value="${esc(inviteUrl)}" id="rsvpInviteLinkInput" aria-label="Link invito RSVP">
        <button type="button" class="ghost" id="rsvpCopyInviteBtn">Copia</button>
      </div>
    </label>
    <p class="field-hint">Il link apre la pagina direttamente sulla sezione RSVP.</p>
    <div class="rsvp-share-actions">
      <button type="button" class="primary" id="rsvpShareInviteBtn">Condividi invito</button>
      <button type="button" class="ghost" id="rsvpCopyInviteTextBtn">Copia messaggio</button>
    </div>
    <textarea hidden id="rsvpInviteTextStore">${esc(inviteText)}</textarea>
    <details class="rsvp-admin-summary">
      <summary>Riepilogo organizzatore</summary>
      <ul class="rsvp-admin-list">
        <li>Le risposte arrivano sul tuo <strong>WhatsApp</strong> e vengono salvate anche nel riepilogo sotto.</li>
        <li>Consiglio: crea un'etichetta o chat «RSVP · ${esc(eventName || pageTitle || "evento")}» per tenere tutto in ordine.</li>
        <li>Modulo attivo: nome, presenza${fieldKeys.length ? `, ${fieldKeys.length} voce/i extra` : ""}${customCount ? `, ${customCount} voce/i personalizzata/e` : ""}.</li>
      </ul>
      <p class="field-hint">Anteprima messaggio che riceverai:</p>
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
  const extra = readRsvpFieldsFromForm(form);
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
}

export function bindRsvpSharePanel(formNode, { publicUrl, momentType, pageTitle, published = true, copyText, sharePageUrl } = {}){
  const panel = document.getElementById("rsvpSharePanel");
  if(!panel || !formNode) return;
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

/** Messaggio RSVP lato pagina pubblica (Worker) — stesso tono per tipo evento. */
export function rsvpPublicWhatsAppIntro(momentType, eventName){
  const type = String(momentType || "free").trim().toLowerCase();
  const label = String(eventName || "Evento").trim();
  const emoji = RSVP_INVITE_EMOJI[type] || "👋";
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
