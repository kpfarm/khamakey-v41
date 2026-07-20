/** Palette e varianti pagina Moments — colori saturi e leggibili (editor + anteprima). */
export const COLOR_PALETTES = {
  // go/hero = accento vivo · g2 = scuro correlato · ro = tinta media (non pastello) · bl = sfondo pagina
  amore     : { go:"#E11D48", g2:"#9F1239", ro:"#F43F5E", bl:"#FFF1F2", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#BE123C", mu:"#475569" },
  rubino    : { go:"#DC2626", g2:"#7F1D1D", ro:"#EF4444", bl:"#FEF2F2", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#B91C1C", mu:"#475569" },
  gentleman : { go:"#1E293B", g2:"#020617", ro:"#334155", bl:"#F1F5F9", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#0F172A", mu:"#475569" },
  uomo      : { go:"#1D4ED8", g2:"#1E3A8A", ro:"#2563EB", bl:"#EFF6FF", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#1E40AF", mu:"#475569" },
  aurora    : { go:"#7C3AED", g2:"#4C1D95", ro:"#8B5CF6", bl:"#F5F3FF", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#6D28D9", mu:"#475569" },
  terracotta: { go:"#EA580C", g2:"#9A3412", ro:"#F97316", bl:"#FFF7ED", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#C2410C", mu:"#475569" },
  rosa      : { go:"#DB2777", g2:"#9D174D", ro:"#EC4899", bl:"#FDF2F8", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#BE185D", mu:"#475569" },
  blu       : { go:"#0284C7", g2:"#0C4A6E", ro:"#0EA5E9", bl:"#F0F9FF", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#0369A1", mu:"#475569" },
  salvia    : { go:"#059669", g2:"#064E3B", ro:"#10B981", bl:"#ECFDF5", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#047857", mu:"#475569" },
  bordeaux  : { go:"#9F1239", g2:"#4C0519", ro:"#BE123C", bl:"#FFF1F2", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#881337", mu:"#475569" },
  perla     : { go:"#44403C", g2:"#1C1917", ro:"#57534E", bl:"#FAFAF9", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#292524", mu:"#57534E" },
  lavanda   : { go:"#7C3AED", g2:"#5B21B6", ro:"#8B5CF6", bl:"#F5F3FF", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#6D28D9", mu:"#475569" },
  cipria    : { go:"#D97706", g2:"#92400E", ro:"#F59E0B", bl:"#FFFBEB", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#B45309", mu:"#57534E" },
  corallo   : { go:"#F97316", g2:"#C2410C", ro:"#FB923C", bl:"#FFF7ED", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#EA580C", mu:"#475569" },
  miele     : { go:"#CA8A04", g2:"#854D0E", ro:"#EAB308", bl:"#FEFCE8", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#A16207", mu:"#475569" },
  notte     : { go:"#38BDF8", g2:"#0284C7", ro:"#0EA5E9", bl:"#0F172A", bl2:"#FFFFFF", card:"#1E293B", in:"#F8FAFC", hero:"#020617", mu:"#94A3B8" },
  neve      : { go:"#0284C7", g2:"#0C4A6E", ro:"#0EA5E9", bl:"#F8FAFC", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#0369A1", mu:"#475569" },
  classic   : { go:"#16A34A", g2:"#14532D", ro:"#22C55E", bl:"#F0FDF4", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#15803D", mu:"#475569" },
};

export const PALETTE_VARIANTS = {
  chiaro: {},
  // "Caldo" = sfondo più avvolgente, non un blocco scuro piatto (prima sembrava "colore morto")
  caldo: {
    amore:    { bl:"#FECDD3", hero:"#BE123C", go:"#E11D48", ro:"#F43F5E" },
    rubino:   { bl:"#FECACA", hero:"#B91C1C", go:"#DC2626", ro:"#EF4444" },
    rosa:     { bl:"#FBCFE8", hero:"#BE185D", go:"#DB2777", ro:"#EC4899" },
    bordeaux: { bl:"#FECDD3", hero:"#881337", go:"#9F1239", ro:"#BE123C" },
    terracotta:{ bl:"#FED7AA", hero:"#C2410C", go:"#EA580C", ro:"#F97316" },
    corallo:  { bl:"#FED7AA", hero:"#EA580C", go:"#F97316", ro:"#FB923C" },
    cipria:   { bl:"#FDE68A", hero:"#B45309", go:"#D97706", ro:"#F59E0B" },
    miele:    { bl:"#FEF08A", hero:"#A16207", go:"#CA8A04", ro:"#EAB308" },
    classic:  { bl:"#BBF7D0", hero:"#15803D", go:"#16A34A", ro:"#22C55E" }
  },
  scuro: {
    notte: { bl:"#020617", hero:"#020617", go:"#38BDF8", g2:"#0284C7", card:"#FFFFFF", bl2:"#FFFFFF", in:"#111111", ro:"#0EA5E9" }
  }
};

export const PALETTE_LABELS = {
  amore:"Rosso vivo", rubino:"Rubino", gentleman:"Antracite", uomo:"Blu royal",
  aurora:"Viola", terracotta:"Arancio terracotta",
  rosa:"Rosa acceso", blu:"Azzurro oceano", salvia:"Verde smeraldo", bordeaux:"Bordeaux",
  perla:"Pietra naturale", lavanda:"Lavanda", cipria:"Ambra", corallo:"Corallo tramonto",
  miele:"Oro sole", notte:"Notte con accento cielo", neve:"Ghiaccio chiaro", classic:"Verde KhamaKey"
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
  base.mu = base.mu || "#666666";
  base.card = "#FFFFFF";
  base.bl2 = "#FFFFFF";
  base.in = "#111111";
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
