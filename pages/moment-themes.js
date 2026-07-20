/** Palette e varianti pagina Moments — colori saturi e leggibili (editor + anteprima). */
export const COLOR_PALETTES = {
  // bl = sfondo pagina (ciò che vedi nei cerchi) · go/hero = accenti · card/in si adattano in resolvePalette
  amore     : { go:"#BE123C", g2:"#9F1239", ro:"#E11D48", bl:"#FECDD3", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#BE123C", mu:"#475569" },
  rubino    : { go:"#B91C1C", g2:"#7F1D1D", ro:"#DC2626", bl:"#FECACA", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#B91C1C", mu:"#475569" },
  gentleman : { go:"#38BDF8", g2:"#0EA5E9", ro:"#64748B", bl:"#0F172A", bl2:"#1E293B", card:"#1E293B", in:"#F8FAFC", hero:"#020617", mu:"#94A3B8" },
  uomo      : { go:"#1E40AF", g2:"#1E3A8A", ro:"#2563EB", bl:"#BFDBFE", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#1E40AF", mu:"#475569" },
  aurora    : { go:"#6D28D9", g2:"#4C1D95", ro:"#7C3AED", bl:"#DDD6FE", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#6D28D9", mu:"#475569" },
  terracotta: { go:"#C2410C", g2:"#9A3412", ro:"#EA580C", bl:"#FED7AA", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#C2410C", mu:"#475569" },
  rosa      : { go:"#BE185D", g2:"#9D174D", ro:"#DB2777", bl:"#FBCFE8", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#BE185D", mu:"#475569" },
  blu       : { go:"#0369A1", g2:"#0C4A6E", ro:"#0284C7", bl:"#BAE6FD", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#0369A1", mu:"#475569" },
  salvia    : { go:"#047857", g2:"#064E3B", ro:"#059669", bl:"#A7F3D0", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#047857", mu:"#475569" },
  bordeaux  : { go:"#F43F5E", g2:"#9F1239", ro:"#BE123C", bl:"#4C0519", bl2:"#881337", card:"#881337", in:"#FFF1F2", hero:"#4C0519", mu:"#FDA4AF" },
  perla     : { go:"#A8A29E", g2:"#57534E", ro:"#78716C", bl:"#292524", bl2:"#44403C", card:"#44403C", in:"#FAFAF9", hero:"#1C1917", mu:"#A8A29E" },
  lavanda   : { go:"#6D28D9", g2:"#5B21B6", ro:"#7C3AED", bl:"#C4B5FD", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#6D28D9", mu:"#475569" },
  cipria    : { go:"#B45309", g2:"#92400E", ro:"#D97706", bl:"#FDE68A", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#B45309", mu:"#57534E" },
  corallo   : { go:"#EA580C", g2:"#C2410C", ro:"#F97316", bl:"#FDBA74", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#EA580C", mu:"#475569" },
  miele     : { go:"#A16207", g2:"#854D0E", ro:"#CA8A04", bl:"#FDE047", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#A16207", mu:"#475569" },
  notte     : { go:"#38BDF8", g2:"#0284C7", ro:"#0EA5E9", bl:"#020617", bl2:"#0F172A", card:"#0F172A", in:"#F8FAFC", hero:"#020617", mu:"#94A3B8" },
  neve      : { go:"#0369A1", g2:"#0C4A6E", ro:"#0284C7", bl:"#E2E8F0", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#0369A1", mu:"#475569" },
  classic   : { go:"#15803D", g2:"#14532D", ro:"#16A34A", bl:"#BBF7D0", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#15803D", mu:"#475569" },
};

/** Palette con sfondo scuro: testo chiaro, card tonali. */
export const DARK_PAGE_PALETTES = new Set(["gentleman", "notte", "perla", "bordeaux"]);

export function isDarkPageBackground(hex = ""){
  const raw = String(hex || "").replace("#","").trim();
  if(raw.length !== 6) return false;
  const n = Number.parseInt(raw, 16);
  if(Number.isNaN(n)) return false;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 145;
}

export const PALETTE_VARIANTS = {
  chiaro: {},
  // "Caldo" = sfondo più avvolgente, non un blocco scuro piatto (prima sembrava "colore morto")
  caldo: {
    amore:    { bl:"#FDA4AF", hero:"#BE123C", go:"#E11D48" },
    rubino:   { bl:"#F87171", hero:"#B91C1C", go:"#DC2626", in:"#111111" },
    rosa:     { bl:"#F9A8D4", hero:"#BE185D", go:"#DB2777" },
    bordeaux: { bl:"#881337", hero:"#4C0519", go:"#F43F5E", card:"#9F1239", bl2:"#9F1239", in:"#FFF1F2" },
    terracotta:{ bl:"#FB923C", hero:"#C2410C", go:"#EA580C" },
    corallo:  { bl:"#FB923C", hero:"#EA580C", go:"#F97316" },
    cipria:   { bl:"#FBBF24", hero:"#B45309", go:"#D97706" },
    miele:    { bl:"#FACC15", hero:"#A16207", go:"#CA8A04" },
    classic:  { bl:"#86EFAC", hero:"#15803D", go:"#16A34A" },
    blu:      { bl:"#7DD3FC", hero:"#0369A1", go:"#0284C7" },
    salvia:   { bl:"#6EE7B7", hero:"#047857", go:"#059669" },
    aurora:   { bl:"#C4B5FD", hero:"#6D28D9", go:"#7C3AED" },
    lavanda:  { bl:"#A78BFA", hero:"#6D28D9", go:"#7C3AED" }
  },
  scuro: {
    notte: { bl:"#020617", hero:"#020617", go:"#38BDF8", g2:"#0284C7", card:"#0F172A", bl2:"#0F172A", in:"#F8FAFC", ro:"#0EA5E9" },
    gentleman: { bl:"#020617", hero:"#020617", go:"#38BDF8", card:"#0F172A", bl2:"#0F172A", in:"#F8FAFC" },
    perla: { bl:"#1C1917", hero:"#0C0A09", go:"#A8A29E", card:"#292524", bl2:"#292524", in:"#FAFAF9" },
    bordeaux: { bl:"#3F0A1A", hero:"#4C0519", go:"#FB7185", card:"#881337", bl2:"#881337", in:"#FFF1F2" }
  }
};

export const PALETTE_LABELS = {
  amore:"Rosso vivo", rubino:"Rubino", gentleman:"Antracite", uomo:"Blu royal",
  aurora:"Viola", terracotta:"Arancio terracotta",
  rosa:"Rosa acceso", blu:"Azzurro oceano", salvia:"Verde smeraldo", bordeaux:"Bordeaux",
  perla:"Pietra naturale", lavanda:"Lavanda", cipria:"Ambra", corallo:"Corallo tramonto",
  miele:"Oro sole",   notte:"Nero notte", neve:"Grigio ghiaccio", classic:"Verde KhamaKey"
};

export const VARIANT_LABELS = { chiaro:"Chiaro", caldo:"Caldo", scuro:"Scuro" };

export const HERO_STYLES = {
  classico: "Classico (gradiente)",
  profilo: "Profilo (copertina + ritratto)",
  romantico: "Romantico caldo",
  intimo: "Intimo con card",
  fullscreen: "Immagine a tutto schermo"
};

export const FONT_PAIRS = {
  classic:{
    label:"Classico KhamaKey (script + serif)",
    display:'"Great Vibes", cursive',
    body:'"Cormorant Infant", Georgia, serif',
    ui:'"DM Sans", sans-serif',
    google:"family=Great+Vibes&family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700"
  },
  romantic:{
    label:"Romantico (script elegante)",
    display:'"Great Vibes", cursive',
    body:'"Cormorant Infant", Georgia, serif',
    ui:'"DM Sans", sans-serif',
    google:"family=Great+Vibes&family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700"
  },
  elegant:{
    label:"Elegante (solo serif)",
    display:'"Cormorant Infant", Georgia, serif',
    body:'"Cormorant Infant", Georgia, serif',
    ui:'"DM Sans", sans-serif',
    google:"family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;600;700"
  },
  modern:{
    label:"Moderno (sans-serif pulito)",
    display:'"DM Sans", sans-serif',
    body:'"DM Sans", sans-serif',
    ui:'"DM Sans", sans-serif',
    google:"family=DM+Sans:wght@400;600;700"
  }
};

export function resolveFontPair(key = "classic"){
  return FONT_PAIRS[key] || FONT_PAIRS.classic;
}

/** Sezioni emotive aggiuntive (da love.html) — roadmap implementazione editor */
export const EMOTIONAL_SECTION_CATALOG = {
  counter: { name:"Contatore", desc:"Tempo trascorso insieme (anniversario, viaggio, memoria)" },
  dedication: { name:"Dedica", desc:"Lettera personale con firma" },
  timeline: { name:"Timeline", desc:"Tappe con data e descrizione" },
  gallery: { name:"Galleria", desc:"Album scorrevole con lightbox" },
  promises: { name:"Promesse", desc:"Lista di impegni o valori con emoji" },
  places: { name:"Luoghi del cuore", desc:"Posti simbolo con icona e link" },
  dreams: { name:"Sogni insieme", desc:"Bucket list con spunta" },
  countdown: { name:"Countdown", desc:"Conto alla rovescia verso l'evento" },
  music: { name:"Musica", desc:"Brano o playlist Spotify" },
  video: { name:"Video", desc:"YouTube o video caricato" },
  quote: { name:"Citazione", desc:"Frase su sfondo elegante" },
  signature: { name:"Firma finale", desc:"Chiusura emozionale della pagina" },
  letter_future: { name:"Lettera al futuro", desc:"Messaggio da rileggere tra anni" },
  rituals: { name:"Rituali", desc:"Abitudini e momenti quotidiani" },
  pet: { name:"Animale", desc:"Il compagno a quattro zampe" },
  numbers: { name:"I nostri numeri", desc:"Statistiche simboliche (giorni, km, foto…)" }
};

export const CREATOR_SERVICES_GAP = {
  integrated: [
    "Editor mobile con bottom nav e save bar",
    "Upload foto Supabase Storage",
    "PIN pagina pubblica",
    "Ordine sezioni drag & drop",
    "Template per tipo evento (matrimonio, viaggio…)",
    "Anteprima live"
  ],
  planned_editor: [
    "11 palette colore + 3 varianti atmosfera",
    "5 stili hero (profilo, romantico, intimo…)",
    "Contatore «insieme da» live",
    "Sezioni strutturate: promesse, luoghi, sogni, rituali",
    "Musica Spotify / video YouTube",
    "Countdown evento",
    "Citazione e firma finale",
    "Navigazione a 2 livelli: Ordine · Design · Contenuti · Account"
  ],
  planned_platform: [
    "Pagina pubblica serif + animazioni scroll (da love.html)",
    "Galleria swipe orizzontale + lightbox",
    "WhatsApp consegna link+PIN al cliente",
    "Integrazione ordini Airtable (team produzione) — separata dall'editor cliente"
  ],
  not_for_client_editor: [
    "Export HTML standalone (sostituito da URL NFC permanente)",
    "Publish Cloudflare Pages per file statico (usiamo Worker + Supabase)",
    "Cloudinary upload (sostituito da Cloudflare R2 + Worker CDN)"
  ]
};

export function resolvePalette(palette = "classic", variant = "chiaro"){
  const base = { ...(COLOR_PALETTES[palette] || COLOR_PALETTES.classic) };
  const overrides = PALETTE_VARIANTS[variant]?.[palette];
  if(overrides) Object.assign(base, overrides);
  const dark = DARK_PAGE_PALETTES.has(palette) || isDarkPageBackground(base.bl) || variant === "scuro";
  if(dark){
    base.in = base.in && base.in !== "#111111" ? base.in : "#F8FAFC";
    base.mu = base.mu || "#94A3B8";
    base.card = base.card && base.card !== "#FFFFFF" ? base.card : (base.bl2 || base.bl);
    base.bl2 = base.bl2 || base.card || base.bl;
  }else{
    base.in = "#111111";
    base.mu = base.mu || "#475569";
    base.card = "#FFFFFF";
    base.bl2 = "#FFFFFF";
  }
  return base;
}

export function legacyThemeToPalette(theme){
  return ({ celebration:"corallo", minimal:"neve", memorial:"perla" })[theme] || "classic";
}

export function normalizeDesignState(state = {}){
  const palette = state.colorPalette || legacyThemeToPalette(state.theme);
  const variant = ["chiaro","caldo","scuro"].includes(state.themeVariant) ? state.themeVariant : "chiaro";
  const heroStyle = Object.keys(HERO_STYLES).includes(state.heroStyle) ? state.heroStyle : "classico";
  const fontPair = Object.keys(FONT_PAIRS).includes(state.fontPair) ? state.fontPair : "classic";
  return { palette, variant, heroStyle, fontPair, colors: resolvePalette(palette, variant), fonts: resolveFontPair(fontPair) };
}

/** Preset visivi — un tap imposta palette, atmosfera, font e copertina insieme. */
export const PAGE_LOOKS = {
  classic:{
    label:"KhamaKey",
    emoji:"💚",
    hint:"Verde e blu — pulito e universale",
    palette:"classic",
    variant:"chiaro",
    fontPair:"classic",
    heroStyle:"classico"
  },
  amore:{
    label:"Amore",
    emoji:"❤️",
    hint:"Rosso classico · riquadri bianchi · testi neri",
    palette:"amore",
    variant:"caldo",
    fontPair:"romantic",
    heroStyle:"romantico"
  },
  passion:{
    label:"Passione",
    emoji:"🔥",
    hint:"Rosso scuro · riquadri bianchi · testi neri",
    palette:"rubino",
    variant:"caldo",
    fontPair:"romantic",
    heroStyle:"romantico"
  },
  gentleman:{
    label:"Sartoriale",
    emoji:"🎩",
    hint:"Grigio antracite · card bianche",
    palette:"gentleman",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  uomo:{
    label:"Uomo",
    emoji:"🧔",
    hint:"Navy forte · card bianche · bronzo",
    palette:"uomo",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  romantic:{
    label:"Rosa gold",
    emoji:"💕",
    hint:"Magenta · riquadri bianchi · testi neri",
    palette:"rosa",
    variant:"caldo",
    fontPair:"romantic",
    heroStyle:"classico"
  },
  elegant:{
    label:"Viola aurora",
    emoji:"✨",
    hint:"Viola intenso · riquadri bianchi · testi neri",
    palette:"aurora",
    variant:"chiaro",
    fontPair:"elegant",
    heroStyle:"classico"
  },
  party:{
    label:"Festa corallo",
    emoji:"🎉",
    hint:"Arancio vivo · riquadri bianchi · testi neri",
    palette:"corallo",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  festive:{
    label:"Natale",
    emoji:"🎄",
    hint:"Verde e oro · riquadri bianchi · testi neri",
    palette:"miele",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  nature:{
    label:"Verde natura",
    emoji:"🌿",
    hint:"Verde bosco · riquadri bianchi · testi neri",
    palette:"salvia",
    variant:"chiaro",
    fontPair:"classic",
    heroStyle:"profilo"
  },
  voyage:{
    label:"Viaggio terra",
    emoji:"✈️",
    hint:"Terracotta · riquadri bianchi · testi neri",
    palette:"terracotta",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  ocean:{
    label:"Oceano",
    emoji:"🌊",
    hint:"Blu profondo · riquadri bianchi · testi neri",
    palette:"blu",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  savana:{
    label:"Savana",
    emoji:"🦁",
    hint:"Verde safari · riquadri bianchi · testi neri",
    palette:"salvia",
    variant:"caldo",
    fontPair:"classic",
    heroStyle:"profilo"
  },
  tramonto:{
    label:"Tramonto",
    emoji:"🌅",
    hint:"Arancio tramonto · riquadri bianchi · testi neri",
    palette:"corallo",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  pop:{
    label:"Pop lavanda",
    emoji:"💜",
    hint:"Viola acceso · riquadri bianchi · testi neri",
    palette:"lavanda",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  night:{
    label:"Notte",
    emoji:"🌙",
    hint:"Nero classico · riquadri bianchi · testi neri",
    palette:"notte",
    variant:"scuro",
    fontPair:"elegant",
    heroStyle:"romantico"
  },
  wedding:{
    label:"Matrimonio",
    emoji:"💍",
    hint:"Bordeaux · riquadri bianchi · testi neri",
    palette:"bordeaux",
    variant:"caldo",
    fontPair:"romantic",
    heroStyle:"romantico"
  },
  memory:{
    label:"Ricordi",
    emoji:"📸",
    hint:"Marrone caldo · riquadri bianchi · testi neri",
    palette:"cipria",
    variant:"caldo",
    fontPair:"classic",
    heroStyle:"intimo"
  },
  neve:{
    label:"Neve",
    emoji:"❄️",
    hint:"Grigio ghiaccio · card bianche",
    palette:"neve",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  }
};

/** Solo look pertinenti per categoria — niente Natale in viaggio, ecc. */
export const LOOKS_FOR_MOMENT_TYPE = {
  free:["classic","elegant","gentleman","night"],
  love:["amore","passion","romantic","wedding"],
  valentine:["passion","amore","romantic"],
  wedding:["wedding","amore","passion","elegant"],
  mom:["amore","romantic","elegant","memory"],
  dad:["uomo","gentleman","night","classic"],
  child:["party","pop","nature","classic"],
  kids:["party","pop","nature","classic"],
  birthday:["party","tramonto","pop","classic"],
  party:["party","tramonto","pop","classic"],
  christmas:["festive","party","memory","classic"],
  memory:["memory","neve","night","gentleman"],
  photo:["memory","neve","night","gentleman"],
  memorial:["night","memory","neve","gentleman"],
  travel:["voyage","ocean","savana","tramonto"],
  family:["classic","amore","memory","nature"],
  pet:["nature","savana","voyage","classic"],
  friendship:["party","pop","amore","classic"],
  communion:["elegant","wedding","classic","gentleman"],
  baptism:["elegant","classic","memory","neve"],
  portfolio:["uomo","gentleman","night","elegant"]
};

export const LOOK_FOR_MOMENT_TYPE = {
  free:"classic",
  love:"amore",
  valentine:"passion",
  wedding:"wedding",
  mom:"amore",
  dad:"uomo",
  child:"party",
  kids:"party",
  birthday:"party",
  party:"party",
  christmas:"festive",
  memory:"memory",
  photo:"memory",
  memorial:"night",
  travel:"voyage",
  family:"classic",
  pet:"nature",
  friendship:"party",
  communion:"elegant",
  baptism:"elegant",
  portfolio:"uomo"
};

export function findLookForDesign({ colorPalette, themeVariant, fontPair, heroStyle } = {}){
  const match = Object.entries(PAGE_LOOKS).find(([, look]) =>
    look.palette === colorPalette
    && look.variant === themeVariant
    && look.fontPair === fontPair
    && look.heroStyle === heroStyle
  );
  return match?.[0] || "";
}

export function suggestLookForMomentType(momentType){
  return LOOK_FOR_MOMENT_TYPE[momentType] || "classic";
}

/** Restituisce solo i look della categoria — non tutti insieme. */
export function looksForMomentType(momentType){
  const list = LOOKS_FOR_MOMENT_TYPE[momentType] || LOOKS_FOR_MOMENT_TYPE.free;
  return list.filter(id => PAGE_LOOKS[id]);
}

export const PAGE_DECOR_PRESETS = {
  none:{ label:"Nessuno", hint:"Pagina pulita", emojis:[] },
  sparkle:{ label:"Scintille", hint:"✨ Leggero e magico", emojis:["✨","⭐","💫","✦"] },
  hearts:{ label:"Cuori", hint:"💕 Romantico e dolce", emojis:["💕","♥","💗","✨"] },
  festive:{ label:"Festa", hint:"🎉 Allegro per compleanni", emojis:["🎉","🎊","🥳","✨"] },
  christmas:{ label:"Natale", hint:"🎄 Nevicata e regali", emojis:["🎄","❄","⭐","🎁"] },
  playful:{ label:"Giocoso", hint:"🌈 Per bambini e famiglia", emojis:["🌈","🎈","😊","⭐"] }
};

/** Adesivi filtrati per categoria pagina. */
export const DECOR_FOR_MOMENT_TYPE = {
  christmas:["none","christmas","festive","sparkle"],
  birthday:["none","festive","playful","sparkle"],
  party:["none","festive","playful","sparkle"],
  kids:["none","playful","festive","sparkle"],
  child:["none","playful","festive","sparkle"],
  love:["none","hearts","sparkle"],
  valentine:["none","hearts","sparkle"],
  wedding:["none","hearts","sparkle"],
  travel:["none","sparkle"],
  memory:["none","sparkle"],
  photo:["none","sparkle"],
  memorial:["none","sparkle"],
  default:["none","sparkle","playful"]
};

export function decorPresetsForMomentType(momentType){
  const list = DECOR_FOR_MOMENT_TYPE[momentType] || DECOR_FOR_MOMENT_TYPE.default;
  return list.filter(id => PAGE_DECOR_PRESETS[id]);
}

export function decorPresetForType(momentType){
  const map = { christmas:"christmas", birthday:"festive", kids:"playful", child:"playful", party:"festive", valentine:"hearts", love:"hearts", wedding:"sparkle" };
  return map[momentType] || "none";
}
