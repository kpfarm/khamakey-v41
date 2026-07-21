/** Categorie Moments — tipi pagina, etichette e template precompilati. */

import { DEFAULT_SECTIONS } from "./moment-sections.js?v=180";

export const MOMENT_TYPE_GROUPS = [
  {
    id:"family",
    label:"Famiglia",
    types:["family","mom","dad","child","kids"]
  },
  {
    id:"love",
    label:"Amore & coppia",
    types:["love","valentine","wedding"]
  },
  {
    id:"celebrations",
    label:"Feste & cerimonie",
    types:["birthday","christmas","communion","baptism","party","free"]
  },
  {
    id:"memories",
    label:"Ricordi & album",
    types:["memory","photo","travel","memorial"]
  },
  {
    id:"other",
    label:"Altro",
    types:["friendship","pet","portfolio"]
  }
];

export const TYPE_LABELS = {
  free:"Evento generale",
  love:"Amore",
  mom:"Mamma",
  dad:"Papà",
  child:"Figlio / Figlia",
  kids:"Bambini",
  memory:"Ricordi",
  photo:"Album foto",
  pet:"Animali",
  communion:"Comunione",
  baptism:"Battesimo",
  friendship:"Amicizia",
  family:"Famiglia",
  valentine:"San Valentino",
  christmas:"Natale",
  birthday:"Compleanno",
  wedding:"Matrimonio",
  party:"Festa",
  travel:"Viaggio",
  memorial:"Memoriale",
  portfolio:"Portfolio"
};

/** Tipi accettati da Supabase (deve coincidere con sql/khamakey-moments-categories-v59.sql). */
export const ALLOWED_MOMENT_TYPES = Object.keys(TYPE_LABELS);

const base = (subtitle, sections, extra = {}) => ({
  subtitle,
  pill: extra.pill || "",
  sections: { ...DEFAULT_SECTIONS, ...sections }
});

/** Disattiva tutte le sezioni tranne quelle elencate — equilibrio template per categoria. */
function kit(type, enabledSections, extra = {}){
  const off = Object.fromEntries(
    Object.keys(DEFAULT_SECTIONS).map(key => [key, { enabled:false }])
  );
  return base(extra.subtitle || "", { ...off, ...enabledSections }, extra);
}

export const MOMENT_TEMPLATES = {
  free: kit("free", {
    intro:{ enabled:true, title:"Benvenuti", body:"Racconta di cosa tratta questa pagina e perché è speciale per te." },
    gallery:{ enabled:true, title:"Le foto", body:"", media:[], images:[] },
    dedication:{ enabled:true, title:"Un messaggio", body:"Scrivi cosa vuoi condividere con chi legge.", signature:"" },
    timeline:{ enabled:true, title:"Programma o tappe", body:"", items:[{ date:"Quando", place:"Dove", text:"Cosa succede." }] },
    music:{ enabled:true, title:"Musica", body:"", spotify_url:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Con affetto" }
  }, { subtitle:"Un momento da condividere" }),
  love: kit("love", {
    intro:{ enabled:true, title:"La nostra storia", body:"Come ci siamo incontrati e cosa ci lega oggi." },
    dedication:{ enabled:true, title:"Per te", body:"Parole che voglio dedicarti oggi.", recipient:"", signature:"Con tutto il mio amore" },
    timeline:{
      enabled:true, title:"Tappe & luoghi", body:"",
      items:[
        { date:"Il primo giorno", place:"Dove tutto è iniziato", text:"Il momento che ha cambiato tutto." },
        { date:"Oggi", place:"Insieme", text:"Ogni giorno scriviamo un nuovo capitolo." }
      ]
    },
    gallery:{ enabled:true, title:"I nostri ricordi", body:"", media:[], images:[] },
    promises:{ enabled:true, title:"Le nostre promesse", body:"♥ · Esserci sempre\n✦ · Costruire insieme\n🌅 · Una vita al tuo fianco" },
    quote:{ enabled:true, title:"", body:"L'amore non guarda con gli occhi, ma con l'anima.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Noi due", sign_subtitle:"Per sempre" }
  }, { pill:"Amore · Un mondo tutto nostro", subtitle:"Per chi ami" }),
  mom: kit("mom", {
    intro:{ enabled:true, title:"Per te, mamma", body:"Grazie per tutto quello che fai ogni giorno con amore." },
    dedication:{ enabled:true, title:"Una dedica", body:"Mamma, questo è per te.", recipient:"Mamma", signature:"Con affetto" },
    gallery:{ enabled:true, title:"Ricordi con te", body:"", media:[], images:[] },
    timeline:{ enabled:true, title:"Momenti con te", body:"", items:[{ date:"Da sempre", place:"Con mamma", text:"I ricordi più belli della nostra vita." }] },
    quote:{ enabled:true, title:"", body:"Una mamma è il cuore che batte accanto al nostro.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Con amore", sign_subtitle:"Per sempre tua/o" }
  }, { pill:"Mamma · Con tutto il cuore", subtitle:"Per la mamma più speciale" }),
  dad: kit("dad", {
    intro:{ enabled:true, title:"Per te, papà", body:"Un tributo semplice a chi c'è sempre stato." },
    dedication:{ enabled:true, title:"Caro papà", body:"Grazie per i tuoi consigli, le risate e la forza.", recipient:"Papà", signature:"Con stima e affetto" },
    gallery:{ enabled:true, title:"Momenti insieme", body:"", media:[], images:[] },
    timeline:{ enabled:true, title:"Tappe insieme", body:"", items:[{ date:"Da piccolo/a", place:"Con papà", text:"Lezioni, avventure e abbracci." }] },
    quote:{ enabled:true, title:"", body:"Un padre è la prima vera grande avventura.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Con affetto", sign_subtitle:"Tuo figlio / Tua figlia" }
  }, { pill:"Papà · Il mio eroe", subtitle:"Per papà" }),
  child: kit("child", {
    intro:{ enabled:true, title:"La nostra gioia", body:"Racconta chi è e perché illumina la vostra vita." },
    gallery:{ enabled:true, title:"I suoi ricordi", body:"", media:[], images:[] },
    timeline:{
      enabled:true, title:"Le sue tappe", body:"",
      items:[
        { date:"Il grande giorno", place:"È arrivato/a", text:"Il momento in cui tutto è cambiato." },
        { date:"Oggi", place:"Cresce", text:"Ogni giorno una nuova scoperta." }
      ]
    },
    dreams:{ enabled:true, title:"I suoi sogni", body:"✨ · Crescere felice\n🌟 · Scoprire il mondo\n🎈 · Sognare in grande" },
    numbers:{ enabled:true, title:"I suoi numeri", body:"365 · giorni di sorrisi\n100 · abbracci\n∞ · amore" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Mamma e Papà", sign_subtitle:"Per sempre orgogliosi di te" }
  }, { pill:"Figlio · Figlia · Il nostro tesoro", subtitle:"Per nostro figlio / nostra figlia" }),
  kids: kit("kids", {
    intro:{ enabled:true, title:"Ciao piccolo!", body:"Una pagina dolce per un bambino speciale." },
    gallery:{ enabled:true, title:"Le sue avventure", body:"", media:[], images:[] },
    timeline:{
      enabled:true, title:"Le sue tappe", body:"",
      items:[
        { date:"Primo giorno", place:"Benvenuto/a", text:"Il giorno in cui è arrivato/a." },
        { date:"Oggi", place:"Scopre il mondo", text:"Ogni giorno qualcosa di nuovo." }
      ]
    },
    numbers:{ enabled:true, title:"I suoi numeri", body:"365 · giorni di sorrisi\n12 · mesi di scoperte\n100 · abbracci" },
    dreams:{ enabled:true, title:"I suoi sogni", body:"🎈 · Giocare e ridere\n🌈 · Imparare cose nuove\n⭐ · Sognare in grande" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Con amore", sign_subtitle:"La famiglia" }
  }, { pill:"Bambini · Meraviglie ogni giorno", subtitle:"Per i più piccoli" }),
  memory: kit("memory", {
    intro:{ enabled:true, title:"Il ricordo", body:"Cosa rende speciale questo momento nel tempo." },
    dedication:{ enabled:true, title:"Un pensiero", body:"Parole che vogliamo tenere vicino al cuore.", signature:"" },
    gallery:{ enabled:true, title:"Immagini", body:"", media:[], images:[] },
    timeline:{
      enabled:true, title:"Momenti nel tempo", body:"",
      items:[
        { date:"Un giorno speciale", place:"Il ricordo", text:"Un momento che non vogliamo dimenticare." },
        { date:"Sempre", place:"Nel cuore", text:"Resta con noi ogni giorno." }
      ]
    },
    quote:{ enabled:true, title:"", body:"I ricordi sono la sola eternità.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Per sempre nel cuore" }
  }, { subtitle:"Un ricordo da custodire" }),
  photo: kit("photo", {
    intro:{ enabled:true, title:"Il nostro album", body:"Una raccolta di immagini che raccontano una storia." },
    gallery:{ enabled:true, title:"Galleria", body:"", media:[], images:[] },
    quote:{ enabled:true, title:"", body:"Ogni foto è un ricordo che parla.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Ricordi da conservare" }
  }, { pill:"Album · Ogni foto è un ricordo", subtitle:"Le foto che contano" }),
  pet: kit("pet", {
    intro:{ enabled:true, title:"Il nostro compagno", body:"Chi è, come è arrivato e perché riempie la casa di gioia." },
    pet:{ enabled:true, title:"Il nostro amico", body:"Un piccolo racconto del vostro legame.", pet_name:"", pet_emoji:"🐾", pet_photo:"" },
    gallery:{ enabled:true, title:"Foto", body:"", media:[], images:[] },
    quote:{ enabled:true, title:"", body:"Amore incondizionato a quattro zampe.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"La famiglia", sign_subtitle:"Che lo ama" }
  }, { pill:"Animali · Amore incondizionato", subtitle:"Il nostro amico a quattro zampe" }),
  communion: kit("communion", {
    intro:{ enabled:true, title:"La mia comunione", body:"Un giorno di fede, gioia e famiglia." },
    timeline:{ enabled:true, title:"Programma", body:"", items:[
      { date:"10:00", place:"Chiesa", text:"Celebrazione eucaristica." },
      { date:"12:30", place:"Sala festa", text:"Ricevimento con famiglia e amici." }
    ]},
    rsvp:{ enabled:true, title:"Conferma presenza", body:"Facci sapere se partecipi — rispondi su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true },
    gallery:{ enabled:true, title:"Foto del giorno", body:"", media:[], images:[] },
    dedication:{ enabled:true, title:"Un ringraziamento", body:"Grazie a chi ci ha accompagnato in questo passo di fede.", signature:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Con gratitudine" }
  }, { pill:"Comunione · Un passo di fede", subtitle:"Una comunione speciale" }),
  baptism: kit("baptism", {
    intro:{ enabled:true, title:"Benvenuto/a", body:"Un messaggio di benvenuto per questo giorno sacro." },
    timeline:{ enabled:true, title:"Programma", body:"", items:[
      { date:"11:00", place:"Chiesa", text:"Cerimonia di battesimo." },
      { date:"13:00", place:"Casa / Sala", text:"Festa in famiglia." }
    ]},
    rsvp:{ enabled:true, title:"Conferma presenza", body:"Dicci se verrai — rispondi su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true },
    gallery:{ enabled:true, title:"Ricordi", body:"", media:[], images:[] },
    dedication:{ enabled:true, title:"Una preghiera", body:"Parole di augurio e benedizione.", signature:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Con amore" }
  }, { pill:"Battesimo · Una benedizione", subtitle:"Battesimo" }),
  friendship: kit("friendship", {
    intro:{ enabled:true, title:"Amicizia vera", body:"Perché certi legami durano per sempre." },
    dedication:{ enabled:true, title:"Per te, amico/a", body:"Grazie per le risate, il supporto e i momenti condivisi.", signature:"" },
    gallery:{ enabled:true, title:"I nostri momenti", body:"", media:[], images:[] },
    timeline:{ enabled:true, title:"I nostri capitoli", body:"", items:[
      { date:"Il primo incontro", place:"Dove tutto è iniziato", text:"Quel giorno che non sapevamo cambierebbe tutto." },
      { date:"Oggi", place:"Sempre insieme", text:"Anni di storie, risate e complicità." }
    ]},
    quote:{ enabled:true, title:"", body:"Un vero amico arriva quando il resto del mondo se ne va.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Per sempre amici" }
  }, { pill:"Amicizia · Sempre insieme", subtitle:"Per un amico speciale" }),
  family: kit("family", {
    intro:{ enabled:true, title:"Noi", body:"Chi siamo e cosa ci unisce." },
    dedication:{ enabled:true, title:"Un messaggio", body:"Parole per la nostra famiglia, unita e speciale.", signature:"" },
    gallery:{ enabled:true, title:"Ricordi di famiglia", body:"", media:[], images:[] },
    timeline:{ enabled:true, title:"Tappe & momenti", body:"", items:[
      { date:"Da sempre", place:"Insieme", text:"I momenti che ci hanno reso ciò che siamo." }
    ]},
    rituals:{ enabled:true, title:"I nostri rituali", body:"🍝 · Cena della domenica\n🎬 · Serata film\n🎄 · Tradizioni di famiglia" },
    numbers:{ enabled:true, title:"I nostri numeri", body:"4 · persone\n365 · giorni insieme\n∞ · amore" },
    signature:{ enabled:true, title:"", body:"", sign_name:"La nostra famiglia", sign_subtitle:"Uniti" }
  }, { pill:"Famiglia · Il nostro mondo", subtitle:"La nostra famiglia" }),
  valentine: kit("valentine", {
    intro:{ enabled:true, title:"Per te", body:"Un messaggio d'amore per San Valentino." },
    dedication:{ enabled:true, title:"Lettera d'amore", body:"Oggi e sempre, sceglierei di nuovo te.", recipient:"", signature:"Con amore" },
    gallery:{ enabled:true, title:"Noi due", body:"", media:[], images:[] },
    music:{ enabled:true, title:"La nostra canzone", body:"", spotify_url:"" },
    quote:{ enabled:true, title:"", body:"Ti amo non solo per come sei, ma per come sono io quando sono con te.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"San Valentino" }
  }, { pill:"San Valentino · Ti amo", subtitle:"San Valentino" }),
  christmas: kit("christmas", {
    intro:{ enabled:true, title:"Buon Natale", body:"Auguri calorosi e ricordi condivisi." },
    gallery:{ enabled:true, title:"Momenti natalizi", body:"", media:[], images:[] },
    rituals:{ enabled:true, title:"Tradizioni", body:"🎄 · Albero in famiglia\n🎁 · Scambio regali\n🍪 · Dolci fatti in casa" },
    dedication:{ enabled:true, title:"Auguri", body:"Vi auguriamo un Natale pieno di luce e serenità.", signature:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Buone feste" }
  }, { pill:"Natale · Gioia condivisa", subtitle:"Natale in famiglia" }),
  birthday: kit("birthday", {
    intro:{ enabled:true, title:"Festeggiamo!", body:"Un augurio speciale per un giorno speciale." },
    dedication:{ enabled:true, title:"Auguri", body:"Tanti auguri di cuore — che questo anno porti gioia!", signature:"" },
    gallery:{ enabled:true, title:"Ricordi", body:"", media:[], images:[] },
    countdown:{ enabled:true, title:"Conto alla rovescia", body:"", event_label:"Al compleanno", target_date:"" },
    rsvp:{ enabled:true, title:"Conferma presenza", body:"Compila il modulo e inviaci la risposta su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true },
    music:{ enabled:true, title:"Playlist della festa", body:"", spotify_url:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Buon compleanno!" }
  }, { pill:"Compleanno · Un anno in più di gioia", subtitle:"Buon compleanno!" }),
  wedding: kit("wedding", {
    intro:{ enabled:true, title:"La nostra storia", body:"Come ci siamo conosciuti e perché questo giorno è speciale." },
    dedication:{ enabled:true, title:"Una dedica", body:"Grazie per essere qui con noi.", recipient:"", signature:"Con amore" },
    timeline:{ enabled:true, title:"Programma", body:"", items:[
      { date:"15:00", place:"Cerimonia", text:"Il sì che aspettavamo." },
      { date:"17:00", place:"Ricevimento", text:"Brindisi, cena e festa." },
      { date:"20:00", place:"Ballo", text:"Musica e celebrazione fino a tardi." }
    ]},
    rsvp:{ enabled:true, title:"Conferma presenza", body:"Facci sapere se ci sarai — rispondi su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true },
    gallery:{ enabled:true, title:"Le nostre foto", body:"", media:[], images:[] },
    promises:{ enabled:true, title:"Le nostre promesse", body:"💍 · Esserci sempre\n🌅 · Una vita insieme\n♥ · Amarsi ogni giorno" },
    music:{ enabled:true, title:"La nostra canzone", body:"", spotify_url:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Noi due", sign_subtitle:"Per sempre" }
  }, { subtitle:"Un giorno da ricordare per sempre" }),
  party: kit("party", {
    intro:{ enabled:true, title:"Benvenuti", body:"Cosa festeggiamo e perché condividiamo questo momento." },
    timeline:{ enabled:true, title:"Programma", body:"", items:[
      { date:"19:00", place:"Location", text:"Aperitivo di benvenuto." },
      { date:"20:30", place:"Sala", text:"Cena e brindisi." },
      { date:"22:00", place:"Pista", text:"Musica e festa." }
    ]},
    rsvp:{ enabled:true, title:"Conferma presenza", body:"Dicci se vieni — rispondi su WhatsApp.", whatsapp_number:"", event_name:"", ask_guests:true, ask_notes:true },
    gallery:{ enabled:true, title:"Galleria", body:"", media:[], images:[] },
    music:{ enabled:true, title:"Playlist", body:"", spotify_url:"" },
    dedication:{ enabled:true, title:"Grazie", body:"Grazie per essere qui e festeggiare con noi!", signature:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"A presto" }
  }, { subtitle:"Festeggiamo insieme" }),
  travel: kit("travel", {
    intro:{ enabled:true, title:"Partenza", body:"Dove andiamo e perché abbiamo scelto questa meta." },
    timeline:{
      enabled:true,
      title:"Tappe & luoghi",
      body:"",
      items:[
        { date:"Giorno 1", place:"Arrivo", text:"Check-in e primo giro del quartiere." },
        { date:"Giorno 2", place:"Esplorazione", text:"Monumenti, mercati e sapori locali." },
        { date:"Giorno 3", place:"Avventura", text:"Escursione o esperienza tipica del posto." }
      ]
    },
    gallery:{ enabled:true, title:"Diario di viaggio", body:"", media:[], images:[] },
    numbers:{ enabled:true, title:"In numeri", body:"3 · giorni\n2 · città\n500 · km percorsi" },
    quote:{ enabled:true, title:"", body:"Non si fa un viaggio. Il viaggio ci fa.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"Buon viaggio" }
  }, { subtitle:"Il nostro viaggio" }),
  memorial: kit("memorial", {
    intro:{ enabled:true, title:"In memoria", body:"Un tributo rispettoso a una persona cara." },
    dedication:{ enabled:true, title:"Ricordo", body:"Parole di rispetto, gratitudine e affetto.", signature:"" },
    gallery:{ enabled:true, title:"Galleria", body:"", media:[], images:[] },
    timeline:{
      enabled:true,
      title:"Momenti di vita",
      body:"",
      items:[
        { date:"Un capitolo", place:"Nel ricordo", text:"Un momento che resterà per sempre nel cuore." },
        { date:"Sempre", place:"Con noi", text:"Ciò che amiamo non muore mai." }
      ]
    },
    quote:{ enabled:true, title:"", body:"Ciò che amiamo davvero non muore mai.", author:"" },
    signature:{ enabled:true, title:"", body:"", sign_name:"", sign_subtitle:"In memoria" }
  }, { subtitle:"In memoria" }),
  portfolio: kit("portfolio", {
    intro:{ enabled:true, title:"Chi sono / Chi siamo", body:"Presentazione breve e ambito di lavoro." },
    timeline:{ enabled:true, title:"Percorso", body:"", items:[
      { date:"2020", place:"Inizio", text:"Primi progetti e formazione." },
      { date:"Oggi", place:"Presente", text:"Lavori selezionati e collaborazioni." }
    ]},
    gallery:{ enabled:true, title:"Lavori selezionati", body:"", media:[], images:[] },
    quote:{ enabled:true, title:"", body:"La creatività è intelligenza che si diverte.", author:"Albert Einstein" },
    signature:{ enabled:true, title:"", body:"", sign_name:"Il tuo nome", sign_subtitle:"Creativo / Artista" }
  }, { subtitle:"Portfolio e lavori" })
};

export function normalizeMomentType(value){
  const key = String(value || "free").trim().toLowerCase();
  return ALLOWED_MOMENT_TYPES.includes(key) ? key : "free";
}

export function renderCategorySelect(current){
  const selected = normalizeMomentType(current);
  return MOMENT_TYPE_GROUPS.map(group=>{
    const options = group.types
      .filter(type=>TYPE_LABELS[type])
      .map(type=>`<option value="${type}" ${type === selected ? "selected" : ""}>${TYPE_LABELS[type]}</option>`)
      .join("");
    return `<optgroup label="${group.label}">${options}</optgroup>`;
  }).join("");
}

export function templateForType(type){
  return MOMENT_TEMPLATES[normalizeMomentType(type)] || MOMENT_TEMPLATES.free;
}
