/** Sezioni Moments — catalogo emotivo condiviso tra editor e pagina pubblica. */

import { normalizeMediaList, parseMediaList, migrateLetterMediaSection } from "./moment-media.js";
import { parseListItems, itemsFromSection, LIST_SECTION_MODES, normalizeListItems } from "./moment-list-items.js";
import { mergePlacesIntoTimeline, resolveJourneySteps, parseJourneySteps } from "./moment-journey.js";
import { readRsvpFieldsFromForm } from "./moment-rsvp-fields.js";

export const SECTION_ORDER_DEFAULT = [
  "intro",
  "dedication",
  "timeline",
  "rsvp",
  "guestbook",
  "gallery",
  "video",
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
  rsvp:{ enabled:false, title:"Conferma presenza", body:"Compila il modulo e invia la risposta su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true, field_keys:["guests","notes"], custom_fields:[], images:[] },
  guestbook:{ enabled:false, title:"Libro degli ospiti", body:"Lascia un pensiero — apparirà dopo l'approvazione dell'organizzatore.", images:[] },
  gallery:{ enabled:false, title:"Galleria foto", body:"", images:[], media:[] },
  video:{ enabled:false, title:"Il nostro video", body:"", video_url:"", video_title:"", video_description:"", images:[] },
  promises:{ enabled:false, title:"Le nostre promesse", body:"", items:[], images:[] },
  places:{ enabled:false, title:"Luoghi del cuore", body:"", images:[] },
  dreams:{ enabled:false, title:"Sogni insieme", body:"", items:[], images:[] },
  countdown:{ enabled:false, title:"Conto alla rovescia", body:"", event_label:"", target_date:"", image_url:"", images:[] },
  music:{ enabled:false, title:"La nostra canzone", body:"", spotify_url:"", youtube_url:"", audio_url:"", audio_title:"", audio_description:"", image_url:"", images:[] },
  letter_future:{ enabled:false, title:"Lettera al futuro", body:"", recipient:"", unlock_date:"", media:[], media_type:"", media_url:"", media_title:"", images:[] },
  rituals:{ enabled:false, title:"I nostri rituali", body:"", items:[], images:[] },
  pet:{ enabled:false, title:"Il nostro compagno", body:"", pet_name:"", pet_emoji:"🐾", pet_photo:"", images:[] },
  numbers:{ enabled:false, title:"I nostri numeri", body:"", items:[], images:[] },
  quote:{ enabled:false, title:"", body:"", author:"", images:[] },
  signature:{ enabled:false, title:"", body:"", sign_name:"", sign_subtitle:"", images:[] }
};

export const SECTION_LABELS = {
  intro:"Introduzione",
  dedication:"Dedica",
  timeline:"Tappe & luoghi",
  rsvp:"RSVP invitati",
  guestbook:"Libro degli ospiti",
  gallery:"Galleria foto",
  video:"Video",
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
  guestbook:"Messaggi degli invitati con moderazione",
  gallery:"Piccola galleria di foto con titolo e descrizione",
  video:"Un video del ricordo (MP4 o MOV)",
  promises:"Lista di promesse con emoji",
  places:"I posti che contano per voi",
  dreams:"Sogni da realizzare insieme",
    countdown:"Quanto manca all'evento",
    rsvp:"Inserisci il tuo WhatsApp — gli invitati compilano e inviano un messaggio pronto.",
    guestbook:"Gli invitati lasciano un messaggio; tu approvi prima che appaia in pagina.",
    music:"Canzone o video preferito",
    letter_future:"Messaggio da aprire in futuro — riceverai un'email il giorno dell'apertura.",
  rituals:"Piccole abitudini quotidiane",
  pet:"Il tuo amico a quattro zampe",
  numbers:"Numeri simbolo (giorni, km…)",
  quote:"Una frase che vi rappresenta",
  signature:"Chiusura finale della pagina"
};

export const SECTION_ICONS = {
  intro:"✨",
  dedication:"💌",
  timeline:"🗺️",
  rsvp:"📲",
  guestbook:"📖",
  gallery:"📸",
  video:"🎬",
  promises:"💍",
  places:"📍",
  dreams:"🌟",
  countdown:"⏳",
  music:"🎵",
  letter_future:"🔐",
  rituals:"🕯️",
  pet:"🐾",
  numbers:"🔢",
  quote:"✍️",
  signature:"💫"
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
    { id:"overview", label:"Riepilogo", icon:"📊" },
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
    guestbook:"Ospiti",
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
    const allMedia = normalizeMediaList(sections.gallery);
    const galleryVideos = allMedia.filter(item=>item.type === "video");
    const galleryImages = allMedia.filter(item=>item.type === "image");
    sections.gallery.media = galleryImages;
    sections.gallery.images = galleryImages.map(item=>item.url);
    if(!sections.video) sections.video = { ...DEFAULT_SECTIONS.video };
    if(galleryVideos.length && !String(sections.video.video_url || "").trim()){
      const first = galleryVideos[0];
      sections.video.video_url = first.url;
      sections.video.video_title = first.title || sections.video.video_title || "";
      sections.video.video_description = first.description || sections.video.video_description || "";
    }
  }
  if(sections.letter_future){
    sections.letter_future.media = migrateLetterMediaSection(sections.letter_future);
    const first = sections.letter_future.media[0];
    if(first){
      sections.letter_future.media_type = first.type;
      sections.letter_future.media_url = first.url;
      sections.letter_future.media_title = first.title || "";
    }
  }
  for(const key of Object.keys(LIST_SECTION_MODES)){
    if(!sections[key]) continue;
    const hadItems = Array.isArray(sections[key].items) && sections[key].items.length;
    const mode = LIST_SECTION_MODES[key];
    sections[key].items = itemsFromSection(sections[key], mode);
    if(!hadItems && sections[key].items.length && sections[key].body?.includes("·")){
      sections[key].body = "";
    }
  }
  return mergePlacesIntoTimeline(sections);
}

export function sectionHasContent(key, section){
  if(!section) return false;
  switch(key){
    case "intro":
      return Boolean(String(section.body || "").trim());
    case "dedication":
      return Boolean(section.body || section.recipient || section.signature);
    case "timeline":
      return resolveJourneySteps(section).length > 0;
    case "gallery":
      return normalizeMediaList(section).some(item=>item.type === "image");
    case "video":
      return Boolean(String(section.video_url || "").trim());
    case "rsvp":
      return Boolean(String(section.whatsapp_number || "").replace(/\D/g, ""));
    case "guestbook":
      return Boolean(section?.enabled);
    case "promises":
    case "dreams":
    case "rituals":
    case "numbers":
      return itemsFromSection(section, LIST_SECTION_MODES[key]).length > 0 || Boolean(String(section.body || "").trim());
    case "countdown":
      return Boolean(section.target_date || section.image_url || section.images?.length);
    case "music":
      return Boolean(section.spotify_url || section.youtube_url || section.audio_url || section.image_url);
    case "letter_future":
      return Boolean(section.body || section.unlock_date || migrateLetterMediaSection(section).length);
    case "pet":
      return Boolean(section.pet_name || section.body || section.pet_photo);
    case "quote":
      return Boolean(section.body || section.author);
    case "signature":
      return Boolean(section.sign_name || section.sign_subtitle || section.body);
    default:
      return Boolean(section.title || section.body || (Array.isArray(section.images) && section.images.length));
  }
}

/** Sezione attiva in pagina: basta che sia abilitata (mostra anche stato vuoto). */
export function sectionIsVisible(key, section){
  return Boolean(section?.enabled);
}

export { parseLineItems } from "./moment-list-items.js";

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
    Object.assign(base, readRsvpFieldsFromForm(form));
  }
  if(key === "music"){
    base.spotify_url = String(form.get(`section_${key}_spotify_url`) || "").trim();
    base.youtube_url = String(form.get(`section_${key}_youtube_url`) || "").trim();
    base.audio_url = String(form.get(`section_${key}_audio_url`) || "").trim();
    base.audio_title = String(form.get(`section_${key}_audio_title`) || "").trim();
    base.audio_description = String(form.get(`section_${key}_audio_description`) || "").trim();
    base.image_url = String(form.get(`section_${key}_image_url`) || "").trim();
  }
  if(LIST_SECTION_MODES[key]){
    base.items = normalizeListItems(parseListItems(form.get(`section_${key}_items`)), LIST_SECTION_MODES[key]);
  }
  if(key === "letter_future"){
    base.recipient = String(form.get(`section_${key}_recipient`) || "").trim();
    base.unlock_date = String(form.get(`section_${key}_unlock_date`) || "").trim();
    base.media = parseMediaList(form.get(`section_${key}_media`));
    const first = base.media[0];
    base.media_type = first?.type || String(form.get(`section_${key}_media_type`) || "").trim();
    base.media_url = first?.url || String(form.get(`section_${key}_media_url`) || "").trim();
    base.media_title = first?.title || String(form.get(`section_${key}_media_title`) || "").trim();
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
    base.media = parseMediaList(form.get(`section_${key}_media`)).filter(item=>item.type === "image");
    base.images = base.media.map(item=>item.url);
  }
  if(key === "video"){
    base.video_url = String(form.get(`section_${key}_video_url`) || "").trim();
    base.video_title = String(form.get(`section_${key}_video_title`) || "").trim();
    base.video_description = String(form.get(`section_${key}_video_description`) || "").trim();
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
    promises:"Aggiungi promesse con il pulsante — emoji e testo in ogni card.",
    dreams:"Aggiungi sogni uno per uno. Spunta «Realizzato» se già avete fatto il passo.",
    rituals:"Aggiungi rituali quotidiani — una card per abitudine.",
    numbers:"Aggiungi numeri simbolo — valore ed etichetta in ogni card."
  };
}

/** Guida passo-passo visibile in ogni pannello sezione. */
export function sectionFillGuide(key){
  const guides = {
    intro:"Scrivi chi siete e perché questo momento è speciale. 2–4 frasi bastano.",
    dedication:"Lettera personale: destinatario, testo e firma. Appare come busta elegante.",
    timeline:"Ogni tappa: data, luogo, descrizione, foto e link mappa. Trascina ☰ per riordinare.",
    gallery:"Carica le foto con Aggiungi foto. Titolo e descrizione per ogni immagine — in pagina si aprono ingrandite al tocco.",
    video:"Carica un solo video (MP4/MOV, max 25 MB) con titolo e descrizione. Per audio usa la sezione Musica.",
    promises:"Tocca «Aggiungi promessa» per ogni voce — niente più righe manuali.",
    dreams:"Tocca «Aggiungi sogno» — puoi segnare quelli già realizzati.",
    countdown:"Scegli data e ora — compare il timer live. Puoi aggiungere anche una foto.",
    music:"Spotify, YouTube, audio caricato o foto copertina — combina come preferite.",
    letter_future:"Scrivi la lettera, scegli la data di apertura e opzionalmente allega fino a 2 foto, 1 video e 1 audio. Riceverai un'email il giorno dell'apertura.",
    rituals:"Tocca «Aggiungi rituale» per ogni abitudine quotidiana.",
    pet:"Nome, emoji e foto del vostro compagno a quattro zampe.",
    numbers:"Tocca «Aggiungi numero» — es. 365 + «giorni insieme».",
    quote:"Titolo facoltativo, citazione e autore — testo grande in pagina.",
    signature:"Titolo della chiusura (es. «Con amore»), poi nomi e sottotitolo.",
    rsvp:"WhatsApp consigliato (39… senza +). Senza numero la sezione non compare in pagina, ma puoi salvare comunque. Gli invitati compilano e ti inviano il messaggio.",
    guestbook:"Attiva la sezione e scrivi un invito. Gli ospiti lasciano messaggi che approvi dall'editor."
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
