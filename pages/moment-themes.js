/**
 * Palette Moments (v162)
 * - bl = sfondo pagina (ciò che vedi nel cerchio) — colori densi e distinti
 * - go = accenti su card bianche (bottoni, date, icone) — stesso tono, più scuro
 * - card sempre bianche; cardInk sempre #111 (testo leggibile)
 */
export const COLOR_PALETTES = {
  rosso     : { bl:"#DC2626", g2:"#991B1B", hero:"#B91C1C", go:"#B91C1C", ro:"#F87171", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#FEE2E2" },
  rosa      : { bl:"#DB2777", g2:"#9D174D", hero:"#BE185D", go:"#BE185D", ro:"#F472B6", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#FCE7F3" },
  bordeaux  : { bl:"#7F1D1D", g2:"#450A0A", hero:"#991B1B", go:"#9F1239", ro:"#FB7185", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFF1F2", mu:"#FECDD3" },
  arancio   : { bl:"#EA580C", g2:"#9A3412", hero:"#C2410C", go:"#C2410C", ro:"#FB923C", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#FFEDD5" },
  ambra     : { bl:"#B45309", g2:"#78350F", hero:"#92400E", go:"#92400E", ro:"#FBBF24", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFBEB", mu:"#FEF3C7" },
  verde     : { bl:"#15803D", g2:"#14532D", hero:"#166534", go:"#166534", ro:"#4ADE80", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#DCFCE7" },
  blu       : { bl:"#1D4ED8", g2:"#1E3A8A", hero:"#1E40AF", go:"#1E40AF", ro:"#60A5FA", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#DBEAFE" },
  azzurro   : { bl:"#0369A1", g2:"#0C4A6E", hero:"#0284C7", go:"#0C4A6E", ro:"#38BDF8", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#E0F2FE" },
  viola     : { bl:"#7C3AED", g2:"#4C1D95", hero:"#6D28D9", go:"#5B21B6", ro:"#A78BFA", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FFFFFF", mu:"#EDE9FE" },
  nero      : { bl:"#0A0A0A", g2:"#000000", hero:"#171717", go:"#334155", ro:"#94A3B8", bl2:"#FFFFFF", card:"#FFFFFF", in:"#FAFAFA", mu:"#CBD5E1" },
  antracite : { bl:"#1E293B", g2:"#020617", hero:"#0F172A", go:"#334155", ro:"#94A3B8", bl2:"#FFFFFF", card:"#FFFFFF", in:"#F8FAFC", mu:"#CBD5E1" },
  crema     : { bl:"#FFF7ED", g2:"#FFEDD5", hero:"#FED7AA", go:"#C2410C", ro:"#FB923C", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", mu:"#9A3412" }
};

const PALETTE_ALIASES = {
  amore:"rosso", rubino:"rosso",
  terracotta:"arancio", corallo:"arancio",
  cipria:"ambra", miele:"ambra",
  classic:"verde", salvia:"verde",
  uomo:"blu", neve:"azzurro",
  aurora:"viola", lavanda:"viola",
  notte:"nero", gentleman:"antracite", perla:"antracite"
};

for(const [alias, canon] of Object.entries(PALETTE_ALIASES)){
  COLOR_PALETTES[alias] = { ...COLOR_PALETTES[canon] };
}

/** Ordine cerchi nel picker (12 colori distinti, con rosso vero). */
export const PALETTE_PICKER_ORDER = [
  "rosso","rosa","bordeaux","arancio","ambra","verde","blu","azzurro","viola","nero","antracite","crema"
];

export function canonicalizePalette(key = "verde"){
  if(PALETTE_PICKER_ORDER.includes(key)) return key;
  return PALETTE_ALIASES[key] || "verde";
}

/** Solo nero/antracite forzano atmosfera «scuro» al tap; gli altri restano «chiaro» con sfondo colorato. */
export const DARK_PAGE_PALETTES = new Set(["nero","antracite"]);

export function isDarkPageBackground(hex = ""){
  const raw = String(hex || "").replace("#","").trim();
  if(raw.length !== 6) return false;
  const n = Number.parseInt(raw, 16);
  if(Number.isNaN(n)) return false;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 160;
}

export const PALETTE_VARIANTS = {
  chiaro: {},
  caldo: {
    rosso: { bl:"#EF4444", hero:"#DC2626", go:"#B91C1C" },
    rosa: { bl:"#EC4899", hero:"#DB2777", go:"#BE185D" },
    arancio: { bl:"#F97316", hero:"#EA580C", go:"#C2410C" },
    ambra: { bl:"#D97706", hero:"#B45309", go:"#92400E", in:"#FFFBEB" },
    verde: { bl:"#16A34A", hero:"#15803D", go:"#166534" },
    crema: { bl:"#FFEDD5", hero:"#FDBA74", go:"#C2410C", in:"#111111" }
  },
  scuro: {
    nero: { bl:"#000000", hero:"#0A0A0A", go:"#64748B" },
    antracite: { bl:"#020617", hero:"#0F172A", go:"#0284C7" },
    bordeaux: { bl:"#450A0A", hero:"#7F1D1D", go:"#BE123C" },
    rosso: { bl:"#991B1B", hero:"#7F1D1D", go:"#DC2626" }
  }
};

export const PALETTE_LABELS = {
  rosso:"Rosso", rosa:"Rosa", bordeaux:"Bordeaux", arancio:"Arancio",
  ambra:"Ambra", verde:"Verde", blu:"Blu", azzurro:"Azzurro",
  viola:"Viola", nero:"Nero", antracite:"Antracite", crema:"Crema",
  amore:"Rosso", rubino:"Rosso", classic:"Verde", salvia:"Verde",
  gentleman:"Antracite", notte:"Nero", perla:"Antracite", uomo:"Blu",
  neve:"Azzurro", aurora:"Viola", lavanda:"Viola", terracotta:"Arancio",
  corallo:"Arancio", cipria:"Ambra", miele:"Ambra"
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

export function resolvePalette(palette = "verde", variant = "chiaro"){
  const key = canonicalizePalette(palette);
  const base = { ...(COLOR_PALETTES[key] || COLOR_PALETTES.verde) };
  const overrides = PALETTE_VARIANTS[variant]?.[key];
  if(overrides) Object.assign(base, overrides);
  // Card sempre bianche + testo scuro (mai ink chiaro sulle card)
  base.card = "#FFFFFF";
  base.bl2 = "#FFFFFF";
  base.cardInk = "#111111";
  const darkPage = isDarkPageBackground(base.bl) || variant === "scuro";
  if(darkPage){
    if(!base.in || base.in === "#111111" || isDarkPageBackground(base.in)) base.in = "#F8FAFC";
    base.mu = base.mu || "#E2E8F0";
  }else{
    base.in = "#111111";
    base.mu = base.mu || "#475569";
  }
  base.ink = base.in;
  return base;
}

export function legacyThemeToPalette(theme){
  return ({ celebration:"arancio", minimal:"crema", memorial:"antracite" })[theme] || "verde";
}

export function normalizeDesignState(state = {}){
  const palette = canonicalizePalette(state.colorPalette || legacyThemeToPalette(state.theme));
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
    hint:"Verde pieno · riquadri bianchi · testi neri",
    palette:"verde",
    variant:"chiaro",
    fontPair:"classic",
    heroStyle:"classico"
  },
  amore:{
    label:"Amore",
    emoji:"❤️",
    hint:"Rosso vivo · riquadri bianchi · testi neri",
    palette:"rosso",
    variant:"chiaro",
    fontPair:"romantic",
    heroStyle:"romantico"
  },
  passion:{
    label:"Passione",
    emoji:"🔥",
    hint:"Bordeaux · riquadri bianchi · testi neri",
    palette:"bordeaux",
    variant:"chiaro",
    fontPair:"romantic",
    heroStyle:"romantico"
  },
  gentleman:{
    label:"Sartoriale",
    emoji:"🎩",
    hint:"Antracite · card bianche",
    palette:"antracite",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  uomo:{
    label:"Uomo",
    emoji:"🧔",
    hint:"Blu reale · card bianche",
    palette:"blu",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  romantic:{
    label:"Rosa",
    emoji:"💕",
    hint:"Rosa pieno · riquadri bianchi · testi neri",
    palette:"rosa",
    variant:"chiaro",
    fontPair:"romantic",
    heroStyle:"classico"
  },
  elegant:{
    label:"Viola",
    emoji:"✨",
    hint:"Viola intenso · riquadri bianchi · testi neri",
    palette:"viola",
    variant:"chiaro",
    fontPair:"elegant",
    heroStyle:"classico"
  },
  party:{
    label:"Festa",
    emoji:"🎉",
    hint:"Arancio vivo · riquadri bianchi · testi neri",
    palette:"arancio",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  festive:{
    label:"Natale",
    emoji:"🎄",
    hint:"Ambra e verde · riquadri bianchi · testi neri",
    palette:"ambra",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  nature:{
    label:"Verde natura",
    emoji:"🌿",
    hint:"Verde bosco · riquadri bianchi · testi neri",
    palette:"verde",
    variant:"chiaro",
    fontPair:"classic",
    heroStyle:"profilo"
  },
  voyage:{
    label:"Viaggio",
    emoji:"✈️",
    hint:"Arancio terra · riquadri bianchi · testi neri",
    palette:"arancio",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  ocean:{
    label:"Oceano",
    emoji:"🌊",
    hint:"Azzurro pieno · riquadri bianchi · testi neri",
    palette:"azzurro",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  savana:{
    label:"Savana",
    emoji:"🦁",
    hint:"Ambra · riquadri bianchi · testi neri",
    palette:"ambra",
    variant:"chiaro",
    fontPair:"classic",
    heroStyle:"profilo"
  },
  tramonto:{
    label:"Tramonto",
    emoji:"🌅",
    hint:"Arancio tramonto · riquadri bianchi · testi neri",
    palette:"arancio",
    variant:"caldo",
    fontPair:"modern",
    heroStyle:"classico"
  },
  pop:{
    label:"Pop",
    emoji:"💜",
    hint:"Viola acceso · riquadri bianchi · testi neri",
    palette:"viola",
    variant:"chiaro",
    fontPair:"modern",
    heroStyle:"classico"
  },
  night:{
    label:"Notte",
    emoji:"🌙",
    hint:"Nero · riquadri bianchi · testi neri",
    palette:"nero",
    variant:"scuro",
    fontPair:"elegant",
    heroStyle:"romantico"
  },
  wedding:{
    label:"Matrimonio",
    emoji:"💍",
    hint:"Bordeaux · riquadri bianchi · testi neri",
    palette:"bordeaux",
    variant:"chiaro",
    fontPair:"romantic",
    heroStyle:"romantico"
  },
  memory:{
    label:"Ricordi",
    emoji:"📸",
    hint:"Crema calda · riquadri bianchi · testi neri",
    palette:"crema",
    variant:"caldo",
    fontPair:"classic",
    heroStyle:"intimo"
  },
  neve:{
    label:"Neve",
    emoji:"❄️",
    hint:"Crema chiara · accenti arancio",
    palette:"crema",
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
  const palette = canonicalizePalette(colorPalette);
  const match = Object.entries(PAGE_LOOKS).find(([, look]) =>
    look.palette === palette
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
