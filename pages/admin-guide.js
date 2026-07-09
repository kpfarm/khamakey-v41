/** Guide contestuali pannello admin — linguaggio semplice per team non tecnico. */

export const COMMON_STATUS_LEGEND = [
  { pill: "active paid completed", label: "Verde — tutto ok / completato / pagato" },
  { pill: "pending draft", label: "Blu — in lavorazione o in attesa" },
  { pill: "low paused", label: "Arancio — attenzione o in pausa" },
  { pill: "disabled cancelled archived error", label: "Rosso — disattivato, errore o annullato" }
];

export const PANEL_GUIDES = {
  dashboard: {
    subtitle: "La tua bacheca: numeri importanti e cosa fare adesso.",
    steps: [
      "Controlla gli alert colorati — indicano le priorità del giorno.",
      "Clicca su un alert per aprire subito la sezione giusta.",
      "Usa il menu a sinistra per clienti, ordini, magazzino o Shopify."
    ],
    legend: [
      { pill: "alert-danger", label: "Rosso — urgente, intervenire subito" },
      { pill: "alert-warn", label: "Giallo — da fare presto" },
      { pill: "alert-info", label: "Blu — informativo" },
      { pill: "alert-ok", label: "Verde — nessun problema" }
    ],
    tip: "Non serve esperienza software: segui gli alert e i pulsanti evidenziati in blu."
  },
  clients: {
    subtitle: "Elenco attività Business con pagina pubblica /p/ e editor.",
    steps: [
      "Cerca per nome, slug o categoria nella barra in alto.",
      "Clicca Editor per modificare la pagina del cliente.",
      "Clicca Pagina per vedere come la vedono i visitatori."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "Business e Moments sono due sistemi separati — qui vedi solo le attività commerciali."
  },
  momentClients: {
    subtitle: "Clienti che hanno attivato un oggetto NFC Moments.",
    steps: [
      "Crea un account cliente con email (opzionale: codice NFC dal magazzino).",
      "Nella tabella oggetti usa Editor / Pagina come per Business.",
      "Filtra per tipo evento o pagina non ancora pubblicata."
    ],
    legend: [
      { pill: "active", label: "Pagina Moments pubblicata" },
      { pill: "draft pending", label: "Bozza o in preparazione" }
    ],
    tip: "Ogni oggetto NFC ha un codice unico — lo trovi in Magazzino NFC Moments."
  },
  momentCatalog: {
    subtitle: "Catalogo prodotti venduti online (Shopify). Fonte unica prezzi e bundle.",
    steps: [
      "Crea o modifica prodotto: SKU, prezzo, foto e descrizione.",
      "Sync Shopify crea una bozza — i clienti non la vedono ancora.",
      "Attiva Visibile nel negozio solo quando foto + descrizione sono pronte."
    ],
    legend: [
      { pill: "draft", label: "Bozza Shopify — non in vendita" },
      { pill: "pending", label: "Sync in coda" },
      { pill: "active synced", label: "Sincronizzato / online" },
      { pill: "error low", label: "Errore sync — riprova o controlla messaggio" }
    ],
    tip: "Bundle coppia: Fisici = 2, Codici NFC = 1 (stessa pagina condivisa)."
  },
  momentInventory: {
    subtitle: "Magazzino codici NFC Moments: disponibili, venduti, collegati agli ordini.",
    steps: [
      "Genera lotti di codici con il modulo in alto (pronta consegna).",
      "Filtra per stato Disponibili per vedere cosa puoi spedire.",
      "Seleziona più righe per assegnare agente, canale o esportare CSV/PDF."
    ],
    legend: [
      { pill: "available", label: "Disponibile — pronto per ordine o vendita" },
      { pill: "claimed active", label: "Attivato dal cliente" },
      { pill: "paused", label: "In pausa — non usare" },
      { pill: "archived", label: "Archiviato" }
    ],
    tip: "Quando arriva un ordine Shopify, il sistema assegna codici disponibili in automatico."
  },
  platformOrders: {
    subtitle: "Tutti gli ordini interni: Shopify, Stripe, NFC, setup manuale.",
    steps: [
      "Usa le chip Vista rapida per filtrare (es. Da evadere, Shopify).",
      "Clicca Gestisci per codici NFC, note e dettaglio ordine.",
      "Aggiorna Stato e Pagamento dalla tabella, poi Aggiorna."
    ],
    legend: [
      { pill: "pending", label: "In attesa — da lavorare" },
      { pill: "paid", label: "Pagato — puoi produrre/spedire" },
      { pill: "production ready", label: "In produzione / pronto" },
      { pill: "shipped completed", label: "Spedito o chiuso" }
    ],
    tip: "Ordini e-commerce (Shopify) arrivano da soli via webhook — non serve crearli a mano."
  },
  integrations: {
    subtitle: "Stato collegamenti Shopify, email, pagamenti. Le password restano su Cloudflare.",
    steps: [
      "Clicca Aggiorna stato Worker per vedere cosa è configurato.",
      "Verde = pronto · Grigio = da configurare con il team tecnico.",
      "Registra webhook Shopify dalla sezione Catalogo vendita."
    ],
    legend: [
      { pill: "active", label: "Servizio configurato nel Worker" },
      { pill: "draft not_configured", label: "Da configurare (secret / account)" }
    ],
    tip: "I collaboratori vedono solo lo stato — le chiavi le imposta l’amministratore tecnico."
  },
  inventory: {
    subtitle: "Magazzino prodotti Business (non NFC Moments).",
    steps: [
      "Controlla le schede stock in alto per prodotti sotto soglia.",
      "Registra movimenti entrata/uscita dal modulo movimenti.",
      "Esporta CSV se serve inventario per contabilità."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "Stock basso compare anche negli alert della Dashboard."
  },
  agents: {
    subtitle: "Agenti, rivenditori e punti autorizzati con rete a grado e provvigioni.",
    steps: [
      "Crea agente con email, tipo (agente / rivenditore / punto autorizzato) e codice referral.",
      "Collega l'upline per formare la rete: quando un downline vende, l'upline prende L2/L3.",
      "Assegna tier, bonus % extra e listino B2B dedicato.",
      "Consulta albero rete e consegne nella tab Rete rivenditori."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "Applica SQL v68 su Supabase per gerarchia, listini e storico consegne."
  },
  resellerNetwork: {
    subtitle: "Rete piramidale, regole provvigioni a grado, listini B2B e prodotti consegnati.",
    steps: [
      "Visualizza l'albero agenti → rivenditori → punti autorizzati.",
      "Configura regole L1/L2/L3 per tier (standard, premium, partner).",
      "Crea listini rivenditori con prezzi B2B per SKU.",
      "Registra consegne NFC/materiali e filtra per agente."
    ],
    legend: [
      { pill: "active", label: "Agente attivo in rete" },
      { pill: "pending", label: "Provvigione in attesa (tab Provvigioni)" }
    ],
    tip: "Le provvigioni multilivello si generano con RPC distribute_network_commissions quando un ordine/pagamento è collegato a un agente downline."
  },
  staff: {
    subtitle: "Invita collaboratori e limita cosa possono fare.",
    steps: [
      "Inserisci email e scegli ruolo Collaboratore o Admin.",
      "Spunta solo i permessi necessari (es. ordini, magazzino).",
      "Il collaboratore accede con la stessa pagina admin e la sua email."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "In dubbio, dai permessi minimi — si possono aggiungere dopo."
  },
  permissions: {
    subtitle: "Elenco permessi disponibili nel sistema.",
    steps: [
      "Consulta questa tabella quando assegni ruoli ai collaboratori.",
      "admin.full = accesso completo.",
      "inventory.write = magazzino e catalogo modificabili."
    ],
    tip: "Non modificare nulla qui — i permessi si assegnano in Collaboratori."
  },
  plans: {
    subtitle: "Piani abbonamento Business e collegamento Stripe.",
    steps: [
      "Inserisci prezzi e ID Stripe (price_...) dal dashboard Stripe.",
      "Salva piano, poi usa Stripe mese/anno per generare link pagamento.",
      "Il cliente paga su Stripe — l’ordine arriva in Ordini."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "Senza price ID Stripe i pulsanti di checkout non funzionano."
  },
  billing: {
    subtitle: "Riepilogo piani e fatturazione.",
    steps: [
      "Vista sintetica — modifica completa in Configurazioni → Piani.",
      "Stripe Checkout si avvia dalla tab Piani."
    ],
    tip: "Per nuovi prezzi contatta chi gestisce Stripe."
  },
  commissions: {
    subtitle: "Regole e movimenti provvigioni agenti con grado L1/L2/L3.",
    steps: [
      "L1 = vendita diretta dell'agente. L2/L3 = upline quando vende un downline.",
      "Le regole tier si configurano in Rete rivenditori.",
      "Filtra per stato pending per vedere cosa pagare."
    ],
    legend: [{ pill: "pending", label: "Da approvare/pagare" }, { pill: "paid completed", label: "Saldato" }],
    tip: "Hook automatico su Stripe/Shopify in arrivo — oggi puoi simulare con RPC distribute_network_commissions."
  },
  support: {
    subtitle: "Ticket assistenza clienti Business e Moments.",
    steps: [
      "Filtra per stato Aperti per lavorare la coda.",
      "Apri ticket per leggere messaggi e aggiornare stato.",
      "Chiudi quando risolto — sparisce dagli alert."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "Priorità alta = cliente in attesa da più tempo."
  },
  crm: {
    subtitle: "Pipeline commerciale e follow-up clienti.",
    steps: [
      "Visualizza schede cliente e prossime azioni.",
      "Aggiorna stato onboarding dalla scheda cliente."
    ],
    tip: "Apri un cliente da Clienti → clic sulla riga per la scheda completa."
  },
  nfc: {
    subtitle: "Spedizioni e tag NFC Business (non Moments).",
    steps: [
      "Monitora spedizioni e associa tag alle attività.",
      "Per Moments usa Magazzino NFC Moments."
    ],
    tip: "Due magazzini separati: Business vs Moments."
  },
  materials: {
    subtitle: "Guide, PDF e materiali per team e agenti.",
    steps: [
      "Carica link o testi per kit vendita e formazione.",
      "I materiali pubblici possono finire sul portale agenti."
    ],
    tip: "Usa codici chiari (es. agent-kit) per ritrovare i file."
  }
};

const GUIDE_COLLAPSED_KEY = "khamakey_admin_guide_collapsed";

export function isGuideCollapsed(){
  try{
    return localStorage.getItem(GUIDE_COLLAPSED_KEY) === "1";
  }catch{
    return false;
  }
}

export function setGuideCollapsed(collapsed){
  try{
    localStorage.setItem(GUIDE_COLLAPSED_KEY, collapsed ? "1" : "0");
  }catch{ /* ignore */ }
}

export function renderPanelGuide(tab, elements){
  const guide = PANEL_GUIDES[tab];
  const root = elements.panelGuide;
  const subtitle = elements.adminSubtitle;
  if(!root || !guide){
    if(root) root.hidden = true;
    if(subtitle) subtitle.textContent = "";
    return;
  }
  root.hidden = false;
  if(subtitle) subtitle.textContent = guide.subtitle || "";
  if(elements.panelGuideSubtitle) elements.panelGuideSubtitle.textContent = guide.subtitle || "";
  if(elements.panelGuideSteps){
    elements.panelGuideSteps.innerHTML = (guide.steps || []).map(step=>`<li>${escapeHtml(step)}</li>`).join("");
  }
  if(elements.panelGuideLegend){
    const items = guide.legend || [];
    elements.panelGuideLegend.innerHTML = items.length ? `
      <p class="legend-title">Legenda colori</p>
      <ul class="legend-list">${items.map(item=>`
        <li><span class="status-pill ${escPillClass(item.pill)}">Esempio</span><span>${escapeHtml(item.label)}</span></li>
      `).join("")}</ul>
    ` : "";
  }
  if(elements.panelGuideTip){
    elements.panelGuideTip.innerHTML = guide.tip
      ? `<strong>Suggerimento:</strong> ${escapeHtml(guide.tip)}`
      : "";
    elements.panelGuideTip.hidden = !guide.tip;
  }
  const collapsed = isGuideCollapsed();
  root.classList.toggle("collapsed", collapsed);
  if(elements.panelGuideToggle){
    elements.panelGuideToggle.textContent = collapsed ? "Mostra guida" : "Nascondi guida";
    elements.panelGuideToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }
  document.querySelectorAll("[data-admin-tab]").forEach(button=>{
    const g = PANEL_GUIDES[button.dataset.adminTab];
    if(g?.subtitle) button.title = g.subtitle;
  });
}

function escPillClass(value){
  return String(value || "draft").split(/\s+/)[0] || "draft";
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}
