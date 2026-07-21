/** Guide contestuali pannello admin — linguaggio semplice per team non tecnico. */

export const COMMON_STATUS_LEGEND = [
  { pill: "active paid completed", label: "Verde — tutto ok / completato / pagato" },
  { pill: "pending draft", label: "Blu — in lavorazione o in attesa" },
  { pill: "low paused", label: "Arancio — attenzione o in pausa" },
  { pill: "disabled cancelled archived error", label: "Rosso — disattivato, errore o annullato" }
];

/** Guide dedicate alla consolle Moments-only (`moments-admin.html`). */
export const MOMENTS_CONSOLE_GUIDES = {
  dashboard: {
    subtitle: "Officina NFC — stock, modelli prodotto, ticket clienti Moments.",
    steps: [
      "Controlla codici disponibili — sotto soglia genera nuovi pezzi in Magazzino NFC.",
      "Flusso: Modello → genera pezzo/i con etichetta barcode → confeziona → consegna al cliente.",
      "Ticket aperti = clienti con problemi su codice, attivazione o pagina /m/.",
      "Il codice modello (es. MOM-KEY-WED) identifica la linea in magazzino e sulle etichette."
    ],
    legend: [
      { pill: "alert-danger", label: "Rosso — stock zero o blocco urgente" },
      { pill: "alert-warn", label: "Giallo — stock basso o ticket da gestire" },
      { pill: "alert-info", label: "Blu — informativo" }
    ],
    tip: "Questa consolle gestisce solo produzione NFC Moments e assistenza prodotto — non attività Business."
  },
  momentNewProduct: {
    subtitle: "Crea modello + opzionalmente 1 pezzo fisico con etichetta barcode.",
    steps: [
      "Linea oggetto + template pagina → codice modello automatico (es. MOM-KEY-WED).",
      "«Crea + 1 pezzo con etichetta barcode» = modello + codice NFC + PDF pronto (regalo, test, vendita locale).",
      "Canale Regalo/prova o Vendita locale per tracciare origine in magazzino.",
      "Poi genera altri pezzi dal Magazzino NFC quando serve stock."
    ],
    legend: [
      { pill: "active", label: "Modello attivo — usabile in magazzino" },
      { pill: "available", label: "Codice disponibile — in confezione non ancora attivato" }
    ],
    tip: "Codice attivazione = inserto confezione · Chip NFC = /m/slug (mai /k/codice) · Barcode numerico solo magazzino"
  },
  momentCatalog: {
    subtitle: "Anagrafica modelli magazzino per produrre pezzi NFC.",
    steps: [
      "Ogni riga = un tipo di oggetto (linea + template + codice modello).",
      "Modifica bundle fisici/codici NFC per confezione se serve.",
      "«Genera pezzi» apre Magazzino con modello già selezionato.",
      "Usa lo stesso codice modello sulle etichette e nella produzione."
    ],
    legend: [
      { pill: "active", label: "Modello in uso" },
      { pill: "hidden archived", label: "Non usare per nuova produzione" }
    ],
    tip: "Qui tieni solo il riferimento produzione NFC — non è il catalogo e-commerce."
  },
  momentInventory: {
    subtitle: "Genera pezzi fisici, PDF etichette Cricut 4 sezioni, export CSV.",
    steps: [
      "Quantità default 1 — anche un solo regalo o prova.",
      "PDF lotto 4 sezioni Cricut: panoramica · ovali (spiega+codice) · barcode · URL NFC completo (stessa numerazione da 1).",
      "Canale: Regalo, Vendita locale, Agente…",
      "Se la tabella sembra vuota: chip «Tutti» o «Mostra tutti» — i filtri a volte nascondono i pezzi."
    ],
    legend: [
      { pill: "available", label: "Disponibile — in scaffale o pronto spedizione" },
      { pill: "claimed active", label: "Attivato dal cliente" },
      { pill: "paused archived", label: "Fuori rotazione" }
    ],
    tip: "Link chip NFC = URL completo https://link…/m/slug · Codice attivazione in confezione · Pagina live = stesso /m/slug dopo attivazione."
  },
  momentClients: {
    subtitle: "Account e oggetti attivati: editor admin, pagine /m/ e supporto cliente.",
    steps: [
      "Crea account con email — opzionale: incolla codice dal magazzino per attivazione immediata.",
      "Tabella Oggetti: Editor apre moments.html come admin · Pagina = anteprima /m/.",
      "Filtra «Pubblicata = No» per trovare chi deve ancora completare la pagina.",
      "Scheda oggetto: copia link pubblico o PIN se il cliente ha problemi ad accedere."
    ],
    legend: [
      { pill: "active", label: "Pagina Moments pubblicata e visibile" },
      { pill: "draft pending", label: "Bozza o non ancora pubblicata" }
    ],
    tip: "Puoi aiutare il cliente senza aspettare: apri Editor dalla riga oggetto e modifica tu la pagina."
  },
  support: {
    subtitle: "Assistenza Moments — ticket clienti (codici, attivazione, pagina /m/).",
    steps: [
      "Parti da «Da lavorare» o clicca i KPI (urgenti / attesa cliente / da chiudere).",
      "Apri il ticket → assegna a te, rispondi via email (Resend) o Apri editor.",
      "Filtro «I miei» = solo ticket assegnati a te; dopo l’email lo stato va in attesa cliente.",
      "Da Clienti Moments puoi tornare ai Ticket o aprire l’Editor in un click."
    ],
    legend: [
      { pill: "urgent", label: "Urgente — cliente bloccato" },
      { pill: "open", label: "Aperto" },
      { pill: "in_progress", label: "In lavorazione" },
      { pill: "waiting_customer", label: "Attesa cliente" },
      { pill: "resolved", label: "Risolto — da chiudere" }
    ],
    tip: "Urgente = cliente bloccato. Usa Copia email o Scrivi email per rispondere subito."
  }
};

export const PANEL_GUIDES = {
  dashboard: {
    subtitle: "La tua bacheca: cosa fare oggi, in ordine di priorità.",
    steps: [
      "Clicca un pulsante colorato per iniziare (ordini, clienti, rete partner…).",
      "Leggi gli alert — rosso = urgente, giallo = presto, verde = tutto ok.",
      "Non sai dove andare? Resta qui e segui i suggerimenti."
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
    subtitle: "Attività Business con pagina /p/, codice NFC e editor.",
    steps: [
      "Cerca per nome, slug, email o codice NFC nella barra in alto.",
      "Clicca Editor per modificare la pagina del cliente (o apri index.html?business=<id>).",
      "Clicca Pagina o Analytics per vedere visitatori e performance.",
      "Nel drawer: email, codice NFC, link /k/ e note cliente."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "Ogni cliente Business ha un codice NFC dal Magazzino NFC Business — senza codice attivo non può usare l'editor (account nuovi)."
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
  businessInventory: {
    subtitle: "Magazzino codici NFC Business: disponibili, attivati, collegati ai clienti.",
    steps: [
      "Genera lotti di codici con il modulo in alto (prefisso KHAMA, SKU opzionale).",
      "Filtra per stato Disponibili per vedere cosa puoi vendere o spedire.",
      "Esporta CSV dal pulsante in alto per stampare o archiviare i codici.",
      "Dopo Provisioning cliente, copia i link al cliente dalla scheda Clienti Business."
    ],
    legend: [
      { pill: "available", label: "Disponibile — pronto per vendita o attivazione" },
      { pill: "claimed active", label: "Attivato dal cliente" },
      { pill: "paused", label: "In pausa — non usare" },
      { pill: "archived", label: "Archiviato" }
    ],
    tip: "I codici Business aprono l'editor su index.html — il chip fisico punta a /k/<codice> che reindirizza alla pagina /p/."
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
    subtitle: "Partner che vendono per KhamaKey o portano nuovi clienti.",
    steps: [
      "Scrivi nome ed email — bastano quelli per iniziare.",
      "Scegli che tipo è (agente, rivenditore, punto autorizzato).",
      "Se ha un capo in rete, selezionalo in «Chi lo segue?».",
      "Salva — il codice invito si crea da solo se lo lasci vuoto."
    ],
    legend: COMMON_STATUS_LEGEND,
    tip: "In modalità semplice vedi solo i campi essenziali. Attiva «Modalità avanzata» per tier e listini."
  },
  resellerNetwork: {
    subtitle: "Chi segue chi — e cosa abbiamo consegnato ai partner.",
    steps: [
      "Guarda l'albero: chi è sotto a chi nella rete.",
      "Registra le consegne (card NFC, materiali) nella sezione in basso.",
      "Per cambiare le regole % per tutti, passa a modalità avanzata."
    ],
    legend: [
      { pill: "active", label: "Partner attivo" },
      { pill: "pending", label: "Soldi ancora da pagare" }
    ],
    tip: "Se Mario segue Lucia, quando Mario vende anche Lucia guadagna una parte."
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
    subtitle: "Quanto spetta a ogni partner — cosa pagare e cosa è già saldato.",
    steps: [
      "Giallo = ancora da pagare al partner.",
      "Verde = già saldato.",
      "«Vendita diretta» = l'ha venduto lui. «Dal suo team» = l'ha venduto qualcuno che segue."
    ],
    legend: [{ pill: "pending", label: "Da pagare" }, { pill: "paid completed", label: "Già pagato" }],
    tip: "Prima di pagare, controlla sempre con l'amministrazione."
  },
  support: {
    subtitle: "Ticket assistenza clienti Business e Moments.",
    steps: [
      "Usa «Da lavorare» o i KPI per la coda operativa.",
      "Apri ticket: messaggio, email, note staff separate, aggiorna stato.",
      "Segna Risolto poi Chiuso quando il cliente è a posto."
    ],
    legend: [
      { pill: "urgent", label: "Urgente" },
      { pill: "open", label: "Aperto" },
      { pill: "waiting_customer", label: "Attesa cliente" },
      { pill: "resolved", label: "Risolto" }
    ],
    tip: "Priorità urgente = cliente bloccato; alta = da smaltire presto."
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

export function getActivePanelGuides(){
  const product = document.documentElement?.dataset?.adminProduct;
  return product === "moments" ? MOMENTS_CONSOLE_GUIDES : PANEL_GUIDES;
}

export function renderPanelGuide(tab, elements){
  const guide = getActivePanelGuides()[tab];
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
    const g = getActivePanelGuides()[button.dataset.adminTab];
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
