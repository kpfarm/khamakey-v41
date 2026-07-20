/** Dashboard Business — panoramica attività (stile Moments organizzatore). */

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function formatNum(value){
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("it-IT") : "0";
}

export function paintBusinessDashboard({
  dirty = false,
  publicUrl = "",
  publicPageUrl = "",
  nfcCode = "",
  businessName = "",
  analytics = {},
  checklistItems = [],
  cloudStatus = ""
} = {}){
  const panel = document.getElementById("businessDashboard");
  if(!panel) return;

  const shareUrl = String(publicUrl || publicPageUrl || "").trim();
  const hasUrl = Boolean(shareUrl);
  const statusChip = dirty
    ? `<span class="dash-chip draft">Modifiche da salvare</span>`
    : hasUrl
      ? `<span class="dash-chip live">Pagina online</span>`
      : `<span class="dash-chip draft">In preparazione</span>`;

  const head = panel.querySelector("#bizDashHead");
  if(head){
    const name = businessName ? `<span class="dash-slug">${esc(businessName)}</span>` : "";
    const nfc = nfcCode ? `<span class="dash-slug">NFC ${esc(nfcCode)}</span>` : "";
    head.innerHTML = `${statusChip}${name}${nfc}`;
  }

  const linkInput = panel.querySelector("#bizDashPublicUrl");
  if(linkInput) linkInput.value = shareUrl;

  const stats = panel.querySelector("#bizDashStats");
  if(stats){
    const chips = [
      `<span class="dash-stat"><strong>${formatNum(analytics.nfc)}</strong> tap NFC</span>`,
      `<span class="dash-stat"><strong>${formatNum(analytics.visits)}</strong> visite</span>`,
      `<span class="dash-stat"><strong>${formatNum(analytics.whatsapp)}</strong> WhatsApp</span>`,
      `<span class="dash-stat yes"><strong>${formatNum(analytics.orders)}</strong> ordini</span>`
    ];
    stats.innerHTML = chips.join("");
  }

  const checklist = panel.querySelector("#bizDashChecklist");
  if(checklist){
    checklist.innerHTML = (checklistItems || []).map(item=>
      `<li class="${item.ok ? "ok" : "todo"}">${esc(item.text)}</li>`
    ).join("");
  }

  const statusEl = panel.querySelector("#bizDashCloud");
  if(statusEl) statusEl.textContent = cloudStatus || "";
}

let actionsBound = false;

export function bindBusinessDashboardActions({ onCopy, onOpen, onGo } = {}){
  if(actionsBound) return;
  const panel = document.getElementById("businessDashboard");
  if(!panel) return;
  actionsBound = true;

  panel.querySelector("#bizDashCopyBtn")?.addEventListener("click",()=>{
    const url = panel.querySelector("#bizDashPublicUrl")?.value || "";
    if(url && typeof onCopy === "function") onCopy(url);
  });
  panel.querySelector("#bizDashOpenBtn")?.addEventListener("click",()=>{
    const url = panel.querySelector("#bizDashPublicUrl")?.value || "";
    if(url && typeof onOpen === "function") onOpen(url);
    else if(url) window.open(url,"_blank","noopener");
  });
  panel.querySelectorAll("[data-biz-dash-go]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const target = btn.dataset.bizDashGo;
      if(target && typeof onGo === "function") onGo(target);
    });
  });
}
