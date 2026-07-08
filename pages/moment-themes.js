/** Palette e varianti pagina Moments — condivise tra editor e anteprima. */
export const COLOR_PALETTES = {
  amore:    { go:"#DC143C", g2:"#B22222", ro:"#CCCCCC", bl:"#CC0000", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#CC0000", mu:"#666666" },
  rubino:   { go:"#B22222", g2:"#CC0000", ro:"#DDDDDD", bl:"#5C0000", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#8B0000", mu:"#666666" },
  gentleman:{ go:"#666666", g2:"#333333", ro:"#DDDDDD", bl:"#EEEEEE", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#333333", mu:"#666666" },
  uomo:     { go:"#003366", g2:"#000080", ro:"#CCCCCC", bl:"#E8ECF0", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#000080", mu:"#666666" },
  aurora:   { go:"#663399", g2:"#4B0082", ro:"#DDDDDD", bl:"#EDE7F6", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#4B0082", mu:"#666666" },
  terracotta:{ go:"#A0522D", g2:"#8B4513", ro:"#DDDDDD", bl:"#F5E6D3", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#8B4513", mu:"#666666" },
  rosa:     { go:"#C71585", g2:"#DB2777", ro:"#DDDDDD", bl:"#8B0045", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#C71585", mu:"#666666" },
  blu:      { go:"#0066CC", g2:"#003366", ro:"#CCCCCC", bl:"#E6EEF7", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#003366", mu:"#666666" },
  salvia:   { go:"#228B22", g2:"#006400", ro:"#CCCCCC", bl:"#E8F5E9", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#228B22", mu:"#666666" },
  bordeaux: { go:"#800020", g2:"#660019", ro:"#DDDDDD", bl:"#4A0010", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#660019", mu:"#666666" },
  perla:    { go:"#666666", g2:"#555555", ro:"#DDDDDD", bl:"#F0F0F0", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#555555", mu:"#666666" },
  lavanda:  { go:"#663399", g2:"#7B68EE", ro:"#DDDDDD", bl:"#F0E6FF", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#663399", mu:"#666666" },
  cipria:   { go:"#A0522D", g2:"#8B4513", ro:"#DDDDDD", bl:"#FAF0E6", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#8B4513", mu:"#666666" },
  corallo:  { go:"#FF6600", g2:"#CC5500", ro:"#DDDDDD", bl:"#FFF0E6", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#CC5500", mu:"#666666" },
  miele:    { go:"#DAA520", g2:"#006400", ro:"#DDDDDD", bl:"#006400", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#006400", mu:"#666666" },
  notte:    { go:"#444444", g2:"#222222", ro:"#DDDDDD", bl:"#111111", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#000000", mu:"#888888" },
  neve:     { go:"#666666", g2:"#999999", ro:"#DDDDDD", bl:"#F5F5F5", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#696969", mu:"#666666" },
  classic:  { go:"#4CAF27", g2:"#1B2A5E", ro:"#DDDDDD", bl:"#F0F0F0", bl2:"#FFFFFF", card:"#FFFFFF", in:"#111111", hero:"#1B2A5E", mu:"#666666" }
};

export const PALETTE_VARIANTS = {
  chiaro: {},
  caldo: {
    amore:    { bl:"#B22222", hero:"#B22222" },
    rubino:   { bl:"#4A0000" },
    rosa:     { bl:"#7A0040" },
    bordeaux: { bl:"#3A0008" },
    miele:    { bl:"#004400" }
  },
  scuro: {
    notte:    { bl:"#000000", hero:"#000000", card:"#FFFFFF", bl2:"#FFFFFF", in:"#111111", go:"#444444", ro:"#DDDDDD" }
  }
};

export const PALETTE_LABELS = {
  amore:"Rosso classico", rubino:"Rubino intenso", gentleman:"Grigio sartoriale", uomo:"Navy e bronzo",
  aurora:"Viola aurora", terracotta:"Terracotta viaggio",
  rosa:"Rosa gold", blu:"Blu oceano", salvia:"Verde savana", bordeaux:"Bordeaux nuziale",
  perla:"Grigio perla", lavanda:"Lavanda pop", cipria:"Seppia ricordi", corallo:"Tramonto corallo",
  miele:"Oro e verde", notte:"Notte scura", neve:"Neve pulita", classic:"KhamaKey classico"
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
