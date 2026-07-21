import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL, authRedirectTo } from "./config.js";
import { exportMomentLabelsPdf } from "./admin-moment-labels.js?v=176";
import { renderPanelGuide, setGuideCollapsed, isGuideCollapsed } from "./admin-guide.js?v=176";
import {
  generateMomentSku,
  generateMomentProductName,
  wireMomentProductAutofill,
  normalizeMomentSku
} from "./moments-admin-helpers.js?v=163";
import {
  TYPE_LABELS,
  normalizeMomentType,
  renderCategorySelect
} from "./moment-categories.js";
import { formatMomentCodeDisplay, packagingBarcodeForRow } from "./moment-codes.js";

const IS_MOMENTS_CONSOLE = document.documentElement.dataset.adminProduct === "moments";
const ADMIN_HOME = IS_MOMENTS_CONSOLE ? "./moments-admin.html" : "./admin.html";

// Su app.khamakeymoments.com l'admin Business non va usato: porta alla Officina Moments.
// Path tipici Pages: /admin, /admin/, /admin.html
if(
  !IS_MOMENTS_CONSOLE
  && typeof location !== "undefined"
  && /(?:^|\.)khamakeymoments\.com$/i.test(location.hostname)
  && /\/admin(?:\.html)?\/?$/i.test(location.pathname)
){
  const hash = location.hash || "";
  const momentsHash = /^#(platformOrders|clients|crm|inventory|billing|plans|integrations|nfc|materials|team)$/i.test(hash)
    ? "#dashboard"
    : hash;
  location.replace(`./moments-admin.html${location.search}${momentsHash}`);
}

const SIMPLE_MODE_KEY = "khamakey_admin_simple_mode";

const TAB_PAGE_TITLES = {
  dashboard: "Oggi",
  platformOrders: "Ordini",
  momentNewProduct: IS_MOMENTS_CONSOLE ? "Nuovo pezzo" : "Nuovo prodotto",
  momentCatalog: IS_MOMENTS_CONSOLE ? "Modelli prodotto" : "Catalogo online",
  momentInventory: IS_MOMENTS_CONSOLE ? "Magazzino NFC" : "Magazzino NFC Moments",
  businessInventory: "Magazzino NFC Business",
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
const momentQuickCatalogForm = document.getElementById("momentQuickCatalogForm");
const momentQuickCatalogStatus = document.getElementById("momentQuickCatalogStatus");
const momentNewProductForm = document.getElementById("momentNewProductForm");
const momentNewProductStatus = document.getElementById("momentNewProductStatus");
const momentBatchForm = document.getElementById("momentBatchForm");
const momentBatchStatus = document.getElementById("momentBatchStatus");
const momentBatchCatalog = document.getElementById("momentBatchCatalog");
const momentInventoryStats = document.getElementById("momentInventoryStats");
const momentFilterLine = document.getElementById("momentFilterLine");
const momentFilterBatch = document.getElementById("momentFilterBatch");
const momentFilterStatus = document.getElementById("momentFilterStatus");
const momentFilterSku = document.getElementById("momentFilterSku");
const momentFilterDateFrom = document.getElementById("momentFilterDateFrom");
const momentFilterDateTo = document.getElementById("momentFilterDateTo");
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
const businessBatchForm = document.getElementById("businessBatchForm");
const businessBatchStatus = document.getElementById("businessBatchStatus");
const businessBatchSku = document.getElementById("businessBatchSku");
const businessBatchAgent = document.getElementById("businessBatchAgent");
const businessInventoryStats = document.getElementById("businessInventoryStats");
const businessSearchInput = document.getElementById("businessSearchInput");
const businessSearchClear = document.getElementById("businessSearchClear");
const businessFilterStatus = document.getElementById("businessFilterStatus");
const businessFilterBatch = document.getElementById("businessFilterBatch");
const businessFilterSku = document.getElementById("businessFilterSku");
const businessFilterLine = document.getElementById("businessFilterLine");
const businessTableCount = document.getElementById("businessTableCount");
const businessExportFiltered = document.getElementById("businessExportFiltered");
const businessProductsTable = document.getElementById("businessProductsTable");
const businessProvisionForm = document.getElementById("businessProvisionForm");
const businessProvisionStatus = document.getElementById("businessProvisionStatus");
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
const nfcShippingStats = document.getElementById("nfcShippingStats");
const nfcShippingTable = document.getElementById("nfcShippingTable");
const nfcShippingCount = document.getElementById("nfcShippingCount");
const nfcShippingSearch = document.getElementById("nfcShippingSearch");
const nfcShippingSearchClear = document.getElementById("nfcShippingSearchClear");
const nfcShippingQuickFilters = document.getElementById("nfcShippingQuickFilters");
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
const supportSearchInput = document.getElementById("supportSearchInput");
const supportStatusFilter = document.getElementById("supportStatusFilter");
const supportPriorityFilter = document.getElementById("supportPriorityFilter");
const supportFilterClear = document.getElementById("supportFilterClear");
const supportRefreshBtn = document.getElementById("supportRefreshBtn");
const supportVisibleCount = document.getElementById("supportVisibleCount");
const supportStatOpen = document.getElementById("supportStatOpen");
const supportStatUrgent = document.getElementById("supportStatUrgent");
const supportStatWaiting = document.getElementById("supportStatWaiting");
const supportStatResolved = document.getElementById("supportStatResolved");
const supportTicketEditForm = document.getElementById("supportTicketEditForm");
const supportTicketEditStatus = document.getElementById("supportTicketEditStatus");
const supportTicketEditCancel = document.getElementById("supportTicketEditCancel");
const supportSendReplyBtn = document.getElementById("supportSendReplyBtn");
const supportAssignMeBtn = document.getElementById("supportAssignMeBtn");
const supportAssigneeSelect = document.getElementById("supportAssigneeSelect");
let activeSupportTicketId = "";
let supportMemberRows = [];
let supportMineOnly = false;
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
let businessProductRows = [];
let businessInventoryRows = [];
let currentCodeKind = "moment";
let currentMoment = null;
let momentInventoryRows = [];
let momentAgentInventoryRows = [];
let selectedMomentCodes = new Set();
let currentCodeRow = null;
let currentPlatformOrder = null;
let momentProductsLoadSeq = 0;
let momentProductsLoaded = false;

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
let nfcShippingStageFilter = "";
let editingMomentCatalogId = null;
let currentClient = null;
let currentClientRecord = null;

const ORDER_STATUS_OPTIONS = ["draft","pending","paid","production","ready","shipped","completed","cancelled","refunded"];
const PAYMENT_STATUS_OPTIONS = ["unpaid","pending","paid","refunded","failed"];
const FULFILLMENT_ORDER_STATUSES = ["pending","paid","production","ready"];
const NFC_SHIPPING_STAGE_LABELS = {
  production:"Da produrre",
  print:"Da stampare",
  ship:"Da spedire",
  shipped:"Spedita",
  issue:"Problema"
};
const DASHBOARD_REVENUE_PAYMENT_STATUSES = ["paid"];

function setGate(message,type=""){
  gateText.textContent = message;
  gateText.className = type;
}

function showLoginGate(message="Accedi con un account admin KhamaKey."){
  shell?.classList.add("locked");
  document.documentElement.classList.add("admin-auth-locked");
  if(sidebar) sidebar.hidden = true;
  if(topbar) topbar.hidden = true;
  if(gate) gate.hidden = false;
  if(content) content.hidden = true;
  if(adminLoginForm) adminLoginForm.hidden = false;
  setGate(message);
}

function showAdmin(user,member){
  shell?.classList.remove("locked");
  document.documentElement.classList.remove("admin-auth-locked");
  if(sidebar) sidebar.hidden = false;
  if(topbar) topbar.hidden = false;
  if(gate) gate.hidden = true;
  if(adminLoginForm) adminLoginForm.hidden = true;
  if(content) content.hidden = false;
  populateMomentTypeSelects();
  applySimpleMode();
  const label = member?.role ? `${user.email} · ${member.role}` : user.email;
  adminEmail.textContent = label || "Admin";
}

function showDenied(email){
  shell?.classList.add("locked");
  document.documentElement.classList.add("admin-auth-locked");
  if(sidebar) sidebar.hidden = true;
  if(topbar) topbar.hidden = true;
  if(gate) gate.hidden = false;
  if(adminLoginForm) adminLoginForm.hidden = false;
  if(content) content.hidden = true;
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

function dashboardSetText(id,value){
  const node = document.getElementById(id);
  if(node) node.textContent = value;
}

function startOfLocalDay(date){
  return new Date(date.getFullYear(),date.getMonth(),date.getDate());
}

function addDays(date,days){
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKey(date){
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")
  ].join("-");
}

function shortDayLabel(date){
  return date.toLocaleDateString("it-IT",{weekday:"short"}).replace(".","");
}

function statusLabel(status){
  return {
    draft:"Bozza",
    pending:"Attesa",
    paid:"Pagato",
    production:"Produzione",
    ready:"Pronto",
    shipped:"Spedito",
    completed:"Completato",
    cancelled:"Annullato",
    refunded:"Rimborsato"
  }[status] || status || "-";
}

function isDashboardRevenueOrder(row){
  return DASHBOARD_REVENUE_PAYMENT_STATUSES.includes(row.payment_status) || ["paid","completed","shipped"].includes(row.status);
}

function renderBarChart(id,items,{ moneyValues = false } = {}){
  const node = document.getElementById(id);
  if(!node) return;
  if(!items.length){
    node.innerHTML = `<div class="dashboard-empty">Nessun dato disponibile</div>`;
    return;
  }
  const max = Math.max(...items.map(item=>Number(item.value || 0)),1);
  node.innerHTML = items.map(item=>{
    const value = Number(item.value || 0);
    const height = Math.max(value ? Math.round((value / max) * 100) : 0, value ? 8 : 4);
    const title = moneyValues ? money(value) : fmt(value);
    return `
      <div class="dashboard-bar" title="${esc(item.label)} · ${esc(title)}">
        <div class="dashboard-bar-fill" style="height:${height}%"></div>
        <small>${esc(item.shortLabel || item.label)}</small>
      </div>
    `;
  }).join("");
}

function renderStatusChart(rows){
  const node = document.getElementById("dashboardStatusChart");
  if(!node) return;
  const counts = ORDER_STATUS_OPTIONS
    .map(status=>({ status, count:rows.filter(row=>row.status === status).length }))
    .filter(item=>item.count > 0);
  if(!counts.length){
    node.innerHTML = `<div class="dashboard-empty">Nessun ordine registrato</div>`;
    return;
  }
  const max = Math.max(...counts.map(item=>item.count),1);
  node.innerHTML = counts.map(item=>`
    <div class="dashboard-status-row">
      <span>${esc(statusLabel(item.status))}</span>
      <div class="dashboard-status-track"><div class="dashboard-status-fill" style="width:${Math.max(6,Math.round((item.count / max) * 100))}%"></div></div>
      <strong>${fmt(item.count)}</strong>
    </div>
  `).join("");
}

function renderDashboardOrderInsights(rows){
  if(IS_MOMENTS_CONSOLE) return;
  const today = startOfLocalDay(new Date());
  const first7 = addDays(today,-6);
  const first30 = addDays(today,-29);
  const rows7 = rows.filter(row=>row.created_at && new Date(row.created_at) >= first7);
  const revenueRows30 = rows.filter(row=>row.created_at && new Date(row.created_at) >= first30 && isDashboardRevenueOrder(row));
  const fulfillmentRows = rows.filter(row=>FULFILLMENT_ORDER_STATUSES.includes(row.status));
  const revenue30 = revenueRows30.reduce((sum,row)=>sum + Number(row.total || 0),0);
  const avgOrder = rows.length ? rows.reduce((sum,row)=>sum + Number(row.total || 0),0) / rows.length : 0;
  dashboardSetText("dOrders7",fmt(rows7.length));
  dashboardSetText("dFulfillment",fmt(fulfillmentRows.length));
  dashboardSetText("mPendingOrdersDash",fmt(fulfillmentRows.length));
  dashboardSetText("dRevenue30",money(revenue30));
  dashboardSetText("dAvgOrder",money(avgOrder));

  const orderDays = Array.from({length:7},(_,index)=>{
    const date = addDays(first7,index);
    const key = dayKey(date);
    return {
      label:date.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"}),
      shortLabel:shortDayLabel(date),
      value:rows.filter(row=>row.created_at && dayKey(new Date(row.created_at)) === key).length
    };
  });
  const revenueWeeks = Array.from({length:4},(_,index)=>{
    const start = addDays(first30,index * 7);
    const end = index === 3 ? addDays(today,1) : addDays(start,7);
    return {
      label:`${start.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})} - ${addDays(end,-1).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})}`,
      shortLabel:`S${index + 1}`,
      value:revenueRows30
        .filter(row=>{
          const created = new Date(row.created_at);
          return created >= start && created < end;
        })
        .reduce((sum,row)=>sum + Number(row.total || 0),0)
    };
  });
  renderBarChart("dashboardOrdersChart",orderDays);
  renderBarChart("dashboardRevenueChart",revenueWeeks,{ moneyValues:true });
  renderStatusChart(rows);
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
  // Su moments-admin molti select Business/ordini non esistono: non crashare.
  if(orderAgentSelect) orderAgentSelect.innerHTML = options;
  if(clientAgentSelect) clientAgentSelect.innerHTML = options;
  if(codeEditAgent) codeEditAgent.innerHTML = options;
  if(orderAssignAgent) orderAssignAgent.innerHTML = `<option value="">Usa agente ordine</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}">${esc(row.contact_name || row.email)} · ${esc(row.referral_code)}</option>
  `).join("");
  if(momentBulkAgent) momentBulkAgent.innerHTML = `<option value="">Agente…</option>` + agentRows.map(row=>`
    <option value="${esc(row.id)}">${esc(row.contact_name || row.email)}</option>
  `).join("");
  if(businessBatchAgent) businessBatchAgent.innerHTML = options;
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
  if(!permissionGrid || !memberPermissionChecklist) return;
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

function setAdminNavOpen(open){
  const shell = document.getElementById("adminShell");
  const toggle = document.getElementById("adminMenuToggle");
  if(!shell) return;
  shell.classList.toggle("nav-open", Boolean(open));
  if(toggle){
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  }
}

function closeAdminNav(){
  setAdminNavOpen(false);
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
  if(tab === "nfc") refreshNfcShippingConsole();
  if(panelGuide && !panelGuide.hidden){
    panelGuide.classList.toggle("collapsed", isGuideCollapsed());
  }
  closeAdminNav();
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

function setMetric(id, value){
  const node = document.getElementById(id);
  if(node) node.textContent = value;
}

async function loadDashboard(){
  if(IS_MOMENTS_CONSOLE){
    const [moments,momentsAvailable,openTickets,catalogModels] = await Promise.all([
      safeCount("moment_events"),
      safeCount("moment_activation_codes",query=>query.eq("status","available")),
      countOpenSupportTickets(),
      safeCount("platform_moment_catalog",query=>query.eq("status","active"))
    ]);
    setMetric("mMoments", fmt(moments));
    const momentStockNode = document.getElementById("mMomentStock");
    if(momentStockNode) momentStockNode.textContent = fmt(momentsAvailable);
    setMetric("mOpenTickets", fmt(openTickets));
    setMetric("mCatalogModels", fmt(catalogModels));
    renderDashboardAlerts({
      momentsAvailable,
      businessAvailable:0,
      pendingOrders:0,
      openTickets,
      lowStockProducts:0,
      pendingCommissions:0
    });
    return;
  }

  const orderOverviewPromise = supabase
    .from("platform_orders")
    .select("id,created_at,total,status,payment_status")
    .order("created_at",{ascending:false})
    .limit(500);
  const [clients,published,nfc,events,agents,orders,pendingCommissions,moments,momentsAvailable,businessAvailable,pendingOrders,openTickets,orderOverview] = await Promise.all([
    safeCount("businesses"),
    safeCount("business_public_pages",query=>query.eq("published",true)),
    safeCount("nfc_tags"),
    safeCount("analytics_events"),
    safeCount("platform_agents",query=>query.eq("status","active")),
    safeCount("platform_orders"),
    safeCount("platform_commission_events",query=>query.eq("status","pending")),
    safeCount("moment_events"),
    safeCount("moment_activation_codes",query=>query.eq("status","available")),
    safeCount("business_activation_codes",query=>query.eq("status","available")),
    safeCount("platform_orders",query=>query.in("status",["pending","paid","production","ready"])),
    countOpenSupportTickets(),
    orderOverviewPromise
  ]);
  const orderOverviewRows = orderOverview?.error ? [] : (orderOverview?.data || []);
  if(orderOverview?.error) console.warn("Andamento ordini non disponibile",orderOverview.error);
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
  setMetric("mClients", fmt(clients));
  setMetric("mPublished", fmt(published));
  setMetric("mNfc", fmt(nfc));
  setMetric("mEvents", fmt(events));
  setMetric("mStock", fmt(stock));
  setMetric("mPlatformOrders", fmt(orders));
  setMetric("mAgents", fmt(agents));
  setMetric("mPendingCommissions", fmt(pendingCommissions));
  setMetric("mMoments", fmt(moments));
  const momentStockNode = document.getElementById("mMomentStock");
  if(momentStockNode) momentStockNode.textContent = fmt(momentsAvailable);
  setMetric("mOpenTickets", fmt(openTickets));
  const businessStockNode = document.getElementById("mBusinessStock");
  if(businessStockNode) businessStockNode.textContent = fmt(businessAvailable);
  renderDashboardOrderInsights(orderOverviewRows);
  renderDashboardAlerts({
    momentsAvailable,
    businessAvailable,
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
      .select("id,profile_id,nome,slug,categoria,pubblicato,created_at,profiles(email),nfc_tags(code,url,stato)")
      .order("created_at",{ascending:false})
      .limit(300);
    if(error) throw error;
    clientRows = data || [];
    const businessOptions = `<option value="">Nessun cliente collegato</option>` + clientRows.map(row=>`
      <option value="${esc(row.id)}">${esc(row.nome || row.slug || row.id)}</option>
    `).join("");
    if(orderBusinessSelect) orderBusinessSelect.innerHTML = businessOptions;
    if(momentBusinessSelect) momentBusinessSelect.innerHTML = businessOptions;
    populateClientCategoryFilter();
    if(!clientsTable) return;
    refreshClientsTable();
  }catch(error){
    console.error(error);
    if(!clientsTable) return;
    const hint = String(error?.message || "").includes("permission") || String(error?.code || "") === "42501"
      ? "Accesso negato dal database. Ricarica la pagina: se persiste, verifica SQL v63/v148."
      : (error?.message || "Errore caricamento clienti.");
    clientsTable.innerHTML = `<tr><td colspan="5">Clienti non disponibili: ${esc(hint)}</td></tr>`;
  }
}

function clientProfileEmail(row){
  const profile = row?.profiles;
  if(Array.isArray(profile)) return profile[0]?.email || "";
  return profile?.email || "";
}

function clientPrimaryNfc(row){
  const tags = row?.nfc_tags;
  if(Array.isArray(tags)) return tags.find(tag=>tag?.code) || tags[0] || null;
  return tags?.code ? tags : null;
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
    return haystackIncludes(row, search, ["nome","slug","categoria","id", r=>clientProfileEmail(r), r=>clientPrimaryNfc(r)?.code]);
  });
  if(clientTableCount) clientTableCount.textContent = `${fmt(rows.length)} clienti`;
  clientsTable.innerHTML = rows.length ? rows.map(row => {
    const nfc = clientPrimaryNfc(row);
    const email = clientProfileEmail(row);
    const pageUrl = publicUrlFor(row);
    return `<tr>
      <td><strong>${esc(row.nome || "Senza nome")}</strong><div class="muted-cell">${esc(row.categoria || "—")}</div></td>
      <td>${esc(email || "—")}</td>
      <td>${nfc?.code ? `<code>${esc(nfc.code)}</code>` : "—"}</td>
      <td>${row.slug ? `<span class="muted-cell">/p/${esc(row.slug)}</span>` : "—"}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-client-open="${esc(row.id)}" data-client-view="summary">Scheda</button>
          ${pageUrl ? `<button type="button" data-client-open="${esc(row.id)}" data-client-view="public">Pagina</button>` : ""}
          <button type="button" data-client-open="${esc(row.id)}" data-client-view="editor">Editor</button>
          <button type="button" data-client-open="${esc(row.id)}" data-client-view="analytics">Analytics</button>
        </div>
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="5">${clientRows.length ? "Nessun cliente corrisponde ai filtri." : "Nessun cliente trovato o permessi database non ancora configurati."}</td></tr>`;
}

// ---------------------------------------------------------------------------
// CRM — pipeline clienti (v84). Costruito su platform_client_records/notes via RPC.
// ---------------------------------------------------------------------------
let crmRows = [];
let crmCurrentBusinessId = "";
let crmQuickFilter = "all";
const crmTable = document.getElementById("crmTable");
const crmTableCount = document.getElementById("crmTableCount");
const crmSearchInput = document.getElementById("crmSearchInput");
const crmSearchClear = document.getElementById("crmSearchClear");
const crmRefreshBtn = document.getElementById("crmRefreshBtn");
const crmFilterStatus = document.getElementById("crmFilterStatus");
const crmFilterPriority = document.getElementById("crmFilterPriority");
const crmQuickFilters = document.getElementById("crmQuickFilters");
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

function isSameLocalDay(a,b){
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function crmQuickMatch(row,now){
  const quick = crmQuickFilter || "all";
  if(quick === "all") return true;
  const follow = row.next_follow_up_at ? new Date(row.next_follow_up_at) : null;
  if(quick === "overdue") return !!follow && follow.getTime() < startOfLocalDay(now).getTime();
  if(quick === "today") return !!follow && isSameLocalDay(follow,now);
  if(quick === "week") return !!follow && follow.getTime() <= addDays(startOfLocalDay(now),7).getTime();
  if(quick === "high") return crmPriorityKey(row.priority) === "alta";
  if(quick === "new") return ["nuovo","new","contattato"].includes(String(row.onboarding_status));
  return true;
}

function syncCrmQuickChips(){
  crmQuickFilters?.querySelectorAll("[data-crm-quick]").forEach(chip=>{
    chip.classList.toggle("active",(chip.dataset.crmQuick || "all") === (crmQuickFilter || "all"));
  });
}

function refreshCrmTable(){
  if(!crmTable) return;
  const search = String(crmSearchInput?.value || "").trim().toLowerCase();
  const status = crmFilterStatus?.value || "";
  const priority = crmFilterPriority?.value || "";
  const nowDate = new Date();
  const now = nowDate.getTime();
  const rows = crmRows.filter(r=>{
    if(!crmQuickMatch(r,nowDate)) return false;
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
  momentCustomersTable.innerHTML = rows.length ? rows.map(row=>{
    const email = String(row.email || "").trim();
    const openTickets = openTicketsForEmail(email).length;
    const objects = Number(row.object_count || 0);
    return `
    <tr class="moment-customer-row">
      <td data-label="Cliente"><strong>${esc(row.display_name || row.email)}</strong>
        <small class="muted-cell">${esc(row.status || "")}${row.published_count ? ` · ${fmt(row.published_count)} pub.` : ""}</small>
      </td>
      <td data-label="Email">${esc(email)}</td>
      <td data-label="Oggetti">${fmt(objects)}</td>
      <td data-label="Ticket">${openTickets ? `<span class="status-pill ${openTickets ? "urgent" : "open"}">${fmt(openTickets)} aperti</span>` : `<span class="muted-cell">0</span>`}</td>
      <td data-label="Ultima">${dateShort(row.last_activated_at)}</td>
      <td data-label="Azioni">
        <div class="row-actions">
          ${objects ? `<button type="button" class="small-action" data-moment-client-objects="${esc(email)}">Oggetti</button>` : ""}
          ${objects ? `<button type="button" class="small-action" data-moment-client-editor="${esc(email)}">Editor</button>` : ""}
          <button type="button" class="small-action" data-moment-client-tickets="${esc(email)}">Ticket${openTickets ? ` (${openTickets})` : ""}</button>
        </div>
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="6">${momentCustomerRows.length ? "Nessun account corrisponde alla ricerca." : "Nessun account Moments. Crea il primo cliente dal form sopra."}</td></tr>`;
}

function momentPublicUrl(slug){
  return slug ? `${PUBLIC_BASE_URL}/m/${encodeURIComponent(slug)}` : "";
}

function momentEditorUrl(eventId){
  return `${LOCAL_PAGES_BASE}/moments.html?admin_event=${encodeURIComponent(eventId)}`;
}

function businessEditorUrl(businessId){
  // Apre il GUSCIO completo (index.html), non l'iframe editor diretto: solo il guscio ha il
  // client Supabase che carica/salva i dati. Con ?business=<id> app.js entra in modalità admin
  // e carica/modifica l'attività del cliente (permessi garantiti dalla RLS platform_write).
  return `${LOCAL_PAGES_BASE}/index.html?business=${encodeURIComponent(businessId)}`;
}

async function loadMoments(){
  try{
    const { data,error } = await supabase
      .from("moment_events")
      .select("id,title,slug,event_type,moment_type,status,event_date,nfc_code,pin_enabled,public_visible,owner_email,plan_key,activated_at,created_at")
      .order("activated_at",{ascending:false,nullsFirst:false})
      .order("created_at",{ascending:false})
      .limit(200);
    if(error) throw error;
    momentRows = data || [];
    populateMomentObjectTypeFilter();
    refreshMomentsTable();
    refreshMomentCustomersTable();
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
  if(!momentsTable) return;
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

function existingMomentSkus(){
  return momentCatalogRows.map(row=>row.sku).filter(Boolean);
}

function resolveProductLine(form){
  const line = form.elements.product_line?.value || "portachiavi";
  if(line !== "altro") return line;
  const custom = String(form.elements.product_line_custom?.value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return custom || "altro";
}

function ensureMomentCatalogFields(form){
  const lineSelect = form.elements.product_line?.value || "portachiavi";
  const customLine = form.elements.product_line_custom?.value || "";
  const product_line = resolveProductLine(form);
  const product_type = normalizeMomentType(form.elements.product_type?.value);
  let sku = normalizeMomentSku(form.elements.sku?.value);
  let name = String(form.elements.name?.value || "").trim();
  if(!sku){
    sku = generateMomentSku({
      productLine: lineSelect,
      productType: product_type,
      customLine,
      existingSkus: existingMomentSkus()
    });
    if(form.elements.sku) form.elements.sku.value = sku;
  }
  if(!name){
    name = generateMomentProductName(lineSelect, product_type, customLine);
    if(form.elements.name) form.elements.name.value = name;
  }
  return { sku, name, product_line, product_type };
}

function wireAllMomentProductAutofill(){
  document.querySelectorAll("[data-moment-auto-form]").forEach(form=>{
    wireMomentProductAutofill(form, existingMomentSkus);
  });
}

function populateMomentTypeSelects(){
  document.querySelectorAll("[data-moment-type-select]").forEach(select=>{
    const current = select.value || select.dataset.defaultValue || "free";
    select.innerHTML = renderCategorySelect(current);
  });
  wireAllMomentProductAutofill();
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
  if(!IS_MOMENTS_CONSOLE && (stats.businessAvailable ?? 999) <= 10){
    alerts.push({
      level:stats.businessAvailable === 0 ? "danger" : "warn",
      title:"Stock NFC Business",
      text:stats.businessAvailable === 0
        ? "Nessun codice Business disponibile — genera un nuovo lotto."
        : `Solo ${fmt(stats.businessAvailable)} codici Business disponibili.`,
      tab:"businessInventory"
    });
  }
  if(!IS_MOMENTS_CONSOLE && stats.pendingOrders > 0){
    alerts.push({
      level:"warn",
      title:"Ordini da evadere",
      text:`${fmt(stats.pendingOrders)} ordini in attesa, pagati o in produzione.`,
      tab:"nfc"
    });
  }
  if(IS_MOMENTS_CONSOLE && stats.openTickets > 0){
    alerts.push({
      level: stats.openTickets >= 5 ? "warn" : "info",
      title:"Ticket supporto",
      text:`${fmt(stats.openTickets)} richieste clienti da gestire.`,
      tab:"support"
    });
  }
  if(!IS_MOMENTS_CONSOLE && stats.openTickets > 0){
    alerts.push({
      level:"warn",
      title:"Ticket supporto aperti",
      text:`${fmt(stats.openTickets)} richieste ancora da chiudere.`,
      tab:"support"
    });
  }
  if(!IS_MOMENTS_CONSOLE && stats.lowStockProducts > 0){
    alerts.push({
      level:"warn",
      title:"Magazzino Business sotto soglia",
      text:`${fmt(stats.lowStockProducts)} prodotti sotto la quantità minima.`,
      tab:"inventory"
    });
  }
  if(!IS_MOMENTS_CONSOLE && stats.pendingCommissions > 0){
    alerts.push({
      level:"info",
      title:"Provvigioni da approvare",
      text:`${fmt(stats.pendingCommissions)} provvigioni in stato pending.`,
      tab:"commissions"
    });
  }
  if(!alerts.length){
    const okText = IS_MOMENTS_CONSOLE
      ? `Nessun alert urgente. Codici disponibili: ${fmt(stats.momentsAvailable)} · Ticket aperti: ${fmt(stats.openTickets)}.`
      : `Nessun alert urgente. Stock Moments: ${fmt(stats.momentsAvailable)} · Ordini attivi: ${fmt(stats.pendingOrders)} · Ticket aperti: ${fmt(stats.openTickets)}.`;
    dashboardAlerts.innerHTML = `
      <div class="alert-item alert-ok" data-admin-tab-jump="dashboard">
        <strong>Tutto ok</strong>
        <span>${okText}</span>
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
  // Chip NFC = link pagina opaco /m/<slug>. Mai /k/<codice attivazione> (rubabile in negozio).
  const slug = String(row?.public_slug || "").trim();
  return slug ? `${PUBLIC_BASE_URL}/m/${encodeURIComponent(slug)}` : "";
}

function momentActivationUrl(row){
  return row?.public_slug ? `${PUBLIC_BASE_URL}/m/${encodeURIComponent(row.public_slug)}` : "";
}

function catalogLabel(row){
  if(!row) return "";
  return `${row.sku} · ${row.name} · ${productLineLabel(row.product_line)} · ${momentTemplateLabel(row.product_type)}`;
}

function normalizedSku(value){
  return String(value || "").replace(/[^A-Z0-9]/gi,"").toUpperCase();
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
  const knownLines = ["portachiavi","orsetto","card","magnete","tag","confezione","altro"];
  momentBatchForm.elements.product_line.value = knownLines.includes(row.product_line) ? row.product_line : "altro";
  momentBatchForm.elements.product_type.value = normalizeMomentType(row.product_type || "free");
  momentBatchForm.elements.prefix.value = String(row.sku || "MOMENT").replace(/[^A-Z0-9]/gi,"").toUpperCase().slice(0,12) || "MOMENT";
  momentBatchForm.elements.prefix.dataset.autoFilled = "1";
  if(!String(momentBatchForm.elements.batch_label.value || "").trim() || momentBatchForm.elements.batch_label.dataset.autoFilled === "1"){
    const today = new Date().toISOString().slice(0,10);
    momentBatchForm.elements.batch_label.value = `${row.sku} · ${today}`;
    momentBatchForm.elements.batch_label.dataset.autoFilled = "1";
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
    "Codice attivazione (inserto confezione)",
    "Codice confezione barcode",
    "Modello catalogo",
    "Link NFC chip (programmazione /m/)",
    "Link pagina pubblica",
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
      formatMomentCodeDisplay(row.code),
      packagingBarcodeForRow(row),
      row.catalog_sku || "",
      momentNfcUrl(row),
      momentActivationUrl(row),
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
    const labeled = rows.map(row=>({
      ...row,
      nfc_url: momentNfcUrl(row),
      catalog_sku: row.catalog_sku || row.sku || ""
    }));
    await exportMomentLabelsPdf(labeled, filenameStem);
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
    sku:momentFilterSku?.value || "",
    dateFrom:momentFilterDateFrom?.value || "",
    dateTo:momentFilterDateTo?.value || "",
    agent:momentFilterAgent?.value || "",
    channel:momentFilterChannel?.value || "",
    order:momentFilterOrder?.value || "",
    search:String(momentSearchInput?.value || "").trim().toLowerCase()
  };
}

function momentRowMatchesSearch(row,search){
  if(!search) return true;
  const nfcUrl = momentNfcUrl(row);
  const activationUrl = momentActivationUrl(row);
  const haystack = [
    row.code,
    row.public_slug,
    nfcUrl,
    activationUrl,
    row.claimed_by_email,
    row.batch_label,
    row.product_label,
    row.product_line,
    orderLabelById(row.platform_order_id)
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search);
}

function momentCatalogMatchesCode(row,catalogId){
  if(!catalogId) return true;
  const catalog = momentCatalogRows.find(item=>item.id === catalogId);
  if(!catalog) return false;
  const sku = normalizedSku(catalog.sku);
  const code = normalizedSku(row.code);
  const label = normalizedSku(`${row.product_label || ""} ${row.batch_label || ""}`);
  // Legacy: codice iniziava con lo SKU. Da v156 i codici sono random → match su etichetta/lotto.
  if(sku && (code.startsWith(sku) || label.includes(sku))) return true;
  // Modello catalogo: stessa linea oggetto + stesso template pagina
  const sameLine = String(row.product_line || "") === String(catalog.product_line || "");
  const sameType = normalizeMomentType(row.product_type) === normalizeMomentType(catalog.product_type);
  return sameLine && sameType;
}

function momentRowMatchesCreatedDate(row,from,to){
  if(!from && !to) return true;
  if(!row.created_at) return false;
  const day = String(row.created_at).slice(0,10);
  if(from && day < from) return false;
  if(to && day > to) return false;
  return true;
}

function catalogForMomentCode(row){
  return momentCatalogRows.find(catalog=>momentCatalogMatchesCode(row,catalog.id)) || null;
}

function filteredMomentProducts(){
  const { line,batch,status,sku,dateFrom,dateTo,agent,channel,order,search } = getMomentProductFilters();
  return momentProductRows.filter(row=>{
    const rowLine = row.product_line || "non_specificato";
    const rowBatch = row.batch_label || "senza_lotto";
    const rowAgent = row.assigned_agent_id || "";
    const rowChannel = row.sold_channel || "";
    if(line && rowLine !== line) return false;
    if(batch && rowBatch !== batch) return false;
    if(status && row.status !== status) return false;
    if(!momentCatalogMatchesCode(row,sku)) return false;
    if(!momentRowMatchesCreatedDate(row,dateFrom,dateTo)) return false;
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

function hasActiveMomentProductFilters(){
  const f = getMomentProductFilters();
  return Boolean(f.line || f.batch || f.status || f.sku || f.dateFrom || f.dateTo || f.agent || f.channel || f.order || f.search);
}

function clearMomentInventoryFilters({ refresh = true } = {}){
  if(momentSearchInput) momentSearchInput.value = "";
  if(momentFilterLine) momentFilterLine.value = "";
  if(momentFilterBatch) momentFilterBatch.value = "";
  if(momentFilterStatus) momentFilterStatus.value = "";
  if(momentFilterSku) momentFilterSku.value = "";
  if(momentFilterDateFrom) momentFilterDateFrom.value = "";
  if(momentFilterDateTo) momentFilterDateTo.value = "";
  if(momentFilterAgent) momentFilterAgent.value = "";
  if(momentFilterChannel) momentFilterChannel.value = "";
  if(momentFilterOrder) momentFilterOrder.value = "";
  syncMomentQuickChips();
  if(refresh) refreshMomentTable();
}

function refreshMomentTable(){
  const rows = filteredMomentProducts();
  renderMomentProductsTable(rows);
  if(momentTableCount){
    const total = momentProductRows.length;
    if(!momentProductsLoaded){
      momentTableCount.textContent = "Caricamento…";
    }else if(!total){
      momentTableCount.textContent = "0 codici in magazzino";
    }else if(rows.length === total){
      momentTableCount.textContent = `${fmt(rows.length)} codici`;
    }else{
      momentTableCount.textContent = `${fmt(rows.length)} di ${fmt(total)} (filtri attivi)`;
    }
  }
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
  const emptyMsg = !momentProductsLoaded
    ? "Caricamento codici…"
    : !momentProductRows.length
      ? "Nessun codice in magazzino. Genera un lotto sopra."
      : `Nessun codice con questi filtri (${fmt(momentProductRows.length)} in magazzino). <button type="button" class="link-button" data-moment-clear-filters>Mostra tutti</button>`;
  momentProductsTable.innerHTML = rows.length ? rows.map(row=>{
    const nfcUrl = momentNfcUrl(row);
    const activationUrl = momentActivationUrl(row);
    const catalog = catalogForMomentCode(row);
    const claimed = row.status === "claimed";
    const checked = selectedMomentCodes.has(row.code) ? "checked" : "";
    const productLabel = catalog ? `${catalog.sku} · ${catalog.name}` : (row.product_label || momentTemplateLabel(row.product_type));
    const trace = [
      soldChannelLabel(row.sold_channel || "non_specificato"),
      agentLabelById(row.assigned_agent_id),
      row.platform_order_id ? orderLabelById(row.platform_order_id) : ""
    ].filter(value=>value && value !== "-" && value !== "Non specificato").join(" · ") || "-";
    return `<tr class="inventory-row">
      <td class="col-select">${claimed ? "" : `<input type="checkbox" data-moment-select="${esc(row.code)}" ${checked} aria-label="Seleziona ${esc(row.code)}">`}</td>
      <td class="col-code" data-label="Codice"><strong>${esc(formatMomentCodeDisplay(row.code))}</strong><div class="muted-cell">${esc(productLabel)}${row.packaging_barcode ? `<br>Barcode: ${esc(row.packaging_barcode)}` : ""}</div></td>
      <td class="col-nfc" data-label="Link NFC">${nfcUrl ? `<a href="${esc(nfcUrl)}" target="_blank" rel="noopener">/m/${esc(row.public_slug)}</a>` : "-"}</td>
      <td class="col-page" data-label="Pagina">${activationUrl ? `<a href="${esc(activationUrl)}" target="_blank" rel="noopener">/m/${esc(row.public_slug)}</a>` : "-"}</td>
      <td class="col-line" data-label="Linea">${esc(productLineLabel(row.product_line || "non_specificato"))}</td>
      <td class="col-batch" data-label="Lotto">${esc(row.batch_label || "-")}</td>
      <td class="col-created" data-label="Creato">${esc(row.created_at ? dateShort(row.created_at) : "-")}</td>
      <td class="col-trace" data-label="Traccia">${row.platform_order_id ? `<button type="button" class="link-button" data-order-open="${esc(row.platform_order_id)}">${esc(trace)}</button>` : esc(trace)}</td>
      <td class="col-status" data-label="Stato"><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      <td class="col-client" data-label="Cliente">${esc(row.claimed_by_email || "-")}</td>
      <td class="col-actions"><button class="small-action" type="button" data-code-edit="${esc(row.code)}">Modifica</button></td>
    </tr>`;
  }).join("") : `<tr><td colspan="11">${emptyMsg}</td></tr>`;
}

function selectHasValue(select, value){
  if(!select || value == null || value === "") return true;
  return [...select.options].some(option=>option.value === value);
}

function populateMomentFilters(){
  if(!momentFilterLine || !momentFilterBatch) return;
  const lineValue = momentFilterLine.value;
  const batchValue = momentFilterBatch.value;
  const skuValue = momentFilterSku?.value || "";
  const agentValue = momentFilterAgent?.value || "";
  const lines = [...new Set(momentProductRows.map(row=>row.product_line || "non_specificato"))].sort();
  const batches = [...new Set(momentProductRows.map(row=>row.batch_label || "senza_lotto"))].sort();
  momentFilterLine.innerHTML = `<option value="">Tutte le linee</option>` + lines.map(value=>`
    <option value="${esc(value)}" ${value === lineValue ? "selected" : ""}>${esc(productLineLabel(value))}</option>
  `).join("");
  momentFilterBatch.innerHTML = `<option value="">Tutti i lotti</option>` + batches.map(value=>`
    <option value="${esc(value)}" ${value === batchValue ? "selected" : ""}>${esc(value === "senza_lotto" ? "Senza lotto" : value)}</option>
  `).join("");
  if(!selectHasValue(momentFilterLine, lineValue)) momentFilterLine.value = "";
  if(!selectHasValue(momentFilterBatch, batchValue)) momentFilterBatch.value = "";
  if(momentFilterSku){
    const active = momentCatalogRows.filter(row=>row.status === "active");
    momentFilterSku.innerHTML = `<option value="">Tutti gli SKU/modelli</option>` + active.map(row=>`
      <option value="${esc(row.id)}" ${row.id === skuValue ? "selected" : ""}>${esc(row.sku)} · ${esc(row.name)}</option>
    `).join("");
    if(!selectHasValue(momentFilterSku, skuValue)) momentFilterSku.value = "";
  }
  populateMomentAgentFilter();
  if(momentFilterAgent && !selectHasValue(momentFilterAgent, agentValue)) momentFilterAgent.value = "";
  // Filtri orfani (SKU/lotto/canale) non devono nascondere i pezzi in silenzio
  if(momentProductsLoaded && momentProductRows.length && !filteredMomentProducts().length && hasActiveMomentProductFilters()){
    console.warn("Filtri magazzino Moments senza risultati — reset automatico.");
    clearMomentInventoryFilters({ refresh: false });
  }
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
  const seq = ++momentProductsLoadSeq;
  try{
    const { data,error } = await supabase
      .from("moment_activation_codes")
      .select("code,packaging_barcode,status,public_slug,product_type,product_line,batch_label,product_label,public_url,claimed_by_email,claimed_at,created_at,sold_channel,assigned_agent_id,platform_order_id")
      .order("created_at",{ascending:false})
      .limit(2000);
    if(error) throw error;
    if(seq !== momentProductsLoadSeq) return; // risposta stale: ignora
    momentProductRows = data || [];
    momentProductsLoaded = true;
    try{
      populateMomentFilters();
    }catch(filterError){
      console.warn("Filtri magazzino Moments non aggiornati", filterError);
    }
    refreshMomentTable();
    try{ refreshNfcShippingConsole(); }catch{ /* pannello NFC assente in Moments console */ }
  }catch(error){
    if(seq !== momentProductsLoadSeq) return;
    console.error(error);
    momentProductsLoaded = true;
    momentProductsTable.innerHTML = `<tr><td colspan="11">Prodotti Moments non disponibili. ${esc(error.message || "Ricarica la pagina.")}</td></tr>`;
    if(momentTableCount) momentTableCount.textContent = "Errore caricamento";
  }
}

function filteredBusinessProducts(){
  const search = String(businessSearchInput?.value || "").trim().toLowerCase();
  const status = businessFilterStatus?.value || "";
  const batch = businessFilterBatch?.value || "";
  const sku = businessFilterSku?.value || "";
  const line = businessFilterLine?.value || "";
  return businessProductRows.filter(row=>{
    const rowBatch = row.batch_label || "senza_lotto";
    const rowSku = row.sku || "non_specificato";
    const rowLine = row.product_line || "non_specificato";
    if(status && row.status !== status) return false;
    if(batch && rowBatch !== batch) return false;
    if(sku && rowSku !== sku) return false;
    if(line && rowLine !== line) return false;
    if(search){
      const biz = row.businesses;
      const bizName = Array.isArray(biz) ? biz[0]?.nome : biz?.nome;
      const bizSlug = Array.isArray(biz) ? biz[0]?.slug : biz?.slug;
      if(!haystackIncludes(row, search, [
        "code","sku","batch_label","product_line","product_label","claimed_by_email","public_slug",
        r=>bizName,r=>bizSlug,r=>businessNfcUrl(r),r=>businessPageUrl(r)
      ])) return false;
    }
    return true;
  });
}

function renderBusinessProductsTable(rows){
  if(!businessProductsTable) return;
  businessProductsTable.innerHTML = rows.length ? rows.map(row=>{
    const nfcUrl = businessNfcUrl(row);
    const pageUrl = businessPageUrl(row);
    const biz = row.businesses;
    const bizName = Array.isArray(biz) ? biz[0]?.nome : biz?.nome;
    const trace = [
      row.sku || "—",
      row.batch_label || "senza lotto",
      soldChannelLabel(row.sold_channel || "non_specificato")
    ].join(" · ");
    return `<tr>
      <td><strong>${esc(row.code)}</strong><div class="muted-cell">${esc(row.product_label || trace)}</div></td>
      <td>${nfcUrl ? `<a href="${esc(nfcUrl)}" target="_blank" rel="noopener">/k/${esc(row.code)}</a>` : "-"}</td>
      <td>${esc(trace)}</td>
      <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
      <td>${esc(row.claimed_by_email || "-")}</td>
      <td>${esc(bizName || "-")}${pageUrl ? `<div class="muted-cell"><a href="${esc(pageUrl)}" target="_blank" rel="noopener">/p/</a></div>` : ""}</td>
      <td>${esc(row.created_at ? dateShort(row.created_at) : "-")}</td>
      <td><button class="small-action" type="button" data-business-code-edit="${esc(row.code)}">Modifica</button></td>
    </tr>`;
  }).join("") : `<tr><td colspan="8">Nessun codice corrisponde ai filtri.</td></tr>`;
}

function refreshBusinessTable(){
  const rows = filteredBusinessProducts();
  if(businessTableCount) businessTableCount.textContent = `${fmt(rows.length)} codici`;
  renderBusinessProductsTable(rows);
}

function populateBusinessFilters(){
  if(!businessFilterBatch || !businessFilterSku || !businessFilterLine) return;
  const batchValue = businessFilterBatch.value;
  const skuValue = businessFilterSku.value;
  const lineValue = businessFilterLine.value;
  const batches = [...new Set(businessProductRows.map(row=>row.batch_label || "senza_lotto"))].sort();
  const skus = [...new Set(businessProductRows.map(row=>row.sku || "non_specificato"))].sort();
  const lines = [...new Set(businessProductRows.map(row=>row.product_line || "non_specificato"))].sort();
  businessFilterBatch.innerHTML = `<option value="">Tutti</option>` + batches.map(value=>`
    <option value="${esc(value)}" ${value === batchValue ? "selected" : ""}>${esc(value === "senza_lotto" ? "Senza lotto" : value)}</option>
  `).join("");
  businessFilterSku.innerHTML = `<option value="">Tutti</option>` + skus.map(value=>`
    <option value="${esc(value)}" ${value === skuValue ? "selected" : ""}>${esc(value)}</option>
  `).join("");
  businessFilterLine.innerHTML = `<option value="">Tutte</option>` + lines.map(value=>`
    <option value="${esc(value)}" ${value === lineValue ? "selected" : ""}>${esc(value)}</option>
  `).join("");
}

function renderBusinessInventoryStats(){
  if(!businessInventoryStats) return;
  if(!businessInventoryRows.length){
    businessInventoryStats.innerHTML = `<p class="inventory-stats-empty">Nessun lotto Business. Genera il primo batch di codici NFC.</p>`;
    return;
  }
  businessInventoryStats.innerHTML = businessInventoryRows.map(row=>{
    const claimed = Number(row.claimed_count || 0);
    const total = Number(row.total_count || 0);
    const pct = total ? Math.round((claimed / total) * 100) : 0;
    return `<article class="inventory-stat-card">
      <div class="inventory-stat-head">
        <strong>${esc(row.sku || "SKU")}</strong>
        <span>${esc(row.batch_label === "senza_lotto" ? "Senza lotto" : row.batch_label)}</span>
      </div>
      <div class="inventory-stat-meta">Linea: ${esc(row.product_line || "—")}</div>
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

async function loadBusinessInventoryStats(){
  if(!businessInventoryStats) return;
  try{
    const { data,error } = await supabase.rpc("get_business_product_inventory_stats");
    if(error) throw error;
    businessInventoryRows = data || [];
    renderBusinessInventoryStats();
  }catch(error){
    console.error(error);
    businessInventoryStats.innerHTML = `<p class="inventory-stats-empty">Statistiche lotti Business non disponibili. Applica SQL v148.</p>`;
  }
}

async function loadBusinessProducts(){
  if(!businessProductsTable) return;
  try{
    const { data,error } = await supabase
      .from("business_activation_codes")
      .select("code,status,sku,product_line,product_label,batch_label,public_slug,public_url,claimed_by_email,claimed_business_id,claimed_at,created_at,sold_channel,assigned_agent_id,platform_order_id,businesses(nome,slug)")
      .order("created_at",{ascending:false})
      .limit(2000);
    if(error) throw error;
    businessProductRows = data || [];
    populateBusinessFilters();
    refreshBusinessTable();
  }catch(error){
    console.error(error);
    businessProductsTable.innerHTML = `<tr><td colspan="8">Codici Business non disponibili. Applica SQL v148.</td></tr>`;
  }
}

function populateBusinessBatchSkuSelect(){
  if(!businessBatchSku) return;
  const current = businessBatchSku.value;
  const nfcProducts = productRows.filter(row=>row.category === "nfc" || row.status === "active");
  businessBatchSku.innerHTML = `<option value="">Manuale — scrivi SKU sotto</option>` + nfcProducts.map(row=>`
    <option value="${esc(row.sku)}" data-name="${esc(row.name)}" ${row.sku === current ? "selected" : ""}>${esc(row.sku)} · ${esc(row.name)}</option>
  `).join("");
}

function businessExportRows(rows,filenameStem="khamakey-business-codes"){
  if(!rows.length){
    alert("Nessun codice da esportare.");
    return;
  }
  const header = ["Codice","Link NFC","Link pagina","SKU","Linea","Lotto","Stato","Cliente","Attività","Creato il"];
  const lines = [header.map(csvCell).join(",")];
  rows.forEach(row=>{
    const biz = row.businesses;
    const bizName = Array.isArray(biz) ? biz[0]?.nome : biz?.nome;
    lines.push([
      row.code,
      businessNfcUrl(row),
      businessPageUrl(row),
      row.sku || "",
      row.product_line || "",
      row.batch_label || "",
      row.status,
      row.claimed_by_email || "",
      bizName || "",
      row.created_at ? dateShort(row.created_at) : ""
    ].map(csvCell).join(","));
  });
  const blob = new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filenameStem}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function saveBusinessBatch(event){
  event.preventDefault();
  if(!hasPermission("inventory.write")){
    setFormStatus(businessBatchStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const form = event.currentTarget;
  const quantity = Math.min(500,Math.max(1,Number(form.elements.quantity.value || 1)));
  const skuSelect = businessBatchSku?.selectedOptions?.[0];
  const sku = String(form.elements.sku?.value || skuSelect?.value || "").trim().toUpperCase();
  const prefix = String(form.elements.prefix.value || sku || "KHAMA").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12) || "KHAMA";
  const productLine = String(form.elements.product_line.value || "").trim();
  const batchLabel = String(form.elements.batch_label.value || "").trim();
  const productLabel = String(form.elements.product_label.value || "").trim() || (skuSelect?.dataset?.name ? `${skuSelect.dataset.name}` : "");
  const soldChannel = form.elements.sold_channel.value || null;
  const assignedAgentId = form.elements.assigned_agent_id.value || null;
  if(!batchLabel){
    setFormStatus(businessBatchStatus,"Inserisci un nome lotto.","error");
    return;
  }
  setFormStatus(businessBatchStatus,`Generazione ${quantity} codici Business (${batchLabel})...`);
  const { data,error } = await supabase.rpc("create_business_product_batch",{
    p_quantity:quantity,
    p_prefix:prefix,
    p_sku:sku || null,
    p_batch_label:batchLabel,
    p_product_line:productLine || null,
    p_product_label:productLabel || null,
    p_sold_channel:soldChannel,
    p_assigned_agent_id:assignedAgentId || null
  });
  if(error){
    console.error(error);
    setFormStatus(businessBatchStatus,error.message || "Generazione non riuscita.","error");
    return;
  }
  const rows = data || [];
  setFormStatus(businessBatchStatus,`Creati ${rows.length} codici · lotto «${batchLabel}». CSV scaricato.`,"ok");
  if(rows.length){
    businessExportRows(rows.map(row=>({
      code:row.out_code || row.code,
      sku:row.sku || sku,
      product_line:row.product_line || productLine,
      batch_label:row.batch_label || batchLabel,
      status:"available",
      public_url:row.public_url,
      created_at:new Date().toISOString()
    })),`khamakey-business-${batchLabel.replace(/[^a-z0-9]+/gi,"-").slice(0,24).toLowerCase() || "stock"}`);
  }
  await Promise.all([loadBusinessProducts(),loadBusinessInventoryStats(),loadDashboard(),loadClients()]);
}

async function provisionBusinessCustomer(event){
  event.preventDefault();
  if(!hasPermission("pages.write") && !hasPermission("inventory.write")){
    setFormStatus(businessProvisionStatus,"Permesso pages.write richiesto.","error");
    return;
  }
  const form = event.currentTarget;
  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const businessName = String(form.elements.business_name.value || "").trim();
  const code = String(form.elements.code.value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
  setFormStatus(businessProvisionStatus,"Elaborazione...");
  const { data,error } = await supabase.rpc("admin_provision_business_customer",{
    p_email:email,
    p_business_name:businessName,
    p_code:code || null
  });
  if(error){
    setFormStatus(businessProvisionStatus,error.message || "Provisioning non riuscito.","error");
    return;
  }
  const row = Array.isArray(data) ? data[0] : data;
  setFormStatus(businessProvisionStatus,row?.status_message || "Operazione completata.", row?.business_id ? "ok" : "error");
  if(row?.business_id) form.elements.code.value = "";
  await Promise.all([loadClients(),loadBusinessProducts(),loadBusinessInventoryStats(),loadDashboard()]);
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
    if(momentProductsLoaded) refreshMomentTable();
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
    populateMomentFilters();
    // Evita di azzerare la tabella mentre i codici sono ancora in caricamento (race Promise.all)
    if(momentProductsLoaded) refreshMomentTable();
    momentCatalogTable.innerHTML = momentCatalogRows.length ? momentCatalogRows.map(row=>{
      if(IS_MOMENTS_CONSOLE){
        return `
        <tr>
          <td><strong>${esc(row.name)}</strong></td>
          <td><code>${esc(row.sku)}</code></td>
          <td>${esc(productLineLabel(row.product_line))}</td>
          <td>${esc(momentTemplateLabel(row.product_type))}</td>
          <td><span class="status-pill ${esc(row.status)}">${esc(row.status)}</span></td>
          <td>
            <button class="small-action" type="button" data-moment-catalog-edit="${esc(row.id)}">Modifica</button>
            <button class="small-action" type="button" data-moment-catalog-stock="${esc(row.id)}">Genera pezzi</button>
          </td>
        </tr>
      `;
      }
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
    }).join("") : `<tr><td colspan="${IS_MOMENTS_CONSOLE ? 6 : 8}">${IS_MOMENTS_CONSOLE ? "Nessun modello — crea il primo da Nuovo pezzo." : "Nessun prodotto in catalogo. Applica SQL v64 o crea il primo SKU."}</td></tr>`;
  }catch(error){
    console.error(error);
    momentCatalogTable.innerHTML = `<tr><td colspan="${IS_MOMENTS_CONSOLE ? 6 : 8}">Catalogo non disponibile. Applica sql/khamakey-moments-sales-channels-v64.sql su Supabase.</td></tr>`;
  }
}

function editMomentCatalog(id){
  const row = momentCatalogRows.find(item=>item.id === id);
  if(!row || !momentCatalogForm) return;
  const knownLines = ["portachiavi","orsetto","card","magnete","tag","confezione","altro"];
  const line = knownLines.includes(row.product_line) ? row.product_line : "altro";
  editingMomentCatalogId = row.id;
  momentCatalogForm.elements.sku.value = row.sku || "";
  momentCatalogForm.elements.sku.dataset.autoFilled = "0";
  momentCatalogForm.elements.name.value = row.name || "";
  momentCatalogForm.elements.name.dataset.autoFilled = "0";
  momentCatalogForm.elements.product_line.value = line;
  if(momentCatalogForm.elements.product_line_custom){
    momentCatalogForm.elements.product_line_custom.value = line === "altro" ? (row.product_line || "") : "";
  }
  const customWrap = momentCatalogForm.querySelector("[data-product-line-custom-wrap]");
  if(customWrap) customWrap.hidden = line !== "altro";
  momentCatalogForm.elements.product_type.innerHTML = renderCategorySelect(row.product_type || "free");
  momentCatalogForm.elements.product_type.value = normalizeMomentType(row.product_type || "free");
  momentCatalogForm.elements.sale_price.value = row.sale_price || 0;
  momentCatalogForm.elements.unit_cost.value = row.unit_cost || 0;
  momentCatalogForm.elements.physical_units.value = row.physical_units || 1;
  momentCatalogForm.elements.activation_codes.value = row.activation_codes || 1;
  if(momentCatalogForm.elements.publish_shopify){
    momentCatalogForm.elements.publish_shopify.value = row.publish_shopify ? "true" : "false";
  }
  if(momentCatalogForm.elements.shopify_live){
    momentCatalogForm.elements.shopify_live.value = row.shopify_live ? "true" : "false";
  }
  if(momentCatalogForm.elements.image_url) momentCatalogForm.elements.image_url.value = row.image_url || "";
  if(momentCatalogForm.elements.description) momentCatalogForm.elements.description.value = row.description || "";
  momentCatalogForm.elements.status.value = row.status || "active";
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
  const description = String(form.elements.description?.value || "").trim();
  const imageUrl = String(form.elements.image_url?.value || "").trim();
  const publishShopify = IS_MOMENTS_CONSOLE ? false : form.elements.publish_shopify?.value === "true";
  const shopifyLive = IS_MOMENTS_CONSOLE ? false : form.elements.shopify_live?.value === "true";
  if(!IS_MOMENTS_CONSOLE && shopifyLive && (description.length < 20 || !imageUrl)){
    setFormStatus(momentCatalogFormStatus,"Per pubblicare online servono immagine e descrizione (min. 20 caratteri).","error");
    return;
  }
  const { sku, name, product_line, product_type } = ensureMomentCatalogFields(form);
  const payload = {
    sku,
    name,
    description:description || null,
    product_line,
    product_type,
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
  setFormStatus(momentCatalogFormStatus, IS_MOMENTS_CONSOLE ? "Modello salvato." : "Prodotto catalogo salvato.","ok");
  await loadMomentCatalog();
  if(!IS_MOMENTS_CONSOLE && (payload.publish_shopify || payload.shopify_live) && catalogId){
    await syncMomentCatalogToShopify(catalogId);
  }
}

async function saveQuickMomentCatalog(event){
  event.preventDefault();
  if(!hasPermission("inventory.write")){
    setFormStatus(momentQuickCatalogStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const form = event.currentTarget;
  const { sku, name, product_line, product_type } = ensureMomentCatalogFields(form);
  if(!name){
    setFormStatus(momentQuickCatalogStatus,"Scegli linea oggetto e template — il nome si compila da solo.","error");
    return;
  }
  const payload = {
    sku,
    name,
    description:null,
    product_line,
    product_type,
    sale_price:Number(form.elements.sale_price.value || 0),
    unit_cost:Number(form.elements.unit_cost.value || 0),
    physical_units:Math.max(1,Number(form.elements.physical_units.value || 1)),
    activation_codes:Math.max(1,Number(form.elements.activation_codes.value || 1)),
    image_url:null,
    publish_shopify:false,
    shopify_live:false,
    status:form.elements.status.value || "active",
    sync_status:"draft",
    updated_at:new Date().toISOString()
  };
  setFormStatus(momentQuickCatalogStatus,"Creazione modello/SKU...");
  const { data,error } = await supabase
    .from("platform_moment_catalog")
    .insert(payload)
    .select("id")
    .single();
  if(error){
    console.error(error);
    const duplicate = String(error.message || "").toLowerCase().includes("duplicate");
    setFormStatus(momentQuickCatalogStatus,duplicate ? "SKU già esistente: apri il catalogo completo per modificarlo." : (error.message || "Creazione SKU non riuscita."),"error");
    return;
  }
  form.reset();
  form.elements.sale_price.value = "0";
  form.elements.unit_cost.value = "0";
  form.elements.physical_units.value = "1";
  form.elements.activation_codes.value = "1";
  form.elements.status.value = "active";
  populateMomentTypeSelects();
  await loadMomentCatalog();
  if(data?.id && momentBatchCatalog){
    momentBatchCatalog.value = data.id;
    applyMomentBatchCatalog();
  }
  setFormStatus(momentQuickCatalogStatus,`Modello ${sku} creato. Ora puoi generare lo stock NFC sotto.`,"ok");
}

async function saveMomentNewProduct(event, { goToInventory = false, createSingleLabel = false } = {}){
  event.preventDefault();
  if(!hasPermission("inventory.write")){
    setFormStatus(momentNewProductStatus,"Non hai il permesso inventory.write.","error");
    return;
  }
  const form = event.currentTarget;
  const { sku, name, product_line, product_type } = ensureMomentCatalogFields(form);
  if(!name){
    setFormStatus(momentNewProductStatus,"Scegli linea oggetto e template pagina.","error");
    return;
  }
  const payload = {
    sku,
    name,
    description:null,
    product_line,
    product_type,
    sale_price:Number(form.elements.sale_price?.value || 0),
    unit_cost:Number(form.elements.unit_cost?.value || 0),
    physical_units:Math.max(1,Number(form.elements.physical_units?.value || 1)),
    activation_codes:Math.max(1,Number(form.elements.activation_codes?.value || 1)),
    image_url:null,
    publish_shopify: IS_MOMENTS_CONSOLE ? false : form.elements.publish_shopify?.value === "true",
    shopify_live:false,
    status:form.elements.status?.value || "active",
    sync_status:"draft",
    updated_at:new Date().toISOString()
  };
  setFormStatus(momentNewProductStatus,"Creazione prodotto...");
  const { data, error } = await supabase
    .from("platform_moment_catalog")
    .insert(payload)
    .select("id")
    .single();
  if(error){
    console.error(error);
    const duplicate = String(error.message || "").toLowerCase().includes("duplicate");
    setFormStatus(momentNewProductStatus,duplicate ? "SKU già esistente — clicca Rigenera e riprova." : (error.message || "Creazione non riuscita."),"error");
    return;
  }
  form.reset();
  if(form.elements.sale_price) form.elements.sale_price.value = "0";
  if(form.elements.unit_cost) form.elements.unit_cost.value = "0";
  if(form.elements.physical_units) form.elements.physical_units.value = "1";
  if(form.elements.activation_codes) form.elements.activation_codes.value = "1";
  if(form.elements.status) form.elements.status.value = "active";
  if(form.elements.publish_shopify) form.elements.publish_shopify.value = "false";
  populateMomentTypeSelects();
  await loadMomentCatalog();
  if(data?.id && momentBatchCatalog){
    momentBatchCatalog.value = data.id;
    applyMomentBatchCatalog();
  }
  const soldChannel = form.elements.sold_channel?.value || "gift";
  if(createSingleLabel){
    if(!hasPermission("moments.write")){
      setFormStatus(momentNewProductStatus,"Serve permesso moments.write per generare codici ed etichette.","error");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const batchLabel = String(form.elements.batch_label?.value || "").trim() || `${sku} · ${today}`;
    await createMomentUnitsAndExport({
      quantity: 1,
      prefix: sku,
      productType: product_type,
      productLine: product_line,
      batchLabel,
      soldChannel,
      catalogSku: sku,
      statusNode: momentNewProductStatus,
      filenameStem: `khamakey-1pezzo-${sku.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
    });
  }else if(goToInventory){
    switchTab("momentInventory");
    setFormStatus(momentNewProductStatus, `Prodotto ${sku} creato — genera lo stock NFC qui sotto.`, "ok");
  }else{
    setFormStatus(momentNewProductStatus, `Prodotto ${sku} creato. Vai al Magazzino NFC per generare i codici.`, "ok");
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
    populateBusinessBatchSkuSelect();
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
      .select("id,order_code,order_type,customer_name,customer_email,customer_phone,status,payment_status,subtotal,shipping_total,discount_total,total,notes,agent_id,created_at,stripe_checkout_session_id,stripe_invoice_id,platform_agents(contact_name,email,referral_code),businesses(nome,slug)")
      .order("created_at",{ascending:false})
      .limit(200);
    if(error) throw error;
    platformOrderRows = data || [];
    refreshOrdersTable();
    refreshNfcShippingConsole();
    if(momentProductsLoaded) refreshMomentTable();
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

function nfcCodesForOrder(orderId){
  return momentProductRows.filter(row=>row.platform_order_id === orderId);
}

function nfcShippingStageForOrder(order,codes=[]){
  if(["cancelled","refunded"].includes(order.status)) return "issue";
  if(["shipped","completed"].includes(order.status)) return "shipped";
  if(order.status === "ready") return "ship";
  if(order.status === "production") return "print";
  if(["pending","paid"].includes(order.status)) return codes.length ? "print" : "production";
  if(!codes.length && order.order_type === "nfc") return "production";
  return "issue";
}

function nfcShippingNextAction(stage,codes=[]){
  if(stage === "production") return codes.length ? "Controlla codici assegnati" : "Assegna codici dal magazzino";
  if(stage === "print") return "Stampa QR / etichette e prepara confezione";
  if(stage === "ship") return "Spedisci o consegna al cliente";
  if(stage === "shipped") return "Verifica consegna e chiudi ordine";
  return "Controlla dati ordine/codici";
}

function nfcShippingRows(){
  return platformOrderRows
    .map(order=>{
      const codes = nfcCodesForOrder(order.id);
      const isNfcOrder = order.order_type === "nfc" || codes.length > 0;
      if(!isNfcOrder) return null;
      return { order,codes,stage:nfcShippingStageForOrder(order,codes) };
    })
    .filter(Boolean);
}

function nfcShippingPriority(stage){
  return { issue:0, production:1, print:2, ship:3, shipped:4 }[stage] ?? 9;
}

function refreshNfcShippingConsole(){
  if(!nfcShippingTable || !nfcShippingStats) return;
  const allRows = nfcShippingRows();
  const counts = allRows.reduce((acc,row)=>{
    acc[row.stage] = (acc[row.stage] || 0) + 1;
    return acc;
  },{});
  nfcShippingStats.innerHTML = ["production","print","ship","shipped","issue"].map(stage=>`
    <article class="shipping-stage-card shipping-stage-${stage}">
      <span>${esc(NFC_SHIPPING_STAGE_LABELS[stage])}</span>
      <strong>${fmt(counts[stage] || 0)}</strong>
    </article>
  `).join("");
  const search = String(nfcShippingSearch?.value || "").trim().toLowerCase();
  const rows = allRows
    .filter(row=>!nfcShippingStageFilter || row.stage === nfcShippingStageFilter)
    .filter(row=>{
      if(!search) return true;
      const codeText = row.codes.map(code=>code.code).join(" ");
      return haystackIncludes(row.order, search, [
        "order_code","order_type","customer_name","customer_email","customer_phone","status","payment_status",
        order=>order.businesses?.nome,
        order=>order.businesses?.slug,
        order=>order.platform_agents?.contact_name,
        order=>order.platform_agents?.email,
        ()=>codeText
      ]);
    })
    .sort((a,b)=>nfcShippingPriority(a.stage) - nfcShippingPriority(b.stage));
  if(nfcShippingCount) nfcShippingCount.textContent = `${fmt(rows.length)} spedizioni`;
  nfcShippingTable.innerHTML = rows.length ? rows.map(({order,codes,stage})=>{
    const nextStatus = stage === "production" ? "production" : stage === "print" ? "ready" : stage === "ship" ? "shipped" : stage === "shipped" ? "completed" : "";
    const codeSummary = codes.length
      ? `${fmt(codes.length)} codici<div class="muted-cell">${codes.slice(0,3).map(code=>esc(code.code)).join(" · ")}${codes.length > 3 ? " ..." : ""}</div>`
      : `<span class="status-pill low">0 codici</span>`;
    return `<tr>
      <td><span class="status-pill ${stage === "issue" ? "error" : stage}">${esc(NFC_SHIPPING_STAGE_LABELS[stage])}</span></td>
      <td><strong>${esc(order.order_code)}</strong><div class="muted-cell">${esc(order.order_type)} · ${dateShort(order.created_at)}</div></td>
      <td><strong>${esc(order.businesses?.nome || order.customer_name || "-")}</strong><div class="muted-cell">${esc(order.customer_email || order.businesses?.slug || "")}</div></td>
      <td>${codeSummary}</td>
      <td>${esc(statusLabel(order.status))}<div class="muted-cell">Pagamento: ${esc(order.payment_status || "-")}</div></td>
      <td>${esc(nfcShippingNextAction(stage,codes))}</td>
      <td class="row-actions">
        <button type="button" data-nfc-order-open="${esc(order.id)}">Gestisci</button>
        ${codes.length ? `<button type="button" data-admin-tab-jump="momentInventory">Stampa</button>` : `<button type="button" data-nfc-order-open="${esc(order.id)}" data-order-view="codes">Assegna</button>`}
        ${nextStatus ? `<button type="button" data-nfc-order-stage="${esc(order.id)}" data-next-status="${esc(nextStatus)}">${stage === "shipped" ? "Completa" : "Avanza"}</button>` : ""}
      </td>
    </tr>`;
  }).join("") : `<tr><td colspan="7">${allRows.length ? "Nessuna spedizione corrisponde ai filtri." : "Nessun ordine NFC collegato. Crea un ordine NFC o assegna codici dal magazzino."}</td></tr>`;
}

async function advanceNfcShippingOrder(orderId,status){
  if(!hasPermission("orders.write")){
    alert("Permesso orders.write richiesto.");
    return;
  }
  const { error } = await supabase
    .from("platform_orders")
    .update({status})
    .eq("id",orderId);
  if(error){
    alert(error.message || "Aggiornamento ordine non riuscito.");
    return;
  }
  await Promise.all([loadPlatformOrders(),loadDashboard()]);
}

async function loadPlans(){
  try{
    const { data,error } = await supabase
      .from("platform_plans")
      .select("id,plan_key,name,description,price_monthly,price_yearly,setup_fee,features,limits,active,public_visible,sort_order,stripe_product_id,stripe_price_monthly_id,stripe_price_yearly_id")
      .order("sort_order",{ascending:true})
      .order("name",{ascending:true});
    if(error) throw error;
    planRows = data || [];
    const renderedPlans = planRows.length ? planRows.map(row=>{
      const storage = row.limits?.storage_mb != null ? `${row.limits.storage_mb} MB` : "";
      const product = row.limits?.product || "";
      return `
      <tr>
        <td><strong>${esc(row.name)}</strong><div class="muted-cell">${esc(row.description || "")}</div></td>
        <td>${esc(row.plan_key)}${product ? `<div class="muted-cell">${esc(product)}${storage ? ` · ${esc(storage)}` : ""}</div>` : ""}</td>
        <td>${money(row.price_monthly)}</td>
        <td>${money(row.price_yearly)}</td>
        <td>${row.stripe_product_id ? "configurato" : "-"}<div class="muted-cell">${esc(row.stripe_price_monthly_id || row.stripe_price_yearly_id || "")}</div></td>
        <td>${(row.features || []).slice(0,3).map(esc).join(", ")}</td>
        <td><span class="status-pill ${row.active ? "active" : "disabled"}">${row.active ? "attivo" : "disattivo"}</span><div class="muted-cell">${row.public_visible ? "pubblico" : "privato"}</div></td>
        <td><button class="small-action" type="button" data-plan-edit="${esc(row.id)}">Modifica</button>${row.stripe_price_monthly_id ? `<button class="small-action" type="button" data-plan-stripe="${esc(row.id)}" data-cycle="monthly">Stripe mese</button>` : ""}${row.stripe_price_yearly_id ? `<button class="small-action" type="button" data-plan-stripe="${esc(row.id)}" data-cycle="yearly">Stripe anno</button>` : ""}</td>
      </tr>
    `;
    }).join("") : `<tr><td colspan="8">Nessun piano configurato.</td></tr>`;
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

function supportSourceLabel(source){
  return ({
    moments_editor:"Editor Moments",
    business_editor:"Editor Business",
    admin:"Creato da admin",
    account_area:"Area account"
  })[source] || source || "—";
}

function supportCustomerEmail(row){
  return String(
    row?.profiles?.email
    || String(row?.description || "").match(/Cliente:\s*([^\s\n]+@[^\s\n]+)/i)?.[1]
    || ""
  ).trim();
}

function supportMomentSlug(row){
  return String(row?.description || "").match(/Pagina Moments:\s*([A-Za-z0-9_-]+)/i)?.[1] || "";
}

function supportEventId(row){
  return String(row?.description || "").match(/ID evento:\s*([0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12})/i)?.[1] || "";
}

function normalizeEmailKey(value){
  return String(value || "").trim().toLowerCase();
}

function momentsForEmail(email){
  const key = normalizeEmailKey(email);
  if(!key) return [];
  return momentRows.filter(row=>normalizeEmailKey(row.owner_email) === key);
}

function ticketsForEmail(email){
  const key = normalizeEmailKey(email);
  if(!key) return [];
  return supportTicketRows.filter(row=>{
    if(normalizeEmailKey(supportCustomerEmail(row)) === key) return true;
    return normalizeEmailKey(row.profiles?.email) === key;
  });
}

function openTicketsForEmail(email){
  return ticketsForEmail(email).filter(row=>!["resolved","closed"].includes(row.status));
}

function resolveMomentFromTicket(row){
  const eventId = supportEventId(row);
  if(eventId){
    const byId = momentRows.find(item=>item.id === eventId);
    if(byId) return byId;
  }
  const slug = supportMomentSlug(row);
  if(slug){
    const bySlug = momentRows.find(item=>String(item.slug || "") === slug);
    if(bySlug) return bySlug;
  }
  const email = supportCustomerEmail(row);
  const owned = momentsForEmail(email);
  return owned[0] || null;
}

function focusMomentClientWorkspace(email, { objects = false, support = false, editor = false, eventId = "" } = {}){
  const clean = String(email || "").trim();
  if(support){
    if(supportSearchInput) supportSearchInput.value = clean;
    if(supportStatusFilter) supportStatusFilter.value = "";
    if(supportPriorityFilter) supportPriorityFilter.value = "";
    switchTab("support");
    syncSupportQuickChips();
    refreshSupportTicketsTable();
    return;
  }
  switchTab("momentClients");
  if(momentCustomerSearchInput){
    momentCustomerSearchInput.value = clean;
    refreshMomentCustomersTable();
  }
  if(objects || editor){
    if(momentObjectSearchInput){
      momentObjectSearchInput.value = clean;
      refreshMomentsTable();
    }
    const target = eventId
      ? momentRows.find(row=>row.id === eventId)
      : momentsForEmail(clean)[0];
    if(editor && target){
      openMomentDrawer(target.id, "editor");
      return;
    }
    const objectsTitle = document.querySelector('[data-panel="momentClients"] .section-title:nth-of-type(2)')
      || [...document.querySelectorAll('[data-panel="momentClients"] .section-title')].find(node=>/oggetti/i.test(node.textContent || ""));
    objectsTitle?.scrollIntoView({ behavior:"smooth", block:"start" });
  }else{
    momentCustomerSearchInput?.closest(".admin-card")?.querySelector("#momentCustomersTable")?.scrollIntoView({ behavior:"smooth", block:"nearest" });
  }
}

function supportCustomerLabel(row){
  const email = supportCustomerEmail(row);
  const business = row.businesses?.nome || row.businesses?.slug || "";
  if(email && business) return `${email} · ${business}`;
  if(email) return email;
  if(business) return business;
  return IS_MOMENTS_CONSOLE ? "Cliente Moments" : "Cliente";
}

function splitSupportDescription(description){
  const raw = String(description || "").trim();
  if(!raw) return { customer:"", notes:[] };
  const chunks = raw.split(/\n\n(?=\[(?:Nota staff|Risposta email) )/i);
  const customerParts = [];
  const notes = [];
  chunks.forEach(chunk=>{
    const trimmed = chunk.trim();
    if(/^\[(?:Nota staff|Risposta email) /i.test(trimmed)) notes.push(trimmed);
    else if(trimmed) customerParts.push(trimmed);
  });
  return { customer:customerParts.join("\n\n").trim(), notes };
}

function supportMemberLabel(member){
  if(!member) return "—";
  const name = String(member.full_name || "").trim();
  const email = String(member.email || "").trim();
  if(name && email) return `${name} · ${email}`;
  return name || email || "—";
}

function supportAssigneeLabel(row){
  const member = row?.assignee || supportMemberRows.find(item=>item.id === row?.assigned_member_id);
  return supportMemberLabel(member);
}

async function loadSupportMembers(){
  try{
    const { data,error } = await supabase
      .from("platform_members")
      .select("id,email,full_name,role,status")
      .eq("status","active")
      .order("full_name",{ascending:true});
    if(error) throw error;
    supportMemberRows = data || [];
  }catch(error){
    console.warn("Membri supporto non disponibili", error);
    supportMemberRows = [];
  }
  populateSupportAssigneeSelect();
}

function populateSupportAssigneeSelect(selectedId = ""){
  const select = supportAssigneeSelect || supportTicketEditForm?.elements?.assigned_member_id;
  if(!select) return;
  const current = selectedId || select.value || "";
  select.innerHTML = `<option value="">Non assegnato</option>` + supportMemberRows.map(row=>`
    <option value="${esc(row.id)}" ${row.id === current ? "selected" : ""}>${esc(supportMemberLabel(row))}</option>
  `).join("");
  if(current) select.value = current;
}

function formatSupportWhen(value){
  if(!value) return "—";
  try{
    return new Intl.DateTimeFormat("it-IT",{
      day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(new Date(value));
  }catch{
    return String(value);
  }
}

function formatSupportAge(value){
  if(!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if(!Number.isFinite(ms) || ms < 0) return formatSupportWhen(value);
  const hours = Math.floor(ms / 3600000);
  if(hours < 1) return "ora";
  if(hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if(days < 21) return `${days}g`;
  return formatSupportWhen(value);
}

function supportPriorityRank(priority){
  return ({ urgent:0, high:1, normal:2, low:3 })[priority] ?? 9;
}

async function loadSupportTickets(){
  try{
    if(!supportMemberRows.length) await loadSupportMembers();
    let query = supabase
      .from("platform_support_tickets")
      .select("id,business_id,profile_id,assigned_member_id,subject,description,priority,status,source,created_at,updated_at,businesses(nome,slug),profiles(email),assignee:platform_members!assigned_member_id(id,email,full_name)")
      .order("created_at",{ascending:false})
      .limit(150);
    // Console Moments: solo ticket Moments
    if(IS_MOMENTS_CONSOLE){
      query = query.eq("source","moments_editor");
    }
    const { data,error } = await query;
    if(error) throw error;
    supportTicketRows = data || [];
    refreshSupportTicketsTable();
    refreshMomentCustomersTable();
    if(activeSupportTicketId && supportTicketRows.some(row=>row.id === activeSupportTicketId)){
      editSupportTicket(activeSupportTicketId, { keepScroll:true, quiet:true });
    }
  }catch(error){
    console.error(error);
    supportTicketsTable.innerHTML = `<tr><td colspan="7">Ticket non disponibili.</td></tr>`;
  }
}

function supportStatusLabel(status){
  return ({
    open:"Aperto",
    in_progress:"In lavorazione",
    waiting_customer:"Attesa cliente",
    resolved:"Risolto",
    closed:"Chiuso",
    active:"Da lavorare"
  })[status] || status || "-";
}

function supportPriorityLabel(priority){
  return ({
    low:"Bassa",
    normal:"Normale",
    high:"Alta",
    urgent:"Urgente"
  })[priority] || priority || "-";
}

function supportStatusMatches(filter, status){
  if(!filter) return true;
  if(filter === "active") return ["open","in_progress","waiting_customer"].includes(status);
  return status === filter;
}

function filteredSupportTickets(){
  const query = String(supportSearchInput?.value || "").trim().toLowerCase();
  const status = supportStatusFilter?.value || "";
  const priority = supportPriorityFilter?.value || "";
  const myId = currentMember?.id || "";
  const rows = supportTicketRows.filter(row=>{
    if(supportMineOnly && myId && row.assigned_member_id !== myId) return false;
    if(!supportStatusMatches(status, row.status)) return false;
    if(priority && row.priority !== priority) return false;
    if(query){
      const haystack = [
        row.subject,
        row.description,
        row.source,
        supportCustomerEmail(row),
        supportMomentSlug(row),
        supportAssigneeLabel(row),
        row.businesses?.nome,
        row.businesses?.slug
      ].join(" ").toLowerCase();
      if(!haystack.includes(query)) return false;
    }
    return true;
  });
  return rows.sort((a,b)=>{
    const closedA = ["resolved","closed"].includes(a.status) ? 1 : 0;
    const closedB = ["resolved","closed"].includes(b.status) ? 1 : 0;
    if(closedA !== closedB) return closedA - closedB;
    const prio = supportPriorityRank(a.priority) - supportPriorityRank(b.priority);
    if(prio !== 0) return prio;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

function updateSupportStats(){
  const open = supportTicketRows.filter(row=>["open","in_progress","waiting_customer"].includes(row.status)).length;
  const urgent = supportTicketRows.filter(row=>row.priority === "urgent" && !["resolved","closed"].includes(row.status)).length;
  const waiting = supportTicketRows.filter(row=>row.status === "waiting_customer").length;
  const resolved = supportTicketRows.filter(row=>row.status === "resolved").length;
  if(supportStatOpen) supportStatOpen.textContent = fmt(open);
  if(supportStatUrgent) supportStatUrgent.textContent = fmt(urgent);
  if(supportStatWaiting) supportStatWaiting.textContent = fmt(waiting);
  if(supportStatResolved) supportStatResolved.textContent = fmt(resolved);
}

function refreshSupportTicketsTable(){
  if(!supportTicketsTable) return;
  const rows = filteredSupportTickets();
  updateSupportStats();
  syncSupportQuickChips();
  if(supportVisibleCount) supportVisibleCount.textContent = `${rows.length} ticket visibili · ${supportTicketRows.length} caricati`;
  supportTicketsTable.innerHTML = rows.length ? rows.map(row=>{
    const { customer } = splitSupportDescription(row.description);
    const preview = String(customer || row.description || "").replace(/\s+/g," ").trim();
    const short = preview.length > 90 ? `${preview.slice(0,90)}…` : preview;
    const activeClass = row.id === activeSupportTicketId ? " is-active" : "";
    const assignee = supportAssigneeLabel(row);
    return `
    <tr class="support-row${activeClass}" data-support-row="${esc(row.id)}">
      <td class="col-ticket" data-label="Ticket">
        <strong>${esc(row.subject)}</strong>
        <small>${esc(short || "Nessun dettaglio")}</small>
      </td>
      <td class="col-client" data-label="Cliente">${esc(supportCustomerLabel(row))}</td>
      <td class="col-assignee" data-label="Assegnato">${esc(assignee)}</td>
      <td class="col-priority" data-label="Priorità"><span class="status-pill ${esc(row.priority)}">${esc(supportPriorityLabel(row.priority))}</span></td>
      <td class="col-status" data-label="Stato"><span class="status-pill ${esc(row.status)}">${esc(supportStatusLabel(row.status))}</span></td>
      <td class="col-when" data-label="Quando" title="${esc(formatSupportWhen(row.created_at))}">${esc(formatSupportAge(row.created_at))}</td>
      <td class="col-actions" data-label="Azioni"><button class="small-action" type="button" data-support-ticket-edit="${esc(row.id)}">Apri</button></td>
    </tr>
  `;
  }).join("") : `<tr><td colspan="7">Nessun ticket corrisponde ai filtri.</td></tr>`;
}

function applySupportQuickFilter(chip){
  if(!chip) return;
  if(chip.hasAttribute("data-support-quick-mine")){
    supportMineOnly = true;
    if(supportStatusFilter) supportStatusFilter.value = "active";
    if(supportPriorityFilter) supportPriorityFilter.value = "";
  }else if(chip.hasAttribute("data-support-quick-priority")){
    supportMineOnly = false;
    if(supportPriorityFilter) supportPriorityFilter.value = chip.dataset.supportQuickPriority || "";
    if(supportStatusFilter) supportStatusFilter.value = "";
  }else if(chip.hasAttribute("data-support-quick-status")){
    supportMineOnly = false;
    if(supportStatusFilter) supportStatusFilter.value = chip.dataset.supportQuickStatus || "";
    if(supportPriorityFilter) supportPriorityFilter.value = "";
  }
  syncSupportQuickChips();
  refreshSupportTicketsTable();
}

function syncSupportQuickChips(){
  const current = supportStatusFilter?.value || "";
  const priority = supportPriorityFilter?.value || "";
  document.querySelectorAll("#supportQuickFilters [data-support-quick-mine]").forEach(chip=>{
    chip.classList.toggle("active", supportMineOnly);
  });
  document.querySelectorAll("#supportQuickFilters [data-support-quick-status], #supportStats [data-support-quick-status]").forEach(chip=>{
    const isStatusChip = chip.hasAttribute("data-support-quick-status") && !chip.hasAttribute("data-support-quick-priority");
    chip.classList.toggle("active", !supportMineOnly && isStatusChip && (chip.dataset.supportQuickStatus || "") === current && !priority);
  });
  document.querySelectorAll("#supportQuickFilters [data-support-quick-priority], #supportStats [data-support-quick-priority]").forEach(chip=>{
    chip.classList.toggle("active", !supportMineOnly && (chip.dataset.supportQuickPriority || "") === priority && !current);
  });
}

function editSupportTicket(id, { keepScroll = false, quiet = false } = {}){
  const row = supportTicketRows.find(item=>item.id === id);
  if(!row || !supportTicketEditForm) return;
  activeSupportTicketId = row.id;
  supportTicketEditForm.hidden = false;
  supportTicketEditForm.elements.ticket_id.value = row.id;
  supportTicketEditForm.elements.ticket_title.value = row.subject || "";
  const split = splitSupportDescription(row.description);
  if(supportTicketEditForm.elements.ticket_description){
    supportTicketEditForm.elements.ticket_description.value = split.customer || "Nessun dettaglio";
  }
  supportTicketEditForm.elements.status.value = row.status || "open";
  supportTicketEditForm.elements.priority.value = row.priority || "normal";
  supportTicketEditForm.elements.internal_note.value = "";
  if(supportTicketEditForm.elements.customer_reply){
    supportTicketEditForm.elements.customer_reply.value = "";
  }
  populateSupportAssigneeSelect(row.assigned_member_id || "");

  const email = supportCustomerEmail(row);
  const slug = supportMomentSlug(row);
  const customerNode = supportTicketEditForm.querySelector("[data-support-customer]");
  const emailNode = supportTicketEditForm.querySelector("[data-support-email]");
  const mailtoNode = supportTicketEditForm.querySelector("[data-support-mailto]");
  const copyEmailBtn = supportTicketEditForm.querySelector("[data-support-copy-email]");
  const pageNode = supportTicketEditForm.querySelector("[data-support-page]");
  const pageLink = supportTicketEditForm.querySelector("[data-support-page-link]");
  const sourceNode = supportTicketEditForm.querySelector("[data-support-source]");
  const createdNode = supportTicketEditForm.querySelector("[data-support-created]");
  const notesBlock = supportTicketEditForm.querySelector("[data-support-notes-block]");
  const notesList = supportTicketEditForm.querySelector("[data-support-notes]");

  if(customerNode) customerNode.textContent = supportCustomerLabel(row);
  if(emailNode) emailNode.textContent = email || "—";
  if(mailtoNode){
    mailtoNode.hidden = !email;
    if(email){
      const subject = encodeURIComponent(`Re: ${row.subject || "Assistenza KhamaKey"}`);
      mailtoNode.href = `mailto:${email}?subject=${subject}`;
    }
  }
  if(copyEmailBtn) copyEmailBtn.hidden = !email;
  if(pageNode) pageNode.textContent = slug ? `/m/${slug}` : "—";
  if(pageLink){
    pageLink.hidden = !slug;
    if(slug) pageLink.href = `${PUBLIC_BASE_URL}/m/${encodeURIComponent(slug)}`;
  }
  if(sourceNode) sourceNode.textContent = supportSourceLabel(row.source);
  if(createdNode) createdNode.textContent = `${formatSupportWhen(row.created_at)} · ${formatSupportAge(row.created_at)}`;
  if(notesBlock && notesList){
    notesBlock.hidden = !split.notes.length;
    notesList.innerHTML = split.notes.map(note=>`<li>${esc(note)}</li>`).join("");
  }

  const linkActions = supportTicketEditForm.querySelector("[data-support-link-actions]");
  const linkedMoment = resolveMomentFromTicket(row);
  const canLinkClient = Boolean(email || linkedMoment);
  if(linkActions){
    linkActions.hidden = !canLinkClient;
    linkActions.dataset.supportEmail = email || linkedMoment?.owner_email || "";
    linkActions.dataset.supportEventId = linkedMoment?.id || supportEventId(row) || "";
    const editorBtn = linkActions.querySelector("[data-support-open-editor]");
    const objectsBtn = linkActions.querySelector("[data-support-open-objects]");
    if(editorBtn) editorBtn.hidden = !linkedMoment && !momentsForEmail(email).length;
    if(objectsBtn) objectsBtn.hidden = !email && !linkedMoment;
  }

  refreshSupportTicketsTable();
  if(!quiet){
    setFormStatus(supportTicketEditStatus,"Ticket aperto: messaggio cliente sopra, note staff sotto. Usa Apri cliente / Editor per intervenire.","ok");
  }
  if(!keepScroll) supportTicketEditForm.scrollIntoView({behavior:"smooth",block:"nearest"});
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
  if(planForm.elements.limits){
    planForm.elements.limits.value = row.limits && Object.keys(row.limits).length
      ? JSON.stringify(row.limits, null, 2)
      : "";
  }
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
  const planKey = String(row.plan_key || "moments_free").trim().toLowerCase();
  const planLabels = { moments_free:"Free", moments_plus:"Plus", moments_pro:"Pro" };
  const planNode = document.getElementById("momentDrawerPlan");
  if(planNode) planNode.textContent = planLabels[planKey] || planKey;
  const planSelect = document.getElementById("momentPlanSelect");
  if(planSelect) planSelect.value = planLabels[planKey] ? planKey : "moments_free";
  document.getElementById("momentDrawerPin").textContent = row.pin_enabled ? "Attivo" : "Disattivo";
  document.getElementById("momentDrawerPublicUrl").textContent = publicUrl || "-";
  momentDrawer.dataset.publicUrl = publicUrl;
  momentDrawer.dataset.editorUrl = editorUrl;
  momentDrawer.dataset.eventId = row.id || "";
  const openPublic = document.getElementById("momentOpenPublicUrl");
  const openEditor = document.getElementById("momentOpenEditorUrl");
  if(openPublic){
    openPublic.href = publicUrl || "#";
    openPublic.hidden = !publicUrl;
  }
  if(openEditor){
    openEditor.href = editorUrl;
  }
  const openTickets = openTicketsForEmail(row.owner_email);
  const ticketsNode = document.getElementById("momentDrawerTickets");
  const ticketsBtn = document.getElementById("momentOpenSupportTickets");
  if(ticketsNode){
    ticketsNode.textContent = openTickets.length
      ? `${openTickets.length} aperti · ${ticketsForEmail(row.owner_email).length} totali`
      : (ticketsForEmail(row.owner_email).length ? `${ticketsForEmail(row.owner_email).length} (nessuno aperto)` : "Nessuno");
  }
  if(ticketsBtn){
    ticketsBtn.hidden = !row.owner_email;
    ticketsBtn.dataset.supportEmail = row.owner_email || "";
    ticketsBtn.textContent = openTickets.length ? `Vedi ticket (${openTickets.length})` : "Vedi ticket";
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

function openCodeDrawer(code,kind="moment"){
  const clean = String(code || "").trim().toUpperCase();
  const row = kind === "business"
    ? businessProductRows.find(item=>String(item.code || "").toUpperCase() === clean)
    : momentProductRows.find(item=>String(item.code || "").toUpperCase() === clean);
  if(!row || !codeDrawer){
    console.warn("openCodeDrawer: codice o drawer non trovato", clean, kind);
    return;
  }
  currentCodeRow = row;
  currentCodeKind = kind;
  const titleEl = document.getElementById("codeDrawerTitle");
  const metaEl = document.getElementById("codeDrawerMeta");
  const codeInput = document.getElementById("codeEditCode");
  const statusSelect = document.getElementById("codeEditStatus");
  const channelSelect = document.getElementById("codeEditChannel");
  if(titleEl) titleEl.textContent = formatMomentCodeDisplay(row.code);
  if(metaEl){
    metaEl.textContent = kind === "business"
      ? `${row.sku || "Business"} · ${row.batch_label || "senza lotto"}`
      : productLineLabel(row.product_line || "non_specificato");
  }
  if(codeInput) codeInput.value = row.code;
  if(statusSelect){
    const claimedOpt = statusSelect.querySelector('option[value="claimed"]');
    if(claimedOpt) claimedOpt.disabled = row.status !== "claimed";
    statusSelect.value = row.status === "claimed" ? "claimed" : (row.status || "available");
  }
  if(channelSelect) channelSelect.value = row.sold_channel || "";
  try{
    renderAgentOptions(row.assigned_agent_id || "");
  }catch(error){
    console.warn("renderAgentOptions", error);
  }
  const batchInput = document.getElementById("codeEditBatch");
  const orderInput = document.getElementById("codeEditOrder");
  const publicUrlInput = document.getElementById("codeEditPublicUrl");
  const nfcUrlInput = document.getElementById("codeEditNfcUrl");
  const activationUrlInput = document.getElementById("codeEditActivationUrl");
  if(batchInput) batchInput.value = row.batch_label || "";
  if(orderInput) orderInput.value = row.platform_order_id ? orderLabelById(row.platform_order_id) : "";
  if(publicUrlInput) publicUrlInput.value = kind === "business" ? businessPageUrl(row) : momentActivationUrl(row);
  if(nfcUrlInput) nfcUrlInput.value = kind === "business" ? businessNfcUrl(row) : momentNfcUrl(row);
  if(activationUrlInput){
    activationUrlInput.value = kind === "business"
      ? `${LOCAL_PAGES_BASE}/index.html?code=${encodeURIComponent(row.code)}`
      : momentActivationUrl(row);
  }
  setFormStatus(codeEditFormStatus,"");
  codeDrawer.classList.add("open");
  codeDrawer.setAttribute("aria-hidden","false");
}

function openBusinessCodeDrawer(code){
  openCodeDrawer(code,"business");
}

function closeCodeDrawer(){
  if(!codeDrawer) return;
  codeDrawer.classList.remove("open");
  codeDrawer.setAttribute("aria-hidden","true");
  currentCodeRow = null;
}

async function saveCodeEdit(event){
  event.preventDefault();
  const isBusiness = currentCodeKind === "business";
  const writePerm = isBusiness ? "inventory.write" : "moments.write";
  if(!hasPermission(writePerm)){
    setFormStatus(codeEditFormStatus,`Non hai il permesso ${writePerm}.`,"error");
    return;
  }
  const form = event.currentTarget;
  const code = String(form.elements.code.value || "").trim().toUpperCase();
  const rows = isBusiness ? businessProductRows : momentProductRows;
  const table = isBusiness ? "business_activation_codes" : "moment_activation_codes";
  const row = rows.find(item=>item.code === code);
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
  const { error } = await supabase.from(table).update(payload).eq("code",code);
  if(error){
    console.error(error);
    setFormStatus(codeEditFormStatus,error.message || "Salvataggio non riuscito.","error");
    return;
  }
  setFormStatus(codeEditFormStatus,"Codice aggiornato.","ok");
  if(isBusiness){
    await Promise.all([loadBusinessProducts(),loadBusinessInventoryStats()]);
  }else{
    await Promise.all([loadMomentProducts(),loadMomentInventoryStats(),loadMomentAgentInventoryStats()]);
  }
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
  const nfc = clientPrimaryNfc(row);
  if(nfc?.url) return nfc.url;
  if(nfc?.code) return `${PUBLIC_BASE_URL}/k/${encodeURIComponent(nfc.code)}`;
  return row?.slug ? `${PUBLIC_BASE_URL}/p/${encodeURIComponent(row.slug)}` : "";
}

function businessNfcUrl(row){
  const code = String(row?.code || "").trim();
  if(row?.public_url && row.public_url.startsWith("http")) return row.public_url;
  return code ? `${PUBLIC_BASE_URL}/k/${encodeURIComponent(code)}` : "";
}

function businessPageUrl(row){
  if(row?.public_slug) return `${PUBLIC_BASE_URL}/p/${encodeURIComponent(row.public_slug)}`;
  const biz = row?.businesses;
  const slug = Array.isArray(biz) ? biz[0]?.slug : biz?.slug;
  return slug ? `${PUBLIC_BASE_URL}/p/${encodeURIComponent(slug)}` : "";
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
  const nfc = clientPrimaryNfc(row);
  const email = clientProfileEmail(row);
  document.getElementById("drawerClientName").textContent = row.nome || "Senza nome";
  document.getElementById("drawerClientMeta").textContent = row.categoria || "Categoria non indicata";
  document.getElementById("drawerSlug").textContent = row.slug || "-";
  document.getElementById("drawerClientEmail").textContent = email || "-";
  document.getElementById("drawerNfcCode").textContent = nfc?.code || "-";
  document.getElementById("drawerNfcUrl").textContent = nfc?.url || (nfc?.code ? businessNfcUrl({code:nfc.code}) : "-");
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

async function createMomentUnitsAndExport({
  quantity = 1,
  prefix,
  productType,
  productLine,
  batchLabel,
  soldChannel = null,
  catalogSku = null,
  statusNode = momentBatchStatus,
  filenameStem = "khamakey-etichetta"
}){
  const qty = Math.min(500, Math.max(1, Number(quantity || 1)));
  const cleanPrefix = String(prefix || "MOMENT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "MOMENT";
  if(!productLine || !batchLabel){
    if(statusNode) setFormStatus(statusNode, "Linea oggetto e nome lotto obbligatori.", "error");
    return null;
  }
  if(statusNode) setFormStatus(statusNode, `Generazione ${qty} pezzo/i (${batchLabel})...`);
  const { data, error } = await supabase.rpc("create_moment_product_batch", {
    p_quantity: qty,
    p_prefix: cleanPrefix,
    p_product_type: productType,
    p_batch_label: batchLabel,
    p_product_line: productLine,
    p_sold_channel: soldChannel || null,
    p_assigned_agent_id: null
  });
  if(error){
    console.error(error);
    if(statusNode) setFormStatus(statusNode, error.message || "Generazione non riuscita.", "error");
    return null;
  }
  const rows = data || [];
  if(!rows.length){
    if(statusNode) setFormStatus(statusNode, "Nessun codice generato.", "error");
    return null;
  }
  const exportRows = rows.map(row=>({
    code: row.out_code || row.code,
    packaging_barcode: row.packaging_barcode || null,
    public_slug: row.public_slug,
    product_type: row.product_type || productType,
    product_line: row.product_line || productLine,
    batch_label: row.batch_label || batchLabel,
    catalog_sku: catalogSku || null,
    status: "available",
    sold_channel: row.sold_channel || soldChannel || null,
    assigned_agent_id: null,
    platform_order_id: null,
    claimed_by_email: "",
    created_at: new Date().toISOString()
  }));
  // Traccia SKU sul product_label (i codici random non lo contengono più)
  if(catalogSku){
    const codes = exportRows.map(row=>row.code).filter(Boolean);
    if(codes.length){
      const label = `${productLine || "Moments"} · ${catalogSku}`;
      const { error:labelError } = await supabase
        .from("moment_activation_codes")
        .update({ product_label: label })
        .in("code", codes);
      if(labelError) console.warn("product_label SKU non aggiornato", labelError);
      else exportRows.forEach(row=>{ row.product_label = label; });
    }
  }
  momentExportRows(exportRows, filenameStem);
  await runLabelExport(exportRows, filenameStem);
  if(statusNode){
    setFormStatus(
      statusNode,
      qty === 1
        ? `1 pezzo creato · codice ${formatMomentCodeDisplay(exportRows[0].code)} · PDF etichetta scaricato.`
        : `Creati ${rows.length} codici · lotto «${batchLabel}» · CSV + PDF etichette.`,
      "ok"
    );
  }
  await Promise.all([loadMomentProducts(), loadMomentInventoryStats(), loadMomentAgentInventoryStats(), loadMomentCustomers(), loadMoments(), loadDashboard()]);
  return exportRows;
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
  const soldChannel = String(form.elements.sold_channel?.value || "").trim() || null;
  await createMomentUnitsAndExport({
    quantity,
    prefix,
    productType,
    productLine,
    batchLabel,
    soldChannel,
    catalogSku: catalog?.sku || null,
    statusNode: momentBatchStatus,
    filenameStem: `khamakey-lotto-${batchLabel.replace(/[^a-z0-9]+/gi,"-").slice(0,24).toLowerCase() || "stock"}`
  });
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
  let limits = {};
  const limitsRaw = String(form.elements.limits?.value || "").trim();
  if(limitsRaw){
    try{
      limits = JSON.parse(limitsRaw);
      if(!limits || typeof limits !== "object" || Array.isArray(limits)){
        throw new Error("I limiti devono essere un oggetto JSON.");
      }
    }catch(parseError){
      setFormStatus(planFormStatus,parseError.message || "JSON limiti non valido.","error");
      return;
    }
  }
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
    limits,
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

async function saveSupportTicketEdit(event){
  event.preventDefault();
  if(!hasPermission("support.write")){
    setFormStatus(supportTicketEditStatus,"Non hai il permesso support.write.","error");
    return;
  }
  const form = event.currentTarget;
  const ticketId = form.elements.ticket_id.value;
  const row = supportTicketRows.find(item=>item.id === ticketId);
  if(!row) return;
  const assigned = String(form.elements.assigned_member_id?.value || "").trim() || null;
  const payload = {
    status:form.elements.status.value,
    priority:form.elements.priority.value,
    assigned_member_id:assigned,
    updated_at:new Date().toISOString()
  };
  setFormStatus(supportTicketEditStatus,"Aggiornamento ticket...");
  const { error } = await supabase
    .from("platform_support_tickets")
    .update(payload)
    .eq("id",ticketId);
  if(error){
    console.error(error);
    setFormStatus(supportTicketEditStatus,error.message || "Errore aggiornamento ticket.","error");
    return;
  }
  const noteBody = String(form.elements.internal_note.value || "").trim();
  if(noteBody && row.business_id){
    const { error:noteError } = await supabase.from("platform_client_notes").insert({
      business_id:row.business_id,
      note_type:"support",
      body:`Ticket ${row.subject}: ${noteBody}`
    });
    if(noteError) console.warn("Nota ticket non salvata",noteError);
  }else if(noteBody){
    const stamp = formatSupportWhen(new Date().toISOString());
    const nextDescription = `${row.description || ""}\n\n[Nota staff ${stamp}] ${noteBody}`.trim();
    const { error:noteError } = await supabase
      .from("platform_support_tickets")
      .update({ description:nextDescription, updated_at:new Date().toISOString() })
      .eq("id",ticketId);
    if(noteError) console.warn("Nota ticket Moments non salvata",noteError);
  }
  activeSupportTicketId = ticketId;
  setFormStatus(supportTicketEditStatus,"Ticket aggiornato.","ok");
  await Promise.all([
    loadSupportTickets(),
    currentClient ? loadClientTickets(currentClient.id) : Promise.resolve()
  ]);
}

async function sendSupportCustomerReply(){
  if(!hasPermission("support.write")){
    setFormStatus(supportTicketEditStatus,"Non hai il permesso support.write.","error");
    return;
  }
  if(!supportTicketEditForm) return;
  const ticketId = supportTicketEditForm.elements.ticket_id.value;
  const row = supportTicketRows.find(item=>item.id === ticketId);
  if(!row) return;
  const message = String(supportTicketEditForm.elements.customer_reply?.value || "").trim();
  if(!message){
    setFormStatus(supportTicketEditStatus,"Scrivi il testo della risposta email.","error");
    return;
  }
  const email = supportCustomerEmail(row);
  if(!email){
    setFormStatus(supportTicketEditStatus,"Email cliente non disponibile su questo ticket.","error");
    return;
  }

  if(supportSendReplyBtn) supportSendReplyBtn.disabled = true;
  setFormStatus(supportTicketEditStatus,"Invio email in corso…");
  try{
    const { data:sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if(!token) throw new Error("Sessione scaduta — accedi di nuovo.");
    const response = await fetch(`${WORKER_BASE_URL}/api/support/reply`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify({
        ticket_id:ticketId,
        message,
        subject:`Re: ${row.subject || "Assistenza KhamaKey"}`,
        to_email:email
      })
    });
    const result = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error || `Errore ${response.status}`);

    const stamp = formatSupportWhen(new Date().toISOString());
    const replyNote = `[Risposta email ${stamp}] A ${email}: ${message}`;
    const nextDescription = `${row.description || ""}\n\n${replyNote}`.trim();
    const assigned = String(supportTicketEditForm.elements.assigned_member_id?.value || "").trim()
      || currentMember?.id
      || null;
    const { error } = await supabase
      .from("platform_support_tickets")
      .update({
        description:nextDescription,
        status:"waiting_customer",
        assigned_member_id:assigned,
        updated_at:new Date().toISOString()
      })
      .eq("id",ticketId);
    if(error) throw error;

    if(row.business_id){
      await supabase.from("platform_client_notes").insert({
        business_id:row.business_id,
        note_type:"support",
        body:`Risposta email ticket «${row.subject}»: ${message}`
      }).then(({ error:noteError })=>{
        if(noteError) console.warn("Nota Business risposta non salvata", noteError);
      });
    }

    supportTicketEditForm.elements.customer_reply.value = "";
    activeSupportTicketId = ticketId;
    setFormStatus(supportTicketEditStatus,`Email inviata a ${email}. Stato: attesa cliente.`,"ok");
    await loadSupportTickets();
  }catch(error){
    console.error(error);
    setFormStatus(supportTicketEditStatus,error.message || "Invio email non riuscito.","error");
  }finally{
    if(supportSendReplyBtn) supportSendReplyBtn.disabled = false;
  }
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
  const loaders = IS_MOMENTS_CONSOLE ? [
    loadDashboard,
    loadMoments,
    loadMomentCustomers,
    loadMomentProducts,
    loadMomentInventoryStats,
    loadMomentAgentInventoryStats,
    loadMomentCatalog,
    loadSupportMembers,
    loadSupportTickets,
    loadTicketCategories
  ] : [
    loadDashboard,
    loadClients,
    loadCrm,
    loadMoments,
    loadMomentCustomers,
    loadMomentProducts,
    loadBusinessProducts,
    loadBusinessInventoryStats,
    loadMomentInventoryStats,
    loadMomentAgentInventoryStats,
    loadMembers,
    loadSupportMembers,
    loadAgents,
    loadCommissions,
    loadCommissionRules,
    loadTierRules,
    loadPriceLists,
    loadNetworkTree,
    loadDeliveries,
    loadMomentCatalog,
    loadProducts,
    loadStockMovements,
    loadPlatformOrders,
    loadPlans,
    loadMaterials,
    loadTicketCategories,
    loadSupportTickets,
    loadIntegrations,
    loadIntegrationHealth,
    loadSupportedLocales,
    loadPaymentTransactions,
    loadWebhookEvents
  ];
  // loaders sono funzioni: vanno invocate, altrimenti Promise.all le tratta come valori già risolti
  await Promise.all(loaders.map(fn => fn()));
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

document.getElementById("adminMenuToggle")?.addEventListener("click",()=>{
  const shell = document.getElementById("adminShell");
  setAdminNavOpen(!shell?.classList.contains("nav-open"));
});
document.getElementById("adminNavBackdrop")?.addEventListener("click",closeAdminNav);
window.addEventListener("keydown",event=>{
  if(event.key === "Escape") closeAdminNav();
});
window.addEventListener("resize",()=>{
  if(window.matchMedia("(min-width:901px)").matches) closeAdminNav();
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

document.getElementById("adminLogout")?.addEventListener("click",async()=>{
  if(supabase) await supabase.auth.signOut();
  location.href = ADMIN_HOME;
});

adminLoginForm?.addEventListener("submit",async event=>{
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

adminResetPassword?.addEventListener("click",async()=>{
  if(!supabase) return;
  const email = document.getElementById("adminLoginEmail").value.trim().toLowerCase();
  if(!email){
    setGate("Inserisci prima l’email admin per recuperare la password.","denied");
    return;
  }
  const redirectTo = authRedirectTo(IS_MOMENTS_CONSOLE ? "/moments-admin.html" : "/admin.html");
  const { error } = await supabase.auth.resetPasswordForEmail(email,{ redirectTo });
  if(error){
    console.error(error);
    setGate(error.message || "Recupero password non riuscito.","denied");
    return;
  }
  setGate("Email di recupero inviata. Controlla la casella dell’account admin.");
});

clientsTable?.addEventListener("click",event=>{
  const button = event.target.closest("[data-client-open]");
  if(!button) return;
  openClientDrawer(button.dataset.clientOpen,button.dataset.clientView || "summary");
});

productsTable?.addEventListener("click",event=>{
  const button = event.target.closest("[data-product-edit]");
  if(button) editProduct(button.dataset.productEdit);
});

momentsTable?.addEventListener("click",event=>{
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

platformOrdersTable?.addEventListener("click",event=>{
  const saveBtn = event.target.closest("[data-order-save]");
  if(saveBtn) return updatePlatformOrder(saveBtn.dataset.orderSave);
  const openBtn = event.target.closest("[data-order-open]");
  if(openBtn) openOrderDrawer(openBtn.dataset.orderOpen);
});

nfcShippingTable?.addEventListener("click",event=>{
  const jumpBtn = event.target.closest("[data-admin-tab-jump]");
  if(jumpBtn){
    switchTab(jumpBtn.dataset.adminTabJump);
    return;
  }
  const openBtn = event.target.closest("[data-nfc-order-open]");
  if(openBtn){
    openOrderDrawer(openBtn.dataset.nfcOrderOpen,openBtn.dataset.orderView || "summary");
    return;
  }
  const stageBtn = event.target.closest("[data-nfc-order-stage]");
  if(stageBtn) advanceNfcShippingOrder(stageBtn.dataset.nfcOrderStage,stageBtn.dataset.nextStatus);
});

plansTable?.addEventListener("click",event=>{
  const stripeBtn = event.target.closest("[data-plan-stripe]");
  if(stripeBtn){
    createStripeCheckoutForPlan(stripeBtn.dataset.planStripe, stripeBtn.dataset.cycle || "monthly");
    return;
  }
  const button = event.target.closest("[data-plan-edit]");
  if(button) editPlan(button.dataset.planEdit);
});

materialsTable?.addEventListener("click",event=>{
  const button = event.target.closest("[data-material-edit]");
  if(button) editMaterial(button.dataset.materialEdit);
});

ticketCategoriesTable?.addEventListener("click",event=>{
  const button = event.target.closest("[data-ticket-category-edit]");
  if(button) editTicketCategory(button.dataset.ticketCategoryEdit);
});

supportTicketsTable?.addEventListener("click",event=>{
  const button = event.target.closest("[data-support-ticket-edit]");
  if(button) editSupportTicket(button.dataset.supportTicketEdit);
});

integrationsTable?.addEventListener("click",event=>{
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
    return;
  }
  const stockBtn = event.target.closest("[data-moment-catalog-stock]");
  if(stockBtn){
    const row = momentCatalogRows.find(item=>item.id === stockBtn.dataset.momentCatalogStock);
    if(row && momentBatchCatalog && momentBatchForm){
      momentBatchCatalog.value = row.id;
      applyMomentBatchCatalog();
      if(momentBatchForm.elements.quantity) momentBatchForm.elements.quantity.value = "1";
      switchTab("momentInventory");
    }
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
    if(form.id === "momentNewProductForm"){
      if(form.elements.sale_price) form.elements.sale_price.value = "0";
      if(form.elements.unit_cost) form.elements.unit_cost.value = "0";
      if(form.elements.physical_units) form.elements.physical_units.value = "1";
      if(form.elements.activation_codes) form.elements.activation_codes.value = "1";
      if(form.elements.status) form.elements.status.value = "active";
      if(form.elements.publish_shopify) form.elements.publish_shopify.value = "false";
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

document.getElementById("copyPublicUrl")?.addEventListener("click",async()=>{
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

document.getElementById("momentPlanForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const status = document.getElementById("momentPlanFormStatus");
  const eventId = momentDrawer?.dataset.eventId || currentMoment?.id || "";
  const planKey = String(event.currentTarget.elements.plan_key.value || "").trim().toLowerCase();
  if(!eventId || !planKey){
    setFormStatus(status,"Seleziona un piano valido.","error");
    return;
  }
  setFormStatus(status,"Applicazione piano...");
  const { data, error } = await supabase.rpc("apply_moment_plan", {
    p_event_id: eventId,
    p_plan_key: planKey
  });
  if(error){
    console.error(error);
    setFormStatus(status, error.message || "Piano non applicato.","error");
    return;
  }
  const labels = { moments_free:"Free", moments_plus:"Plus", moments_pro:"Pro" };
  const applied = String(data?.plan_key || planKey);
  const row = momentRows.find(item=>item.id === eventId);
  if(row) row.plan_key = applied;
  if(currentMoment?.id === eventId) currentMoment.plan_key = applied;
  const planNode = document.getElementById("momentDrawerPlan");
  if(planNode) planNode.textContent = labels[applied] || applied;
  setFormStatus(status,`Piano ${labels[applied] || applied} applicato. Limiti attivi al prossimo caricamento editor.`,"ok");
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

nfcShippingQuickFilters?.addEventListener("click",event=>{
  const chip = event.target.closest("[data-nfc-shipping-stage]");
  if(!chip) return;
  nfcShippingStageFilter = chip.dataset.nfcShippingStage || "";
  chip.closest(".filter-chip-bar")?.querySelectorAll(".filter-chip").forEach(node=>{
    node.classList.toggle("active", node === chip);
  });
  refreshNfcShippingConsole();
});

bindSearchInput(nfcShippingSearch, refreshNfcShippingConsole);
nfcShippingSearchClear?.addEventListener("click",()=>{
  if(nfcShippingSearch) nfcShippingSearch.value = "";
  nfcShippingStageFilter = "";
  nfcShippingQuickFilters?.querySelectorAll(".filter-chip").forEach(node=>{
    node.classList.toggle("active", !node.dataset.nfcShippingStage);
  });
  refreshNfcShippingConsole();
});

document.getElementById("momentInventoryQuickFilters")?.addEventListener("click",event=>{
  const chip = event.target.closest("[data-moment-quick]");
  if(!chip) return;
  // I chip rapidi ripartono da zero: evita filtri SKU/lotto/date “appiccicati” che svuotano la tabella
  clearMomentInventoryFilters({ refresh: false });
  if(momentFilterStatus) momentFilterStatus.value = chip.dataset.momentQuickStatus || "";
  if(momentFilterOrder){
    momentFilterOrder.value = chip.dataset.momentQuickOrder !== undefined
      ? (chip.dataset.momentQuickOrder || "")
      : "";
  }
  chip.closest(".filter-chip-bar")?.querySelectorAll(".filter-chip").forEach(node=>{
    node.classList.toggle("active", node === chip);
  });
  syncMomentQuickChips();
  refreshMomentTable();
});

function onSupportQuickClick(event){
  const chip = event.target.closest("[data-support-quick-status],[data-support-quick-priority],[data-support-quick-mine]");
  if(!chip) return;
  applySupportQuickFilter(chip);
}
document.getElementById("supportQuickFilters")?.addEventListener("click", onSupportQuickClick);
document.getElementById("supportStats")?.addEventListener("click", onSupportQuickClick);

supportFilterClear?.addEventListener("click",()=>{
  if(supportSearchInput) supportSearchInput.value = "";
  if(supportStatusFilter) supportStatusFilter.value = "active";
  if(supportPriorityFilter) supportPriorityFilter.value = "";
  supportMineOnly = false;
  syncSupportQuickChips();
  refreshSupportTicketsTable();
});
supportRefreshBtn?.addEventListener("click", async ()=>{
  if(supportRefreshBtn) supportRefreshBtn.disabled = true;
  await loadSupportTickets();
  if(supportRefreshBtn) supportRefreshBtn.disabled = false;
});
supportSendReplyBtn?.addEventListener("click",()=>sendSupportCustomerReply());
supportAssignMeBtn?.addEventListener("click",()=>{
  if(!currentMember?.id){
    setFormStatus(supportTicketEditStatus,"Il tuo account non è in Collaboratori — non posso assegnarti.","error");
    return;
  }
  populateSupportAssigneeSelect(currentMember.id);
  setFormStatus(supportTicketEditStatus,"Assegnato a te — clicca Salva per confermare.","ok");
});

supportStatusFilter?.addEventListener("change",()=>{
  syncSupportQuickChips();
  refreshSupportTicketsTable();
});
supportPriorityFilter?.addEventListener("change",()=>{
  syncSupportQuickChips();
  refreshSupportTicketsTable();
});
bindSearchInput(supportSearchInput, refreshSupportTicketsTable);

supportTicketEditForm?.addEventListener("click", async event=>{
  const copyBtn = event.target.closest("[data-support-copy-email]");
  if(copyBtn){
    const email = String(supportTicketEditForm.querySelector("[data-support-email]")?.textContent || "").trim();
    if(!email || email === "—") return;
    try{
      await navigator.clipboard.writeText(email);
      setFormStatus(supportTicketEditStatus,"Email copiata.","ok");
    }catch{
      setFormStatus(supportTicketEditStatus,"Copia non riuscita — seleziona l’email a mano.","error");
    }
    return;
  }
  const linkHost = event.target.closest("[data-support-link-actions]");
  if(!linkHost) return;
  const email = linkHost.dataset.supportEmail || "";
  const eventId = linkHost.dataset.supportEventId || "";
  if(event.target.closest("[data-support-open-client]")){
    focusMomentClientWorkspace(email, { objects:false });
    return;
  }
  if(event.target.closest("[data-support-open-objects]")){
    focusMomentClientWorkspace(email, { objects:true, eventId });
    return;
  }
  if(event.target.closest("[data-support-open-editor]")){
    focusMomentClientWorkspace(email, { editor:true, eventId });
  }
});

momentCustomersTable?.addEventListener("click", event=>{
  const ticketsBtn = event.target.closest("[data-moment-client-tickets]");
  if(ticketsBtn){
    focusMomentClientWorkspace(ticketsBtn.dataset.momentClientTickets, { support:true });
    return;
  }
  const objectsBtn = event.target.closest("[data-moment-client-objects]");
  if(objectsBtn){
    focusMomentClientWorkspace(objectsBtn.dataset.momentClientObjects, { objects:true });
    return;
  }
  const editorBtn = event.target.closest("[data-moment-client-editor]");
  if(editorBtn){
    focusMomentClientWorkspace(editorBtn.dataset.momentClientEditor, { editor:true });
  }
});

document.getElementById("momentOpenSupportTickets")?.addEventListener("click", event=>{
  const email = event.currentTarget.dataset.supportEmail || "";
  if(!email) return;
  closeMomentDrawer();
  focusMomentClientWorkspace(email, { support:true });
});
crmQuickFilters?.addEventListener("click",event=>{
  const chip = event.target.closest("[data-crm-quick]");
  if(!chip) return;
  crmQuickFilter = chip.dataset.crmQuick || "all";
  syncCrmQuickChips();
  refreshCrmTable();
});
supportTicketEditCancel?.addEventListener("click",()=>{
  if(supportTicketEditForm){
    supportTicketEditForm.hidden = true;
    supportTicketEditForm.reset();
    activeSupportTicketId = "";
    refreshSupportTicketsTable();
  }
});

if(momentSearchInput){
  let searchTimer = null;
  momentSearchInput.addEventListener("input",()=>{
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshMomentTable,180);
  });
}
momentSearchClear?.addEventListener("click",()=>{
  clearMomentInventoryFilters();
});

[momentFilterLine,momentFilterBatch,momentFilterStatus,momentFilterSku,momentFilterDateFrom,momentFilterDateTo,momentFilterAgent,momentFilterChannel,momentFilterOrder].forEach(node=>{
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
  if(event.target.closest("[data-moment-clear-filters]")){
    clearMomentInventoryFilters();
    return;
  }
  const editBtn = event.target.closest("[data-code-edit]");
  if(editBtn){
    event.preventDefault();
    return openCodeDrawer(editBtn.getAttribute("data-code-edit") || editBtn.dataset.codeEdit);
  }
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

memberForm?.addEventListener("submit",saveMember);
agentForm?.addEventListener("submit",saveAgent);
if(momentForm) momentForm.addEventListener("submit",saveMoment);
if(momentQuickCatalogForm) momentQuickCatalogForm.addEventListener("submit",saveQuickMomentCatalog);
if(momentNewProductForm){
  momentNewProductForm.addEventListener("submit",event=>{
    const goToInventory = event.currentTarget.dataset.goToInventory === "1";
    const createSingleLabel = event.currentTarget.dataset.createSingleLabel === "1";
    delete event.currentTarget.dataset.goToInventory;
    delete event.currentTarget.dataset.createSingleLabel;
    saveMomentNewProduct(event, { goToInventory, createSingleLabel });
  });
  momentNewProductForm.querySelector("[data-submit-and-stock]")?.addEventListener("click",()=>{
    momentNewProductForm.dataset.goToInventory = "1";
    momentNewProductForm.requestSubmit();
  });
  momentNewProductForm.querySelector("[data-submit-and-label]")?.addEventListener("click",()=>{
    momentNewProductForm.dataset.createSingleLabel = "1";
    momentNewProductForm.requestSubmit();
  });
}

document.querySelectorAll("[data-batch-qty]").forEach(button=>{
  button.addEventListener("click",()=>{
    const input = momentBatchForm?.elements?.quantity;
    if(input) input.value = button.dataset.batchQty || "1";
  });
});
if(momentBatchForm) momentBatchForm.addEventListener("submit",createMomentBatch);
if(businessBatchForm) businessBatchForm.addEventListener("submit",saveBusinessBatch);
if(businessProvisionForm) businessProvisionForm.addEventListener("submit",provisionBusinessCustomer);
businessSearchInput?.addEventListener("input",refreshBusinessTable);
businessSearchClear?.addEventListener("click",()=>{
  if(businessSearchInput) businessSearchInput.value = "";
  refreshBusinessTable();
});
[businessFilterStatus,businessFilterBatch,businessFilterSku,businessFilterLine].forEach(node=>{
  node?.addEventListener("change",refreshBusinessTable);
});
businessExportFiltered?.addEventListener("click",()=>{
  businessExportRows(filteredBusinessProducts(),"khamakey-business-magazzino");
});
businessProductsTable?.addEventListener("click",event=>{
  const editBtn = event.target.closest("[data-business-code-edit]");
  if(editBtn) openBusinessCodeDrawer(editBtn.dataset.businessCodeEdit);
});
businessBatchSku?.addEventListener("change",()=>{
  const opt = businessBatchSku.selectedOptions?.[0];
  if(!opt?.value || !businessBatchForm) return;
  businessBatchForm.elements.prefix.value = String(opt.value).replace(/[^A-Z0-9]/g,"").slice(0,12);
  if(!businessBatchForm.elements.product_label.value){
    businessBatchForm.elements.product_label.value = opt.dataset.name || opt.textContent.split("·").pop()?.trim() || "";
  }
});
if(momentCatalogForm) momentCatalogForm.addEventListener("submit",saveMomentCatalog);
productForm?.addEventListener("submit",saveProduct);
stockForm?.addEventListener("submit",saveStockMovement);
platformOrderForm?.addEventListener("submit",savePlatformOrder);
clientRecordForm?.addEventListener("submit",saveClientRecord);
clientNoteForm?.addEventListener("submit",saveClientNote);
ticketForm?.addEventListener("submit",saveTicket);
supportTicketEditForm?.addEventListener("submit",saveSupportTicketEdit);
planForm?.addEventListener("submit",savePlan);
materialForm?.addEventListener("submit",saveMaterial);
ticketCategoryForm?.addEventListener("submit",saveTicketCategory);
if(refreshIntegrationHealthBtn) refreshIntegrationHealthBtn.addEventListener("click",loadIntegrationHealth);
integrationForm?.addEventListener("submit",saveIntegration);

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
  showLoginGate(error.message || "Errore apertura consolle. Accedi di nuovo.");
});
