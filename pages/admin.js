import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";
import { exportMomentLabelsPdf } from "./admin-moment-labels.js";
import { renderPanelGuide, setGuideCollapsed, isGuideCollapsed } from "./admin-guide.js?v=106";

const SIMPLE_MODE_KEY = "khamakey_admin_simple_mode";

const TAB_PAGE_TITLES = {
  dashboard: "Oggi",
  platformOrders: "Ordini",
  momentCatalog: "Catalogo online",
  momentInventory: "Magazzino NFC",
  nfc: "Spedizioni NFC",
  billing: "Piani e pagamenti",
  clients: "Attività Business",
  momentClients: "Clienti Moments",
  support: "Supporto",
  crm: "CRM avanzato",
  inventory: "Magazzino Business",
  agents: "Partner e agenti",
  resellerNetwork: "Rete partner",
  commissions: "Quanto spetta",
  integrations: "Collegamenti",
  staff: "Collaboratori",
  permissions: "Permessi",
  plans: "Piani abbonamento",
  materials: "Materiali"
};

const SIMPLE_TAB_REDIRECT = {
  crm: "clients",
  inventory: "clients",
  nfc: "platformOrders",
  billing: "platformOrders",
  integrations: "dashboard",
  staff: "dashboard",
  permissions: "dashboard",
  plans: "dashboard",
  materials: "dashboard"
};

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
const simpleModeToggle = document.getElementById("simpleModeToggle");
const sidebar = document.getElementById("adminSidebar");
const topbar = document.getElementById("adminTopbar");
const gate = document.getElementById("adminGate");
const gateText = document.getElementById("adminGateText");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminResetPassword = document.getElementById("adminResetPassword");
const content = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const adminTitle = document.getElementById("adminTitle");
const adminSubtitle = document.getElementById("adminSubtitle");
const panelGuide = document.getElementById("panelGuide");
const panelGuideSubtitle = document.getElementById("panelGuideSubtitle");
const panelGuideSteps = document.getElementById("panelGuideSteps");
const panelGuideLegend = document.getElementById("panelGuideLegend");
const panelGuideTip = document.getElementById("panelGuideTip");
const panelGuideToggle = document.getElementById("panelGuideToggle");
const panelGuideToggleTop = document.getElementById("panelGuideToggleTop");
const guideElements = {
  panelGuide,
  adminSubtitle,
  panelGuideSubtitle,
  panelGuideSteps,
  panelGuideLegend,
  panelGuideTip,
  panelGuideToggle
};
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
const momentBatchCatalog = document.getElementById("momentBatchCatalog");
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
const commissionSearchInput = document.getElementById("commissionSearchInput");
const commissionSearchClear = document.getElementById("commissionSearchClear");
const commissionRefreshBtn = document.getElementById("commissionRefreshBtn");
const commissionFilterStatus = document.getElementById("commissionFilterStatus");
const commissionTableCount = document.getElementById("commissionTableCount");
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
const integrationHealthGrid = document.getElementById("integrationHealthGrid");
const refreshIntegrationHealthBtn = document.getElementById("refreshIntegrationHealth");
const supportedLocalesTable = document.getElementById("supportedLocalesTable");
const permissionGrid = document.getElementById("permissionGrid");
const memberPermissionChecklist = document.getElementById("memberPermissionChecklist");
const memberForm = document.getElementById("memberForm");
const memberFormStatus = document.getElementById("memberFormStatus");
const agentForm = document.getElementById("agentForm");
const agentFormStatus = document.getElementById("agentFormStatus");
const agentFormReset = document.getElementById("agentFormReset");
const agentParentSelect = document.getElementById("agentParentSelect");
const agentPriceListSelect = document.getElementById("agentPriceListSelect");
const networkTree = document.getElementById("networkTree");
const networkRootSelect = document.getElementById("networkRootSelect");
const networkRefreshBtn = document.getElementById("networkRefreshBtn");
const tierRuleForm = document.getElementById("tierRuleForm");
const tierRuleFormStatus = document.getElementById("tierRuleFormStatus");
const tierRulesTable = document.getElementById("tierRulesTable");
const priceListForm = document.getElementById("priceListForm");
const priceListFormStatus = document.getElementById("priceListFormStatus");
const priceListsTable = document.getElementById("priceListsTable");
const priceListItemForm = document.getElementById("priceListItemForm");
const priceListItemFormStatus = document.getElementById("priceListItemFormStatus");
const priceListItemSelect = document.getElementById("priceListItemSelect");
const priceListItemsTable = document.getElementById("priceListItemsTable");
const deliveryForm = document.getElementById("deliveryForm");
const deliveryFormStatus = document.getElementById("deliveryFormStatus");
const deliveryAgentSelect = document.getElementById("deliveryAgentSelect");
const deliveryFilterAgent = document.getElementById("deliveryFilterAgent");
const deliveriesTable = document.getElementById("deliveriesTable");
const drawer = document.getElementById("clientDrawer");
const drawerFrame = document.getElementById("drawerPublicFrame");
const drawerEditorFrame = document.getElementById("drawerEditorFrame");
const momentDrawer = document.getElementById("momentDrawer");
const momentDrawerPublicFrame = document.getElementById("momentDrawerPublicFrame");
const momentDrawerEditorFrame = document.getElementById("momentDrawerEditorFrame");
const clientSearchInput = document.getElementById("clientSearchInput");
const clientFilterCategory = document.getElementById("clientFilterCategory");
const clientTableCount = document.getElementById("clientTableCount");
const momentCustomerSearchInput = document.getElementById("momentCustomerSearchInput");
const momentObjectSearchInput = document.getElementById("momentObjectSearchInput");
const momentFilterType = document.getElementById("momentFilterType");
const momentFilterPublished = document.getElementById("momentFilterPublished");
const momentCustomerTableCount = document.getElementById("momentCustomerTableCount");
const momentObjectTableCount = document.getElementById("momentObjectTableCount");
const agentSearchInput = document.getElementById("agentSearchInput");
const agentFilterStatus = document.getElementById("agentFilterStatus");
const agentFilterModel = document.getElementById("agentFilterModel");
const agentTableCount = document.getElementById("agentTableCount");
const orderSearchInput = document.getElementById("orderSearchInput");
const orderFilterStatus = document.getElementById("orderFilterStatus");
const orderFilterType = document.getElementById("orderFilterType");
const orderTableCount = document.getElementById("orderTableCount");
const dashboardAlerts = document.getElementById("dashboardAlerts");
const momentCatalogForm = document.getElementById("momentCatalogForm");
const momentCatalogFormStatus = document.getElementById("momentCatalogFormStatus");
const momentCatalogTable = document.getElementById("momentCatalogTable");

let supabase = null;
let currentMember = null;
let clientRows = [];
let agentRows = [];
let networkRows = [];
let tierRuleRows = [];
let priceListRows = [];
let priceListItemRows = [];
let deliveryRows = [];
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

const AGENT_TYPE_LABELS = {
  agent:"Agente",
  reseller:"Rivenditore",
  authorized_point:"Punto autorizzato"
};

const TIER_LEVEL_LABELS = {
  1:"L1 diretto",
  2:"L2 upline",
  3:"L3 upline"
};

let supportTicketRows = [];
let platformOrderRows = [];
let planRows = [];
let materialRows = [];
let ticketCategoryRows = [];
let integrationRows = [];
let momentCatalogRows = [];
let editingMomentCatalogId = null;
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
  populateMomentTypeSelects();
  applySimpleMode();
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

function agentLabel(row){
  if(!row) return "-";
  return `${row.contact_name || row.email || "Agente"} · ${row.referral_code || ""}`.trim();
}

function agentParentLabel(parentId){
  if(!parentId) return "Radice";
  const parent = agentRows.find(item=>item.id === parentId);
  return parent ? agentLabel(parent) : "Upline";
}

function isAgentDescendant(agentId, potentialAncestorId){
  if(!agentId || !potentialAncestorId || agentId === potentialAncestorId) return false;
  let current = agentRows.find(item=>item.id === agentId);
  const seen = new Set();
  while(current?.parent_agent_id && !seen.has(current.parent_agent_id)){
    if(current.parent_agent_id === potentialAncestorId) return true;
    seen.add(current.parent_agent_id);
    current = agentRows.find(item=>item.id === current.parent_agent_id);
  }
  return false;
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
  renderAgentHierarchySelects(selectedId);
}

function renderAgentHierarchySelects(selectedParentId=""){
  const editingId = String(agentForm?.elements?.agent_id?.value || "").trim();
  const parentOptions = `<option value="">Nessuno — è il capo</option>` + agentRows
    .filter(row=>row.id !== editingId && !isAgentDescendant(editingId, row.id))
    .map(row=>`<option value="${esc(row.id)}" ${row.id === selectedParentId ? "selected" : ""}>${esc(agentLabel(row))}</option>`)
    .join("");
  if(agentParentSelect) agentParentSelect.innerHTML = parentOptions;
  const priceListOptions = `<option value="">Nessun listino dedicato</option>` + priceListRows.map(row=>`
    <option value="${esc(row.id)}" ${row.id === (agentForm?.elements?.price_list_id?.value || "") ? "selected" : ""}>${esc(row.name)} (${esc(row.list_key)})</option>
  `).join("");
  if(agentPriceListSelect) agentPriceListSelect.innerHTML = priceListOptions;
  const agentOnlyOptions = `<option value="">Seleziona agente</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}">${esc(agentLabel(row))}</option>
  `).join("");
  if(deliveryAgentSelect) deliveryAgentSelect.innerHTML = agentOnlyOptions;
  if(deliveryFilterAgent) deliveryFilterAgent.innerHTML = `<option value="">Tutti</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}">${esc(agentLabel(row))}</option>
  `).join("");
  const rootOptions = `<option value="">Tutte le radici</option>` + agentRows
    .filter(row=>!row.parent_agent_id)
    .map(row=>`<option value="${esc(row.id)}">${esc(agentLabel(row))}</option>`)
    .join("");
  if(networkRootSelect) networkRootSelect.innerHTML = rootOptions;
  const listItemOptions = `<option value="">Seleziona listino</option>` + priceListRows.map(row=>`
    <option value="${esc(row.id)}">${esc(row.name)}</option>
  `).join("");
  if(priceListItemSelect) priceListItemSelect.innerHTML = listItemOptions;
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

function togglePanelGuide(forceCollapsed){
  const collapsed = typeof forceCollapsed === "boolean" ? forceCollapsed : !isGuideCollapsed();
  setGuideCollapsed(collapsed);
  if(panelGuide) panelGuide.classList.toggle("collapsed", collapsed);
  const label = collapsed ? "Mostra guida" : "Nascondi guida";
  if(panelGuideToggle){
    panelGuideToggle.textContent = label;
    panelGuideToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }
  if(panelGuideToggleTop) panelGuideToggleTop.textContent = collapsed ? "Mostra guida" : "Guida sezione";
}

function isSimpleMode(){
  try{
    const stored = localStorage.getItem(SIMPLE_MODE_KEY);
    if(stored === null) return true;
    return stored !== "false";
  }catch{
    return true;
  }
}

function setSimpleMode(enabled){
  try{
    localStorage.setItem(SIMPLE_MODE_KEY, enabled ? "true" : "false");
  }catch{ /* ignore */ }
  applySimpleMode();
}

function applySimpleMode(){
  const simple = isSimpleMode();
  shell?.classList.toggle("simple-mode", simple);
  if(simpleModeToggle){
    simpleModeToggle.setAttribute("aria-pressed", simple ? "true" : "false");
    simpleModeToggle.textContent = simple ? "Modalità semplice" : "Modalità avanzata";
    simpleModeToggle.title = simple ? "Nasconde opzioni tecniche — clicca per espandere" : "Mostra tutte le opzioni tecniche";
  }
}

function simpleTierLabel(level){
  if(!level || level === 1) return "Vendita diretta";
  if(level === 2) return "Dal suo team";
  if(level === 3) return "Dal team del team";
  return `Livello ${level}`;
}

function isAdvancedTab(tab){
  const button = document.querySelector(`[data-admin-tab="${tab}"]`);
  return Boolean(button?.hasAttribute("data-advanced-only"));
}

function switchTab(tab){
  if(isSimpleMode() && isAdvancedTab(tab)){
    tab = SIMPLE_TAB_REDIRECT[tab] || "dashboard";
  }
  document.querySelectorAll("[data-admin-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.adminTab === tab);
  });
  document.querySelectorAll("[data-panel]").forEach(panel=>{
    panel.classList.toggle("active",panel.dataset.panel === tab);
  });
  const active = document.querySelector(`[data-admin-tab="${tab}"]`);
  const group = active?.closest("[data-nav-group]");
  if(group) group.classList.add("open");
  adminTitle.textContent = TAB_PAGE_TITLES[tab] || active?.textContent || "Admin";
  renderPanelGuide(tab, guideElements);
  if(panelGuide && !panelGuide.hidden){
    panelGuide.classList.toggle("collapsed", isGuideCollapsed());
  }
  try{
    history.replaceState(null, "", `#${tab}`);
  }catch{ /* ignore */ }
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

async function countOpenSupportTickets(){
  try{
    const { data,error } = await supabase
      .from("platform_support_tickets")
      .select("status")
      .limit(500);
    if(error) throw error;
    return (data || []).filter(row=>!["closed","resolved"].includes(String(row.status || "").toLowerCase())).length;
  }catch(error){
    console.warn("Conteggio ticket aperti non disponibile",error);
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
  const [clients,published,nfc,events,agents,orders,pendingCommissions,moments,momentsAvailable,pendingOrders,openTickets] = await Promise.all([
    safeCount("businesses"),
    safeCount("business_public_pages",query=>query.eq("published",true)),
    safeCount("nfc_tags"),
    safeCount("analytics_events"),
    safeCount("platform_agents",query=>query.eq("status","active")),
    safeCount("platform_orders"),
    safeCount("platform_commission_events",query=>query.eq("status","pending")),
    safeCount("moment_events"),
    safeCount("moment_activation_codes",query=>query.eq("status","available")),
    safeCount("platform_orders",query=>query.in("status",["pending","paid","production","ready"])),
    countOpenSupportTickets()
  ]);
  let stock = 0;
  let lowStockProducts = 0;
  try{
    const { data,error } = await supabase
      .from("platform_product_stock_summary")
      .select("available_quantity,min_stock");
    if(error) throw error;
    stock = (data || []).reduce((sum,row)=>sum + Number(row.available_quantity || 0),0);
    lowStockProducts = (data || []).filter(row=>{
      const available = Number(row.available_quantity || 0);
      const minStock = Number(row.min_stock || 0);
      return minStock > 0 && available <= minStock;
    }).length;
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
  renderDashboardAlerts({
    momentsAvailable,
    pendingOrders,
    openTickets,
    lowStockProducts,
    pendingCommissions
  });
}

async function loadClients(){
  try{
    const { data,error } = await supabase
      .from("businesses")
      .select("id,profile_id,nome,slug,categoria")
      .order("created_at",{ascending:false})
      .limit(200);
    if(error) throw error;
    clientRows = data || [];
    const businessOptions = `<option value="">Nessun cliente collegato</option>` + clientRows.map(row=>`
      <option value="${esc(row.id)}">${esc(row.nome || row.slug || row.id)}</option>
    `).join("");
    orderBusinessSelect.innerHTML = businessOptions;
    momentBusinessSelect.innerHTML = businessOptions;
    populateClientCategoryFilter();
    refreshClientsTable();
  }catch(error){
    console.error(error);
    const hint = String(error?.message || "").includes("permission") || String(error?.code || "") === "42501"
      ? "Accesso negato dal database. Ricarica la pagina: se persiste, verifica SQL v63."
      : (error?.message || "Errore caricamento clienti.");
    clientsTable.innerHTML = `<tr><td colspan="4">Clienti non disponibili: ${esc(hint)}</td></tr>`;
  }
}

function populateClientCategoryFilter(){
  if(!clientFilterCategory) return;
  const current = clientFilterCategory.value;
  const categories = [...new Set(clientRows.map(row=>row.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"it"));
  clientFilterCategory.innerHTML = `<option value="">Tutte</option>` + categories.map(cat=>`
    <option value="${esc(cat)}" ${cat === current ? "selected" : ""}>${esc(cat)}</option>
  `).join("");
}

function refreshClientsTable(){
  const search = String(clientSearchInput?.value || "").trim().toLowerCase();
  const category = clientFilterCategory?.value || "";
  const rows = clientRows.filter(row=>{
    if(category && (row.categoria || "") !== category) return false;
    return haystackIncludes(row, search, ["nome","slug","categoria","id"]);
  });
  if(clientTableCount) clientTableCount.textContent = `${fmt(rows.length)} clienti`;
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
  `).join("") : `<tr><td colspan="4">${clientRows.length ? "Nessun cliente corrisponde ai filtri." : "Nessun cliente trovato o permessi database non ancora configurati."}</td></tr>`;
}

// ---------------------------------------------------------------------------
// CRM — pipeline clienti (v84). Costruito su platform_client_records/notes via RPC.
// ---------------------------------------------------------------------------
let crmRows = [];
let crmCurrentBusinessId = "";
const crmTable = document.getElementById("crmTable");
const crmTableCount = document.getElementById("crmTableCount");
const crmSearchInput = document.getElementById("crmSearchInput");
const crmSearchClear = document.getElementById("crmSearchClear");
const crmRefreshBtn = document.getElementById("crmRefreshBtn");
const crmFilterStatus = document.getElementById("crmFilterStatus");
const crmFilterPriority = document.getElementById("crmFilterPriority");
const crmEditorCard = document.getElementById("crmEditorCard");
const crmEditorTitle = document.getElementById("crmEditorTitle");
const crmRecordForm = document.getElementById("crmRecordForm");
const crmRecordBusinessId = document.getElementById("crmRecordBusinessId");
const crmRecordStatus = document.getElementById("crmRecordStatus");
const crmRecordPriority = document.getElementById("crmRecordPriority");
const crmRecordAgent = document.getElementById("crmRecordAgent");
const crmRecordFollowUp = document.getElementById("crmRecordFollowUp");
const crmRecordTags = document.getElementById("crmRecordTags");
const crmRecordNotes = document.getElementById("crmRecordNotes");
const crmRecordStatusMsg = document.getElementById("crmRecordStatusMsg");
const crmNoteForm = document.getElementById("crmNoteForm");
const crmNoteBody = document.getElementById("crmNoteBody");
const crmNoteType = document.getElementById("crmNoteType");
const crmNotePinned = document.getElementById("crmNotePinned");
const crmNoteStatusMsg = document.getElementById("crmNoteStatusMsg");
const crmNotesList = document.getElementById("crmNotesList");

const CRM_STATUS_LABELS = {
  nuovo:"Nuovo", new:"Nuovo", contattato:"Contattato", in_onboarding:"In onboarding",
  attivo:"Attivo", active:"Attivo", a_rischio:"A rischio", perso:"Perso"
};
const CRM_PRIORITY_LABELS = { alta:"Alta", media:"Media", normal:"Media", bassa:"Bassa" };

function crmStatusLabel(v){ return CRM_STATUS_LABELS[v] || (v || "Nuovo"); }
function crmPriorityLabel(v){ return CRM_PRIORITY_LABELS[v] || (v || "Media"); }
function crmPriorityKey(v){ return v === "alta" ? "alta" : v === "bassa" ? "bassa" : "media"; }

async function loadCrm(){
  if(!crmTable) return;
  if(!hasPermission("crm.read") && !hasPermission("crm.write")){
    crmTable.innerHTML = `<tr><td colspan="6">Serve il permesso crm.read per vedere la pipeline.</td></tr>`;
    return;
  }
  try{
    const { data,error } = await supabase.rpc("list_crm_clients");
    if(error) throw error;
    crmRows = data || [];
    populateCrmStatusFilter();
    refreshCrmTable();
    updateCrmStats();
  }catch(error){
    console.error(error);
    crmTable.innerHTML = `<tr><td colspan="6">CRM non disponibile: ${esc(error?.message || "errore")}. Applica SQL v84.</td></tr>`;
  }
}

function populateCrmStatusFilter(){
  if(!crmFilterStatus) return;
  const current = crmFilterStatus.value;
  const statuses = [...new Set(crmRows.map(r=>r.onboarding_status).filter(Boolean))];
  crmFilterStatus.innerHTML = `<option value="">Tutti</option>` + statuses.map(s=>`
    <option value="${esc(s)}" ${s === current ? "selected" : ""}>${esc(crmStatusLabel(s))}</option>
  `).join("");
}

function updateCrmStats(){
  const now = Date.now();
  const soon = now + 7 * 24 * 3600 * 1000;
  const total = crmRows.length;
  const follow = crmRows.filter(r=>r.next_follow_up_at && new Date(r.next_follow_up_at).getTime() <= soon).length;
  const high = crmRows.filter(r=>crmPriorityKey(r.priority) === "alta").length;
  const fresh = crmRows.filter(r=>["nuovo","new","contattato"].includes(String(r.onboarding_status))).length;
  const set = (id,v)=>{ const n = document.getElementById(id); if(n) n.textContent = fmt(v); };
  set("crmStatTotal",total); set("crmStatFollow",follow); set("crmStatHigh",high); set("crmStatNew",fresh);
}

function refreshCrmTable(){
  if(!crmTable) return;
  const search = String(crmSearchInput?.value || "").trim().toLowerCase();
  const status = crmFilterStatus?.value || "";
  const priority = crmFilterPriority?.value || "";
  const now = Date.now();
  const rows = crmRows.filter(r=>{
    if(status && String(r.onboarding_status) !== status) return false;
    if(priority && crmPriorityKey(r.priority) !== priority) return false;
    if(search){
      const hay = [r.business_name, r.slug, r.categoria, (r.tags || []).join(" ")].join(" ").toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  });
  if(crmTableCount) crmTableCount.textContent = `${fmt(rows.length)} clienti`;
  crmTable.innerHTML = rows.length ? rows.map(r=>{
    const due = r.next_follow_up_at && new Date(r.next_follow_up_at).getTime() <= now;
    const pk = crmPriorityKey(r.priority);
    const sk = String(r.onboarding_status || "nuovo");
    return `<tr>
      <td><strong>${esc(r.business_name)}</strong>${r.tags && r.tags.length ? `<br><span class="crm-note-meta">${esc(r.tags.join(" · "))}</span>` : ""}</td>
      <td><span class="crm-status-pill ${esc(sk)}">${esc(crmStatusLabel(sk))}</span></td>
      <td><span class="crm-status-pill ${esc(pk)}">${esc(crmPriorityLabel(r.priority))}</span></td>
      <td>${r.next_follow_up_at ? `<span class="${due ? "crm-follow-due" : ""}">${esc(dateShort(r.next_follow_up_at))}</span>` : "-"}</td>
      <td>${fmt(r.note_count || 0)}</td>
      <td><div class="row-actions"><button type="button" data-crm-open="${esc(r.business_id)}">Apri scheda</button></div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="6">${crmRows.length ? "Nessun cliente corrisponde ai filtri." : "Nessun cliente."}</td></tr>`;
}

function populateCrmAgentSelect(selected){
  if(!crmRecordAgent) return;
  crmRecordAgent.innerHTML = `<option value="">Nessuno</option>` + agentRows.map(a=>`
    <option value="${esc(a.id)}" ${a.id === selected ? "selected" : ""}>${esc(a.contact_name || a.email || a.id)}</option>
  `).join("");
}

async function openCrmClient(businessId){
  const row = crmRows.find(r=>r.business_id === businessId);
  if(!row) return;
  crmCurrentBusinessId = businessId;
  crmEditorCard.hidden = false;
  crmEditorTitle.textContent = `Scheda — ${row.business_name}`;
  crmRecordBusinessId.value = businessId;
  // se lo stato reale non è tra le opzioni (es. valore legacy), aggiungilo al volo
  const sk = String(row.onboarding_status || "nuovo");
  if(![...crmRecordStatus.options].some(o=>o.value === sk)){
    crmRecordStatus.add(new Option(crmStatusLabel(sk), sk));
  }
  crmRecordStatus.value = sk;
  crmRecordPriority.value = crmPriorityKey(row.priority);
  populateCrmAgentSelect(row.assigned_agent_id || "");
  crmRecordFollowUp.value = row.next_follow_up_at ? toDateTimeLocal(row.next_follow_up_at) : "";
  crmRecordTags.value = (row.tags || []).join(", ");
  crmRecordNotes.value = row.admin_notes || "";
  setFormStatus(crmRecordStatusMsg,"");
  setFormStatus(crmNoteStatusMsg,"");
  crmEditorCard.scrollIntoView({behavior:"smooth",block:"start"});
  await loadCrmNotes(businessId);
}

async function saveCrmRecord(event){
  event.preventDefault();
  if(!hasPermission("crm.write")) return setFormStatus(crmRecordStatusMsg,"Serve il permesso crm.write.","error");
  const tags = crmRecordTags.value.split(",").map(t=>t.trim()).filter(Boolean);
  setFormStatus(crmRecordStatusMsg,"Salvataggio...");
  try{
    const { error } = await supabase.rpc("save_crm_client",{
      p_business_id: crmRecordBusinessId.value,
      p_onboarding_status: crmRecordStatus.value,
      p_priority: crmRecordPriority.value,
      p_assigned_agent_id: crmRecordAgent.value || null,
      p_next_follow_up_at: crmRecordFollowUp.value ? new Date(crmRecordFollowUp.value).toISOString() : null,
      p_tags: tags,
      p_admin_notes: crmRecordNotes.value
    });
    if(error) throw error;
    setFormStatus(crmRecordStatusMsg,"Scheda salvata.","ok");
    await loadCrm();
  }catch(error){
    setFormStatus(crmRecordStatusMsg,error.message || "Errore salvataggio.","error");
  }
}

async function loadCrmNotes(businessId){
  if(!crmNotesList) return;
  try{
    const { data,error } = await supabase.rpc("list_crm_notes",{ p_business_id: businessId });
    if(error) throw error;
    const notes = data || [];
    crmNotesList.innerHTML = notes.length ? notes.map(n=>`
      <div class="crm-note ${n.pinned ? "pinned" : ""}">
        <div class="crm-note-head">
          <span class="crm-note-type">${esc(n.note_type || "nota")}</span>
          ${n.pinned ? `<span class="crm-note-type">📌 fissata</span>` : ""}
          <span class="crm-note-meta">${esc(n.author_name || "Team")} · ${esc(dateShort(n.created_at))}</span>
          <div class="crm-note-actions"><button type="button" data-crm-note-del="${esc(n.id)}">Elimina</button></div>
        </div>
        <div class="crm-note-body">${esc(n.body)}</div>
      </div>
    `).join("") : `<p class="inventory-table-meta">Nessuna nota ancora.</p>`;
  }catch(error){
    crmNotesList.innerHTML = `<p class="inventory-table-meta">Note non disponibili: ${esc(error?.message || "errore")}</p>`;
  }
}

async function addCrmNote(event){
  event.preventDefault();
  if(!crmCurrentBusinessId) return;
  if(!hasPermission("crm.write")) return setFormStatus(crmNoteStatusMsg,"Serve il permesso crm.write.","error");
  setFormStatus(crmNoteStatusMsg,"Salvataggio nota...");
  try{
    const { error } = await supabase.rpc("add_crm_note",{
      p_business_id: crmCurrentBusinessId,
      p_body: crmNoteBody.value,
      p_note_type: crmNoteType.value,
      p_pinned: crmNotePinned.checked
    });
    if(error) throw error;
    crmNoteBody.value = "";
    crmNotePinned.checked = false;
    setFormStatus(crmNoteStatusMsg,"Nota aggiunta.","ok");
    await Promise.all([loadCrmNotes(crmCurrentBusinessId), loadCrm()]);
  }catch(error){
    setFormStatus(crmNoteStatusMsg,error.message || "Errore nota.","error");
  }
}

async function deleteCrmNote(noteId){
  if(!hasPermission("crm.write")) return;
  try{
    const { error } = await supabase.rpc("delete_crm_note",{ p_note_id: noteId });
    if(error) throw error;
    await Promise.all([loadCrmNotes(crmCurrentBusinessId), loadCrm()]);
  }catch(error){
    console.error("delete_crm_note",error);
  }
}

async function loadMomentCustomers(){
  if(!momentCustomersTable) return;
  try{
    const { data,error } = await supabase.rpc("get_moment_customer_stats");
    if(error) throw error;
    momentCustomerRows = data || [];
    refreshMomentCustomersTable();
  }catch(error){
    console.error(error);
    momentCustomersTable.innerHTML = `<tr><td colspan="6">Account Moments non disponibili. Applica SQL v43.</td></tr>`;
  }
}

function refreshMomentCustomersTable(){
  if(!momentCustomersTable) return;
  const search = String(momentCustomerSearchInput?.value || "").trim().toLowerCase();
  const rows = momentCustomerRows.filter(row=>haystackIncludes(row, search, ["display_name","email","status"]));
  if(momentCustomerTableCount) momentCustomerTableCount.textContent = `${fmt(rows.length)} account`;
  momentCustomersTable.innerHTML = rows.length ? rows.map(row=>`
    <tr>
      <td><strong>${esc(row.display_name || row.email)}</strong></td>
      <td>${esc(row.email)}</td>
      <td>${fmt(row.object_count)}</td>
      <td>${fmt(row.published_count)}</td>
      <td>${dateShort(row.last_activated_at)}</td>
      <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
    </tr>
  `).join("") : `<tr><td colspan="6">${momentCustomerRows.length ? "Nessun account corrisponde alla ricerca." : "Nessun account Moments. Crea il primo cliente dal form sopra."}</td></tr>`;
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
      .limit(200);
    if(error) throw error;
    momentRows = data || [];
    populateMomentObjectTypeFilter();
    refreshMomentsTable();
  }catch(error){
    console.error(error);
    momentsTable.innerHTML = `<tr><td colspan="7">Oggetti Moments non disponibili. Verifica permessi moments.read.</td></tr>`;
  }
}

function populateMomentObjectTypeFilter(){
  if(!momentFilterType) return;
  const current = momentFilterType.value;
  const types = [...new Set(momentRows.map(row=>normalizeMomentType(row.moment_type || row.event_type)))].sort((a,b)=>
    (TYPE_LABELS[a] || a).localeCompare(TYPE_LABELS[b] || b,"it")
  );
  momentFilterType.innerHTML = `<option value="">Tutti</option>` + types.map(type=>`
    <option value="${esc(type)}" ${type === current ? "selected" : ""}>${esc(momentTemplateLabel(type))}</option>
  `).join("");
}

function refreshMomentsTable(){
  const search = String(momentObjectSearchInput?.value || "").trim().toLowerCase();
  const typeFilter = momentFilterType?.value || "";
  const publishedFilter = momentFilterPublished?.value || "";
  const rows = momentRows.filter(row=>{
    const type = normalizeMomentType(row.moment_type || row.event_type);
    if(typeFilter && type !== typeFilter) return false;
    if(publishedFilter === "yes" && !row.public_visible) return false;
    if(publishedFilter === "no" && row.public_visible) return false;
    return haystackIncludes(row, search, [
      "title","slug","owner_email","nfc_code","status",
      r=>momentTemplateLabel(r.moment_type || r.event_type)
    ]);
  });
  if(momentObjectTableCount) momentObjectTableCount.textContent = `${fmt(rows.length)} oggetti`;
  momentsTable.innerHTML = rows.length ? rows.map(row=>{
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
  }).join("") : `<tr><td colspan="7">${momentRows.length ? "Nessun oggetto corrisponde ai filtri." : "Nessun oggetto Moments attivato."}</td></tr>`;
}

function productLineLabel(value){
  return PRODUCT_LINE_LABELS[value] || value || "Non specificato";
}

function momentTemplateLabel(value){
  return TYPE_LABELS[normalizeMomentType(value)] || value || "-";
}

function populateMomentTypeSelects(){
  document.querySelectorAll("[data-moment-type-select]").forEach(select=>{
    const current = select.value || select.dataset.defaultValue || "free";
    select.innerHTML = renderCategorySelect(current);
  });
}

function haystackIncludes(row, search, parts){
  if(!search) return true;
  const haystack = parts.map(part=>{
    if(typeof part === "function") return part(row);
    return row?.[part];
  }).filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search);
}

function bindSearchInput(input, onChange){
  if(!input) return;
  let timer = null;
  input.addEventListener("input",()=>{
    clearTimeout(timer);
    timer = setTimeout(onChange,180);
  });
}

function renderDashboardAlerts(stats){
  if(!dashboardAlerts) return;
  const alerts = [];
  if(stats.momentsAvailable <= 10){
    alerts.push({
      level:stats.momentsAvailable === 0 ? "danger" : "warn",
      title:"Stock NFC Moments",
      text:stats.momentsAvailable === 0
        ? "Nessun codice disponibile in magazzino — genera un nuovo lotto."
        : `Solo ${fmt(stats.momentsAvailable)} codici disponibili — valuta nuova produzione.`,
      tab:"momentInventory"
    });
  }
  if(stats.pendingOrders > 0){
    alerts.push({
      level:"warn",
      title:"Ordini da evadere",
      text:`${fmt(stats.pendingOrders)} ordini in attesa, pagati o in produzione.`,
      tab:"platformOrders"
    });
  }
  if(stats.openTickets > 0){
    alerts.push({
      level:"warn",
      title:"Ticket supporto aperti",
      text:`${fmt(stats.openTickets)} richieste ancora da chiudere.`,
      tab:"support"
    });
  }
  if(stats.lowStockProducts > 0){
    alerts.push({
      level:"warn",
      title:"Magazzino Business sotto soglia",
      text:`${fmt(stats.lowStockProducts)} prodotti sotto la quantità minima.`,
      tab:"inventory"
    });
  }
  if(stats.pendingCommissions > 0){
    alerts.push({
      level:"info",
      title:"Provvigioni da approvare",
      text:`${fmt(stats.pendingCommissions)} provvigioni in stato pending.`,
      tab:"commissions"
    });
  }
  if(!alerts.length){
    dashboardAlerts.innerHTML = `
      <div class="alert-item alert-ok" data-admin-tab-jump="dashboard">
        <strong>Tutto ok</strong>
        <span>Nessun alert urgente. Stock Moments: ${fmt(stats.momentsAvailable)} · Ordini attivi: ${fmt(stats.pendingOrders)} · Ticket aperti: ${fmt(stats.openTickets)}.</span>
      </div>`;
    return;
  }
  dashboardAlerts.innerHTML = alerts.map(alert=>`
    <div class="alert-item alert-${esc(alert.level)}" data-admin-tab-jump="${esc(alert.tab)}" role="button" tabindex="0">
      <strong>${esc(alert.title)}</strong>
      <span>${esc(alert.text)}</span>
    </div>
  `).join("");
  dashboardAlerts.querySelectorAll("[data-admin-tab-jump]").forEach(node=>{
    node.addEventListener("click",()=>switchTab(node.dataset.adminTabJump));
    node.addEventListener("keydown",event=>{
      if(event.key === "Enter" || event.key === " "){
        event.preventDefault();
        switchTab(node.dataset.adminTabJump);
      }
    });
  });
}

function momentNfcUrl(row){
  const code = String(row?.code || row?.out_code || "").trim();
  return code ? `${PUBLIC_BASE_URL}/k/${encodeURIComponent(code)}` : "";
}

function momentActivationUrl(row){
  return row?.public_slug ? `${PUBLIC_BASE_URL}/m/${encodeURIComponent(row.public_slug)}` : "";
}

function catalogLabel(row){
  if(!row) return "";
  return `${row.sku} · ${row.name} · ${productLineLabel(row.product_line)} · ${momentTemplateLabel(row.product_type)}`;
}

function populateMomentBatchCatalogSelect(){
  if(!momentBatchCatalog) return;
  const current = momentBatchCatalog.value;
  const active = momentCatalogRows.filter(row=>row.status === "active");
  momentBatchCatalog.innerHTML = `<option value="">Manuale — scegli linea e template sotto</option>` + active.map(row=>`
    <option value="${esc(row.id)}" ${row.id === current ? "selected" : ""}>${esc(catalogLabel(row))}</option>
  `).join("");
}

function applyMomentBatchCatalog(){
  if(!momentBatchForm || !momentBatchCatalog) return;
  const row = momentCatalogRows.find(item=>item.id === momentBatchCatalog.value);
  if(!row) return;
  momentBatchForm.elements.product_line.value = row.product_line || "portachiavi";
  momentBatchForm.elements.product_type.value = normalizeMomentType(row.product_type || "free");
  momentBatchForm.elements.prefix.value = String(row.sku || "MOMENT").replace(/[^A-Z0-9]/gi,"").toUpperCase().slice(0,12) || "MOMENT";
  if(!String(momentBatchForm.elements.batch_label.value || "").trim()){
    const today = new Date().toISOString().slice(0,10);
    momentBatchForm.elements.batch_label.value = `${row.sku} · ${today}`;
  }
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
    "Link attivazione",
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
      momentActivationUrl(row),
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
    const nfcUrl = momentNfcUrl(row);
    const activationUrl = momentActivationUrl(row);
    const claimed = row.status === "claimed";
    const checked = selectedMomentCodes.has(row.code) ? "checked" : "";
    const trace = [
      soldChannelLabel(row.sold_channel || "non_specificato"),
      agentLabelById(row.assigned_agent_id),
      row.platform_order_id ? orderLabelById(row.platform_order_id) : ""
    ].filter(value=>value && value !== "-" && value !== "Non specificato").join(" · ") || "-";
    return `<tr>
      <td>${claimed ? "" : `<input type="checkbox" data-moment-select="${esc(row.code)}" ${checked} aria-label="Seleziona ${esc(row.code)}">`}</td>
      <td><strong>${esc(row.code)}</strong><div class="muted-cell">${esc(momentTemplateLabel(row.product_type))}</div></td>
      <td>${nfcUrl ? `<a href="${esc(nfcUrl)}" target="_blank" rel="noopener">/k/${esc(row.code)}</a>` : "-"}</td>
      <td>${activationUrl ? `<a href="${esc(activationUrl)}" target="_blank" rel="noopener">/m/${esc(row.public_slug)}</a>` : "-"}</td>
      <td>${esc(productLineLabel(row.product_line || "non_specificato"))}</td>
      <td>${esc(row.batch_label || "-")}</td>
      <td>${esc(row.created_at ? dateShort(row.created_at) : "-")}</td>
      <td>${row.platform_order_id ? `<button type="button" class="link-button" data-order-open="${esc(row.platform_order_id)}">${esc(trace)}</button>` : esc(trace)}</td>
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
      .select("code,status,public_slug,product_type,product_line,batch_label,product_label,public_url,claimed_by_email,claimed_at,created_at,sold_channel,assigned_agent_id,platform_order_id")
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
      .select("id,business_name,contact_name,email,phone,referral_code,commission_percent,commission_bonus_percent,model,status,agent_type,parent_agent_id,tier_key,price_list_id,territory")
      .order("created_at",{ascending:false});
    if(error) throw error;
    agentRows = data || [];
    renderAgentOptions(currentClientRecord?.assigned_agent_id || "");
    refreshAgentsTable();
    if(momentProductRows.length) refreshMomentTable();
  }catch(error){
    console.error(error);
    agentsTable.innerHTML = `<tr><td colspan="7">Agenti non disponibili. Verifica permessi agents.read.</td></tr>`;
  }
}

function refreshAgentsTable(){
  const search = String(agentSearchInput?.value || "").trim().toLowerCase();
  const status = agentFilterStatus?.value || "";
  const model = agentFilterModel?.value || "";
  const rows = agentRows.filter(row=>{
    if(status && row.status !== status) return false;
    if(model && row.model !== model) return false;
    return haystackIncludes(row, search, ["contact_name","business_name","email","referral_code","model","agent_type","territory"]);
  });
  if(agentTableCount) agentTableCount.textContent = `${fmt(rows.length)} agenti`;
  agentsTable.innerHTML = rows.length ? rows.map(row=>`
    <tr>
      <td><strong>${esc(row.contact_name || row.email)}</strong><div class="muted-cell">${esc(row.business_name || row.email)}</div></td>
      <td>${esc(AGENT_TYPE_LABELS[row.agent_type] || row.agent_type || "agent")}</td>
      <td>${esc(row.referral_code)}</td>
      <td class="muted-cell">${esc(agentParentLabel(row.parent_agent_id))}${agentDownlineCount(row.id) ? ` · ${fmt(agentDownlineCount(row.id))} downline` : ""}</td>
      <td>${fmt(Number(row.commission_percent || 0) + Number(row.commission_bonus_percent || 0))}%</td>
      <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      <td>
        <button class="small-action" type="button" data-agent-edit="${esc(row.id)}">Modifica</button>
        <button class="small-action" type="button" data-agent-network="${esc(row.id)}">Rete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="7">${agentRows.length ? "Nessun agente corrisponde ai filtri." : "Nessun agente registrato."}</td></tr>`;
}

let commissionRows = [];
const COMMISSION_STATUS_LABELS = { pending:"Da pagare", approved:"Approvata", paid:"Pagata", cancelled:"Annullata" };
function commissionStatusLabel(s){ return COMMISSION_STATUS_LABELS[s] || (s || "-"); }

async function loadCommissions(){
  try{
    const { data,error } = await supabase
      .from("platform_commission_events")
      .select("id,agent_id,event_type,amount,commission_amount,status,tier_level,source_type,source_agent_id,rule_snapshot,created_at,platform_agents(contact_name,email,referral_code)")
      .order("created_at",{ascending:false})
      .limit(200);
    if(error) throw error;
    commissionRows = data || [];
    updateCommissionStats();
    refreshCommissionsTable();
  }catch(error){
    console.error(error);
    commissionsTable.innerHTML = `<tr><td colspan="8">Provvigioni non disponibili. Verifica permessi commissions.read.</td></tr>`;
  }
}

function updateCommissionStats(){
  const sumBy = status => commissionRows.filter(r=>r.status===status).reduce((acc,r)=>acc + Number(r.commission_amount || 0),0);
  const set = (id,val)=>{ const n = document.getElementById(id); if(n) n.textContent = val; };
  set("commissionStatPending", money(sumBy("pending")));
  set("commissionStatApproved", money(sumBy("approved")));
  set("commissionStatPaid", money(sumBy("paid")));
  set("commissionStatCount", fmt(commissionRows.length));
}

function refreshCommissionsTable(){
  const search = String(commissionSearchInput?.value || "").trim().toLowerCase();
  const status = commissionFilterStatus?.value || "";
  const canWrite = hasPermission("commissions.write");
  const rows = commissionRows.filter(row=>{
    if(status && row.status !== status) return false;
    if(search){
      const orderCode = row.rule_snapshot?.order_code || "";
      const hay = [row.platform_agents?.contact_name, row.platform_agents?.email, row.event_type, orderCode].join(" ").toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  });
  if(commissionTableCount) commissionTableCount.textContent = `${fmt(rows.length)} voci`;
  commissionsTable.innerHTML = rows.length ? rows.map(row=>{
    const orderCode = row.rule_snapshot?.order_code || "";
    const actions = canWrite ? commissionActionButtons(row) : "";
    return `<tr>
      <td><strong>${esc(row.platform_agents?.contact_name || row.platform_agents?.email || row.agent_id)}</strong></td>
      <td>${esc(row.event_type)}</td>
      <td>${esc(isSimpleMode() ? simpleTierLabel(row.tier_level) : (TIER_LEVEL_LABELS[row.tier_level] || (row.tier_level ? `L${row.tier_level}` : "Vendita diretta")))}</td>
      <td>${orderCode ? `<span class="muted-cell">${esc(orderCode)}</span>` : "-"}</td>
      <td>${money(row.amount)}</td>
      <td><strong>${money(row.commission_amount)}</strong></td>
      <td><span class="status-pill ${esc(row.status)}">${esc(commissionStatusLabel(row.status))}</span></td>
      <td><div class="row-actions">${actions || "-"}</div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="8">Nessuna provvigione in questo stato.</td></tr>`;
}

function commissionActionButtons(row){
  const id = esc(row.id);
  const btn = (status,label)=>`<button type="button" data-commission-set="${id}" data-commission-status="${status}">${label}</button>`;
  if(row.status === "pending") return btn("approved","Approva") + btn("paid","Segna pagata") + btn("cancelled","Annulla");
  if(row.status === "approved") return btn("paid","Segna pagata") + btn("cancelled","Annulla");
  if(row.status === "paid") return btn("pending","Riporta in attesa");
  if(row.status === "cancelled") return btn("pending","Ripristina");
  return "";
}

async function setCommissionStatus(id,status){
  if(!hasPermission("commissions.write")) return;
  const row = commissionRows.find(r=>r.id === id);
  if(!row) return;
  const prev = row.status;
  row.status = status; // ottimistico
  updateCommissionStats();
  refreshCommissionsTable();
  try{
    const { error } = await supabase.from("platform_commission_events").update({ status }).eq("id",id);
    if(error) throw error;
  }catch(error){
    console.error("setCommissionStatus",error);
    row.status = prev; // rollback in caso di errore
    updateCommissionStats();
    refreshCommissionsTable();
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

async function loadNetworkTree(){
  if(!networkTree) return;
  try{
    const rootId = networkRootSelect?.value || null;
    const { data,error } = await supabase.rpc("get_agent_network_tree",{
      p_root_agent_id:rootId || null
    });
    if(error) throw error;
    networkRows = data || [];
    renderNetworkTree();
  }catch(error){
    console.error(error);
    networkTree.innerHTML = `<p class="inventory-stats-empty">Rete non disponibile. Applica SQL v68 su Supabase.</p>`;
  }
}

function renderNetworkTree(){
  if(!networkTree) return;
  if(!networkRows.length){
    networkTree.innerHTML = `<p class="inventory-stats-empty">Nessun agente in rete. Crea agenti radice dalla tab Agenti.</p>`;
    return;
  }
  networkTree.innerHTML = networkRows.map(row=>{
    const indent = Math.min(row.depth || 0, 8) * 18;
    const bonus = Number(row.commission_bonus_percent || 0);
    const l1 = Number(row.commission_percent || 0) + bonus;
    return `
      <article class="network-node" style="margin-left:${indent}px">
        <div class="network-node-head">
          <strong>${esc(row.contact_name || row.email)}</strong>
          <span class="status-pill ${esc(row.status)}">${esc(AGENT_TYPE_LABELS[row.agent_type] || row.agent_type || "agent")}</span>
        </div>
        <div class="network-node-meta muted-cell">
          ${esc(row.referral_code)} · tier ${esc(row.tier_key || "standard")} · L1 ${fmt(l1)}%
          ${bonus ? ` (+${fmt(bonus)}% bonus)` : ""}
          · ${fmt(row.downline_count || 0)} downline
        </div>
        <div class="network-node-actions">
          <button class="small-action" type="button" data-agent-edit="${esc(row.agent_id)}">Modifica</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadTierRules(){
  if(!tierRulesTable) return;
  try{
    const { data,error } = await supabase
      .from("platform_commission_tier_rules")
      .select("id,tier_key,product_area,event_type,level_1_percent,level_2_percent,level_3_percent,active,notes")
      .order("tier_key",{ascending:true})
      .order("event_type",{ascending:true});
    if(error) throw error;
    tierRuleRows = data || [];
    tierRulesTable.innerHTML = tierRuleRows.length ? tierRuleRows.map(row=>`
      <tr>
        <td><strong>${esc(row.tier_key)}</strong></td>
        <td>${esc(row.product_area)}</td>
        <td>${esc(row.event_type)}</td>
        <td>${fmt(row.level_1_percent)}%</td>
        <td>${fmt(row.level_2_percent)}%</td>
        <td>${fmt(row.level_3_percent)}%</td>
        <td><span class="status-pill ${row.active ? "" : "disabled"}">${row.active ? "attiva" : "disattiva"}</span></td>
      </tr>
    `).join("") : `<tr><td colspan="7">Nessuna regola tier. Applica SQL v68.</td></tr>`;
  }catch(error){
    console.error(error);
    tierRulesTable.innerHTML = `<tr><td colspan="7">Regole tier non disponibili. Applica SQL v68.</td></tr>`;
  }
}

async function loadPriceLists(){
  if(!priceListsTable) return;
  try{
    const { data,error } = await supabase
      .from("platform_reseller_price_lists")
      .select("id,list_key,name,product_area,currency,active,notes")
      .order("name",{ascending:true});
    if(error) throw error;
    priceListRows = data || [];
    renderAgentHierarchySelects(agentForm?.elements?.parent_agent_id?.value || "");
    const { data:items,error:itemsError } = await supabase
      .from("platform_reseller_price_list_items")
      .select("id,price_list_id,sku,product_name,unit_price,min_qty,platform_reseller_price_lists(name,list_key)")
      .order("sku",{ascending:true});
    if(itemsError) throw itemsError;
    priceListItemRows = items || [];
    refreshPriceListsTable();
    refreshPriceListItemsTable();
  }catch(error){
    console.error(error);
    priceListsTable.innerHTML = `<tr><td colspan="5">Listini non disponibili. Applica SQL v68.</td></tr>`;
    if(priceListItemsTable) priceListItemsTable.innerHTML = `<tr><td colspan="5">Listini non disponibili.</td></tr>`;
  }
}

function refreshPriceListsTable(){
  if(!priceListsTable) return;
  priceListsTable.innerHTML = priceListRows.length ? priceListRows.map(row=>{
    const count = priceListItemRows.filter(item=>item.price_list_id === row.id).length;
    return `
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.list_key)}</div></td>
        <td>${esc(row.product_area)}</td>
        <td>${esc(row.currency || "EUR")}</td>
        <td><span class="status-pill ${row.active ? "" : "disabled"}">${row.active ? "attivo" : "disattivo"}</span></td>
        <td>${fmt(count)} righe</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="5">Nessun listino creato.</td></tr>`;
}

function refreshPriceListItemsTable(){
  if(!priceListItemsTable) return;
  const selectedList = priceListItemSelect?.value || "";
  const rows = selectedList
    ? priceListItemRows.filter(item=>item.price_list_id === selectedList)
    : priceListItemRows;
  priceListItemsTable.innerHTML = rows.length ? rows.map(row=>`
    <tr>
      <td>${esc(row.platform_reseller_price_lists?.name || row.price_list_id)}</td>
      <td>${esc(row.sku)}</td>
      <td>${esc(row.product_name || "-")}</td>
      <td>${money(row.unit_price)}</td>
      <td>${fmt(row.min_qty || 1)}</td>
    </tr>
  `).join("") : `<tr><td colspan="5">${priceListRows.length ? "Nessuna riga per il listino selezionato." : "Crea un listino per iniziare."}</td></tr>`;
}

async function loadDeliveries(){
  if(!deliveriesTable) return;
  try{
    const filterAgent = deliveryFilterAgent?.value || null;
    const { data,error } = await supabase.rpc("get_agent_delivery_history",{
      p_agent_id:filterAgent || null,
      p_limit:100
    });
    if(error) throw error;
    deliveryRows = data || [];
    refreshDeliveriesTable();
  }catch(error){
    console.error(error);
    deliveriesTable.innerHTML = `<tr><td colspan="6">Storico consegne non disponibile. Applica SQL v68.</td></tr>`;
  }
}

function refreshDeliveriesTable(){
  if(!deliveriesTable) return;
  deliveriesTable.innerHTML = deliveryRows.length ? deliveryRows.map(row=>`
    <tr>
      <td>${dateShort(row.delivered_at)}</td>
      <td><strong>${esc(row.agent_name)}</strong></td>
      <td>${esc(row.product_label || row.sku || "-")}</td>
      <td>${fmt(row.quantity)}</td>
      <td>${esc(row.delivery_type)}</td>
      <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
    </tr>
  `).join("") : `<tr><td colspan="6">Nessuna consegna registrata.</td></tr>`;
}

function momentShopifyStorePill(row){
  if(!row.publish_shopify) return `<span class="muted-cell">Non su Shopify</span>`;
  const description = String(row.description || "").trim();
  const imageUrl = String(row.image_url || "").trim();
  const ready = description.length >= 20 && imageUrl;
  if(row.shopify_live && ready) return `<span class="status-pill active">Online</span>`;
  if(row.shopify_live && !ready) return `<span class="status-pill pending">In attesa contenuti</span>`;
  return `<span class="status-pill draft">Bozza Shopify</span>`;
}

async function loadMomentCatalog(){
  if(!momentCatalogTable) return;
  try{
    const { data,error } = await supabase
      .from("platform_moment_catalog")
      .select("id,sku,name,description,product_line,product_type,sale_price,unit_cost,physical_units,activation_codes,image_url,publish_shopify,shopify_live,sync_status,sync_error,last_synced_at,status,sort_order")
      .order("sort_order",{ascending:true})
      .order("name",{ascending:true});
    if(error) throw error;
    momentCatalogRows = data || [];
    populateMomentBatchCatalogSelect();
    momentCatalogTable.innerHTML = momentCatalogRows.length ? momentCatalogRows.map(row=>{
      const syncLabel = {
        draft:"Bozza",
        pending:"In coda",
        synced:"Sincronizzato",
        error:"Errore"
      }[row.sync_status] || row.sync_status;
      const syncClass = row.sync_status === "error" ? "low" : row.sync_status === "synced" ? "active" : row.sync_status;
      return `
        <tr>
          <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(productLineLabel(row.product_line))} · ${esc(momentTemplateLabel(row.product_type))}</div></td>
          <td>${esc(row.sku)}</td>
          <td><strong>${money(row.sale_price)}</strong><div class="muted-cell">Costo ${money(row.unit_cost)}</div></td>
          <td>${fmt(row.physical_units)}</td>
          <td>${fmt(row.activation_codes)}</td>
          <td>${momentShopifyStorePill(row)}</td>
          <td><span class="status-pill ${esc(syncClass)}">${esc(syncLabel)}</span>${row.sync_error ? `<div class="muted-cell">${esc(row.sync_error)}</div>` : ""}</td>
          <td>
            <button class="small-action" type="button" data-moment-catalog-edit="${esc(row.id)}">Modifica</button>
            <button class="small-action" type="button" data-moment-catalog-sync="${esc(row.id)}">Sync Shopify</button>
          </td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="8">Nessun prodotto in catalogo. Applica SQL v64 o crea il primo SKU.</td></tr>`;
  }catch(error){
    console.error(error);
    momentCatalogTable.innerHTML = `<tr><td colspan="8">Catalogo non disponibile. Applica sql/khamakey-moments-sales-channels-v64.sql su Supabase.</td></tr>`;
  }
}

function editMomentCatalog(id){
  const row = momentCatalogRows.find(item=>item.id === id);
  if(!row || !momentCatalogForm) return;
  editingMomentCatalogId = row.id;
  momentCatalogForm.elements.sku.value = row.sku || "";
  momentCatalogForm.elements.name.value = row.name || "";
  momentCatalogForm.elements.product_line.value = row.product_line || "portachiavi";
  momentCatalogForm.elements.product_type.innerHTML = renderCategorySelect(row.product_type || "free");
  momentCatalogForm.elements.product_type.value = normalizeMomentType(row.product_type || "free");
  momentCatalogForm.elements.sale_price.value = row.sale_price || 0;
  momentCatalogForm.elements.unit_cost.value = row.unit_cost || 0;
  momentCatalogForm.elements.physical_units.value = row.physical_units || 1;
  momentCatalogForm.elements.activation_codes.value = row.activation_codes || 1;
  momentCatalogForm.elements.publish_shopify.value = row.publish_shopify ? "true" : "false";
  momentCatalogForm.elements.shopify_live.value = row.shopify_live ? "true" : "false";
  momentCatalogForm.elements.status.value = row.status || "active";
  momentCatalogForm.elements.image_url.value = row.image_url || "";
  momentCatalogForm.elements.description.value = row.description || "";
  focusForm(momentCatalogForm,momentCatalogFormStatus,`Stai modificando ${row.name || row.sku}.`);
}

async function syncMomentCatalogToShopify(catalogId){
  if(!hasPermission("inventory.write")){
    setFormStatus(momentCatalogFormStatus,"Non hai il permesso inventory.write.","error");
    return { ok:false, error:"Permesso negato." };
  }
  const { data:sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if(!token){
    setFormStatus(momentCatalogFormStatus,"Sessione scaduta. Riaccedi.","error");
    return { ok:false, error:"Sessione scaduta." };
  }
  setFormStatus(momentCatalogFormStatus,"Sincronizzazione Shopify in corso...");
  try{
    const response = await fetch(`${WORKER_BASE_URL}/api/channels/shopify/sync`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify({ catalog_id:catalogId })
    });
    const result = await response.json().catch(()=>({}));
    if(!response.ok){
      throw new Error(result.error || `Sync fallita (${response.status})`);
    }
    setFormStatus(momentCatalogFormStatus,`Shopify aggiornato (${result.handle || result.shopify_product_id}).`,"ok");
    await loadMomentCatalog();
    return { ok:true, result };
  }catch(error){
    console.error(error);
    setFormStatus(momentCatalogFormStatus,error.message || "Errore sync Shopify.","error");
    await loadMomentCatalog();
    return { ok:false, error:error.message || "Errore sync." };
  }
}

async function syncAllMomentCatalogToShopify(){
  const targets = momentCatalogRows.filter(row=>row.status === "active");
  if(!targets.length){
    setFormStatus(momentCatalogFormStatus,"Nessun prodotto attivo da sincronizzare.","error");
    return;
  }
  setFormStatus(momentCatalogFormStatus,`Sync Shopify: 0/${targets.length}...`);
  let okCount = 0;
  for(const row of targets){
    const result = await syncMomentCatalogToShopify(row.id);
    if(result.ok) okCount += 1;
    setFormStatus(momentCatalogFormStatus,`Sync Shopify: ${okCount}/${targets.length} completati...`);
  }
  setFormStatus(momentCatalogFormStatus,`Sync completata: ${okCount}/${targets.length} prodotti su Shopify.`,"ok");
}

async function registerShopifyOrderWebhooks(){
  if(!hasPermission("inventory.write")){
    setFormStatus(momentCatalogFormStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const { data:sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if(!token){
    setFormStatus(momentCatalogFormStatus,"Sessione scaduta. Riaccedi.","error");
    return;
  }
  setFormStatus(momentCatalogFormStatus,"Registrazione webhook ordini Shopify...");
  try{
    const response = await fetch(`${WORKER_BASE_URL}/api/channels/shopify/register-webhooks`,{
      method:"POST",
      headers:{ Authorization:`Bearer ${token}` }
    });
    const result = await response.json().catch(()=>({}));
    if(!response.ok){
      throw new Error(result.error || result.manual || `Errore ${response.status}`);
    }
    const created = (result.created || []).length;
    const skipped = (result.skipped || []).length;
    setFormStatus(momentCatalogFormStatus,`Webhook ordini OK (${created} creati, ${skipped} già presenti).`,"ok");
  }catch(error){
    console.error(error);
    setFormStatus(momentCatalogFormStatus,`${error.message}. In alternativa: Shopify → Impostazioni → Notifiche → Webhook.`,"error");
  }
}

async function saveMomentCatalog(event){
  event.preventDefault();
  if(!hasPermission("inventory.write")){
    setFormStatus(momentCatalogFormStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const form = event.currentTarget;
  const description = String(form.elements.description.value || "").trim();
  const imageUrl = String(form.elements.image_url.value || "").trim();
  const publishShopify = form.elements.publish_shopify.value === "true";
  const shopifyLive = form.elements.shopify_live.value === "true";
  if(shopifyLive && (description.length < 20 || !imageUrl)){
    setFormStatus(momentCatalogFormStatus,"Per pubblicare online servono immagine e descrizione (min. 20 caratteri).","error");
    return;
  }
  const payload = {
    sku:String(form.elements.sku.value || "").trim().toUpperCase(),
    name:String(form.elements.name.value || "").trim(),
    description:description || null,
    product_line:form.elements.product_line.value,
    product_type:normalizeMomentType(form.elements.product_type.value),
    sale_price:Number(form.elements.sale_price.value || 0),
    unit_cost:Number(form.elements.unit_cost.value || 0),
    physical_units:Math.max(1,Number(form.elements.physical_units.value || 1)),
    activation_codes:Math.max(1,Number(form.elements.activation_codes.value || 1)),
    image_url:imageUrl || null,
    publish_shopify:publishShopify,
    shopify_live:shopifyLive,
    status:form.elements.status.value,
    sync_status:publishShopify ? "pending" : "draft",
    updated_at:new Date().toISOString()
  };
  setFormStatus(momentCatalogFormStatus,"Salvataggio catalogo...");
  let catalogId = editingMomentCatalogId;
  if(catalogId){
    const { error } = await supabase.from("platform_moment_catalog").update(payload).eq("id",catalogId);
    if(error){
      setFormStatus(momentCatalogFormStatus,error.message || "Errore salvataggio.","error");
      return;
    }
  }else{
    const { data,error } = await supabase.from("platform_moment_catalog").insert(payload).select("id").single();
    if(error){
      setFormStatus(momentCatalogFormStatus,error.message || "Errore salvataggio.","error");
      return;
    }
    catalogId = data?.id;
  }
  editingMomentCatalogId = null;
  form.reset();
  form.elements.sale_price.value = "0";
  form.elements.unit_cost.value = "0";
  form.elements.physical_units.value = "1";
  form.elements.activation_codes.value = "1";
  form.elements.publish_shopify.value = "false";
  form.elements.shopify_live.value = "false";
  form.elements.status.value = "active";
  populateMomentTypeSelects();
  setFormStatus(momentCatalogFormStatus,"Prodotto catalogo salvato.","ok");
  await loadMomentCatalog();
  if((payload.publish_shopify || payload.shopify_live) && catalogId){
    await syncMomentCatalogToShopify(catalogId);
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
      .limit(200);
    if(error) throw error;
    platformOrderRows = data || [];
    refreshOrdersTable();
    if(momentProductRows.length) refreshMomentTable();
  }catch(error){
    console.error(error);
    platformOrdersTable.innerHTML = `<tr><td colspan="8">Ordini non disponibili. Verifica permessi orders.read.</td></tr>`;
  }
}

function refreshOrdersTable(){
  const search = String(orderSearchInput?.value || "").trim().toLowerCase();
  const status = orderFilterStatus?.value || "";
  const type = orderFilterType?.value || "";
  const rows = platformOrderRows.filter(row=>{
    if(status && row.status !== status) return false;
    if(type && row.order_type !== type) return false;
    return haystackIncludes(row, search, [
      "order_code","order_type","customer_name","customer_email","customer_phone","status",
      row=>row.businesses?.nome,
      row=>row.businesses?.slug,
      row=>row.platform_agents?.contact_name,
      row=>row.platform_agents?.email
    ]);
  });
  if(orderTableCount) orderTableCount.textContent = `${fmt(rows.length)} ordini`;
  platformOrdersTable.innerHTML = rows.length ? rows.map(row=>`
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
  `).join("") : `<tr><td colspan="8">${platformOrderRows.length ? "Nessun ordine corrisponde ai filtri." : "Nessun ordine interno registrato."}</td></tr>`;
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
        <td><button class="small-action" type="button" data-plan-edit="${esc(row.id)}">Modifica</button>${row.stripe_price_monthly_id ? `<button class="small-action" type="button" data-plan-stripe="${esc(row.id)}" data-cycle="monthly">Stripe mese</button>` : ""}${row.stripe_price_yearly_id ? `<button class="small-action" type="button" data-plan-stripe="${esc(row.id)}" data-cycle="yearly">Stripe anno</button>` : ""}</td>
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

async function createStripeCheckoutForPlan(planId, billingCycle){
  const row = planRows.find(item=>item.id === planId);
  if(!row){
    setFormStatus(planFormStatus,"Piano non trovato.","error");
    return;
  }
  const priceId = billingCycle === "yearly" ? row.stripe_price_yearly_id : row.stripe_price_monthly_id;
  if(!priceId){
    setFormStatus(planFormStatus,`Configura stripe_price_${billingCycle === "yearly" ? "yearly" : "monthly"}_id nel piano.`,"error");
    return;
  }
  const customerEmail = window.prompt("Email cliente (opzionale — lascia vuoto per usare la tua email admin):","") || "";
  const { data:sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if(!token){
    setFormStatus(planFormStatus,"Sessione scaduta. Riaccedi.","error");
    return;
  }
  setFormStatus(planFormStatus,`Creazione checkout Stripe (${billingCycle})...`);
  try{
    const response = await fetch(`${WORKER_BASE_URL}/api/billing/stripe/checkout-session`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify({
        plan_key:row.plan_key,
        billing_cycle:billingCycle,
        customer_email:customerEmail || undefined
      })
    });
    const result = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error || `Errore ${response.status}`);
    if(result.checkout_url){
      window.open(result.checkout_url,"_blank","noopener");
      setFormStatus(planFormStatus,`Checkout Stripe aperto per ${row.name} (${billingCycle}).`,"ok");
    }else{
      setFormStatus(planFormStatus,"Checkout creato ma URL mancante.","error");
    }
  }catch(error){
    console.error(error);
    setFormStatus(planFormStatus,error.message || "Errore Stripe Checkout.","error");
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

async function loadIntegrationHealth(){
  if(!integrationHealthGrid) return;
  integrationHealthGrid.innerHTML = `<p class="field-hint">Lettura stato Worker...</p>`;
  try{
    const { data:sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const response = await fetch(`${WORKER_BASE_URL}/api/integrations/status`,{
      headers:token ? { Authorization:`Bearer ${token}` } : {}
    });
    const health = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(health.error || `Errore ${response.status}`);
    const items = Object.entries(health.integrations || {});
    integrationHealthGrid.innerHTML = items.length ? items.map(([key,item])=>`
      <div class="integration-health-card">
        <strong>${esc(key.charAt(0).toUpperCase()+key.slice(1))}</strong>
        <span class="status-pill ${item.configured ? "active" : "draft"}">${item.configured ? "Configurato" : "Da configurare"}</span>
        <div class="muted-cell">Worker ${esc(health.version || "-")}</div>
      </div>
    `).join("") : `<p class="field-hint">Nessuna integrazione rilevata.</p>`;
    if(health.locales?.length){
      integrationHealthGrid.insertAdjacentHTML("beforeend",`
        <div class="integration-health-card">
          <strong>Lingue</strong>
          <span class="status-pill active">${esc(health.locales.join(", ").toUpperCase())}</span>
          <div class="muted-cell">i18n predisposto</div>
        </div>
      `);
    }
  }catch(error){
    console.error(error);
    integrationHealthGrid.innerHTML = `<p class="field-hint">Stato Worker non disponibile. Verifica login admin e deploy Worker.</p>`;
  }
}

async function loadSupportedLocales(){
  if(!supportedLocalesTable) return;
  try{
    const { data,error } = await supabase
      .from("platform_supported_locales")
      .select("locale,label,active,sort_order")
      .order("sort_order",{ascending:true});
    if(error) throw error;
    const rows = data || [];
    supportedLocalesTable.innerHTML = rows.length ? rows.map(row=>`
      <tr>
        <td><strong>${esc(String(row.locale || "").toUpperCase())}</strong></td>
        <td>${esc(row.label)}</td>
        <td>${row.active ? "Sì" : "No"}</td>
        <td>${fmt(row.sort_order)}</td>
      </tr>
    `).join("") : `<tr><td colspan="4">Applica sql/khamakey-integrations-i18n-v66.sql su Supabase.</td></tr>`;
  }catch(error){
    console.error(error);
    supportedLocalesTable.innerHTML = `<tr><td colspan="4">Lingue non disponibili (SQL v66).</td></tr>`;
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
  document.getElementById("codeEditPublicUrl").value = momentActivationUrl(row);
  document.getElementById("codeEditNfcUrl").value = momentNfcUrl(row);
  document.getElementById("codeEditActivationUrl").value = momentActivationUrl(row);
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

function resetAgentForm(){
  if(!agentForm) return;
  agentForm.reset();
  if(agentForm.elements.agent_id) agentForm.elements.agent_id.value = "";
  if(agentForm.elements.commission_percent) agentForm.elements.commission_percent.value = "10";
  if(agentForm.elements.commission_bonus_percent) agentForm.elements.commission_bonus_percent.value = "0";
  renderAgentHierarchySelects("");
  setFormStatus(agentFormStatus,"");
}

function editAgent(id){
  const row = agentRows.find(item=>item.id === id);
  if(!row) return;
  const form = document.getElementById("agentForm");
  if(form.elements.agent_id) form.elements.agent_id.value = row.id || "";
  form.elements.contact_name.value = row.contact_name || "";
  form.elements.email.value = row.email || "";
  form.elements.business_name.value = row.business_name || "";
  form.elements.phone.value = row.phone || "";
  form.elements.referral_code.value = row.referral_code || "";
  form.elements.commission_percent.value = row.commission_percent ?? 10;
  if(form.elements.commission_bonus_percent) form.elements.commission_bonus_percent.value = row.commission_bonus_percent ?? 0;
  if(form.elements.agent_type) form.elements.agent_type.value = row.agent_type || "agent";
  if(form.elements.tier_key) form.elements.tier_key.value = row.tier_key || "standard";
  if(form.elements.territory) form.elements.territory.value = row.territory || "";
  form.elements.model.value = row.model || "referral";
  renderAgentHierarchySelects(row.parent_agent_id || "");
  if(form.elements.parent_agent_id) form.elements.parent_agent_id.value = row.parent_agent_id || "";
  if(form.elements.price_list_id) form.elements.price_list_id.value = row.price_list_id || "";
  focusForm(form,agentFormStatus,"Agente caricato nel form. Modifica e salva.");
}

function openAgentNetwork(id){
  if(networkRootSelect){
    networkRootSelect.value = id || "";
  }
  switchTab("resellerNetwork");
  loadNetworkTree();
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
  const agentId = String(form.elements.agent_id?.value || "").trim();
  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const businessName = String(form.elements.business_name.value || "").trim();
  const contactName = String(form.elements.contact_name.value || "").trim();
  const referralCode = String(form.elements.referral_code.value || "").trim().toUpperCase() || referralFrom(email,businessName || contactName);
  const parentAgentId = String(form.elements.parent_agent_id?.value || "").trim() || null;
  if(agentId && parentAgentId && (agentId === parentAgentId || isAgentDescendant(parentAgentId, agentId))){
    setFormStatus(agentFormStatus,"L'upline non può essere lo stesso agente o un suo downline.","error");
    return;
  }
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
    commission_bonus_percent:Number(form.elements.commission_bonus_percent?.value || 0),
    agent_type:form.elements.agent_type?.value || "agent",
    parent_agent_id:parentAgentId,
    tier_key:form.elements.tier_key?.value || "standard",
    price_list_id:String(form.elements.price_list_id?.value || "").trim() || null,
    territory:String(form.elements.territory?.value || "").trim() || null,
    model:form.elements.model.value,
    status:"active"
  };
  if(agentId) payload.id = agentId;
  const { error } = await supabase
    .from("platform_agents")
    .upsert(payload, agentId ? {onConflict:"id"} : {onConflict:"referral_code"});
  if(error){
    console.error(error);
    setFormStatus(agentFormStatus,error.message || "Errore salvataggio agente.","error");
    return;
  }
  resetAgentForm();
  setFormStatus(agentFormStatus,"Agente salvato.","ok");
  await Promise.all([loadAgents(),loadMembers(),loadDashboard(),loadNetworkTree(),loadPriceLists()]);
}

function agentDownlineCount(agentId){
  return agentRows.filter(row=>row.parent_agent_id === agentId).length;
}

async function saveTierRule(event){
  event.preventDefault();
  if(!hasPermission("commissions.write")){
    setFormStatus(tierRuleFormStatus,"Non hai il permesso commissions.write.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    tier_key:form.elements.tier_key.value,
    product_area:form.elements.product_area.value,
    event_type:form.elements.event_type.value,
    level_1_percent:Number(form.elements.level_1_percent.value || 0),
    level_2_percent:Number(form.elements.level_2_percent.value || 0),
    level_3_percent:Number(form.elements.level_3_percent.value || 0),
    notes:String(form.elements.notes.value || "").trim() || null,
    active:true
  };
  setFormStatus(tierRuleFormStatus,"Salvataggio regola tier...");
  const { error } = await supabase
    .from("platform_commission_tier_rules")
    .upsert(payload,{onConflict:"tier_key,product_area,event_type"});
  if(error){
    console.error(error);
    setFormStatus(tierRuleFormStatus,error.message || "Errore salvataggio regola tier.","error");
    return;
  }
  form.elements.notes.value = "";
  setFormStatus(tierRuleFormStatus,"Regola tier salvata.","ok");
  await loadTierRules();
}

async function savePriceList(event){
  event.preventDefault();
  if(!hasPermission("agents.write")){
    setFormStatus(priceListFormStatus,"Non hai il permesso agents.write.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    list_key:String(form.elements.list_key.value || "").trim().toLowerCase(),
    name:String(form.elements.name.value || "").trim(),
    product_area:form.elements.product_area.value,
    currency:String(form.elements.currency.value || "EUR").trim().toUpperCase(),
    active:true
  };
  setFormStatus(priceListFormStatus,"Salvataggio listino...");
  const { error } = await supabase
    .from("platform_reseller_price_lists")
    .upsert(payload,{onConflict:"list_key"});
  if(error){
    console.error(error);
    setFormStatus(priceListFormStatus,error.message || "Errore salvataggio listino.","error");
    return;
  }
  form.reset();
  if(form.elements.currency) form.elements.currency.value = "EUR";
  setFormStatus(priceListFormStatus,"Listino salvato.","ok");
  await Promise.all([loadPriceLists(),loadAgents()]);
}

async function savePriceListItem(event){
  event.preventDefault();
  if(!hasPermission("agents.write")){
    setFormStatus(priceListItemFormStatus,"Non hai il permesso agents.write.","error");
    return;
  }
  const form = event.currentTarget;
  const payload = {
    price_list_id:form.elements.price_list_id.value,
    sku:String(form.elements.sku.value || "").trim().toUpperCase(),
    product_name:String(form.elements.product_name.value || "").trim() || null,
    unit_price:Number(form.elements.unit_price.value || 0),
    min_qty:Math.max(1,Number(form.elements.min_qty.value || 1))
  };
  if(!payload.price_list_id) return setFormStatus(priceListItemFormStatus,"Seleziona un listino.","error");
  setFormStatus(priceListItemFormStatus,"Salvataggio riga listino...");
  const { error } = await supabase
    .from("platform_reseller_price_list_items")
    .upsert(payload,{onConflict:"price_list_id,sku"});
  if(error){
    console.error(error);
    setFormStatus(priceListItemFormStatus,error.message || "Errore salvataggio riga.","error");
    return;
  }
  form.elements.sku.value = "";
  form.elements.product_name.value = "";
  form.elements.unit_price.value = "0";
  form.elements.min_qty.value = "1";
  setFormStatus(priceListItemFormStatus,"Riga listino salvata.","ok");
  await loadPriceLists();
}

async function saveDelivery(event){
  event.preventDefault();
  if(!hasPermission("agents.write") && !hasPermission("shipping.write")){
    setFormStatus(deliveryFormStatus,"Permesso agents.write o shipping.write richiesto.","error");
    return;
  }
  const form = event.currentTarget;
  const agentId = form.elements.agent_id.value;
  if(!agentId) return setFormStatus(deliveryFormStatus,"Seleziona un agente.","error");
  setFormStatus(deliveryFormStatus,"Registrazione consegna...");
  const { error } = await supabase.rpc("record_agent_delivery",{
    p_agent_id:agentId,
    p_delivery_type:form.elements.delivery_type.value,
    p_sku:String(form.elements.sku.value || "").trim() || null,
    p_product_label:String(form.elements.product_label.value || "").trim() || null,
    p_quantity:Number(form.elements.quantity.value || 1),
    p_unit_price:form.elements.unit_price.value ? Number(form.elements.unit_price.value) : null,
    p_tracking_code:String(form.elements.tracking_code.value || "").trim() || null,
    p_notes:String(form.elements.notes.value || "").trim() || null
  });
  if(error){
    console.error(error);
    setFormStatus(deliveryFormStatus,error.message || "Errore registrazione consegna.","error");
    return;
  }
  form.reset();
  if(form.elements.quantity) form.elements.quantity.value = "1";
  setFormStatus(deliveryFormStatus,"Consegna registrata.","ok");
  await loadDeliveries();
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
  const catalog = momentCatalogRows.find(item=>item.id === form.elements.catalog_id?.value);
  const quantity = Math.min(500,Math.max(1,Number(form.elements.quantity.value || 1)));
  const prefixSource = catalog?.sku || form.elements.prefix.value || "MOMENT";
  const prefix = String(prefixSource).trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12) || "MOMENT";
  const productLine = String(catalog?.product_line || form.elements.product_line.value || "").trim();
  const productType = normalizeMomentType(catalog?.product_type || form.elements.product_type.value);
  const batchLabel = String(form.elements.batch_label.value || "").trim();
  if(!productLine || !batchLabel){
    setFormStatus(momentBatchStatus,"Seleziona la linea oggetto e inserisci un nome lotto.","error");
    return;
  }
  setFormStatus(momentBatchStatus,`Generazione ${quantity} ${productLineLabel(productLine)} (${batchLabel})...`);
  const { data,error } = await supabase.rpc("create_moment_product_batch",{
    p_quantity:quantity,
    p_prefix:prefix,
    p_product_type:productType,
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
      product_type:row.product_type || productType,
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
    loadCrm(),
    loadMoments(),
    loadMomentCustomers(),
    loadMomentProducts(),
    loadMomentInventoryStats(),
    loadMomentAgentInventoryStats(),
    loadMembers(),
    loadAgents(),
    loadCommissions(),
    loadCommissionRules(),
    loadTierRules(),
    loadPriceLists(),
    loadNetworkTree(),
    loadDeliveries(),
    loadMomentCatalog(),
    loadProducts(),
    loadStockMovements(),
    loadPlatformOrders(),
    loadPlans(),
    loadMaterials(),
    loadTicketCategories(),
    loadSupportTickets(),
    loadIntegrations(),
    loadIntegrationHealth(),
    loadSupportedLocales(),
    loadPaymentTransactions(),
    loadWebhookEvents()
  ]);
  renderAgentHierarchySelects("");
  const hashTab = String(location.hash || "").replace(/^#/, "").trim();
  if(hashTab && document.querySelector(`[data-panel="${hashTab}"]`)){
    switchTab(hashTab);
  }else{
    renderPanelGuide("dashboard", guideElements);
  }
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

simpleModeToggle?.addEventListener("click",()=>{
  setSimpleMode(!isSimpleMode());
  const activeTab = document.querySelector("[data-admin-tab].active")?.dataset.adminTab || "dashboard";
  if(isSimpleMode() && isAdvancedTab(activeTab)){
    switchTab(SIMPLE_TAB_REDIRECT[activeTab] || "dashboard");
  }
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

// CRM wiring (v84)
if(crmRecordForm) crmRecordForm.addEventListener("submit",saveCrmRecord);
if(crmNoteForm) crmNoteForm.addEventListener("submit",addCrmNote);
if(crmSearchInput) crmSearchInput.addEventListener("input",refreshCrmTable);
if(crmSearchClear) crmSearchClear.addEventListener("click",()=>{ crmSearchInput.value = ""; refreshCrmTable(); });
if(crmRefreshBtn) crmRefreshBtn.addEventListener("click",loadCrm);
if(crmFilterStatus) crmFilterStatus.addEventListener("change",refreshCrmTable);
if(crmFilterPriority) crmFilterPriority.addEventListener("change",refreshCrmTable);
if(crmTable) crmTable.addEventListener("click",event=>{
  const openBtn = event.target.closest("[data-crm-open]");
  if(openBtn) openCrmClient(openBtn.dataset.crmOpen);
});
if(crmNotesList) crmNotesList.addEventListener("click",event=>{
  const delBtn = event.target.closest("[data-crm-note-del]");
  if(delBtn) deleteCrmNote(delBtn.dataset.crmNoteDel);
});

// Gestione provvigioni wiring (v85 complemento)
if(commissionSearchInput) commissionSearchInput.addEventListener("input",refreshCommissionsTable);
if(commissionSearchClear) commissionSearchClear.addEventListener("click",()=>{ commissionSearchInput.value=""; refreshCommissionsTable(); });
if(commissionRefreshBtn) commissionRefreshBtn.addEventListener("click",loadCommissions);
if(commissionFilterStatus) commissionFilterStatus.addEventListener("change",refreshCommissionsTable);
if(commissionsTable) commissionsTable.addEventListener("click",event=>{
  const btn = event.target.closest("[data-commission-set]");
  if(btn) setCommissionStatus(btn.dataset.commissionSet, btn.dataset.commissionStatus);
});

platformOrdersTable.addEventListener("click",event=>{
  const saveBtn = event.target.closest("[data-order-save]");
  if(saveBtn) return updatePlatformOrder(saveBtn.dataset.orderSave);
  const openBtn = event.target.closest("[data-order-open]");
  if(openBtn) openOrderDrawer(openBtn.dataset.orderOpen);
});

plansTable.addEventListener("click",event=>{
  const stripeBtn = event.target.closest("[data-plan-stripe]");
  if(stripeBtn){
    createStripeCheckoutForPlan(stripeBtn.dataset.planStripe, stripeBtn.dataset.cycle || "monthly");
    return;
  }
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

document.getElementById("momentCatalogSyncAll")?.addEventListener("click",syncAllMomentCatalogToShopify);
document.getElementById("momentCatalogRegisterWebhooks")?.addEventListener("click",registerShopifyOrderWebhooks);

momentCatalogTable?.addEventListener("click",event=>{
  const editBtn = event.target.closest("[data-moment-catalog-edit]");
  if(editBtn){
    editMomentCatalog(editBtn.dataset.momentCatalogEdit);
    switchTab("momentCatalog");
    return;
  }
  const syncBtn = event.target.closest("[data-moment-catalog-sync]");
  if(syncBtn){
    syncMomentCatalogToShopify(syncBtn.dataset.momentCatalogSync);
  }
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
    if(form.id === "momentCatalogForm"){
      editingMomentCatalogId = null;
      if(form.elements.physical_units) form.elements.physical_units.value = "1";
      if(form.elements.activation_codes) form.elements.activation_codes.value = "1";
      if(form.elements.publish_shopify) form.elements.publish_shopify.value = "false";
      if(form.elements.shopify_live) form.elements.shopify_live.value = "false";
      populateMomentTypeSelects();
    }
    if(form.id === "momentBatchForm"){
      populateMomentTypeSelects();
      populateMomentBatchCatalogSelect();
    }
    if(statusNode) setFormStatus(statusNode,"Nuovo inserimento pronto.","ok");
  });
});

momentBatchCatalog?.addEventListener("change",applyMomentBatchCatalog);

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

panelGuideToggle?.addEventListener("click",()=>togglePanelGuide());
panelGuideToggleTop?.addEventListener("click",()=>togglePanelGuide());

document.getElementById("orderQuickFilters")?.addEventListener("click",event=>{
  const chip = event.target.closest("[data-order-quick]");
  if(!chip || !orderFilterStatus || !orderFilterType) return;
  orderFilterStatus.value = chip.dataset.orderQuickStatus || "";
  orderFilterType.value = chip.dataset.orderQuickType || "";
  chip.closest(".filter-chip-bar")?.querySelectorAll(".filter-chip").forEach(node=>{
    node.classList.toggle("active", node === chip);
  });
  refreshOrdersTable();
});

document.getElementById("momentInventoryQuickFilters")?.addEventListener("click",event=>{
  const chip = event.target.closest("[data-moment-quick]");
  if(!chip) return;
  if(momentFilterStatus) momentFilterStatus.value = chip.dataset.momentQuickStatus || "";
  if(momentFilterOrder && chip.dataset.momentQuickOrder !== undefined){
    momentFilterOrder.value = chip.dataset.momentQuickOrder || "";
  }
  chip.closest(".filter-chip-bar")?.querySelectorAll(".filter-chip").forEach(node=>{
    node.classList.toggle("active", node === chip);
  });
  refreshMomentTable();
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
  if(node) node.addEventListener("change",()=>{
    syncMomentQuickChips();
    refreshMomentTable();
  });
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
  const editButton = event.target.closest("[data-agent-edit]");
  if(editButton){
    editAgent(editButton.dataset.agentEdit);
    switchTab("agents");
    return;
  }
  const networkButton = event.target.closest("[data-agent-network]");
  if(networkButton) openAgentNetwork(networkButton.dataset.agentNetwork);
});

networkTree?.addEventListener("click",event=>{
  const editButton = event.target.closest("[data-agent-edit]");
  if(editButton){
    editAgent(editButton.dataset.agentEdit);
    switchTab("agents");
  }
});

networkRefreshBtn?.addEventListener("click",loadNetworkTree);
networkRootSelect?.addEventListener("change",loadNetworkTree);
deliveryFilterAgent?.addEventListener("change",loadDeliveries);
priceListItemSelect?.addEventListener("change",refreshPriceListItemsTable);
agentFormReset?.addEventListener("click",resetAgentForm);
if(tierRuleForm) tierRuleForm.addEventListener("submit",saveTierRule);
if(priceListForm) priceListForm.addEventListener("submit",savePriceList);
if(priceListItemForm) priceListItemForm.addEventListener("submit",savePriceListItem);
if(deliveryForm) deliveryForm.addEventListener("submit",saveDelivery);

platformOrderForm?.elements?.order_type?.addEventListener("change",syncNfcOrderFieldsVisibility);
syncNfcOrderFieldsVisibility();

memberForm.addEventListener("submit",saveMember);
agentForm.addEventListener("submit",saveAgent);
if(momentForm) momentForm.addEventListener("submit",saveMoment);
if(momentBatchForm) momentBatchForm.addEventListener("submit",createMomentBatch);
if(momentCatalogForm) momentCatalogForm.addEventListener("submit",saveMomentCatalog);
productForm.addEventListener("submit",saveProduct);
stockForm.addEventListener("submit",saveStockMovement);
platformOrderForm.addEventListener("submit",savePlatformOrder);
clientRecordForm.addEventListener("submit",saveClientRecord);
clientNoteForm.addEventListener("submit",saveClientNote);
ticketForm.addEventListener("submit",saveTicket);
planForm.addEventListener("submit",savePlan);
materialForm.addEventListener("submit",saveMaterial);
ticketCategoryForm.addEventListener("submit",saveTicketCategory);
if(refreshIntegrationHealthBtn) refreshIntegrationHealthBtn.addEventListener("click",loadIntegrationHealth);
integrationForm.addEventListener("submit",saveIntegration);

bindSearchInput(clientSearchInput, refreshClientsTable);
document.getElementById("clientSearchClear")?.addEventListener("click",()=>{
  if(clientSearchInput) clientSearchInput.value = "";
  refreshClientsTable();
});
clientFilterCategory?.addEventListener("change",refreshClientsTable);

bindSearchInput(momentCustomerSearchInput, refreshMomentCustomersTable);
document.getElementById("momentCustomerSearchClear")?.addEventListener("click",()=>{
  if(momentCustomerSearchInput) momentCustomerSearchInput.value = "";
  refreshMomentCustomersTable();
});

bindSearchInput(momentObjectSearchInput, refreshMomentsTable);
document.getElementById("momentObjectSearchClear")?.addEventListener("click",()=>{
  if(momentObjectSearchInput) momentObjectSearchInput.value = "";
  refreshMomentsTable();
});
momentFilterType?.addEventListener("change",refreshMomentsTable);
momentFilterPublished?.addEventListener("change",refreshMomentsTable);

bindSearchInput(agentSearchInput, refreshAgentsTable);
document.getElementById("agentSearchClear")?.addEventListener("click",()=>{
  if(agentSearchInput) agentSearchInput.value = "";
  refreshAgentsTable();
});
agentFilterStatus?.addEventListener("change",refreshAgentsTable);
agentFilterModel?.addEventListener("change",refreshAgentsTable);

bindSearchInput(orderSearchInput, refreshOrdersTable);
document.getElementById("orderSearchClear")?.addEventListener("click",()=>{
  if(orderSearchInput) orderSearchInput.value = "";
  refreshOrdersTable();
});
orderFilterStatus?.addEventListener("change",()=>{
  syncOrderQuickChips();
  refreshOrdersTable();
});
orderFilterType?.addEventListener("change",()=>{
  syncOrderQuickChips();
  refreshOrdersTable();
});

function syncOrderQuickChips(){
  const bar = document.getElementById("orderQuickFilters");
  if(!bar) return;
  const type = orderFilterType?.value || "";
  const status = orderFilterStatus?.value || "";
  bar.querySelectorAll(".filter-chip").forEach(chip=>{
    const match = (chip.dataset.orderQuickType || "") === type
      && (chip.dataset.orderQuickStatus || "") === status;
    chip.classList.toggle("active", match);
  });
}

function syncMomentQuickChips(){
  const bar = document.getElementById("momentInventoryQuickFilters");
  if(!bar) return;
  const status = momentFilterStatus?.value || "";
  const order = momentFilterOrder?.value || "";
  const extra = !!(momentFilterLine?.value || momentFilterBatch?.value || momentFilterChannel?.value || momentFilterAgent?.value);
  bar.querySelectorAll(".filter-chip").forEach(chip=>{
    const chipStatus = chip.dataset.momentQuickStatus || "";
    const chipOrder = chip.dataset.momentQuickOrder;
    let match = false;
    if(chipOrder === undefined && !chipStatus){
      match = !status && !order && !extra;
    }else if(chipOrder !== undefined){
      match = !extra && order === chipOrder && !status;
    }else{
      match = !extra && status === chipStatus && !order;
    }
    chip.classList.toggle("active", match);
  });
}

init().catch(error=>{
  console.error(error);
  setGate(error.message || "Errore apertura admin.","denied");
});
