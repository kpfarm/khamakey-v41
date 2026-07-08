/** Sezioni Moments — catalogo emotivo condiviso tra editor e pagina pubblica. */

import { normalizeMediaList, parseMediaList } from "./moment-media.js";
import { mergePlacesIntoTimeline, resolveJourneySteps, parseJourneySteps } from "./moment-journey.js";

export const SECTION_ORDER_DEFAULT = [
  "intro",
  "dedication",
  "timeline",
  "rsvp",
  "gallery",
  "promises",
  "dreams",
  "countdown",
  "music",
  "letter_future",
  "rituals",
  "pet",
  "numbers",
  "quote",
  "signature"
];

export const DEFAULT_SECTIONS = {
  intro:{ enabled:true, title:"La nostra storia", body:"", images:[] },
  dedication:{ enabled:false, title:"Una dedica per te", body:"", recipient:"", signature:"", images:[] },
  timeline:{ enabled:false, title:"Tappe & luoghi", body:"", items:[], images:[] },
  rsvp:{ enabled:false, title:"Conferma presenza", body:"Compila il modulo e invia la risposta su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true, images:[] },
  gallery:{ enabled:false, title:"I nostri ricordi", body:"", images:[], media:[] },
  promises:{ enabled:false, title:"Le nostre promesse", body:"", images:[] },
  places:{ enabled:false, title:"Luoghi del cuore", body:"", images:[] },
  dreams:{ enabled:false, title:"Sogni insieme", body:"", images:[] },
  countdown:{ enabled:false, title:"Conto alla rovescia", body:"", event_label:"", target_date:"", image_url:"", images:[] },
  music:{ enabled:false, title:"La nostra canzone", body:"", spotify_url:"", youtube_url:"", audio_url:"", audio_title:"", audio_description:"", images:[] },
  letter_future:{ enabled:false, title:"Lettera al futuro", body:"", recipient:"", unlock_date:"", media_type:"", media_url:"", media_title:"", images:[] },
  rituals:{ enabled:false, title:"I nostri rituali", body:"", images:[] },
  pet:{ enabled:false, title:"Il nostro compagno", body:"", pet_name:"", pet_emoji:"🐾", pet_photo:"", images:[] },
  numbers:{ enabled:false, title:"I nostri numeri", body:"", images:[] },
  quote:{ enabled:false, title:"", body:"", author:"", images:[] },
  signature:{ enabled:false, title:"", body:"", sign_name:"", sign_subtitle:"", images:[] }
};

export const SECTION_LABELS = {
  intro:"Introduzione",
  dedication:"Dedica",
  timeline:"Tappe & luoghi",
  rsvp:"RSVP invitati",
  gallery:"Foto & video",
  promises:"Promesse",
  places:"Luoghi del cuore",
  dreams:"Sogni insieme",
  countdown:"Countdown",
  music:"Musica",
  letter_future:"Lettera al futuro",
  rituals:"Rituali",
  pet:"Animale",
  numbers:"I nostri numeri",
  quote:"Citazione",
  signature:"Firma finale"
};

export const SECTION_SUBTITLES = {
  intro:"Racconta chi siete e perché conta",
  dedication:"Una lettera con la tua firma",
  timeline:"Date, luoghi e foto del percorso",
  rsvp:"Gli invitati confermano via WhatsApp",
  gallery:"Aggiungi foto, video e audio",
  promises:"Lista di promesse con emoji",
  places:"I posti che contano per voi",
  dreams:"Sogni da realizzare insieme",
    countdown:"Quanto manca all'evento",
    rsvp:"Inserisci il tuo WhatsApp — gli invitati compilano e inviano un messaggio pronto.",
    music:"Canzone o video preferito",
  letter_future:"Messaggio da aprire in futuro",
  rituals:"Piccole abitudini quotidiane",
  pet:"Il tuo amico a quattro zampe",
  numbers:"Numeri simbolo (giorni, km…)",
  quote:"Una frase che vi rappresenta",
  signature:"Chiusura finale della pagina"
};

export const SECTION_ICONS = {
  intro:"✦",
  dedication:"💌",
  timeline:"◷",
  rsvp:"✓",
  gallery:"▣",
  promises:"🤝",
  places:"📍",
  dreams:"✨",
  countdown:"⏳",
  music:"🎵",
  letter_future:"🔒",
  rituals:"🕯",
  pet:"🐾",
  numbers:"#",
  quote:"❝",
  signature:"♥"
};

export const LEGACY_SECTION_MAP = {
  schedule:"timeline",
  location:"places",
  places:null,
  message:"dedication",
  details:null,
  contacts:null
};

export const NAV_GROUPS = [
  { id:"design", label:"Design", icon:"✦" },
  { id:"content", label:"Contenuti", icon:"✎" },
  { id:"account", label:"Account", icon:"◉" }
];

export function designNavItems(){
  return [
    { id:"cover", label:"Copertina", icon:"✦" },
    { id:"styling", label:"Colori", icon:"◑" },
    { id:"order", label:"Ordine", icon:"☰" }
  ];
}

export function contentNavItems(order = SECTION_ORDER_DEFAULT, momentType = "free"){
  return [
    { id:"counter", label:"Contatore", icon:"⏱" },
    ...order.filter(key=>key !== "places").map(key=>({
      id:`section-${key}`,
      label:shortNavLabel(key),
      icon:SECTION_ICONS[key] || "•"
    }))
  ];
}

export function accountNavItems(){
  return [
    { id:"objects", label:"Pagine", icon:"◉" },
    { id:"privacy", label:"Pubblica", icon:"🔒" }
  ];
}

function shortNavLabel(key){
  const short = {
    intro:"Intro",
    dedication:"Dedica",
    timeline:"Tappe",
    rsvp:"RSVP",
    gallery:"Foto & video",
    promises:"Promesse",
    places:"Luoghi",
    dreams:"Sogni",
    countdown:"Timer",
    music:"Musica",
    letter_future:"Futuro",
    rituals:"Rituali",
    pet:"Pet",
    numbers:"Numeri",
    quote:"Citazione",
    signature:"Firma"
  };
  return short[key] || SECTION_LABELS[key] || key;
}

export function normalizeSectionOrder(order){
  const base = Array.isArray(order)
    ? order.map(key=>LEGACY_SECTION_MAP[key] ?? key).filter(key=>key && key !== "places" && DEFAULT_SECTIONS[key])
    : [];
  return [...new Set([...base, ...SECTION_ORDER_DEFAULT.filter(key=>!base.includes(key))])];
}

export function migrateSections(rawSections = {}){
  const sections = {};
  for(const key of Object.keys(DEFAULT_SECTIONS)){
    const incoming = rawSections[key] || {};
    sections[key] = {
      ...DEFAULT_SECTIONS[key],
      ...incoming,
      images:Array.isArray(incoming.images) ? incoming.images.filter(Boolean) : []
    };
  }
  if(rawSections.schedule && !rawSections.timeline){
    sections.timeline = {
      ...sections.timeline,
      ...rawSections.schedule,
      title:rawSections.schedule.title || sections.timeline.title
    };
  }
  if(rawSections.location && !rawSections.places?.body){
    const loc = rawSections.location;
    const placeLine = loc.address
      ? `📍 · ${loc.address}${loc.maps_url ? ` · ${loc.maps_url}` : ""}`
      : "";
    sections.places = {
      ...sections.places,
      enabled:Boolean(loc.enabled || sections.places.enabled),
      title:loc.title || sections.places.title,
      body:[loc.body, placeLine].filter(Boolean).join("\n")
    };
  }
  if(rawSections.message && !rawSections.dedication){
    sections.dedication = {
      ...sections.dedication,
      ...rawSections.message,
      title:rawSections.message.title || sections.dedication.title
    };
  }
  if(rawSections.details?.body && !sections.intro.body){
    sections.intro.body = [sections.intro.body, rawSections.details.body].filter(Boolean).join("\n\n");
    if(rawSections.details.enabled) sections.intro.enabled = true;
  }
  if(sections.gallery){
    sections.gallery.media = normalizeMediaList(sections.gallery);
    sections.gallery.images = sections.gallery.media.filter(item=>item.type === "image").map(item=>item.url);
  }
  return mergePlacesIntoTimeline(sections);
}

export function sectionHasContent(key, section){
  if(!section) return false;
  if(section.title || section.body) return true;
  if(Array.isArray(section.images) && section.images.length) return true;
  if(key === "gallery" && normalizeMediaList(section).length) return true;
  if(key === "timeline" && resolveJourneySteps(section).length) return true;
  if(key === "dedication" && (section.recipient || section.signature)) return true;
  if(key === "countdown" && (section.target_date || section.image_url || section.images?.length)) return true;
  if(key === "rsvp" && section.whatsapp_number) return true;
  if(key === "music" && (section.spotify_url || section.youtube_url || section.audio_url)) return true;
  if(key === "letter_future" && (section.body || section.unlock_date || section.media_url)) return true;
  if(key === "pet" && (section.pet_name || section.body || section.pet_photo)) return true;
  if(key === "numbers" && section.body) return true;
  if(key === "rituals" && section.body) return true;
  if(key === "quote" && section.author) return true;
  if(key === "signature" && (section.sign_name || section.sign_subtitle)) return true;
  return false;
}

/** Sezione attiva in pagina: basta che sia abilitata (mostra anche stato vuoto). */
export function sectionIsVisible(key, section){
  return Boolean(section?.enabled);
}

export function parseLineItems(body, mode = "dot"){
  return String(body || "")
    .split("\n")
    .map(line=>line.trim())
    .filter(Boolean)
    .map(line=>{
      const parts = line.split("·").map(part=>part.trim());
      if(mode === "promise"){
        const emoji = parts[0]?.match(/^[\p{Extended_Pictographic}\u2600-\u27BF]/u) ? parts.shift() : "✦";
        return { emoji, text:parts.join(" · ") || line };
      }
      if(mode === "place"){
        const icon = parts[0]?.match(/^[\p{Extended_Pictographic}\u2600-\u27BF]/u) ? parts.shift() : "📍";
        const url = parts.find(part=>/^https?:\/\//i.test(part)) || "";
        const name = parts.filter(part=>part !== url).join(" · ");
        return { icon, name:name || line, url };
      }
      if(mode === "dream"){
        const done = /^✓/.test(parts[0] || "");
        if(done) parts.shift();
        return { done, text:parts.join(" · ") || line.replace(/^✓\s*/,"") };
      }
      if(mode === "timeline"){
        if(parts.length >= 2) return { date:parts[0], text:parts.slice(1).join(" · ") };
        return { date:"", text:line };
      }
      if(mode === "ritual"){
        const emoji = parts[0]?.match(/^[\p{Extended_Pictographic}\u2600-\u27BF]/u) ? parts.shift() : "🕯";
        return { emoji, text:parts.join(" · ") || line };
      }
      if(mode === "number"){
        if(parts.length >= 2) return { value:parts[0], label:parts.slice(1).join(" · ") };
        return { value:"", label:line };
      }
      return { text:line };
    });
}

export function readSectionFromForm(form, key){
  const base = {
    enabled:form.get(`section_${key}_enabled`) === "on",
    title:String(form.get(`section_${key}_title`) || "").trim(),
    body:String(form.get(`section_${key}_body`) || "").trim(),
    images:key === "gallery" ? parseImageLines(form.get(`section_${key}_images`)) : []
  };
  if(key === "dedication"){
    base.recipient = String(form.get(`section_${key}_recipient`) || "").trim();
    base.signature = String(form.get(`section_${key}_signature`) || "").trim();
  }
  if(key === "countdown"){
    base.event_label = String(form.get(`section_${key}_event_label`) || "").trim();
    base.target_date = String(form.get(`section_${key}_target_date`) || "").trim();
    base.image_url = String(form.get(`section_${key}_image_url`) || "").trim();
  }
  if(key === "rsvp"){
    base.whatsapp_number = String(form.get(`section_${key}_whatsapp_number`) || "").trim();
    base.event_name = String(form.get(`section_${key}_event_name`) || "").trim();
    base.ask_guests = form.get(`section_${key}_ask_guests`) === "on";
    base.ask_notes = form.get(`section_${key}_ask_notes`) === "on";
  }
  if(key === "music"){
    base.spotify_url = String(form.get(`section_${key}_spotify_url`) || "").trim();
    base.youtube_url = String(form.get(`section_${key}_youtube_url`) || "").trim();
    base.audio_url = String(form.get(`section_${key}_audio_url`) || "").trim();
    base.audio_title = String(form.get(`section_${key}_audio_title`) || "").trim();
    base.audio_description = String(form.get(`section_${key}_audio_description`) || "").trim();
  }
  if(key === "letter_future"){
    base.recipient = String(form.get(`section_${key}_recipient`) || "").trim();
    base.unlock_date = String(form.get(`section_${key}_unlock_date`) || "").trim();
    base.media_type = String(form.get(`section_${key}_media_type`) || "").trim();
    base.media_url = String(form.get(`section_${key}_media_url`) || "").trim();
    base.media_title = String(form.get(`section_${key}_media_title`) || "").trim();
  }
  if(key === "pet"){
    base.pet_name = String(form.get(`section_${key}_pet_name`) || "").trim();
    base.pet_emoji = String(form.get(`section_${key}_pet_emoji`) || "🐾").trim() || "🐾";
    base.pet_photo = String(form.get(`section_${key}_pet_photo`) || "").trim();
  }
  if(key === "quote"){
    base.author = String(form.get(`section_${key}_author`) || "").trim();
  }
  if(key === "signature"){
    base.sign_name = String(form.get(`section_${key}_sign_name`) || "").trim();
    base.sign_subtitle = String(form.get(`section_${key}_sign_subtitle`) || "").trim();
  }
  if(key === "gallery"){
    base.media = parseMediaList(form.get(`section_${key}_media`));
    base.images = base.media.filter(item=>item.type === "image").map(item=>item.url);
  }
  if(key === "timeline"){
    base.items = parseJourneySteps(form.get(`section_${key}_items`));
  }
  return base;
}

export function parseImageLines(value){
  return String(value || "")
    .split(/\n+/)
    .map(line=>line.trim())
    .filter(line=>/^https?:\/\//i.test(line))
    .slice(0,24);
}

export function formatImageLines(images){
  return Array.isArray(images) ? images.filter(Boolean).join("\n") : "";
}

export function sectionFieldHints(){
  return {
    timeline:"Ogni tappa: data, luogo, descrizione, foto e link mappa.",
    promises:"Una riga per promessa: «💍 · Esserci sempre»",
    dreams:"Una riga per sogno. Prefix «✓ ·» se già realizzato",
    rituals:"Una riga per rituale: «☕ · Caffè insieme ogni mattina»",
    numbers:"Una riga per numero: «365 · giorni insieme»"
  };
}

/** Guida passo-passo visibile in ogni pannello sezione. */
export function sectionFillGuide(key){
  const guides = {
    intro:"Scrivi chi siete e perché questo momento è speciale. 2–4 frasi bastano.",
    dedication:"Lettera personale: destinatario, testo e firma. Appare come busta elegante.",
    timeline:"Ogni tappa: data, luogo, descrizione, foto e link mappa. Trascina ☰ per riordinare.",
    gallery:"Carica foto, video o audio con i pulsanti Aggiungi. Poi titolo e descrizione per ogni file. Infine Salva. Non compariranno link tecnici — solo anteprima e titoli.",
    promises:"Una riga = una promessa. Inizia con un emoji, es. «💍 · Esserci sempre».",
    dreams:"Lista desideri. Prefix «✓ ·» se già realizzato.",
    countdown:"Scegli data e ora — compare il timer live. Puoi aggiungere anche una foto.",
    music:"Spotify, YouTube o audio caricato — puoi usarne uno o tutti. Incolla solo link pubblici (Spotify/YouTube), non link di file caricati.",
    letter_future:"Scrivi la lettera, scegli la data di apertura e opzionalmente allega foto, video o audio.",
    rituals:"Abitudini vostre, una riga ciascuna. Es. «☕ · Caffè insieme ogni mattina».",
    pet:"Nome, emoji e foto del vostro compagno a quattro zampe.",
    numbers:"Statistiche simboliche. Es. «365 · giorni insieme», «12 · viaggi fatti».",
    quote:"Solo la citazione e l'autore — testo grande in pagina.",
    signature:"Chiusura finale con i vostri nomi.",
    rsvp:"Inserisci il tuo numero WhatsApp (39…). Gli invitati compilano il modulo e inviano un messaggio pronto."
  };
  return guides[key] || "Compila i campi sotto, attiva la sezione e clicca Salva.";
}

export function spotifyEmbedUrl(url){
  const raw = String(url || "").trim();
  if(!raw) return "";
  try{
    const parsed = new URL(raw);
    if(parsed.hostname.includes("open.spotify.com")){
      const path = parsed.pathname.replace("/embed/","/");
      return `https://open.spotify.com/embed${path}${parsed.search}`;
    }
  }catch{}
  return "";
}

export function youtubeVideoId(raw){
  const url = String(raw || "").trim();
  if(!url) return "";
  try{
    const parsed = new URL(url);
    if(parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1).split("/")[0];
    if(parsed.hostname.includes("youtube.com")){
      if(parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || "";
      return parsed.searchParams.get("v") || "";
    }
  }catch{}
  const short = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return short ? short[1] : "";
}

export function youtubeEmbedUrl(raw){
  const id = youtubeVideoId(raw);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

export function formatUnlockDate(raw){
  const value = String(raw || "").trim();
  if(!value) return "";
  const date = new Date(value.length > 10 ? value : `${value}T12:00:00`);
  if(Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
}

export function isLetterUnlocked(unlockDate){
  const raw = String(unlockDate || "").trim();
  if(!raw) return true;
  const target = new Date(raw.length > 10 ? raw : `${raw}T00:00:00`);
  if(Number.isNaN(target.getTime())) return true;
  return Date.now() >= target.getTime();
}
