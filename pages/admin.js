import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";
import { exportMomentLabelsPdf } from "./admin-moment-labels.js";

const ADMIN_EMAILS = new Set([
  "kristianperelli@gmail.com",
  "info.khamakey@gmail.com"
]);

const PERMISSIONS = [
  ["support.read","Vedere richieste supporto"],
  ["support.write","Rispondere al supporto"],
  ["shipping.read","Vedere spedizioni e NFC"],
  ["shipping.write","Aggiornare spedizioni e codici NFC"],
  ["crm.read","Vedere CRM clienti"],
  ["crm.write","Modificare CRM e note"],
  ["moments.read","Vedere KhamaKey Moments"],
  ["moments.write","Gestire KhamaKey Moments"],
  ["pages.read","Vedere pagine clienti"],
  ["pages.write","Modificare pagine clienti"],
  ["analytics.read","Vedere analytics clienti"],
  ["billing.read","Vedere piani e pagamenti"],
  ["billing.write","Gestire piani e fatturazione"],
  ["staff.manage","Gestire collaboratori e permessi"],
  ["agents.read","Vedere agenti e rivenditori"],
  ["agents.write","Gestire agenti e rivenditori"],
  ["commissions.read","Vedere provvigioni"],
  ["commissions.write","Gestire provvigioni"],
  ["inventory.read","Vedere magazzino prodotti"],
  ["inventory.write","Gestire prodotti e movimenti magazzino"],
  ["orders.read","Vedere ordini KhamaKey"],
  ["orders.write","Gestire ordini KhamaKey"],
  ["audit.read","Vedere log operativi"],
  ["settings.manage","Gestire impostazioni piattaforma"],
  ["admin.full","Accesso completo"]
];

const PUBLIC_BASE_URL = WORKER_BASE_URL;
const LOCAL_PAGES_BASE = location.protocol === "file:" ? "." : location.origin;
const shell = document.getElementById("adminShell");
const sidebar = document.getElementById("adminSidebar");
const topbar = document.getElementById("adminTopbar");
const gate = document.getElementById("adminGate");
const gateText = document.getElementById("adminGateText");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminResetPassword = document.getElementById("adminResetPassword");
const content = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const adminTitle = document.getElementById("adminTitle");
const clientsTable = document.getElementById("clientsTable");
const momentsTable = document.getElementById("momentsTable");
const momentForm = document.getElementById("momentForm");
const momentFormStatus = document.getElementById("momentFormStatus");
const momentBusinessSelect = document.getElementById("momentBusinessSelect");
const momentProvisionForm = document.getElementById("momentProvisionForm");
const momentProvisionStatus = document.getElementById("momentProvisionStatus");
const momentCustomersTable = document.getElementById("momentCustomersTable");
const momentBatchForm = document.getElementById("momentBatchForm");
const momentBatchStatus = document.getElementById("momentBatchStatus");
const momentInventoryStats = document.getElementById("momentInventoryStats");
const momentFilterLine = document.getElementById("momentFilterLine");
const momentFilterBatch = document.getElementById("momentFilterBatch");
const momentFilterStatus = document.getElementById("momentFilterStatus");
const momentFilterAgent = document.getElementById("momentFilterAgent");
const momentFilterChannel = document.getElementById("momentFilterChannel");
const momentFilterOrder = document.getElementById("momentFilterOrder");
const momentSearchInput = document.getElementById("momentSearchInput");
const momentSearchClear = document.getElementById("momentSearchClear");
const momentSelectAll = document.getElementById("momentSelectAll");
const momentBulkBar = document.getElementById("momentBulkBar");
const momentBulkCount = document.getElementById("momentBulkCount");
const momentBulkAgent = document.getElementById("momentBulkAgent");
const momentBulkChannel = document.getElementById("momentBulkChannel");
const momentBulkStatus = document.getElementById("momentBulkStatus");
const momentBulkApply = document.getElementById("momentBulkApply");
const momentBulkClearAgent = document.getElementById("momentBulkClearAgent");
const momentBulkClearOrder = document.getElementById("momentBulkClearOrder");
const momentTableCount = document.getElementById("momentTableCount");
const momentExportFiltered = document.getElementById("momentExportFiltered");
const momentExportSelected = document.getElementById("momentExportSelected");
const momentLabelsFiltered = document.getElementById("momentLabelsFiltered");
const momentLabelsSelected = document.getElementById("momentLabelsSelected");
const momentAgentStats = document.getElementById("momentAgentStats");
const momentProductsTable = document.getElementById("momentProductsTable");
const codeDrawer = document.getElementById("codeDrawer");
const codeEditForm = document.getElementById("codeEditForm");
const codeEditFormStatus = document.getElementById("codeEditFormStatus");
const codeEditAgent = document.getElementById("codeEditAgent");
const orderDrawer = document.getElementById("orderDrawer");
const orderEditForm = document.getElementById("orderEditForm");
const orderEditStatus = document.getElementById("orderEditStatus");
const orderAssignForm = document.getElementById("orderAssignForm");
const orderAssignStatus = document.getElementById("orderAssignStatus");
const orderAssignAgent = document.getElementById("orderAssignAgent");
const orderCodesTable = document.getElementById("orderCodesTable");
const nfcOrderFields = document.getElementById("nfcOrderFields");
const membersTable = document.getElementById("membersTable");
const agentsTable = document.getElementById("agentsTable");
const commissionsTable = document.getElementById("commissionsTable");
const commissionRulesTable = document.getElementById("commissionRulesTable");
const productsTable = document.getElementById("productsTable");
const stockMovementsTable = document.getElementById("stockMovementsTable");
const platformOrdersTable = document.getElementById("platformOrdersTable");
const productForm = document.getElementById("productForm");
const productFormStatus = document.getElementById("productFormStatus");
const stockForm = document.getElementById("stockForm");
const stockFormStatus = document.getElementById("stockFormStatus");
const stockProductSelect = document.getElementById("stockProductSelect");
const platformOrderForm = document.getElementById("platformOrderForm");
const platformOrderFormStatus = document.getElementById("platformOrderFormStatus");
const orderBusinessSelect = document.getElementById("orderBusinessSelect");
const orderAgentSelect = document.getElementById("orderAgentSelect");
const clientRecordForm = document.getElementById("clientRecordForm");
const clientRecordStatus = document.getElementById("clientRecordStatus");
const clientAgentSelect = document.getElementById("clientAgentSelect");
const drawerOrdersTable = document.getElementById("drawerOrdersTable");
const drawerAnalyticsTable = document.getElementById("drawerAnalyticsTable");
const drawerTicketsTable = document.getElementById("drawerTicketsTable");
const ticketForm = document.getElementById("ticketForm");
const ticketFormStatus = document.getElementById("ticketFormStatus");
const clientNoteForm = document.getElementById("clientNoteForm");
const clientNoteStatus = document.getElementById("clientNoteStatus");
const clientNotesList = document.getElementById("clientNotesList");
const supportTicketsTable = document.getElementById("supportTicketsTable");
const ticketCategoriesTable = document.getElementById("ticketCategoriesTable");
const ticketCategoryForm = document.getElementById("ticketCategoryForm");
const ticketCategoryStatus = document.getElementById("ticketCategoryStatus");
const billingPlansTable = document.getElementById("billingPlansTable");
const plansTable = document.getElementById("plansTable");
const planForm = document.getElementById("planForm");
const planFormStatus = document.getElementById("planFormStatus");
const materialsTable = document.getElementById("materialsTable");
const materialForm = document.getElementById("materialForm");
const materialFormStatus = document.getElementById("materialFormStatus");
const integrationForm = document.getElementById("integrationForm");
const integrationFormStatus = document.getElementById("integrationFormStatus");
const integrationsTable = document.getElementById("integrationsTable");
const paymentTransactionsTable = document.getElementById("paymentTransactionsTable");
const webhookEventsTable = document.getElementById("webhookEventsTable");
const permissionGrid = document.getElementById("permissionGrid");
const memberPermissionChecklist = document.getElementById("memberPermissionChecklist");
const memberForm = document.getElementById("memberForm");
const memberFormStatus = document.getElementById("memberFormStatus");
const agentForm = document.getElementById("agentForm");
const agentFormStatus = document.getElementById("agentFormStatus");
const drawer = document.getElementById("clientDrawer");
const drawerFrame = document.getElementById("drawerPublicFrame");
const drawerEditorFrame = document.getElementById("drawerEditorFrame");
const momentDrawer = document.getElementById("momentDrawer");
const momentDrawerPublicFrame = document.getElementById("momentDrawerPublicFrame");
const momentDrawerEditorFrame = document.getElementById("momentDrawerEditorFrame");

let supabase = null;
let currentMember = null;
let clientRows = [];
let agentRows = [];
let productRows = [];
let momentRows = [];
let momentCustomerRows = [];
let momentProductRows = [];
let currentMoment = null;
let momentInventoryRows = [];
let momentAgentInventoryRows = [];
let selectedMomentCodes = new Set();
let currentCodeRow = null;
let currentPlatformOrder = null;

const PRODUCT_LINE_LABELS = {
  orsetto:"Orsetto NFC",
  portachiavi:"Portachiavi NFC",
  card:"Card NFC",
  magnete:"Magnete NFC",
  tag:"Tag / tessera NFC",
  confezione:"Confezione regalo",
  altro:"Altro oggetto",
  non_specificato:"Non specificato"
};

const SOLD_CHANNEL_LABELS = {
  direct:"Diretto / sito",
  agent:"Agente",
  reseller:"Rivenditore",
  gift:"Regalo / confezione",
  other:"Altro",
  non_specificato:"Non specificato"
};

const MOMENT_TEMPLATE_LABELS = {
  free:"Evento generale",
  love:"Amore",
  mom:"Mamma",
  dad:"Papà",
  child:"Figlio / Figlia",
  kids:"Bambini",
  memory:"Ricordi",
  photo:"Album foto",
  pet:"Animali",
  communion:"Comunione",
  baptism:"Battesimo",
  friendship:"Amicizia",
  family:"Famiglia",
  valentine:"San Valentino",
  christmas:"Natale",
  birthday:"Compleanno",
  wedding:"Matrimonio",
  party:"Festa",
  travel:"Viaggio",
  memorial:"Memoriale",
  portfolio:"Portfolio"
};
let platformOrderRows = [];
let planRows = [];
let materialRows = [];
let ticketCategoryRows = [];
let integrationRows = [];
let currentClient = null;
let currentClientRecord = null;

const ORDER_STATUS_OPTIONS = ["draft","pending","paid","production","ready","shipped","completed","cancelled","refunded"];
const PAYMENT_STATUS_OPTIONS = ["unpaid","pending","paid","refunded","failed"];

function setGate(message,type=""){
  gateText.textContent = message;
  gateText.className = type;
}

function showLoginGate(message="Accedi con un account admin KhamaKey."){
  shell.classList.add("locked");
  sidebar.hidden = true;
  topbar.hidden = true;
  gate.hidden = false;
  content.hidden = true;
  adminLoginForm.hidden = false;
  setGate(message);
}

function showAdmin(user,member){
  shell.classList.remove("locked");
  sidebar.hidden = false;
  topbar.hidden = false;
  gate.hidden = true;
  adminLoginForm.hidden = true;
  content.hidden = false;
  const label = member?.role ? `${user.email} · ${member.role}` : user.email;
  adminEmail.textContent = label || "Admin";
}

function showDenied(email){
  shell.classList.add("locked");
  sidebar.hidden = true;
  topbar.hidden = true;
  gate.hidden = false;
  adminLoginForm.hidden = false;
  content.hidden = true;
  adminEmail.textContent = email || "Non autorizzato";
  setGate("Accesso non autorizzato. Questa pagina è riservata ad admin e collaboratori KhamaKey autorizzati.","denied");
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}

function fmt(value){
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("it-IT") : "0";
}

function money(value){
  return Number(value || 0).toLocaleString("it-IT",{style:"currency",currency:"EUR"});
}

function marginPercent(salePrice,unitCost){
  const sale = Number(salePrice || 0);
  const cost = Number(unitCost || 0);
  if(!sale) return "-";
  return `${Math.round(((sale - cost) / sale) * 100)}%`;
}

function dateShort(value){
  if(!value) return "-";
  return new Date(value).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
}

function toDateTimeLocal(value){
  if(!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0,16);
}

async function pinHash(slug,pin){
  if(!pin) return "";
  const data = new TextEncoder().encode(`moment:${slug}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

function permissionLabel(key){
  return PERMISSIONS.find(([value])=>value === key)?.[1] || key;
}

function hasPermission(key){
  const permissions = currentMember?.permissions || [];
  return currentMember?.role === "owner" ||
    currentMember?.role === "admin" ||
    permissions.includes("admin.full") ||
    permissions.includes(key);
}

function setFormStatus(node,message,type=""){
  node.textContent = message;
  node.className = `form-status ${type}`.trim();
}

function selectOptions(options,selected){
  return options.map(value=>`<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(value)}</option>`).join("");
}

function focusForm(form,statusNode,message){
  form.scrollIntoView({behavior:"smooth",block:"start"});
  const first = form.querySelector("input,select,textarea");
  if(first) first.focus({preventScroll:true});
  setFormStatus(statusNode,message || "Modifica caricata nel form.","ok");
}

function nextOrderCode(prefix="KK"){
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}`;
  return `${prefix}-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function renderAgentOptions(selectedId=""){
  const options = `<option value="">Nessun agente</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}" ${row.id === selectedId ? "selected" : ""}>${esc(row.contact_name || row.email)} · ${esc(row.referral_code)}</option>
  `).join("");
  orderAgentSelect.innerHTML = options;
  clientAgentSelect.innerHTML = options;
  if(codeEditAgent) codeEditAgent.innerHTML = options;
  if(orderAssignAgent) orderAssignAgent.innerHTML = `<option value="">Usa agente ordine</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}">${esc(row.contact_name || row.email)} · ${esc(row.referral_code)}</option>
  `).join("");
  if(momentBulkAgent) momentBulkAgent.innerHTML = `<option value="">Agente…</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}">${esc(row.contact_name || row.email)}</option>
  `).join("");
  populateMomentAgentFilter();
}

function soldChannelLabel(value){
  return SOLD_CHANNEL_LABELS[value] || value || "Non specificato";
}

function agentLabelById(id){
  if(!id) return "-";
  const agent = agentRows.find(row=>row.id === id);
  return agent ? (agent.contact_name || agent.email) : String(id).slice(0,8) + "…";
}

function renderPermissions(){
  permissionGrid.innerHTML = PERMISSIONS.map(([key,label]) => `
    <div class="permission-item">
      <strong>${key}</strong>
      <span>${label}</span>
    </div>
  `).join("");
  memberPermissionChecklist.innerHTML = PERMISSIONS.map(([key,label]) => `
    <label>
      <input type="checkbox" name="permissions" value="${esc(key)}">
      <span><strong>${esc(key)}</strong><br>${esc(label)}</span>
    </label>
  `).join("");
}

function switchTab(tab){
  document.querySelectorAll("[data-admin-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.adminTab === tab);
  });
  document.querySelectorAll("[data-panel]").forEach(panel=>{
    panel.classList.toggle("active",panel.dataset.panel === tab);
  });
  const active = document.querySelector(`[data-admin-tab="${tab}"]`);
  const group = active?.closest("[data-nav-group]");
  if(group) group.classList.add("open");
  adminTitle.textContent = active?.textContent || "Admin";
}

async function safeCount(table,filter){
  try{
    let query = supabase.from(table).select("*",{count:"exact",head:true});
    if(filter) query = filter(query);
    const { count,error } = await query;
    if(error) throw error;
    return count || 0;
  }catch(error){
    console.warn(`Conteggio ${table} non disponibile`,error);
    return 0;
  }
}

async function loadCurrentMember(user){
  const email = String(user.email || "").toLowerCase();
  try{
    const { data,error } = await supabase
      .from("platform_members")
      .select("id,user_id,email,full_name,role,status,permissions")
      .eq("email",email)
      .maybeSingle();
    if(error) throw error;
    if(data?.status === "active"){
      return data;
    }
  }catch(error){
    console.warn("Tabella membri non disponibile, uso allowlist temporanea",error);
  }
  if(ADMIN_EMAILS.has(email)){
    return {
      email,
      role:"owner",
      status:"active",
      permissions:["admin.full"]
    };
  }
  return null;
}

async function loadDashboard(){
  const [clients,published,nfc,events,agents,orders,pendingCommissions,moments,momentsAvailable] = await Promise.all([
    safeCount("businesses"),
    safeCount("business_public_pages",query=>query.eq("published",true)),
    safeCount("nfc_tags"),
    safeCount("analytics_events"),
    safeCount("platform_agents",query=>query.eq("status","active")),
    safeCount("platform_orders"),
    safeCount("platform_commission_events",query=>query.eq("status","pending")),
    safeCount("moment_events"),
    safeCount("moment_activation_codes",query=>query.eq("status","available"))
  ]);
  let stock = 0;
  try{
    const { data,error } = await supabase
      .from("platform_product_stock_summary")
      .select("available_quantity");
    if(error) throw error;
    stock = (data || []).reduce((sum,row)=>sum + Number(row.available_quantity || 0),0);
  }catch(error){
    console.warn("Stock non disponibile",error);
  }
  document.getElementById("mClients").textContent = fmt(clients);
  document.getElementById("mPublished").textContent = fmt(published);
  document.getElementById("mNfc").textContent = fmt(nfc);
  document.getElementById("mEvents").textContent = fmt(events);
  document.getElementById("mStock").textContent = fmt(stock);
  document.getElementById("mPlatformOrders").textContent = fmt(orders);
  document.getElementById("mAgents").textContent = fmt(agents);
  document.getElementById("mPendingCommissions").textContent = fmt(pendingCommissions);
  document.getElementById("mMoments").textContent = fmt(moments);
  const momentStockNode = document.getElementById("mMomentStock");
  if(momentStockNode) momentStockNode.textContent = fmt(momentsAvailable);
}

async function loadClients(){
  try{
    const { data,error } = await supabase
      .from("businesses")
      .select("id,profile_id,nome,slug,categoria")
      .order("created_at",{ascending:false})
      .limit(50);
    if(error) throw error;
    const rows = data || [];
    clientRows = rows;
    const businessOptions = `<option value="">Nessun cliente collegato</option>` + rows.map(row=>`
      <option value="${esc(row.id)}">${esc(row.nome || row.slug || row.id)}</option>
    `).join("");
    orderBusinessSelect.innerHTML = businessOptions;
    momentBusinessSelect.innerHTML = businessOptions;
    clientsTable.innerHTML = rows.length ? rows.map(row => `
      <tr>
        <td><strong>${esc(row.nome || "Senza nome")}</strong></td>
        <td>${esc(row.slug || "-")}</td>
        <td>${esc(row.categoria || "-")}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-client-open="${esc(row.id)}" data-client-view="summary">Scheda</button>
            ${row.slug ? `<button type="button" data-client-open="${esc(row.id)}" data-client-view="public">Pagina</button>` : ""}
            <button type="button" data-client-open="${esc(row.id)}" data-client-view="editor">Editor</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="4">Nessun cliente trovato o permessi database non ancora configurati.</td></tr>`;
  }catch(error){
    console.error(error);
    const hint = String(error?.message || "").includes("permission") || String(error?.code || "") === "42501"
      ? "Accesso negato dal database. Ricarica la pagina: se persiste, verifica SQL v63."
      : (error?.message || "Errore caricamento clienti.");
    clientsTable.innerHTML = `<tr><td colspan="4">Clienti non disponibili: ${esc(hint)}</td></tr>`;
  }
}

async function loadMomentCustomers(){
  if(!momentCustomersTable) return;
  try{
    const { data,error } = await supabase.rpc("get_moment_customer_stats");
    if(error) throw error;
    momentCustomerRows = data || [];
    momentCustomersTable.innerHTML = momentCustomerRows.length ? momentCustomerRows.map(row=>`
      <tr>
        <td><strong>${esc(row.display_name || row.email)}</strong></td>
        <td>${esc(row.email)}</td>
        <td>${fmt(row.object_count)}</td>
        <td>${fmt(row.published_count)}</td>
        <td>${dateShort(row.last_activated_at)}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="6">Nessun account Moments. Crea il primo cliente dal form sopra.</td></tr>`;
  }catch(error){
    console.error(error);
    momentCustomersTable.innerHTML = `<tr><td colspan="6">Account Moments non disponibili. Applica SQL v43.</td></tr>`;
  }
}

function momentPublicUrl(slug){
  return slug ? `${PUBLIC_BASE_URL}/m/${encodeURIComponent(slug)}` : "";
}

function momentEditorUrl(eventId){
  return `${LOCAL_PAGES_BASE}/moments.html?admin_event=${encodeURIComponent(eventId)}`;
}

function businessEditorUrl(businessId){
  return `${LOCAL_PAGES_BASE}/editor.html?business=${encodeURIComponent(businessId)}`;
}

async function loadMoments(){
  try{
    const { data,error } = await supabase
      .from("moment_events")
      .select("id,title,slug,event_type,moment_type,status,event_date,nfc_code,pin_enabled,public_visible,owner_email,activated_at,created_at")
      .order("activated_at",{ascending:false,nullsFirst:false})
      .order("created_at",{ascending:false})
      .limit(120);
    if(error) throw error;
    momentRows = data || [];
    momentsTable.innerHTML = momentRows.length ? momentRows.map(row=>{
      const type = momentTemplateLabel(row.moment_type || row.event_type);
      const publicUrl = momentPublicUrl(row.slug);
      return `<tr>
        <td><strong>${esc(row.title)}</strong><div class="muted-cell">/m/${esc(row.slug)}</div></td>
        <td>${esc(row.owner_email || "-")}</td>
        <td>${esc(type)}</td>
        <td>${esc(row.nfc_code || "-")}</td>
        <td><span class="status-pill ${row.public_visible ? "active" : "draft"}">${row.public_visible ? "sì" : "no"}</span></td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" data-moment-open="${esc(row.id)}" data-moment-view="summary">Scheda</button>
            ${publicUrl ? `<button type="button" data-moment-open="${esc(row.id)}" data-moment-view="public">Pagina</button>` : ""}
            <button type="button" data-moment-open="${esc(row.id)}" data-moment-view="editor">Editor</button>
          </div>
        </td>
      </tr>`;
    }).join("") : `<tr><td colspan="7">Nessun oggetto Moments attivato.</td></tr>`;
  }catch(error){
    console.error(error);
    momentsTable.innerHTML = `<tr><td colspan="7">Oggetti Moments non disponibili. Verifica permessi moments.read.</td></tr>`;
  }
}

function productLineLabel(value){
  return PRODUCT_LINE_LABELS[value] || value || "Non specificato";
}

function momentTemplateLabel(value){
  return MOMENT_TEMPLATE_LABELS[value] || value || "-";
}

function momentNfcUrl(row){
  return row?.public_slug ? `${PUBLIC_BASE_URL}/m/${row.public_slug}` : "";
}

function csvCell(value){
  const text = String(value ?? "");
  return `"${text.replace(/"/g,'""')}"`;
}

function momentExportRows(rows,filenameStem="khamakey-moments"){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return;
  }
  const header = [
    "Codice attivazione",
    "Link NFC",
    "Codice confezione",
    "Slug pagina",
    "Linea prodotto",
    "Lotto",
    "Template",
    "Stato",
    "Canale",
    "Agente",
    "Ordine",
    "Cliente",
    "Creato il"
  ];
  const lines = [header.map(csvCell).join(",")];
  rows.forEach(row=>{
    lines.push([
      row.code,
      momentNfcUrl(row),
      row.code,
      row.public_slug || "",
      productLineLabel(row.product_line || "non_specificato"),
      row.batch_label || "",
      momentTemplateLabel(row.product_type),
      row.status,
      soldChannelLabel(row.sold_channel || "non_specificato"),
      agentLabelById(row.assigned_agent_id),
      orderLabelById(row.platform_order_id),
      row.claimed_by_email || "",
      row.created_at ? dateShort(row.created_at) : ""
    ].map(csvCell).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0,10);
  anchor.href = url;
  anchor.download = `${filenameStem}-${stamp}-${rows.length}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function runLabelExport(rows, filenameStem, triggerButton){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return;
  }
  const buttons = [momentLabelsFiltered,momentLabelsSelected].filter(Boolean);
  buttons.forEach(btn=>{ btn.disabled = true; });
  if(triggerButton) triggerButton.textContent = "PDF in corso…";
  try{
    await exportMomentLabelsPdf(rows, filenameStem);
  }catch(error){
    console.error(error);
    alert(error.message || "Generazione PDF non riuscita.");
  }finally{
    buttons.forEach(btn=>{ btn.disabled = false; });
    if(momentLabelsFiltered) momentLabelsFiltered.textContent = "PDF etichette (filtri)";
    if(momentLabelsSelected) momentLabelsSelected.textContent = "PDF etichette (selezione)";
  }
}

function orderLabelById(orderId){
  if(!orderId) return "-";
  const order = platformOrderRows.find(row=>row.id === orderId);
  return order ? order.order_code : String(orderId).slice(0,8) + "…";
}

function getMomentProductFilters(){
  return {
    line:momentFilterLine?.value || "",
    batch:momentFilterBatch?.value || "",
    status:momentFilterStatus?.value || "",
    agent:momentFilterAgent?.value || "",
    channel:momentFilterChannel?.value || "",
    order:momentFilterOrder?.value || "",
    search:String(momentSearchInput?.value || "").trim().toLowerCase()
  };
}

function momentRowMatchesSearch(row,search){
  if(!search) return true;
  const haystack = [
    row.code,
    row.public_slug,
    row.claimed_by_email,
    row.batch_label,
    row.product_line,
    orderLabelById(row.platform_order_id)
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search);
}

function filteredMomentProducts(){
  const { line,batch,status,agent,channel,order,search } = getMomentProductFilters();
  return momentProductRows.filter(row=>{
    const rowLine = row.product_line || "non_specificato";
    const rowBatch = row.batch_label || "senza_lotto";
    const rowAgent = row.assigned_agent_id || "";
    const rowChannel = row.sold_channel || "";
    if(line && rowLine !== line) return false;
    if(batch && rowBatch !== batch) return false;
    if(status && row.status !== status) return false;
    if(agent === "__none__" && rowAgent) return false;
    if(agent && agent !== "__none__" && rowAgent !== agent) return false;
    if(channel === "__none__" && rowChannel) return false;
    if(channel && channel !== "__none__" && rowChannel !== channel) return false;
    if(order === "__none__" && row.platform_order_id) return false;
    if(order === "__linked__" && !row.platform_order_id) return false;
    if(!momentRowMatchesSearch(row,search)) return false;
    return true;
  });
}

function refreshMomentTable(){
  const rows = filteredMomentProducts();
  renderMomentProductsTable(rows);
  if(momentTableCount) momentTableCount.textContent = `${fmt(rows.length)} codici visibili`;
  updateMomentBulkBar();
}

function updateMomentBulkBar(){
  const count = selectedMomentCodes.size;
  if(momentBulkBar) momentBulkBar.hidden = count === 0;
  if(momentBulkCount) momentBulkCount.textContent = `${count} selezionati`;
}

function toggleMomentCodeSelection(code,checked){
  if(checked) selectedMomentCodes.add(code);
  else selectedMomentCodes.delete(code);
  updateMomentBulkBar();
}

function renderMomentProductsTable(rows){
  if(!momentProductsTable) return;
  momentProductsTable.innerHTML = rows.length ? rows.map(row=>{
    const publicUrl = row.public_slug ? `${PUBLIC_BASE_URL}/m/${row.public_slug}` : "";
    const claimed = row.status === "claimed";
    const checked = selectedMomentCodes.has(row.code) ? "checked" : "";
    return `<tr>
      <td>${claimed ? "" : `<input type="checkbox" data-moment-select="${esc(row.code)}" ${checked} aria-label="Seleziona ${esc(row.code)}">`}</td>
      <td><strong>${esc(row.code)}</strong><div class="muted-cell">${esc(momentTemplateLabel(row.product_type))}</div></td>
      <td>${publicUrl ? `<a href="${esc(publicUrl)}" target="_blank" rel="noopener">${esc(row.public_slug)}</a>` : "-"}</td>
      <td>${esc(productLineLabel(row.product_line || "non_specificato"))}</td>
      <td>${esc(row.batch_label || "-")}</td>
      <td>${esc(soldChannelLabel(row.sold_channel || "non_specificato"))}</td>
      <td>${esc(agentLabelById(row.assigned_agent_id))}</td>
      <td>${row.platform_order_id ? `<button type="button" class="link-button" data-order-open="${esc(row.platform_order_id)}">${esc(orderLabelById(row.platform_order_id))}</button>` : "-"}</td>
      <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      <td>${esc(row.claimed_by_email || "-")}</td>
      <td><button class="small-action" type="button" data-code-edit="${esc(row.code)}">Modifica</button></td>
    </tr>`;
  }).join("") : `<tr><td colspan="11">Nessun codice corrisponde ai filtri selezionati.</td></tr>`;
}

function populateMomentFilters(){
  if(!momentFilterLine || !momentFilterBatch) return;
  const lineValue = momentFilterLine.value;
  const batchValue = momentFilterBatch.value;
  const lines = [...new Set(momentProductRows.map(row=>row.product_line || "non_specificato"))].sort();
  const batches = [...new Set(momentProductRows.map(row=>row.batch_label || "senza_lotto"))].sort();
  momentFilterLine.innerHTML = `<option value="">Tutte le linee</option>` + lines.map(value=>`
    <option value="${esc(value)}" ${value === lineValue ? "selected" : ""}>${esc(productLineLabel(value))}</option>
  `).join("");
  momentFilterBatch.innerHTML = `<option value="">Tutti i lotti</option>` + batches.map(value=>`
    <option value="${esc(value)}" ${value === batchValue ? "selected" : ""}>${esc(value === "senza_lotto" ? "Senza lotto" : value)}</option>
  `).join("");
  populateMomentAgentFilter();
}

function populateMomentAgentFilter(){
  if(!momentFilterAgent) return;
  const agentValue = momentFilterAgent.value;
  const agentIds = [...new Set(momentProductRows.map(row=>row.assigned_agent_id).filter(Boolean))];
  momentFilterAgent.innerHTML = `<option value="">Tutti gli agenti</option>`
    + `<option value="__none__" ${agentValue === "__none__" ? "selected" : ""}>Senza agente</option>`
    + agentIds.map(id=>`
      <option value="${esc(id)}" ${id === agentValue ? "selected" : ""}>${esc(agentLabelById(id))}</option>
    `).join("");
}

function renderMomentInventoryStats(){
  if(!momentInventoryStats) return;
  if(!momentInventoryRows.length){
    momentInventoryStats.innerHTML = `<p class="inventory-stats-empty">Nessun lotto generato. Crea il primo batch per vedere totali e attivazioni.</p>`;
    return;
  }
  momentInventoryStats.innerHTML = momentInventoryRows.map(row=>{
    const claimed = Number(row.claimed_count || 0);
    const total = Number(row.total_count || 0);
    const pct = total ? Math.round((claimed / total) * 100) : 0;
    return `<article class="inventory-stat-card">
      <div class="inventory-stat-head">
        <strong>${esc(productLineLabel(row.product_line))}</strong>
        <span>${esc(row.batch_label === "senza_lotto" ? "Senza lotto" : row.batch_label)}</span>
      </div>
      <div class="inventory-stat-meta">Template: ${esc(momentTemplateLabel(row.product_type))}</div>
      <div class="inventory-stat-grid">
        <div><span>Totale</span><strong>${fmt(row.total_count)}</strong></div>
        <div><span>Disponibili</span><strong class="available">${fmt(row.available_count)}</strong></div>
        <div><span>Attivati</span><strong class="claimed">${fmt(row.claimed_count)}</strong></div>
        <div><span>In pausa</span><strong>${fmt(row.paused_count)}</strong></div>
      </div>
      <div class="inventory-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <p class="inventory-stat-foot">${fmt(claimed)} attivati su ${fmt(total)} (${pct}%)</p>
    </article>`;
  }).join("");
}

async function loadMomentInventoryStats(){
  if(!momentInventoryStats) return;
  try{
    const { data,error } = await supabase.rpc("get_moment_product_inventory_stats");
    if(error) throw error;
    momentInventoryRows = data || [];
    renderMomentInventoryStats();
  }catch(error){
    console.error(error);
    momentInventoryStats.innerHTML = `<p class="inventory-stats-empty">Statistiche lotti non disponibili. Applica lo script SQL v42.</p>`;
  }
}

async function loadMomentProducts(){
  if(!momentProductsTable) return;
  try{
    const { data,error } = await supabase
      .from("moment_activation_codes")
      .select("code,status,public_slug,product_type,product_line,batch_label,claimed_by_email,claimed_at,created_at,sold_channel,assigned_agent_id,platform_order_id")
      .order("created_at",{ascending:false})
      .limit(2000);
    if(error) throw error;
    momentProductRows = data || [];
    populateMomentFilters();
    refreshMomentTable();
  }catch(error){
    console.error(error);
    momentProductsTable.innerHTML = `<tr><td colspan="11">Prodotti Moments non disponibili. Applica SQL v61/v62.</td></tr>`;
  }
}

async function loadMomentAgentInventoryStats(){
  if(!momentAgentStats) return;
  try{
    const { data,error } = await supabase.rpc("get_moment_agent_inventory_stats");
    if(error) throw error;
    momentAgentInventoryRows = data || [];
    renderMomentAgentInventoryStats();
  }catch(error){
    console.error(error);
    momentAgentStats.innerHTML = `<p class="inventory-stats-empty">Report agenti non disponibile. Applica lo script SQL v61.</p>`;
  }
}

function renderMomentAgentInventoryStats(){
  if(!momentAgentStats) return;
  if(!momentAgentInventoryRows.length){
    momentAgentStats.innerHTML = `<p class="inventory-stats-empty">Nessun codice assegnato ad agenti. Genera un lotto con agente o canale vendita.</p>`;
    return;
  }
  momentAgentStats.innerHTML = momentAgentInventoryRows.map(row=>{
    const total = Number(row.total_count || 0);
    const claimed = Number(row.claimed_count || 0);
    const pct = total ? Math.round((claimed / total) * 100) : 0;
    return `<article class="inventory-stat-card">
      <div class="inventory-stat-head">
        <strong>${esc(row.agent_name || "Senza agente")}</strong>
        <span>${esc(soldChannelLabel(row.sold_channel))}</span>
      </div>
      <div class="inventory-stat-grid">
        <div><span>Consegnati</span><strong>${fmt(row.total_count)}</strong></div>
        <div><span>Disponibili</span><strong class="available">${fmt(row.available_count)}</strong></div>
        <div><span>Attivati</span><strong class="claimed">${fmt(row.claimed_count)}</strong></div>
        <div><span>Tasso</span><strong>${pct}%</strong></div>
      </div>
      <div class="inventory-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
    </article>`;
  }).join("");
}

async function loadMembers(){
  try{
    const { data,error } = await supabase
      .from("platform_members")
      .select("id,email,full_name,role,status,permissions,created_at")
      .order("created_at",{ascending:false});
    if(error) throw error;
    const rows = data || [];
    membersTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.email)}</strong><div class="muted-cell">${esc(row.full_name || "")}</div></td>
        <td>${esc(row.role)}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
        <td>${(row.permissions || []).slice(0,4).map(esc).join(", ")}${(row.permissions || []).length > 4 ? "…" : ""}</td>
      </tr>
    `).join("") : `<tr><td colspan="4">Nessun collaboratore registrato.</td></tr>`;
  }catch(error){
    console.error(error);
    membersTable.innerHTML = `<tr><td colspan="4">Collaboratori non disponibili. Verifica RLS platform_members.</td></tr>`;
  }
}

async function loadAgents(){
  try{
    const { data,error } = await supabase
      .from("platform_agents")
      .select("id,business_name,contact_name,email,referral_code,commission_percent,model,status")
      .order("created_at",{ascending:false});
    if(error) throw error;
    agentRows = data || [];
    renderAgentOptions(currentClientRecord?.assigned_agent_id || "");
    agentsTable.innerHTML = agentRows.length ? agentRows.map(row=>`
      <tr>
        <td><strong>${esc(row.contact_name || row.email)}</strong><div class="muted-cell">${esc(row.business_name || row.email)}</div></td>
        <td>${esc(row.referral_code)}</td>
        <td>${esc(row.model)}</td>
        <td>${fmt(row.commission_percent)}%</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
        <td><button class="small-action" type="button" data-agent-edit="${esc(row.id)}">Modifica</button></td>
      </tr>
    `).join("") : `<tr><td colspan="6">Nessun agente registrato.</td></tr>`;
    if(momentProductRows.length) refreshMomentTable();
  }catch(error){
    console.error(error);
    agentsTable.innerHTML = `<tr><td colspan="5">Agenti non disponibili. Verifica permessi agents.read.</td></tr>`;
  }
}

async function loadCommissions(){
  try{
    const { data,error } = await supabase
      .from("platform_commission_events")
      .select("id,agent_id,event_type,amount,commission_amount,status,platform_agents(contact_name,email,referral_code)")
      .order("created_at",{ascending:false})
      .limit(50);
    if(error) throw error;
    const rows = data || [];
    commissionsTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.platform_agents?.contact_name || row.platform_agents?.email || row.agent_id)}</strong></td>
        <td>${esc(row.event_type)}</td>
        <td>${money(row.amount)}</td>
        <td>${money(row.commission_amount)}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="5">Nessuna provvigione registrata.</td></tr>`;
  }catch(error){
    console.error(error);
    commissionsTable.innerHTML = `<tr><td colspan="5">Provvigioni non disponibili. Verifica permessi commissions.read.</td></tr>`;
  }
}

async function loadCommissionRules(){
  try{
    const { data,error } = await supabase
      .from("platform_commission_rules")
      .select("id,event_type,plan_key,amount,default_commission_percent,active,notes")
      .order("event_type",{ascending:true})
      .order("plan_key",{ascending:true});
    if(error) throw error;
    const rows = data || [];
    commissionRulesTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.event_type)}</strong></td>
        <td>${esc(row.plan_key || "-")}</td>
        <td>${money(row.amount)}</td>
        <td>${row.default_commission_percent == null ? "Agente" : `${fmt(row.default_commission_percent)}%`}</td>
        <td><span class="status-pill ${row.active ? "" : "disabled"}">${row.active ? "attiva" : "disattiva"}</span></td>
        <td class="muted-cell">${esc(row.notes || "")}</td>
      </tr>
    `).join("") : `<tr><td colspan="6">Nessuna regola configurata.</td></tr>`;
  }catch(error){
    console.error(error);
    commissionRulesTable.innerHTML = `<tr><td colspan="6">Regole non disponibili. Verifica permessi commissions.read.</td></tr>`;
  }
}

async function loadProducts(){
  try{
    const [{ data:stockData,error:stockError },{ data:detailData,error:detailError }] = await Promise.all([
      supabase
        .from("platform_product_stock_summary")
        .select("id,sku,name,category,sale_price,min_stock,status,available_quantity,reserved_quantity")
        .order("name",{ascending:true}),
      supabase
        .from("platform_products")
        .select("id,unit_cost,supplier,image_url,description")
    ]);
    if(stockError) throw stockError;
    if(detailError) console.warn("Dettagli prodotto non disponibili",detailError);
    const details = new Map((detailData || []).map(row=>[row.id,row]));
    productRows = (stockData || []).map(row=>({...row,...(details.get(row.id) || {})}));
    stockProductSelect.innerHTML = productRows.length ? productRows.map(row=>`
      <option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.sku)}</option>
    `).join("") : `<option value="">Nessun prodotto</option>`;
    productsTable.innerHTML = productRows.length ? productRows.map(row=>{
      const available = Number(row.available_quantity || 0);
      const minStock = Number(row.min_stock || 0);
      const low = minStock > 0 && available <= minStock;
      return `
        <tr>
          <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.supplier || row.description || "")}</div></td>
          <td>${esc(row.sku)}</td>
          <td>${esc(row.category)}</td>
          <td><strong>${money(row.sale_price)}</strong><div class="muted-cell">Costo ${money(row.unit_cost)}</div></td>
          <td>${esc(marginPercent(row.sale_price,row.unit_cost))}</td>
          <td class="${low ? "stock-low" : "stock-ok"}">${fmt(available)}</td>
          <td>${fmt(row.reserved_quantity)}</td>
          <td>${fmt(row.min_stock)}</td>
          <td><span class="status-pill ${low ? "low" : esc(row.status)}">${low ? "soglia bassa" : esc(row.status)}</span></td>
          <td><button class="small-action" type="button" data-product-edit="${esc(row.id)}">Modifica</button></td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="10">Nessun prodotto registrato.</td></tr>`;
  }catch(error){
    console.error(error);
    productsTable.innerHTML = `<tr><td colspan="10">Prodotti non disponibili. Verifica permessi inventory.read.</td></tr>`;
    stockProductSelect.innerHTML = `<option value="">Prodotti non disponibili</option>`;
  }
}

async function loadStockMovements(){
  try{
    const { data,error } = await supabase
      .from("platform_product_stock_movements")
      .select("id,movement_type,quantity,notes,created_at,platform_products(name,sku)")
      .order("created_at",{ascending:false})
      .limit(30);
    if(error) throw error;
    const rows = data || [];
    stockMovementsTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.platform_products?.name || "-")}</strong><div class="muted-cell">${esc(row.platform_products?.sku || "")}</div></td>
        <td>${esc(row.movement_type)}</td>
        <td>${fmt(row.quantity)}</td>
        <td>${esc(row.notes || "-")}</td>
        <td>${dateShort(row.created_at)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5">Nessun movimento registrato.</td></tr>`;
  }catch(error){
    console.error(error);
    stockMovementsTable.innerHTML = `<tr><td colspan="5">Movimenti non disponibili. Verifica permessi inventory.read.</td></tr>`;
  }
}

async function loadPlatformOrders(){
  try{
    const { data,error } = await supabase
      .from("platform_orders")
      .select("id,order_code,order_type,customer_name,customer_email,customer_phone,status,payment_status,subtotal,shipping_total,discount_total,total,notes,agent_id,stripe_checkout_session_id,stripe_invoice_id,platform_agents(contact_name,email,referral_code),businesses(nome,slug)")
      .order("created_at",{ascending:false})
      .limit(50);
    if(error) throw error;
    platformOrderRows = data || [];
    platformOrdersTable.innerHTML = platformOrderRows.length ? platformOrderRows.map(row=>`
      <tr>
        <td><strong>${esc(row.order_code)}</strong></td>
        <td>${esc(row.order_type)}</td>
        <td><strong>${esc(row.businesses?.nome || row.customer_name || "-")}</strong><div class="muted-cell">${esc(row.customer_email || row.businesses?.slug || "")}</div></td>
        <td>${esc(row.platform_agents?.contact_name || row.platform_agents?.email || "-")}</td>
        <td><strong>${money(row.total)}</strong><div class="muted-cell">Sub ${money(row.subtotal)} · Sped ${money(row.shipping_total)}</div></td>
        <td><select class="inline-select" data-order-payment="${esc(row.id)}">${selectOptions(PAYMENT_STATUS_OPTIONS,row.payment_status)}</select></td>
        <td><select class="inline-select" data-order-status="${esc(row.id)}">${selectOptions(ORDER_STATUS_OPTIONS,row.status)}</select></td>
        <td>
          <button class="small-action" type="button" data-order-save="${esc(row.id)}">Aggiorna</button>
          <button class="small-action" type="button" data-order-open="${esc(row.id)}">Gestisci</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="8">Nessun ordine interno registrato.</td></tr>`;
    if(momentProductRows.length) refreshMomentTable();
  }catch(error){
    console.error(error);
    platformOrdersTable.innerHTML = `<tr><td colspan="8">Ordini non disponibili. Verifica permessi orders.read.</td></tr>`;
  }
}

async function loadPlans(){
  try{
    const { data,error } = await supabase
      .from("platform_plans")
      .select("id,plan_key,name,description,price_monthly,price_yearly,setup_fee,features,active,public_visible,sort_order,stripe_product_id,stripe_price_monthly_id,stripe_price_yearly_id")
      .order("sort_order",{ascending:true})
      .order("name",{ascending:true});
    if(error) throw error;
    planRows = data || [];
    const renderedPlans = planRows.length ? planRows.map(row=>`
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.description || "")}</div></td>
        <td>${esc(row.plan_key)}</td>
        <td>${money(row.price_monthly)}</td>
        <td>${money(row.price_yearly)}</td>
        <td>${row.stripe_product_id ? "configurato" : "-"}<div class="muted-cell">${esc(row.stripe_price_monthly_id || row.stripe_price_yearly_id || "")}</div></td>
        <td>${(row.features || []).slice(0,3).map(esc).join(", ")}</td>
        <td><span class="status-pill ${row.active ? "active" : "disabled"}">${row.active ? "attivo" : "disattivo"}</span><div class="muted-cell">${row.public_visible ? "pubblico" : "privato"}</div></td>
        <td><button class="small-action" type="button" data-plan-edit="${esc(row.id)}">Modifica</button></td>
      </tr>
    `).join("") : `<tr><td colspan="8">Nessun piano configurato.</td></tr>`;
    plansTable.innerHTML = renderedPlans;
    billingPlansTable.innerHTML = planRows.length ? planRows.map(row=>`
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.plan_key)}</div></td>
        <td>${money(row.price_monthly)}</td>
        <td>${money(row.price_yearly)}</td>
        <td>${money(row.setup_fee)}</td>
        <td><span class="status-pill ${row.active ? "active" : "disabled"}">${row.active ? "attivo" : "disattivo"}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="5">Nessun piano configurato.</td></tr>`;
  }catch(error){
    console.error(error);
    plansTable.innerHTML = `<tr><td colspan="8">Piani non disponibili. Verifica permessi billing/settings.</td></tr>`;
    billingPlansTable.innerHTML = `<tr><td colspan="5">Piani non disponibili.</td></tr>`;
  }
}

async function loadMaterials(){
  try{
    const { data,error } = await supabase
      .from("platform_materials")
      .select("id,material_key,name,material_type,url,description,audience,active,sort_order")
      .order("sort_order",{ascending:true})
      .order("name",{ascending:true});
    if(error) throw error;
    materialRows = data || [];
    materialsTable.innerHTML = materialRows.length ? materialRows.map(row=>`
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.description || row.material_key)}</div></td>
        <td>${esc(row.material_type)}</td>
        <td>${esc(row.audience)}</td>
        <td>${row.url ? `<a href="${esc(row.url)}" target="_blank" rel="noopener">Apri</a>` : "-"}</td>
        <td><span class="status-pill ${row.active ? "active" : "disabled"}">${row.active ? "attivo" : "disattivo"}</span></td>
        <td><button class="small-action" type="button" data-material-edit="${esc(row.id)}">Modifica</button></td>
      </tr>
    `).join("") : `<tr><td colspan="6">Nessun materiale configurato.</td></tr>`;
  }catch(error){
    console.error(error);
    materialsTable.innerHTML = `<tr><td colspan="6">Materiali non disponibili. Verifica permessi settings.manage.</td></tr>`;
  }
}

async function loadTicketCategories(){
  try{
    const { data,error } = await supabase
      .from("platform_ticket_categories")
      .select("id,category_key,name,default_priority,active,sort_order")
      .order("sort_order",{ascending:true})
      .order("name",{ascending:true});
    if(error) throw error;
    ticketCategoryRows = data || [];
    ticketCategoriesTable.innerHTML = ticketCategoryRows.length ? ticketCategoryRows.map(row=>`
      <tr>
        <td><strong>${esc(row.name)}</strong></td>
        <td>${esc(row.category_key)}</td>
        <td>${esc(row.default_priority)}</td>
        <td><span class="status-pill ${row.active ? "active" : "disabled"}">${row.active ? "attiva" : "disattiva"}</span></td>
        <td><button class="small-action" type="button" data-ticket-category-edit="${esc(row.id)}">Modifica</button></td>
      </tr>
    `).join("") : `<tr><td colspan="5">Nessuna categoria configurata.</td></tr>`;
  }catch(error){
    console.error(error);
    ticketCategoriesTable.innerHTML = `<tr><td colspan="5">Categorie non disponibili.</td></tr>`;
  }
}

async function loadSupportTickets(){
  try{
    const { data,error } = await supabase
      .from("platform_support_tickets")
      .select("id,subject,priority,status,businesses(nome,slug)")
      .order("created_at",{ascending:false})
      .limit(80);
    if(error) throw error;
    const rows = data || [];
    supportTicketsTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.subject)}</strong></td>
        <td>${esc(row.businesses?.nome || row.businesses?.slug || "-")}</td>
        <td>${esc(row.priority)}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="4">Nessun ticket aperto.</td></tr>`;
  }catch(error){
    console.error(error);
    supportTicketsTable.innerHTML = `<tr><td colspan="4">Ticket non disponibili.</td></tr>`;
  }
}

async function loadIntegrations(){
  try{
    const { data,error } = await supabase
      .from("platform_integrations")
      .select("id,provider,name,environment,status,webhook_url,last_event_at,notes")
      .order("provider",{ascending:true});
    if(error) throw error;
    integrationRows = data || [];
    integrationsTable.innerHTML = integrationRows.length ? integrationRows.map(row=>`
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.provider)}</div></td>
        <td>${esc(row.environment)}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
        <td>${row.webhook_url ? `<span class="muted-cell">${esc(row.webhook_url)}</span>` : "-"}</td>
        <td>${dateShort(row.last_event_at)}</td>
        <td><button class="small-action" type="button" data-integration-edit="${esc(row.id)}">Modifica</button></td>
      </tr>
    `).join("") : `<tr><td colspan="6">Nessuna integrazione configurata.</td></tr>`;
  }catch(error){
    console.error(error);
    integrationsTable.innerHTML = `<tr><td colspan="6">Integrazioni non disponibili. Verifica permessi settings.manage.</td></tr>`;
  }
}

async function loadPaymentTransactions(){
  try{
    const { data,error } = await supabase
      .from("platform_payment_transactions")
      .select("id,provider,transaction_type,amount,currency,status,platform_orders(order_code)")
      .order("created_at",{ascending:false})
      .limit(60);
    if(error) throw error;
    const rows = data || [];
    paymentTransactionsTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.provider)}</strong></td>
        <td>${esc(row.transaction_type)}</td>
        <td>${Number(row.amount || 0).toLocaleString("it-IT",{style:"currency",currency:row.currency || "EUR"})}</td>
        <td>${esc(row.platform_orders?.order_code || "-")}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="5">Nessuna transazione registrata.</td></tr>`;
  }catch(error){
    console.error(error);
    paymentTransactionsTable.innerHTML = `<tr><td colspan="5">Transazioni non disponibili.</td></tr>`;
  }
}

async function loadWebhookEvents(){
  try{
    const { data,error } = await supabase
      .from("platform_webhook_events")
      .select("id,provider,event_type,status,received_at")
      .order("received_at",{ascending:false})
      .limit(60);
    if(error) throw error;
    const rows = data || [];
    webhookEventsTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(row.provider)}</strong></td>
        <td>${esc(row.event_type)}</td>
        <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
        <td>${dateShort(row.received_at)}</td>
      </tr>
    `).join("") : `<tr><td colspan="4">Nessun webhook ricevuto.</td></tr>`;
  }catch(error){
    console.error(error);
    webhookEventsTable.innerHTML = `<tr><td colspan="4">Webhook non disponibili.</td></tr>`;
  }
}

async function loadClientRecord(row){
  try{
    const { data,error } = await supabase
      .from("platform_client_records")
      .select("business_id,profile_id,onboarding_status,priority,plan_key,assigned_agent_id,admin_notes,tags,next_follow_up_at")
      .eq("business_id",row.id)
      .maybeSingle();
    if(error) throw error;
    currentClientRecord = data || {
      business_id:row.id,
      profile_id:row.profile_id || null,
      onboarding_status:"new",
      priority:"normal",
      plan_key:"",
      assigned_agent_id:"",
      admin_notes:"",
      tags:[],
      next_follow_up_at:null
    };
  }catch(error){
    console.warn("Scheda cliente non disponibile",error);
    currentClientRecord = {
      business_id:row.id,
      onboarding_status:"new",
      priority:"normal",
      plan_key:"",
      assigned_agent_id:"",
      admin_notes:"",
      tags:[],
      next_follow_up_at:null
    };
  }
  clientRecordForm.elements.onboarding_status.value = currentClientRecord.onboarding_status || "new";
  clientRecordForm.elements.priority.value = currentClientRecord.priority || "normal";
  clientRecordForm.elements.plan_key.value = currentClientRecord.plan_key || "";
  clientRecordForm.elements.tags.value = (currentClientRecord.tags || []).join(", ");
  clientRecordForm.elements.next_follow_up_at.value = toDateTimeLocal(currentClientRecord.next_follow_up_at);
  clientRecordForm.elements.admin_notes.value = currentClientRecord.admin_notes || "";
  renderAgentOptions(currentClientRecord.assigned_agent_id || "");
  document.getElementById("drawerOnboarding").textContent = currentClientRecord.onboarding_status || "-";
  document.getElementById("drawerPriority").textContent = currentClientRecord.priority || "-";
  const agent = agentRows.find(item=>item.id === currentClientRecord.assigned_agent_id);
  document.getElementById("drawerAgent").textContent = agent ? `${agent.contact_name || agent.email} · ${agent.referral_code}` : "-";
}

async function loadClientOrders(businessId){
  try{
    const { data,error } = await supabase
      .from("platform_orders")
      .select("id,order_code,order_type,total,status")
      .eq("business_id",businessId)
      .order("created_at",{ascending:false});
    if(error) throw error;
    const rows = data || [];
    document.getElementById("drawerMetricOrders").textContent = fmt(rows.length);
    drawerOrdersTable.innerHTML = rows.length ? rows.map(row=>`
      <tr><td><strong>${esc(row.order_code)}</strong></td><td>${esc(row.order_type)}</td><td>${money(row.total)}</td><td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td></tr>
    `).join("") : `<tr><td colspan="4">Nessun ordine collegato.</td></tr>`;
  }catch(error){
    console.error(error);
    drawerOrdersTable.innerHTML = `<tr><td colspan="4">Ordini cliente non disponibili.</td></tr>`;
    document.getElementById("drawerMetricOrders").textContent = "0";
  }
}

async function loadClientAnalytics(businessId){
  try{
    const { data,error } = await supabase
      .from("analytics_events")
      .select("tipo")
      .eq("business_id",businessId)
      .limit(500);
    if(error) throw error;
    const counts = new Map();
    for(const row of data || []) counts.set(row.tipo,(counts.get(row.tipo) || 0) + 1);
    const rows = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
    document.getElementById("drawerMetricEvents").textContent = fmt((data || []).length);
    drawerAnalyticsTable.innerHTML = rows.length ? rows.map(([tipo,count])=>`
      <tr><td><strong>${esc(tipo)}</strong></td><td>${fmt(count)}</td></tr>
    `).join("") : `<tr><td colspan="2">Nessun evento registrato.</td></tr>`;
  }catch(error){
    console.error(error);
    drawerAnalyticsTable.innerHTML = `<tr><td colspan="2">Analytics non disponibili.</td></tr>`;
    document.getElementById("drawerMetricEvents").textContent = "0";
  }
}

async function loadClientTickets(businessId){
  try{
    const { data,error } = await supabase
      .from("platform_support_tickets")
      .select("id,subject,priority,status")
      .eq("business_id",businessId)
      .order("created_at",{ascending:false});
    if(error) throw error;
    const rows = data || [];
    document.getElementById("drawerMetricTickets").textContent = fmt(rows.filter(row=>row.status !== "closed" && row.status !== "resolved").length);
    drawerTicketsTable.innerHTML = rows.length ? rows.map(row=>`
      <tr><td><strong>${esc(row.subject)}</strong></td><td>${esc(row.priority)}</td><td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td></tr>
    `).join("") : `<tr><td colspan="3">Nessun ticket.</td></tr>`;
  }catch(error){
    console.error(error);
    drawerTicketsTable.innerHTML = `<tr><td colspan="3">Ticket non disponibili.</td></tr>`;
    document.getElementById("drawerMetricTickets").textContent = "0";
  }
}

async function loadClientNotes(businessId){
  try{
    const { data,error } = await supabase
      .from("platform_client_notes")
      .select("id,note_type,body,created_at")
      .eq("business_id",businessId)
      .order("created_at",{ascending:false})
      .limit(30);
    if(error) throw error;
    const rows = data || [];
    document.getElementById("drawerMetricNotes").textContent = fmt(rows.length);
    clientNotesList.innerHTML = rows.length ? rows.map(row=>`
      <div class="note-item">
        <strong>${esc(row.note_type)} · ${dateShort(row.created_at)}</strong>
        <p>${esc(row.body)}</p>
      </div>
    `).join("") : `Nessuna nota interna.`;
  }catch(error){
    console.error(error);
    clientNotesList.textContent = "Note non disponibili.";
    document.getElementById("drawerMetricNotes").textContent = "0";
  }
}

async function refreshClientDrawerData(){
  if(!currentClient) return;
  await Promise.all([
    loadClientRecord(currentClient),
    loadClientOrders(currentClient.id),
    loadClientAnalytics(currentClient.id),
    loadClientTickets(currentClient.id),
    loadClientNotes(currentClient.id)
  ]);
}

function editProduct(id){
  const row = productRows.find(item=>item.id === id);
  if(!row) return;
  productForm.elements.sku.value = row.sku || "";
  productForm.elements.name.value = row.name || "";
  productForm.elements.category.value = row.category || "nfc";
  productForm.elements.sale_price.value = row.sale_price || 0;
  productForm.elements.unit_cost.value = row.unit_cost || 0;
  productForm.elements.min_stock.value = row.min_stock || 0;
  productForm.elements.supplier.value = row.supplier || "";
  productForm.elements.image_url.value = row.image_url || "";
  productForm.elements.description.value = row.description || "";
  productForm.elements.status.value = row.status || "active";
  focusForm(productForm,productFormStatus,`Stai modificando ${row.name || row.sku}.`);
}

function editMoment(id){
  const row = momentRows.find(item=>item.id === id);
  if(!row) return;
  momentForm.elements.title.value = row.title || "";
  momentForm.elements.slug.value = row.slug || "";
  momentForm.elements.event_type.value = row.event_type || "wedding";
  momentForm.elements.status.value = row.status || "draft";
  momentForm.elements.business_id.value = row.business_id || "";
  momentForm.elements.event_date.value = toDateTimeLocal(row.event_date);
  momentForm.elements.owner_email.value = row.owner_email || "";
  momentForm.elements.nfc_code.value = row.nfc_code || "";
  momentForm.elements.access_pin.value = "";
  momentForm.elements.pin_enabled.value = row.pin_enabled ? "true" : "false";
  momentForm.elements.venue_name.value = row.venue_name || "";
  momentForm.elements.venue_address.value = row.venue_address || "";
  momentForm.elements.description.value = row.description || "";
  focusForm(momentForm,momentFormStatus,`Stai modificando ${row.title || row.slug}.`);
}

function editPlan(id){
  const row = planRows.find(item=>item.id === id);
  if(!row) return;
  planForm.elements.plan_key.value = row.plan_key || "";
  planForm.elements.name.value = row.name || "";
  planForm.elements.price_monthly.value = row.price_monthly || 0;
  planForm.elements.price_yearly.value = row.price_yearly || 0;
  planForm.elements.setup_fee.value = row.setup_fee || 0;
  planForm.elements.stripe_product_id.value = row.stripe_product_id || "";
  planForm.elements.stripe_price_monthly_id.value = row.stripe_price_monthly_id || "";
  planForm.elements.stripe_price_yearly_id.value = row.stripe_price_yearly_id || "";
  planForm.elements.public_visible.value = row.public_visible ? "true" : "false";
  planForm.elements.active.value = row.active ? "true" : "false";
  planForm.elements.sort_order.value = row.sort_order || 0;
  planForm.elements.description.value = row.description || "";
  planForm.elements.features.value = (row.features || []).join(", ");
  focusForm(planForm,planFormStatus,`Stai modificando il piano ${row.name || row.plan_key}.`);
}

function editMaterial(id){
  const row = materialRows.find(item=>item.id === id);
  if(!row) return;
  materialForm.elements.material_key.value = row.material_key || "";
  materialForm.elements.name.value = row.name || "";
  materialForm.elements.material_type.value = row.material_type || "document";
  materialForm.elements.audience.value = row.audience || "internal";
  materialForm.elements.url.value = row.url || "";
  materialForm.elements.description.value = row.description || "";
  materialForm.elements.active.value = row.active ? "true" : "false";
  focusForm(materialForm,materialFormStatus,`Stai modificando ${row.name || row.material_key}.`);
}

function editTicketCategory(id){
  const row = ticketCategoryRows.find(item=>item.id === id);
  if(!row) return;
  ticketCategoryForm.elements.category_key.value = row.category_key || "";
  ticketCategoryForm.elements.name.value = row.name || "";
  ticketCategoryForm.elements.default_priority.value = row.default_priority || "normal";
  focusForm(ticketCategoryForm,ticketCategoryStatus,`Stai modificando ${row.name || row.category_key}.`);
}

function editIntegration(id){
  const row = integrationRows.find(item=>item.id === id);
  if(!row) return;
  integrationForm.elements.provider.value = row.provider || "other";
  integrationForm.elements.name.value = row.name || "";
  integrationForm.elements.environment.value = row.environment || "test";
  integrationForm.elements.status.value = row.status || "not_configured";
  integrationForm.elements.webhook_url.value = row.webhook_url || "";
  integrationForm.elements.notes.value = row.notes || "";
  focusForm(integrationForm,integrationFormStatus,`Stai modificando ${row.name || row.provider}.`);
}

async function updatePlatformOrder(id){
  if(!hasPermission("orders.write")){
    setFormStatus(platformOrderFormStatus,"Non hai il permesso orders.write.","error");
    return;
  }
  const status = platformOrdersTable.querySelector(`[data-order-status="${CSS.escape(id)}"]`)?.value;
  const paymentStatus = platformOrdersTable.querySelector(`[data-order-payment="${CSS.escape(id)}"]`)?.value;
  if(!status || !paymentStatus) return;
  setFormStatus(platformOrderFormStatus,"Aggiornamento ordine...");
  const { error } = await supabase
    .from("platform_orders")
    .update({status,payment_status:paymentStatus})
    .eq("id",id);
  if(error){
    console.error(error);
    setFormStatus(platformOrderFormStatus,error.message || "Errore aggiornamento ordine.","error");
    return;
  }
  setFormStatus(platformOrderFormStatus,"Ordine aggiornato.","ok");
  await Promise.all([loadPlatformOrders(),loadDashboard()]);
}

function setMomentDrawerView(view="summary"){
  document.querySelectorAll("[data-moment-drawer-view]").forEach(button=>{
    button.classList.toggle("active",button.dataset.momentDrawerView === view);
  });
  document.querySelectorAll("#momentDrawer .drawer-view").forEach(panel=>{
    panel.classList.toggle("active",panel.id === `moment-drawer-${view}`);
  });
}

function openMomentDrawer(eventId,view="summary"){
  const row = momentRows.find(item=>item.id === eventId);
  if(!row) return;
  currentMoment = row;
  const publicUrl = momentPublicUrl(row.slug);
  const editorUrl = momentEditorUrl(row.id);
  document.getElementById("momentDrawerTitle").textContent = row.title || row.slug || "Oggetto Moments";
  document.getElementById("momentDrawerMeta").textContent = row.owner_email || "Cliente non indicato";
  document.getElementById("momentDrawerEmail").textContent = row.owner_email || "-";
  document.getElementById("momentDrawerSlug").textContent = row.slug || "-";
  document.getElementById("momentDrawerNfc").textContent = row.nfc_code || "-";
  document.getElementById("momentDrawerType").textContent = momentTemplateLabel(row.moment_type || row.event_type);
  document.getElementById("momentDrawerPublished").textContent = row.public_visible ? "Sì" : "No";
  document.getElementById("momentDrawerPin").textContent = row.pin_enabled ? "Attivo" : "Disattivo";
  document.getElementById("momentDrawerPublicUrl").textContent = publicUrl || "-";
  momentDrawer.dataset.publicUrl = publicUrl;
  momentDrawer.dataset.editorUrl = editorUrl;
  const openPublic = document.getElementById("momentOpenPublicUrl");
  const openEditor = document.getElementById("momentOpenEditorUrl");
  if(openPublic){
    openPublic.href = publicUrl || "#";
    openPublic.hidden = !publicUrl;
  }
  if(openEditor){
    openEditor.href = editorUrl;
  }
  if(momentDrawerPublicFrame) momentDrawerPublicFrame.src = publicUrl || "about:blank";
  if(momentDrawerEditorFrame) momentDrawerEditorFrame.src = editorUrl;
  momentDrawer.classList.add("open");
  momentDrawer.setAttribute("aria-hidden","false");
  setMomentDrawerView(view);
}

function closeMomentDrawer(){
  if(!momentDrawer) return;
  momentDrawer.classList.remove("open");
  momentDrawer.setAttribute("aria-hidden","true");
  if(momentDrawerPublicFrame) momentDrawerPublicFrame.src = "about:blank";
  if(momentDrawerEditorFrame) momentDrawerEditorFrame.src = "about:blank";
  currentMoment = null;
}

function openCodeDrawer(code){
  const row = momentProductRows.find(item=>item.code === code);
  if(!row || !codeDrawer) return;
  currentCodeRow = row;
  document.getElementById("codeDrawerTitle").textContent = row.code;
  document.getElementById("codeDrawerMeta").textContent = productLineLabel(row.product_line || "non_specificato");
  document.getElementById("codeEditCode").value = row.code;
  const statusSelect = document.getElementById("codeEditStatus");
  statusSelect.value = row.status;
  statusSelect.querySelector('option[value="claimed"]').disabled = row.status !== "claimed";
  if(row.status === "claimed") statusSelect.value = "claimed";
  document.getElementById("codeEditChannel").value = row.sold_channel || "";
  renderAgentOptions(row.assigned_agent_id || "");
  document.getElementById("codeEditBatch").value = row.batch_label || "";
  document.getElementById("codeEditOrder").value = row.platform_order_id ? orderLabelById(row.platform_order_id) : "";
  document.getElementById("codeEditPublicUrl").value = row.public_slug ? `${PUBLIC_BASE_URL}/m/${row.public_slug}` : "";
  setFormStatus(codeEditFormStatus,"");
  codeDrawer.classList.add("open");
  codeDrawer.setAttribute("aria-hidden","false");
}

function closeCodeDrawer(){
  if(!codeDrawer) return;
  codeDrawer.classList.remove("open");
  codeDrawer.setAttribute("aria-hidden","true");
  currentCodeRow = null;
}

async function saveCodeEdit(event){
  event.preventDefault();
  if(!hasPermission("moments.write")){
    setFormStatus(codeEditFormStatus,"Non hai il permesso moments.write.","error");
    return;
  }
  const form = event.currentTarget;
  const code = String(form.elements.code.value || "").trim().toUpperCase();
  const row = momentProductRows.find(item=>item.code === code);
  if(row?.status === "claimed"){
    setFormStatus(codeEditFormStatus,"Codice già attivato: non modificabile.","error");
    return;
  }
  const payload = {
    status:form.elements.status.value,
    sold_channel:form.elements.sold_channel.value || null,
    assigned_agent_id:form.elements.assigned_agent_id.value || null,
    batch_label:String(form.elements.batch_label.value || "").trim() || null,
    updated_at:new Date().toISOString()
  };
  setFormStatus(codeEditFormStatus,"Salvataggio...");
  const { error } = await supabase.from("moment_activation_codes").update(payload).eq("code",code);
  if(error){
    console.error(error);
    setFormStatus(codeEditFormStatus,error.message || "Salvataggio non riuscito.","error");
    return;
  }
  setFormStatus(codeEditFormStatus,"Codice aggiornato.","ok");
  await Promise.all([loadMomentProducts(),loadMomentInventoryStats(),loadMomentAgentInventoryStats()]);
  closeCodeDrawer();
}

async function unlinkCodeOrder(){
  if(!currentCodeRow || !hasPermission("moments.write")) return;
  setFormStatus(codeEditFormStatus,"Scollegamento ordine...");
  const { error } = await supabase.rpc("bulk_update_moment_activation_codes",{
    p_codes:[currentCodeRow.code],
    p_clear_order:true
  });
  if(error){
    setFormStatus(codeEditFormStatus,error.message || "Scollegamento non riuscito.","error");
    return;
  }
  setFormStatus(codeEditFormStatus,"Ordine scollegato.","ok");
  await loadMomentProducts();
  openCodeDrawer(currentCodeRow.code);
}

function setOrderDrawerView(view="summary"){
  document.querySelectorAll("[data-order-drawer-view]").forEach(button=>{
    button.classList.toggle("active",button.dataset.orderDrawerView === view);
  });
  document.querySelectorAll("#orderDrawer .drawer-view").forEach(panel=>{
    panel.classList.toggle("active",panel.id === `order-drawer-${view}`);
  });
}

async function loadOrderCodes(orderId){
  if(!orderCodesTable) return;
  const codes = momentProductRows.filter(row=>row.platform_order_id === orderId);
  orderCodesTable.innerHTML = codes.length ? codes.map(row=>{
    const publicUrl = row.public_slug ? `${PUBLIC_BASE_URL}/m/${row.public_slug}` : "";
    return `<tr>
      <td><strong>${esc(row.code)}</strong></td>
      <td>${esc(productLineLabel(row.product_line || "non_specificato"))}</td>
      <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      <td>${publicUrl ? `<a href="${esc(publicUrl)}" target="_blank" rel="noopener">Apri</a>` : "-"}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="4">Nessun codice collegato. Usa «Assegna codici».</td></tr>`;
}

function openOrderDrawer(orderId,view="summary"){
  const row = platformOrderRows.find(item=>item.id === orderId);
  if(!row || !orderDrawer) return;
  currentPlatformOrder = row;
  document.getElementById("orderDrawerTitle").textContent = row.order_code;
  document.getElementById("orderDrawerMeta").textContent = `${row.order_type || "ordine"} · ${row.customer_name || row.businesses?.nome || "Cliente"}`;
  document.getElementById("orderDrawerKv").innerHTML = `
    <span>Cliente</span><strong>${esc(row.customer_name || row.businesses?.nome || "-")}</strong>
    <span>Email</span><strong>${esc(row.customer_email || "-")}</strong>
    <span>Agente</span><strong>${esc(row.platform_agents?.contact_name || row.platform_agents?.email || "-")}</strong>
    <span>Totale</span><strong>${money(row.total)}</strong>
    <span>Tipo</span><strong>${esc(row.order_type)}</strong>
  `;
  document.getElementById("orderEditId").value = row.id;
  document.getElementById("orderEditStatus").innerHTML = selectOptions(ORDER_STATUS_OPTIONS,row.status);
  document.getElementById("orderEditPayment").innerHTML = selectOptions(PAYMENT_STATUS_OPTIONS,row.payment_status);
  document.getElementById("orderEditNotes").value = row.notes || "";
  document.getElementById("orderAssignOrderId").value = row.id;
  renderAgentOptions(row.agent_id || "");
  setFormStatus(orderEditStatus,"");
  setFormStatus(orderAssignStatus,"");
  loadOrderCodes(row.id);
  orderDrawer.classList.add("open");
  orderDrawer.setAttribute("aria-hidden","false");
  setOrderDrawerView(view);
}

function closeOrderDrawer(){
  if(!orderDrawer) return;
  orderDrawer.classList.remove("open");
  orderDrawer.setAttribute("aria-hidden","true");
  currentPlatformOrder = null;
}

async function saveOrderEdit(event){
  event.preventDefault();
  if(!hasPermission("orders.write")){
    setFormStatus(orderEditStatus,"Non hai il permesso orders.write.","error");
    return;
  }
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const payload = {
    status:form.elements.status.value,
    payment_status:form.elements.payment_status.value,
    notes:String(form.elements.notes.value || "").trim() || null
  };
  setFormStatus(orderEditStatus,"Salvataggio...");
  const { error } = await supabase.from("platform_orders").update(payload).eq("id",id);
  if(error){
    setFormStatus(orderEditStatus,error.message || "Salvataggio non riuscito.","error");
    return;
  }
  setFormStatus(orderEditStatus,"Ordine aggiornato.","ok");
  await loadPlatformOrders();
  openOrderDrawer(id);
}

async function assignOrderCodes(event){
  event.preventDefault();
  if(!hasPermission("orders.write") && !hasPermission("moments.write")){
    setFormStatus(orderAssignStatus,"Permesso orders.write o moments.write richiesto.","error");
    return;
  }
  const form = event.currentTarget;
  const orderId = form.elements.order_id.value;
  const quantity = Math.min(500,Math.max(1,Number(form.elements.quantity.value || 1)));
  const productLine = String(form.elements.product_line.value || "").trim() || null;
  const agentId = String(form.elements.agent_id.value || currentPlatformOrder?.agent_id || "").trim() || null;
  const soldChannel = form.elements.sold_channel.value || "agent";
  setFormStatus(orderAssignStatus,`Assegnazione ${quantity} codici da magazzino...`);
  const { data,error } = await supabase.rpc("assign_moment_codes_to_order",{
    p_order_id:orderId,
    p_quantity:quantity,
    p_product_line:productLine,
    p_agent_id:agentId,
    p_sold_channel:soldChannel
  });
  if(error){
    console.error(error);
    setFormStatus(orderAssignStatus,error.message || "Assegnazione non riuscita. Applica SQL v62.","error");
    return;
  }
  const rows = data || [];
  setFormStatus(orderAssignStatus,`Assegnati ${rows.length} codici all'ordine.`,"ok");
  await Promise.all([loadMomentProducts(),loadPlatformOrders()]);
  openOrderDrawer(orderId,"codes");
}

async function applyMomentBulk(action={}){
  const codes = [...selectedMomentCodes];
  if(!codes.length) return;
  if(!hasPermission("moments.write")){
    alert("Permesso moments.write richiesto.");
    return;
  }
  const { error } = await supabase.rpc("bulk_update_moment_activation_codes",{
    p_codes:codes,
    p_status:action.status || null,
    p_sold_channel:action.channel ?? null,
    p_assigned_agent_id:action.agentId ?? null,
    p_clear_agent:Boolean(action.clearAgent),
    p_clear_order:Boolean(action.clearOrder)
  });
  if(error){
    alert(error.message || "Aggiornamento bulk non riuscito.");
    return;
  }
  selectedMomentCodes.clear();
  if(momentSelectAll) momentSelectAll.checked = false;
  await Promise.all([loadMomentProducts(),loadMomentInventoryStats(),loadMomentAgentInventoryStats()]);
}

function editAgent(id){
  const row = agentRows.find(item=>item.id === id);
  if(!row) return;
  const form = document.getElementById("agentForm");
  form.elements.contact_name.value = row.contact_name || "";
  form.elements.email.value = row.email || "";
  form.elements.business_name.value = row.business_name || "";
  form.elements.phone.value = row.phone || "";
  form.elements.referral_code.value = row.referral_code || "";
  form.elements.commission_percent.value = row.commission_percent ?? 10;
  form.elements.model.value = row.model || "referral";
  focusForm(form,agentFormStatus,"Agente caricato nel form. Modifica e salva.");
}

function syncNfcOrderFieldsVisibility(){
  if(!nfcOrderFields) return;
  const type = platformOrderForm?.elements?.order_type?.value || "";
  nfcOrderFields.hidden = type !== "nfc";
}

async function provisionMomentCustomer(event){
  event.preventDefault();
  if(!hasPermission("moments.write")){
    setFormStatus(momentProvisionStatus,"Non hai il permesso moments.write.","error");
    return;
  }
  const form = event.currentTarget;
  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const displayName = String(form.elements.display_name.value || "").trim();
  const code = String(form.elements.code.value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
  const title = String(form.elements.title.value || "").trim();
  const momentType = form.elements.moment_type.value;
  if(!email) return setFormStatus(momentProvisionStatus,"Inserisci l'email del cliente.","error");
  if(code && !title) return setFormStatus(momentProvisionStatus,"Per attivare un codice NFC inserisci anche il titolo pagina.","error");
  setFormStatus(momentProvisionStatus,code ? "Creazione cliente e attivazione codice..." : "Creazione account cliente...");
  const { data,error } = await supabase.rpc("admin_provision_moment_customer",{
    p_email:email,
    p_display_name:displayName || null,
    p_code:code || null,
    p_title:title || null,
    p_moment_type:momentType
  });
  if(error){
    console.error(error);
    setFormStatus(momentProvisionStatus,error.message || "Provisioning non riuscito.","error");
    return;
  }
  const row = (Array.isArray(data) ? data[0] : data) || {};
  if(row.event_id){
    setFormStatus(momentProvisionStatus,`Cliente ${email} creato e codice collegato. Slug: /m/${row.slug}`,"ok");
  }else{
    setFormStatus(momentProvisionStatus,`Account Moments creato per ${email}. Il cliente potrà attivare un codice dopo la registrazione.`,"ok");
  }
  form.reset();
  await Promise.all([loadMomentCustomers(),loadMoments(),loadMomentProducts(),loadMomentInventoryStats(),loadDashboard()]);
}

function publicUrlFor(row){
  return row?.slug ? `${PUBLIC_BASE_URL}/p/${encodeURIComponent(row.slug)}` : "";
}

function setDrawerView(view="summary"){
  document.querySelectorAll("[data-drawer-view]").forEach(button=>{
    button.classList.toggle("active",button.dataset.drawerView === view);
  });
  document.querySelectorAll(".drawer-view").forEach(panel=>{
    panel.classList.toggle("active",panel.id === `drawer-${view}`);
  });
}

function openClientDrawer(clientId,view="summary"){
  const row = clientRows.find(item=>item.id === clientId);
  if(!row) return;
  currentClient = row;
  currentClientRecord = null;
  const publicUrl = publicUrlFor(row);
  document.getElementById("drawerClientName").textContent = row.nome || "Senza nome";
  document.getElementById("drawerClientMeta").textContent = row.categoria || "Categoria non indicata";
  document.getElementById("drawerSlug").textContent = row.slug || "-";
  document.getElementById("drawerCategory").textContent = row.categoria || "-";
  document.getElementById("drawerPublicUrl").textContent = publicUrl || "Pagina pubblica non disponibile";
  drawerFrame.src = publicUrl || "about:blank";
  if(drawerEditorFrame) drawerEditorFrame.src = businessEditorUrl(row.id);
  drawer.dataset.publicUrl = publicUrl;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden","false");
  setDrawerView(view);
  refreshClientDrawerData();
}

function closeClientDrawer(){
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden","true");
  drawerFrame.src = "about:blank";
  if(drawerEditorFrame) drawerEditorFrame.src = "about:blank";
  currentClient = null;
  currentClientRecord = null;
}

function selectedMemberPermissions(form){
  const checked = Array.from(form.querySelectorAll('input[name="permissions"]:checked')).map(input=>input.value);
  const role = form.elements.role.value;
  if(role === "admin" && !checked.includes("admin.full")) checked.push("admin.full");
  if(role === "agent"){
    for(const permission of ["agents.read","commissions.read"]){
      if(!checked.includes(permission)) checked.push(permission);
    }
  }
  return checked;
}

function referralFrom(email,businessName){
  const base = String(businessName || email || "AGENTE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/@.*/,"")
    .replace(/[^a-zA-Z0-9]+/g,"")
    .slice(0,10)
    .toUpperCase() || "AGENTE";
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}

async function saveMember(event){
  event.preventDefault();
  if(!hasPermission("staff.manage")){
    setFormStatus(memberFormStatus,"Non hai il permesso staff.manage.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    email:String(form.elements.email.value || "").trim().toLowerCase(),
    full_name:String(form.elements.full_name.value || "").trim() || null,
    role:form.elements.role.value,
    status:"active",
    permissions:selectedMemberPermissions(form)
  };
  setFormStatus(memberFormStatus,"Salvataggio collaboratore...");
  const { error } = await supabase
    .from("platform_members")
    .upsert(payload,{onConflict:"email"});
  if(error){
    console.error(error);
    setFormStatus(memberFormStatus,error.message || "Errore salvataggio collaboratore.","error");
    return;
  }
  form.reset();
  setFormStatus(memberFormStatus,"Collaboratore salvato.","ok");
  await loadMembers();
}

async function saveAgent(event){
  event.preventDefault();
  if(!hasPermission("agents.write")){
    setFormStatus(agentFormStatus,"Non hai il permesso agents.write.","error");
    return;
  }
  const form = event.currentTarget;
  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const businessName = String(form.elements.business_name.value || "").trim();
  const contactName = String(form.elements.contact_name.value || "").trim();
  const referralCode = String(form.elements.referral_code.value || "").trim().toUpperCase() || referralFrom(email,businessName || contactName);
  setFormStatus(agentFormStatus,"Salvataggio agente...");
  const memberPayload = {
    email,
    full_name:contactName || businessName || null,
    role:"agent",
    status:"active",
    permissions:["agents.read","commissions.read"]
  };
  const { data:member,error:memberError } = await supabase
    .from("platform_members")
    .upsert(memberPayload,{onConflict:"email"})
    .select("id")
    .single();
  if(memberError){
    console.error(memberError);
    setFormStatus(agentFormStatus,memberError.message || "Errore creazione membro agente.","error");
    return;
  }
  const payload = {
    member_id:member.id,
    business_name:businessName || null,
    contact_name:contactName || null,
    email,
    phone:String(form.elements.phone.value || "").trim() || null,
    referral_code:referralCode,
    commission_percent:Number(form.elements.commission_percent.value || 0),
    model:form.elements.model.value,
    status:"active"
  };
  const { error } = await supabase
    .from("platform_agents")
    .upsert(payload,{onConflict:"referral_code"});
  if(error){
    console.error(error);
    setFormStatus(agentFormStatus,error.message || "Errore salvataggio agente.","error");
    return;
  }
  form.reset();
  form.elements.commission_percent.value = "10";
  setFormStatus(agentFormStatus,"Agente salvato.","ok");
  await Promise.all([loadAgents(),loadMembers(),loadDashboard()]);
}

async function saveMoment(event){
  event.preventDefault();
  if(!hasPermission("moments.write")){
    setFormStatus(momentFormStatus,"Non hai il permesso moments.write.","error");
    return;
  }
  const form = event.currentTarget;
  const slug = String(form.elements.slug.value || "").trim().toLowerCase();
  const pin = String(form.elements.access_pin.value || "").trim();
  const payload = {
    title:String(form.elements.title.value || "").trim(),
    slug,
    event_type:form.elements.event_type.value,
    status:form.elements.status.value,
    business_id:form.elements.business_id.value || null,
    owner_email:String(form.elements.owner_email.value || "").trim().toLowerCase() || null,
    nfc_code:String(form.elements.nfc_code.value || "").trim().toUpperCase() || null,
    pin_enabled:form.elements.pin_enabled.value === "true",
    public_visible:form.elements.status.value === "active",
    event_date:form.elements.event_date.value ? new Date(form.elements.event_date.value).toISOString() : null,
    venue_name:String(form.elements.venue_name.value || "").trim() || null,
    venue_address:String(form.elements.venue_address.value || "").trim() || null,
    description:String(form.elements.description.value || "").trim() || null
  };
  if(pin) payload.pin_hash = await pinHash(slug,pin);
  setFormStatus(momentFormStatus,"Salvataggio Moment...");
  const { data:savedMoment,error } = await supabase
    .from("moment_events")
    .upsert(payload,{onConflict:"slug"})
    .select("id,slug,pin_enabled,pin_hash,public_visible,status,title,description,event_date,venue_name,venue_address")
    .single();
  if(error){
    console.error(error);
    setFormStatus(momentFormStatus,error.message || "Errore salvataggio Moment.","error");
    return;
  }
  const pagePayload = {
    event_id:savedMoment.id,
    slug:savedMoment.slug,
    published:savedMoment.status === "active",
    pin_enabled:savedMoment.pin_enabled,
    pin_hash:savedMoment.pin_hash || null,
    state:{
      title:savedMoment.title,
      description:savedMoment.description,
      event_date:savedMoment.event_date,
      venue_name:savedMoment.venue_name,
      venue_address:savedMoment.venue_address
    }
  };
  const { data:savedPage,error:pageError } = await supabase
    .from("moment_pages")
    .upsert(pagePayload,{onConflict:"slug"})
    .select("id")
    .single();
  if(pageError){
    console.error(pageError);
    setFormStatus(momentFormStatus,pageError.message || "Moment salvato, ma pagina pubblica non aggiornata.","error");
    return;
  }
  if(payload.nfc_code){
    const { error:nfcError } = await supabase
      .from("moment_nfc_links")
      .upsert({
        code:payload.nfc_code,
        event_id:savedMoment.id,
        page_id:savedPage.id,
        status:"active"
      },{onConflict:"code"});
    if(nfcError){
      console.error(nfcError);
      setFormStatus(momentFormStatus,nfcError.message || "Moment salvato, ma NFC non collegato.","error");
      return;
    }
  }
  form.reset();
  setFormStatus(momentFormStatus,"Moment salvato.","ok");
  await Promise.all([loadMoments(),loadDashboard()]);
}

async function createMomentBatch(event){
  event.preventDefault();
  if(!hasPermission("moments.write")){
    setFormStatus(momentBatchStatus,"Non hai il permesso moments.write.","error");
    return;
  }
  const form = event.currentTarget;
  const quantity = Math.min(500,Math.max(1,Number(form.elements.quantity.value || 1)));
  const prefix = String(form.elements.prefix.value || "MOMENT").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12) || "MOMENT";
  const productLine = String(form.elements.product_line.value || "").trim();
  const batchLabel = String(form.elements.batch_label.value || "").trim();
  if(!productLine || !batchLabel){
    setFormStatus(momentBatchStatus,"Seleziona la linea oggetto e inserisci un nome lotto.","error");
    return;
  }
  setFormStatus(momentBatchStatus,`Generazione ${quantity} ${productLineLabel(productLine)} (${batchLabel})...`);
  const { data,error } = await supabase.rpc("create_moment_product_batch",{
    p_quantity:quantity,
    p_prefix:prefix,
    p_product_type:form.elements.product_type.value,
    p_batch_label:batchLabel,
    p_product_line:productLine
  });
  if(error){
    console.error(error);
    setFormStatus(momentBatchStatus,error.message || "Generazione prodotti non riuscita.","error");
    return;
  }
  const rows = data || [];
  setFormStatus(momentBatchStatus,`Creati ${rows.length} codici in stock · lotto «${batchLabel}». Assegna agente/ordine quando serve.`,"ok");
  if(rows.length){
    const exportRows = rows.map(row=>({
      code:row.out_code || row.code,
      public_slug:row.public_slug,
      product_type:row.product_type,
      product_line:row.product_line || productLine,
      batch_label:row.batch_label || batchLabel,
      status:"available",
      sold_channel:null,
      assigned_agent_id:null,
      platform_order_id:null,
      claimed_by_email:"",
      created_at:new Date().toISOString()
    }));
    momentExportRows(exportRows,`khamakey-lotto-${batchLabel.replace(/[^a-z0-9]+/gi,"-").slice(0,24).toLowerCase() || "stock"}`);
    await runLabelExport(exportRows, `khamakey-etichette-${batchLabel.replace(/[^a-z0-9]+/gi,"-").slice(0,24).toLowerCase() || "stock"}`);
  }
  await Promise.all([loadMomentProducts(),loadMomentInventoryStats(),loadMomentAgentInventoryStats(),loadMomentCustomers(),loadMoments(),loadDashboard()]);
}

async function saveProduct(event){
  event.preventDefault();
  if(!hasPermission("inventory.write")){
    setFormStatus(productFormStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    sku:String(form.elements.sku.value || "").trim().toUpperCase(),
    name:String(form.elements.name.value || "").trim(),
    category:form.elements.category.value,
    sale_price:Number(form.elements.sale_price.value || 0),
    unit_cost:Number(form.elements.unit_cost.value || 0),
    min_stock:Number(form.elements.min_stock.value || 0),
    supplier:String(form.elements.supplier.value || "").trim() || null,
    image_url:String(form.elements.image_url.value || "").trim() || null,
    description:String(form.elements.description.value || "").trim() || null,
    status:form.elements.status.value
  };
  setFormStatus(productFormStatus,"Salvataggio prodotto...");
  const { error } = await supabase
    .from("platform_products")
    .upsert(payload,{onConflict:"sku"});
  if(error){
    console.error(error);
    setFormStatus(productFormStatus,error.message || "Errore salvataggio prodotto.","error");
    return;
  }
  form.reset();
  form.elements.sale_price.value = "0";
  form.elements.unit_cost.value = "0";
  form.elements.min_stock.value = "0";
  form.elements.status.value = "active";
  setFormStatus(productFormStatus,"Prodotto salvato.","ok");
  await Promise.all([loadProducts(),loadDashboard()]);
}

async function saveStockMovement(event){
  event.preventDefault();
  if(!hasPermission("inventory.write")){
    setFormStatus(stockFormStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const form = event.currentTarget;
  const rawQuantity = Number(form.elements.quantity.value || 0);
  const movementType = form.elements.movement_type.value;
  const negativeTypes = new Set(["reserved","defective"]);
  const positiveTypes = new Set(["stock_in","released","returned"]);
  let quantity = Math.abs(rawQuantity);
  if(negativeTypes.has(movementType)) quantity = -quantity;
  if(!positiveTypes.has(movementType) && !negativeTypes.has(movementType)) quantity = rawQuantity;
  const payload = {
    product_id:form.elements.product_id.value,
    movement_type:movementType,
    quantity,
    notes:String(form.elements.notes.value || "").trim() || null
  };
  setFormStatus(stockFormStatus,"Registrazione movimento...");
  const { error } = await supabase
    .from("platform_product_stock_movements")
    .insert(payload);
  if(error){
    console.error(error);
    setFormStatus(stockFormStatus,error.message || "Errore movimento magazzino.","error");
    return;
  }
  form.reset();
  form.elements.quantity.value = "1";
  setFormStatus(stockFormStatus,"Movimento registrato.","ok");
  await Promise.all([loadProducts(),loadStockMovements(),loadDashboard()]);
}

async function savePlatformOrder(event){
  event.preventDefault();
  if(!hasPermission("orders.write")){
    setFormStatus(platformOrderFormStatus,"Non hai il permesso orders.write.","error");
    return;
  }
  const form = event.currentTarget;
  const businessId = form.elements.business_id.value || null;
  const selectedBusiness = clientRows.find(row=>row.id === businessId);
  const payload = {
    order_code:nextOrderCode("KK"),
    order_type:form.elements.order_type.value,
    business_id:businessId,
    agent_id:form.elements.agent_id.value || null,
    customer_name:String(form.elements.customer_name.value || selectedBusiness?.nome || "").trim() || null,
    customer_email:String(form.elements.customer_email.value || "").trim().toLowerCase() || null,
    customer_phone:String(form.elements.customer_phone.value || "").trim() || null,
    subtotal:Number(form.elements.subtotal.value || 0),
    shipping_total:Number(form.elements.shipping_total.value || 0),
    discount_total:Number(form.elements.discount_total.value || 0),
    status:form.elements.status.value,
    payment_status:form.elements.payment_status.value,
    notes:String(form.elements.notes.value || "").trim() || null
  };
  setFormStatus(platformOrderFormStatus,"Creazione ordine...");
  const { data:inserted,error } = await supabase
    .from("platform_orders")
    .insert(payload)
    .select("id,order_code")
    .single();
  if(error){
    console.error(error);
    setFormStatus(platformOrderFormStatus,error.message || "Errore creazione ordine.","error");
    return;
  }
  const nfcQty = Number(form.elements.nfc_quantity?.value || 0);
  if(nfcQty > 0 && inserted?.id){
    const productLine = String(form.elements.nfc_product_line?.value || "").trim() || null;
    const { data:assigned,error:assignError } = await supabase.rpc("assign_moment_codes_to_order",{
      p_order_id:inserted.id,
      p_quantity:nfcQty,
      p_product_line:productLine,
      p_agent_id:payload.agent_id,
      p_sold_channel:payload.agent_id ? "agent" : "direct"
    });
    if(assignError){
      setFormStatus(platformOrderFormStatus,`Ordine creato ma codici non assegnati: ${assignError.message}`,"error");
      await Promise.all([loadPlatformOrders(),loadMomentProducts(),loadDashboard()]);
      return;
    }
    setFormStatus(platformOrderFormStatus,`Ordine ${inserted.order_code} creato con ${(assigned || []).length} codici da magazzino.`,"ok");
  }else{
    setFormStatus(platformOrderFormStatus,"Ordine creato.","ok");
  }
  form.reset();
  form.elements.subtotal.value = "0";
  form.elements.shipping_total.value = "0";
  form.elements.discount_total.value = "0";
  if(form.elements.nfc_quantity) form.elements.nfc_quantity.value = "0";
  syncNfcOrderFieldsVisibility();
  await Promise.all([loadPlatformOrders(),loadMomentProducts(),loadDashboard()]);
}

async function saveClientRecord(event){
  event.preventDefault();
  if(!currentClient) return;
  if(!hasPermission("crm.write")){
    setFormStatus(clientRecordStatus,"Non hai il permesso crm.write.","error");
    return;
  }
  const form = event.currentTarget;
  const tags = String(form.elements.tags.value || "")
    .split(",")
    .map(tag=>tag.trim())
    .filter(Boolean);
  const payload = {
    business_id:currentClient.id,
    profile_id:currentClient.profile_id || null,
    onboarding_status:form.elements.onboarding_status.value,
    priority:form.elements.priority.value,
    plan_key:form.elements.plan_key.value || null,
    assigned_agent_id:form.elements.assigned_agent_id.value || null,
    tags,
    next_follow_up_at:form.elements.next_follow_up_at.value ? new Date(form.elements.next_follow_up_at.value).toISOString() : null,
    admin_notes:String(form.elements.admin_notes.value || "").trim() || null
  };
  setFormStatus(clientRecordStatus,"Salvataggio scheda cliente...");
  const { error } = await supabase
    .from("platform_client_records")
    .upsert(payload,{onConflict:"business_id"});
  if(error){
    console.error(error);
    setFormStatus(clientRecordStatus,error.message || "Errore salvataggio scheda.","error");
    return;
  }
  setFormStatus(clientRecordStatus,"Scheda cliente aggiornata.","ok");
  await loadClientRecord(currentClient);
}

async function savePlan(event){
  event.preventDefault();
  if(!hasPermission("settings.manage") && !hasPermission("billing.write")){
    setFormStatus(planFormStatus,"Non hai il permesso per gestire i piani.","error");
    return;
  }
  const form = event.currentTarget;
  const features = String(form.elements.features.value || "")
    .split(",")
    .map(item=>item.trim())
    .filter(Boolean);
  const payload = {
    plan_key:String(form.elements.plan_key.value || "").trim().toLowerCase(),
    name:String(form.elements.name.value || "").trim(),
    description:String(form.elements.description.value || "").trim() || null,
    price_monthly:Number(form.elements.price_monthly.value || 0),
    price_yearly:Number(form.elements.price_yearly.value || 0),
    setup_fee:Number(form.elements.setup_fee.value || 0),
    stripe_product_id:String(form.elements.stripe_product_id.value || "").trim() || null,
    stripe_price_monthly_id:String(form.elements.stripe_price_monthly_id.value || "").trim() || null,
    stripe_price_yearly_id:String(form.elements.stripe_price_yearly_id.value || "").trim() || null,
    sort_order:Number(form.elements.sort_order.value || 0),
    public_visible:form.elements.public_visible.value === "true",
    features,
    active:form.elements.active.value === "true"
  };
  setFormStatus(planFormStatus,"Salvataggio piano...");
  const { error } = await supabase.from("platform_plans").upsert(payload,{onConflict:"plan_key"});
  if(error){
    console.error(error);
    setFormStatus(planFormStatus,error.message || "Errore salvataggio piano.","error");
    return;
  }
  form.reset();
  form.elements.price_monthly.value = "0";
  form.elements.price_yearly.value = "0";
  form.elements.setup_fee.value = "0";
  form.elements.sort_order.value = "0";
  form.elements.public_visible.value = "false";
  form.elements.active.value = "true";
  setFormStatus(planFormStatus,"Piano salvato.","ok");
  await loadPlans();
}

async function saveMaterial(event){
  event.preventDefault();
  if(!hasPermission("settings.manage")){
    setFormStatus(materialFormStatus,"Non hai il permesso settings.manage.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    material_key:String(form.elements.material_key.value || "").trim().toLowerCase(),
    name:String(form.elements.name.value || "").trim(),
    material_type:form.elements.material_type.value,
    audience:form.elements.audience.value,
    url:String(form.elements.url.value || "").trim() || null,
    description:String(form.elements.description.value || "").trim() || null,
    active:form.elements.active.value === "true"
  };
  setFormStatus(materialFormStatus,"Salvataggio materiale...");
  const { error } = await supabase.from("platform_materials").upsert(payload,{onConflict:"material_key"});
  if(error){
    console.error(error);
    setFormStatus(materialFormStatus,error.message || "Errore salvataggio materiale.","error");
    return;
  }
  form.reset();
  form.elements.active.value = "true";
  setFormStatus(materialFormStatus,"Materiale salvato.","ok");
  await loadMaterials();
}

async function saveTicketCategory(event){
  event.preventDefault();
  if(!hasPermission("settings.manage") && !hasPermission("support.write")){
    setFormStatus(ticketCategoryStatus,"Non hai il permesso per gestire categorie ticket.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    category_key:String(form.elements.category_key.value || "").trim().toLowerCase(),
    name:String(form.elements.name.value || "").trim(),
    default_priority:form.elements.default_priority.value,
    active:true
  };
  setFormStatus(ticketCategoryStatus,"Salvataggio categoria...");
  const { error } = await supabase.from("platform_ticket_categories").upsert(payload,{onConflict:"category_key"});
  if(error){
    console.error(error);
    setFormStatus(ticketCategoryStatus,error.message || "Errore categoria.","error");
    return;
  }
  form.reset();
  setFormStatus(ticketCategoryStatus,"Categoria salvata.","ok");
  await loadTicketCategories();
}

async function saveIntegration(event){
  event.preventDefault();
  if(!hasPermission("settings.manage")){
    setFormStatus(integrationFormStatus,"Non hai il permesso settings.manage.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    provider:form.elements.provider.value,
    name:String(form.elements.name.value || "").trim(),
    environment:form.elements.environment.value,
    status:form.elements.status.value,
    webhook_url:String(form.elements.webhook_url.value || "").trim() || null,
    notes:String(form.elements.notes.value || "").trim() || null
  };
  setFormStatus(integrationFormStatus,"Salvataggio integrazione...");
  const { error } = await supabase
    .from("platform_integrations")
    .upsert(payload,{onConflict:"provider,environment"});
  if(error){
    console.error(error);
    setFormStatus(integrationFormStatus,error.message || "Errore integrazione.","error");
    return;
  }
  form.reset();
  setFormStatus(integrationFormStatus,"Integrazione salvata.","ok");
  await loadIntegrations();
}

async function saveClientNote(event){
  event.preventDefault();
  if(!currentClient) return;
  if(!hasPermission("crm.write") && !hasPermission("support.write")){
    setFormStatus(clientNoteStatus,"Non hai il permesso per scrivere note.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    business_id:currentClient.id,
    note_type:form.elements.note_type.value,
    body:String(form.elements.body.value || "").trim()
  };
  setFormStatus(clientNoteStatus,"Salvataggio nota...");
  const { error } = await supabase.from("platform_client_notes").insert(payload);
  if(error){
    console.error(error);
    setFormStatus(clientNoteStatus,error.message || "Errore nota.","error");
    return;
  }
  form.reset();
  setFormStatus(clientNoteStatus,"Nota aggiunta.","ok");
  await loadClientNotes(currentClient.id);
}

async function saveTicket(event){
  event.preventDefault();
  if(!currentClient) return;
  if(!hasPermission("support.write")){
    setFormStatus(ticketFormStatus,"Non hai il permesso support.write.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    business_id:currentClient.id,
    profile_id:currentClient.profile_id || null,
    subject:String(form.elements.subject.value || "").trim(),
    priority:form.elements.priority.value,
    description:String(form.elements.description.value || "").trim() || null,
    status:"open",
    source:"admin"
  };
  setFormStatus(ticketFormStatus,"Creazione ticket...");
  const { error } = await supabase.from("platform_support_tickets").insert(payload);
  if(error){
    console.error(error);
    setFormStatus(ticketFormStatus,error.message || "Errore ticket.","error");
    return;
  }
  form.reset();
  setFormStatus(ticketFormStatus,"Ticket creato.","ok");
  await Promise.all([loadClientTickets(currentClient.id),loadSupportTickets()]);
}

async function loadAdminSession(){
  const { data:userData,error:userError } = await supabase.auth.getUser();
  if(userError || !userData.user){
    showLoginGate("Sessione non verificata. Accedi di nuovo con un account admin.");
    return;
  }
  currentMember = await loadCurrentMember(userData.user);
  if(!currentMember){
    showDenied(String(userData.user.email || "").toLowerCase());
    return;
  }
  showAdmin(userData.user,currentMember);
  await Promise.all([
    loadDashboard(),
    loadClients(),
    loadMoments(),
    loadMomentCustomers(),
    loadMomentProducts(),
    loadMomentInventoryStats(),
    loadMomentAgentInventoryStats(),
    loadMembers(),
    loadAgents(),
    loadCommissions(),
    loadCommissionRules(),
    loadProducts(),
    loadStockMovements(),
    loadPlatformOrders(),
    loadPlans(),
    loadMaterials(),
    loadTicketCategories(),
    loadSupportTickets(),
    loadIntegrations(),
    loadPaymentTransactions(),
    loadWebhookEvents()
  ]);
}

async function init(){
  renderPermissions();
  if(!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY){
    setGate("Configurazione Supabase mancante.");
    return;
  }
  supabase = createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  const { data:sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if(!session?.user){
    showLoginGate();
    return;
  }
  await loadAdminSession();
}

document.querySelectorAll("[data-admin-tab]").forEach(button=>{
  button.addEventListener("click",()=>switchTab(button.dataset.adminTab));
});

document.querySelectorAll("[data-nav-toggle]").forEach(button=>{
  button.addEventListener("click",()=>{
    button.closest("[data-nav-group]")?.classList.toggle("open");
  });
});

document.getElementById("adminLogout").addEventListener("click",async()=>{
  if(supabase) await supabase.auth.signOut();
  location.href = "./admin.html";
});

adminLoginForm.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!supabase) return;
  const email = document.getElementById("adminLoginEmail").value.trim().toLowerCase();
  const password = document.getElementById("adminLoginPassword").value;
  setGate("Accesso in corso...");
  const { error } = await supabase.auth.signInWithPassword({ email,password });
  if(error){
    console.error(error);
    setGate(error.message || "Accesso non riuscito. Controlla email e password.","denied");
    return;
  }
  setGate("Sessione admin verificata. Caricamento pannello...");
  await loadAdminSession();
});

adminResetPassword.addEventListener("click",async()=>{
  if(!supabase) return;
  const email = document.getElementById("adminLoginEmail").value.trim().toLowerCase();
  if(!email){
    setGate("Inserisci prima l’email admin per recuperare la password.","denied");
    return;
  }
  const redirectTo = location.protocol === "file:" ? undefined : `${location.origin}/admin.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(email,{ redirectTo });
  if(error){
    console.error(error);
    setGate(error.message || "Recupero password non riuscito.","denied");
    return;
  }
  setGate("Email di recupero inviata. Controlla la casella dell’account admin.");
});

clientsTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-client-open]");
  if(!button) return;
  openClientDrawer(button.dataset.clientOpen,button.dataset.clientView || "summary");
});

productsTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-product-edit]");
  if(button) editProduct(button.dataset.productEdit);
});

momentsTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-moment-open]");
  if(button) openMomentDrawer(button.dataset.momentOpen,button.dataset.momentView || "summary");
});

if(momentProvisionForm) momentProvisionForm.addEventListener("submit",provisionMomentCustomer);

platformOrdersTable.addEventListener("click",event=>{
  const saveBtn = event.target.closest("[data-order-save]");
  if(saveBtn) return updatePlatformOrder(saveBtn.dataset.orderSave);
  const openBtn = event.target.closest("[data-order-open]");
  if(openBtn) openOrderDrawer(openBtn.dataset.orderOpen);
});

plansTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-plan-edit]");
  if(button) editPlan(button.dataset.planEdit);
});

materialsTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-material-edit]");
  if(button) editMaterial(button.dataset.materialEdit);
});

ticketCategoriesTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-ticket-category-edit]");
  if(button) editTicketCategory(button.dataset.ticketCategoryEdit);
});

integrationsTable.addEventListener("click",event=>{
  const button = event.target.closest("[data-integration-edit]");
  if(button) editIntegration(button.dataset.integrationEdit);
});

document.querySelectorAll("[data-reset-form]").forEach(button=>{
  button.addEventListener("click",()=>{
    const form = document.getElementById(button.dataset.resetForm);
    if(!form) return;
    form.reset();
    if(form.elements.sale_price) form.elements.sale_price.value = "0";
    if(form.elements.unit_cost) form.elements.unit_cost.value = "0";
    if(form.elements.min_stock) form.elements.min_stock.value = "0";
    if(form.elements.price_monthly) form.elements.price_monthly.value = "0";
    if(form.elements.price_yearly) form.elements.price_yearly.value = "0";
    if(form.elements.setup_fee) form.elements.setup_fee.value = "0";
    if(form.elements.sort_order) form.elements.sort_order.value = "0";
    if(form.elements.active) form.elements.active.value = "true";
    if(form.elements.public_visible) form.elements.public_visible.value = "false";
    const statusNode = form.querySelector(".form-status");
    if(statusNode) setFormStatus(statusNode,"Nuovo inserimento pronto.","ok");
  });
});

document.querySelectorAll("[data-client-drawer-close]").forEach(button=>{
  button.addEventListener("click",closeClientDrawer);
});

document.querySelectorAll("[data-drawer-view]").forEach(button=>{
  button.addEventListener("click",()=>setDrawerView(button.dataset.drawerView));
});

document.getElementById("copyPublicUrl").addEventListener("click",async()=>{
  const url = drawer.dataset.publicUrl || "";
  if(!url) return;
  try{
    await navigator.clipboard.writeText(url);
  }catch(error){
    console.warn("Copia link non riuscita",error);
  }
});

document.querySelectorAll("[data-moment-drawer-close]").forEach(button=>{
  button.addEventListener("click",closeMomentDrawer);
});
document.querySelectorAll("[data-moment-drawer-view]").forEach(button=>{
  button.addEventListener("click",()=>setMomentDrawerView(button.dataset.momentDrawerView));
});
document.getElementById("momentCopyPublicUrl")?.addEventListener("click",async()=>{
  const url = momentDrawer?.dataset.publicUrl || "";
  if(!url) return;
  try{ await navigator.clipboard.writeText(url); }catch(error){ console.warn("Copia link non riuscita",error); }
});

document.querySelectorAll("[data-code-drawer-close]").forEach(button=>{
  button.addEventListener("click",closeCodeDrawer);
});
document.querySelectorAll("[data-order-drawer-close]").forEach(button=>{
  button.addEventListener("click",closeOrderDrawer);
});
document.querySelectorAll("[data-order-drawer-view]").forEach(button=>{
  button.addEventListener("click",()=>setOrderDrawerView(button.dataset.orderDrawerView));
});
if(codeEditForm) codeEditForm.addEventListener("submit",saveCodeEdit);
document.getElementById("codeEditUnlinkOrder")?.addEventListener("click",unlinkCodeOrder);
if(orderEditForm) orderEditForm.addEventListener("submit",saveOrderEdit);
if(orderAssignForm) orderAssignForm.addEventListener("submit",assignOrderCodes);

document.querySelectorAll("[data-admin-tab-jump]").forEach(button=>{
  button.addEventListener("click",()=>switchTab(button.dataset.adminTabJump));
});

if(momentSearchInput){
  let searchTimer = null;
  momentSearchInput.addEventListener("input",()=>{
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshMomentTable,180);
  });
}
momentSearchClear?.addEventListener("click",()=>{
  if(momentSearchInput) momentSearchInput.value = "";
  refreshMomentTable();
});

[momentFilterLine,momentFilterBatch,momentFilterStatus,momentFilterAgent,momentFilterChannel,momentFilterOrder].forEach(node=>{
  if(node) node.addEventListener("change",refreshMomentTable);
});

momentSelectAll?.addEventListener("change",event=>{
  const checked = event.target.checked;
  filteredMomentProducts().forEach(row=>{
    if(row.status === "claimed") return;
    if(checked) selectedMomentCodes.add(row.code);
    else selectedMomentCodes.delete(row.code);
  });
  refreshMomentTable();
});

momentProductsTable?.addEventListener("change",event=>{
  const input = event.target.closest("[data-moment-select]");
  if(!input) return;
  toggleMomentCodeSelection(input.dataset.momentSelect,input.checked);
});

momentProductsTable?.addEventListener("click",event=>{
  const editBtn = event.target.closest("[data-code-edit]");
  if(editBtn) return openCodeDrawer(editBtn.dataset.codeEdit);
  const orderBtn = event.target.closest("[data-order-open]");
  if(orderBtn) return openOrderDrawer(orderBtn.dataset.orderOpen,"codes");
});

momentBulkApply?.addEventListener("click",()=>{
  applyMomentBulk({
    status:momentBulkStatus?.value || null,
    channel:momentBulkChannel?.value || null,
    agentId:momentBulkAgent?.value || null
  });
});
momentBulkClearAgent?.addEventListener("click",()=>applyMomentBulk({clearAgent:true}));
momentBulkClearOrder?.addEventListener("click",()=>applyMomentBulk({clearOrder:true}));

momentExportFiltered?.addEventListener("click",()=>{
  momentExportRows(filteredMomentProducts(), "khamakey-magazzino");
});
momentExportSelected?.addEventListener("click",()=>{
  const rows = momentProductRows.filter(row=>selectedMomentCodes.has(row.code));
  momentExportRows(rows, "khamakey-selezione");
});
momentLabelsFiltered?.addEventListener("click",async event=>{
  await runLabelExport(filteredMomentProducts(), "khamakey-etichette", event.currentTarget);
});
momentLabelsSelected?.addEventListener("click",async event=>{
  const rows = momentProductRows.filter(row=>selectedMomentCodes.has(row.code));
  await runLabelExport(rows, "khamakey-etichette-selezione", event.currentTarget);
});

agentsTable?.addEventListener("click",event=>{
  const button = event.target.closest("[data-agent-edit]");
  if(button) editAgent(button.dataset.agentEdit);
});

platformOrderForm?.elements?.order_type?.addEventListener("change",syncNfcOrderFieldsVisibility);
syncNfcOrderFieldsVisibility();

memberForm.addEventListener("submit",saveMember);
agentForm.addEventListener("submit",saveAgent);
if(momentForm) momentForm.addEventListener("submit",saveMoment);
if(momentBatchForm) momentBatchForm.addEventListener("submit",createMomentBatch);
productForm.addEventListener("submit",saveProduct);
stockForm.addEventListener("submit",saveStockMovement);
platformOrderForm.addEventListener("submit",savePlatformOrder);
clientRecordForm.addEventListener("submit",saveClientRecord);
clientNoteForm.addEventListener("submit",saveClientNote);
ticketForm.addEventListener("submit",saveTicket);
planForm.addEventListener("submit",savePlan);
materialForm.addEventListener("submit",saveMaterial);
ticketCategoryForm.addEventListener("submit",saveTicketCategory);
integrationForm.addEventListener("submit",saveIntegration);

init().catch(error=>{
  console.error(error);
  setGate(error.message || "Errore apertura admin.","denied");
});
