import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const gate = document.getElementById("gate");
const portal = document.getElementById("portal");
const loginForm = document.getElementById("loginForm");
const gateMsg = document.getElementById("gateMsg");
const noAgentNotice = document.getElementById("noAgentNotice");
const portalBody = document.getElementById("portalBody");
const portalHello = document.getElementById("portalHello");
const portalSub = document.getElementById("portalSub");

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function money(v){ return Number(v || 0).toLocaleString("it-IT", { style:"currency", currency:"EUR" }); }
function dateShort(v){ return v ? new Date(v).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "-"; }

const COMMISSION_STATUS = { pending:"Da pagare", approved:"Approvata", paid:"Pagata", cancelled:"Annullata" };
const EVENT_LABELS = { nfc_order:"Ordine NFC", subscription:"Abbonamento", setup:"Setup" };
function tierLevel(l){ return l ? `L${l}` : "Diretta"; }

async function showGate(message){
  portal.hidden = true;
  gate.hidden = false;
  if(message) gateMsg.textContent = message;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  gateMsg.textContent = "Accesso in corso…";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){
    gateMsg.textContent = "Email o password non corretti.";
    return;
  }
  gateMsg.textContent = "";
  await enterPortal();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

document.querySelectorAll(".tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== tab; });
  });
});

async function enterPortal(){
  gate.hidden = true;
  portal.hidden = false;

  const { data: profileRows, error } = await supabase.rpc("get_my_agent_profile");
  if(error){
    console.error("get_my_agent_profile", error);
    portalHello.textContent = "Ciao";
    noAgentNotice.hidden = false;
    portalBody.hidden = true;
    return;
  }
  const profile = (profileRows || [])[0];
  if(!profile){
    portalHello.textContent = "Ciao";
    noAgentNotice.hidden = false;
    portalBody.hidden = true;
    return;
  }

  noAgentNotice.hidden = true;
  portalBody.hidden = false;
  portalHello.innerHTML = `Ciao ${esc(profile.contact_name || profile.business_name || "partner")}${profile.tier_key ? `<span class="badge">${esc(profile.tier_key)}</span>` : ""}`;
  const subParts = [];
  if(profile.referral_code) subParts.push(`Codice: ${esc(profile.referral_code)}`);
  if(profile.territory) subParts.push(esc(profile.territory));
  subParts.push(`${profile.network_size || 0} nella tua rete diretta`);
  portalSub.innerHTML = subParts.join(" · ");

  document.getElementById("cardPending").textContent = money(profile.pending_total);
  document.getElementById("cardApproved").textContent = money(profile.approved_total);
  document.getElementById("cardPaid").textContent = money(profile.paid_total);

  await Promise.all([loadCommissions(), loadNetwork(), loadDeliveries()]);
}

async function loadCommissions(){
  const body = document.getElementById("commissionsBody");
  try{
    const { data, error } = await supabase.rpc("get_my_commissions");
    if(error) throw error;
    const rows = data || [];
    body.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${esc(dateShort(r.created_at))}</td>
        <td>${esc(EVENT_LABELS[r.event_type] || r.event_type)}</td>
        <td>${esc(tierLevel(r.tier_level))}</td>
        <td>${r.order_code ? esc(r.order_code) : "-"}</td>
        <td class="num">${money(r.amount)}</td>
        <td class="num">${esc(Number(r.commission_percent || 0))}%</td>
        <td class="num"><strong>${money(r.commission_amount)}</strong></td>
        <td><span class="pill ${esc(r.status)}">${esc(COMMISSION_STATUS[r.status] || r.status)}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="8" class="empty">Nessuna provvigione ancora. Appariranno qui quando i tuoi ordini verranno registrati.</td></tr>`;
  }catch(error){
    console.error("get_my_commissions", error);
    body.innerHTML = `<tr><td colspan="8" class="empty">Impossibile caricare le provvigioni.</td></tr>`;
  }
}

async function loadNetwork(){
  const body = document.getElementById("networkBody");
  try{
    const { data, error } = await supabase.rpc("get_my_network");
    if(error) throw error;
    const rows = data || [];
    body.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td><strong>${esc(r.contact_name || "-")}</strong></td>
        <td>${esc(r.business_name || "-")}</td>
        <td>${esc(r.referral_code || "-")}</td>
        <td>${esc(tierLevel(r.depth))}</td>
        <td>${esc(r.tier_key || "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty">Non hai ancora rivenditori nella tua rete.</td></tr>`;
  }catch(error){
    console.error("get_my_network", error);
    body.innerHTML = `<tr><td colspan="5" class="empty">Impossibile caricare la rete.</td></tr>`;
  }
}

async function loadDeliveries(){
  const body = document.getElementById("deliveriesBody");
  try{
    const { data, error } = await supabase.rpc("get_my_deliveries");
    if(error) throw error;
    const rows = data || [];
    body.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${esc(dateShort(r.created_at))}</td>
        <td><strong>${esc(r.product_label || r.delivery_type || "-")}</strong></td>
        <td>${esc(r.sku || "-")}</td>
        <td class="num">${esc(r.quantity ?? "-")}</td>
        <td><span class="pill ${esc(r.status)}">${esc(r.status || "-")}</span></td>
        <td>${esc(r.tracking_code || "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">Nessuna consegna registrata.</td></tr>`;
  }catch(error){
    console.error("get_my_deliveries", error);
    body.innerHTML = `<tr><td colspan="6" class="empty">Impossibile caricare le consegne.</td></tr>`;
  }
}

async function init(){
  if(!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY){
    showGate("Configurazione mancante.");
    return;
  }
  const { data } = await supabase.auth.getSession();
  if(data?.session?.user){
    await enterPortal();
  }else{
    gate.hidden = false;
    portal.hidden = true;
  }
}

init();
