/** Kit editor — sezioni consigliate, opzionali e etichette adattive per tipo pagina. */
import { MOMENT_TYPE_GROUPS, normalizeMomentType } from "./moment-categories.js";
import { SECTION_ORDER_DEFAULT, sectionFillGuide, SECTION_ICONS } from "./moment-sections.js";

export { SECTION_ICONS };

/** Tutte le sezioni disponibili nel kit (places deprecato → timeline). */
export const ALL_KIT_SECTIONS = SECTION_ORDER_DEFAULT.filter(key => key !== "places");

const BASE_SECTION_LABELS = {
  intro:"Introduzione",
  dedication:"Dedica",
  timeline:"Tappe & luoghi",
  rsvp:"RSVP invitati",
  gallery:"Foto & video",
  promises:"Promesse",
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

const BASE_SECTION_SUBTITLES = {
  intro:"Racconta chi siete e perché conta",
  dedication:"Una lettera con la tua firma",
  timeline:"Date, luoghi e foto del percorso",
  rsvp:"Gli invitati confermano via WhatsApp",
  gallery:"Aggiungi foto, video e audio",
  promises:"Lista di promesse con emoji",
  dreams:"Sogni da realizzare insieme",
  countdown:"Quanto manca all'evento",
  music:"Canzone o video preferito",
  letter_future:"Messaggio da aprire in futuro",
  rituals:"Piccole abitudini quotidiane",
  pet:"Il tuo amico a quattro zampe",
  numbers:"Numeri simbolo (giorni, km…)",
  quote:"Una frase che vi rappresenta",
  signature:"Chiusura finale della pagina"
};

const TYPE_TO_GROUP = Object.fromEntries(
  MOMENT_TYPE_GROUPS.flatMap(group => group.types.map(type => [type, group.id]))
);

/** Vocabolario completo per gruppo — etichette di tutte le sezioni nel tono della categoria. */
const GROUP_VOCAB = {
  family:{
    labels:{
      intro:"Chi siamo", dedication:"Un messaggio", timeline:"Tappe & momenti", rsvp:"Conferma presenza",
      gallery:"Foto di famiglia", promises:"Promesse di famiglia", dreams:"Sogni in famiglia",
      countdown:"Conto alla rovescia", music:"Musica di famiglia", letter_future:"Messaggio per il futuro",
      rituals:"Le nostre abitudini", pet:"Il nostro animale", numbers:"I nostri numeri",
      quote:"Citazione", signature:"Firma"
    },
    subtitles:{
      intro:"Presenta la famiglia in poche righe",
      dedication:"Dedica o augurio per mamma, papà, figli…",
      timeline:"Date e momenti importanti in famiglia",
      rsvp:"Per feste, riunioni e celebrazioni",
      gallery:"Ricordi condivisi in foto e video",
      promises:"Impegni simbolici tra di voi",
      dreams:"Desideri e progetti in famiglia",
      countdown:"Quanto manca a un evento speciale",
      music:"Canzone o brano che vi rappresenta",
      letter_future:"Un messaggio da rileggere tra anni",
      rituals:"Piccole tradizioni di famiglia",
      pet:"Il compagno a quattro zampe in casa",
      numbers:"Giorni, persone, ricordi in cifre",
      quote:"Una frase che vi unisce",
      signature:"Chiusura calorosa della pagina"
    }
  },
  love:{
    labels:{
      intro:"La nostra storia", dedication:"Dedica d'amore", timeline:"Tappe & luoghi", rsvp:"Conferma presenza",
      gallery:"I nostri ricordi", promises:"Le nostre promesse", dreams:"Sogni insieme",
      countdown:"Conto alla rovescia", music:"La nostra canzone", letter_future:"Lettera al futuro",
      rituals:"I nostri rituali", pet:"Il nostro compagno", numbers:"I nostri numeri",
      quote:"Citazione", signature:"Firma"
    },
    subtitles:{
      intro:"Come vi siete conosciuti e cosa vi lega",
      dedication:"Lettera personale con firma",
      timeline:"Date, luoghi e foto speciali",
      rsvp:"Per anniversari o feste di coppia",
      gallery:"Foto, video e audio del vostro percorso",
      promises:"Impegni simbolici con emoji",
      dreams:"Desideri per il futuro insieme",
      countdown:"Quanto manca a una data speciale",
      music:"Canzone o video che vi rappresenta",
      letter_future:"Messaggio da rileggere tra anni",
      rituals:"Piccole abitudini di coppia",
      pet:"L'amico peloso della vostra storia",
      numbers:"Giorni insieme, date simbolo…",
      quote:"Una frase d'amore che resta",
      signature:"Chiusura romantica della pagina"
    }
  },
  celebrations:{
    labels:{
      intro:"Benvenuti", dedication:"Auguri", timeline:"Programma", rsvp:"Conferma presenza",
      gallery:"Foto della festa", promises:"Promesse", dreams:"Sogni",
      countdown:"Conto alla rovescia", music:"Musica & playlist", letter_future:"Auguri da rileggere",
      rituals:"Tradizioni", pet:"Il nostro animale", numbers:"In numeri",
      quote:"Citazione", signature:"Firma"
    },
    subtitles:{
      intro:"Di cosa si tratta e perché festeggiamo",
      dedication:"Messaggio agli invitati o alla persona festeggiata",
      timeline:"Orari, tappe e luoghi dell'evento",
      rsvp:"Gli invitati rispondono su WhatsApp",
      gallery:"Foto, video e ricordi del giorno",
      promises:"Impegni o auguri simbolici",
      dreams:"Desideri per il futuro",
      countdown:"Quanto manca al grande giorno",
      music:"Brano o playlist della festa",
      letter_future:"Un messaggio da aprire in futuro",
      rituals:"Tradizioni e momenti speciali",
      pet:"Amico a quattro zampe della festa",
      numbers:"Ospiti, anni, numeri simbolo…",
      quote:"Una frase per l'occasione",
      signature:"Chiusura della celebrazione"
    }
  },
  memories:{
    labels:{
      intro:"Il ricordo", dedication:"Un pensiero", timeline:"Tappe nel tempo", rsvp:"Conferma presenza",
      gallery:"Galleria", promises:"Promesse", dreams:"Sogni",
      countdown:"Conto alla rovescia", music:"Musica", letter_future:"Messaggio sigillato",
      rituals:"Rituali", pet:"Il nostro compagno", numbers:"In numeri",
      quote:"Citazione", signature:"Firma"
    },
    subtitles:{
      intro:"Cosa rende speciale questo momento",
      dedication:"Parole da custodire nel tempo",
      timeline:"Date e luoghi significativi",
      rsvp:"Utile se condividi un evento commemorativo",
      gallery:"Immagini e video del ricordo",
      promises:"Impegni o valori da ricordare",
      dreams:"Sogni legati a questo capitolo",
      countdown:"Quanto manca a una data simbolo",
      music:"Canzone legata al ricordo",
      letter_future:"Messaggio da aprire in futuro",
      rituals:"Abitudini o tradizioni legate al ricordo",
      pet:"Compagno presente in questo capitolo",
      numbers:"Date, anni, cifre simbolo",
      quote:"Una frase che resta",
      signature:"Chiusura del tributo o album"
    }
  },
  other:{
    labels:{
      intro:"Presentazione", dedication:"Messaggio", timeline:"Percorso", rsvp:"Conferma presenza",
      gallery:"Galleria", promises:"Promesse", dreams:"Sogni",
      countdown:"Conto alla rovescia", music:"Musica", letter_future:"Messaggio al futuro",
      rituals:"Rituali", pet:"Il nostro amico", numbers:"In numeri",
      quote:"Citazione", signature:"Firma"
    },
    subtitles:{
      intro:"Chi presenti e di cosa parla la pagina",
      dedication:"Testo libero con la tua voce",
      timeline:"Tappe, date o programma",
      rsvp:"Per eventi con invitati",
      gallery:"Foto, video e lavori",
      promises:"Impegni o obiettivi",
      dreams:"Desideri e progetti",
      countdown:"Timer verso una data",
      music:"Brano o playlist",
      letter_future:"Un messaggio da custodire",
      rituals:"Abitudini o tradizioni",
      pet:"Il compagno a quattro zampe",
      numbers:"Cifre e statistiche simbolo",
      quote:"Una frase che rappresenta",
      signature:"Chiusura della pagina"
    }
  }
};

/** Adattamenti per singolo tipo — sovrascrivono il vocabolario di gruppo. */
const TYPE_VOCAB = {
  mom:{
    labels:{ dedication:"Per mamma", gallery:"Ricordi con te", letter_future:"Messaggio per mamma", rituals:"Tradizioni con mamma", quote:"Citazione per mamma" },
    subtitles:{ dedication:"Parole di gratitudine per la mamma", letter_future:"Auguri da rileggere tra gli anni" }
  },
  dad:{
    labels:{ dedication:"Per papà", gallery:"Momenti insieme", letter_future:"Messaggio per papà", rituals:"Momenti con papà", quote:"Citazione per papà" },
    subtitles:{ dedication:"Parole di stima e affetto per papà", letter_future:"Un messaggio da conservare" }
  },
  child:{
    labels:{ intro:"La nostra gioia", dreams:"I suoi sogni", numbers:"I suoi numeri", timeline:"Le sue tappe", letter_future:"Lettera al futuro", quote:"Citazione per lui/lei" },
    subtitles:{ dreams:"Desideri e sogni da realizzare", numbers:"Età, traguardi, numeri simbolo", timeline:"Primi passi e momenti speciali" }
  },
  kids:{
    labels:{ intro:"Ciao piccolo!", gallery:"Le sue avventure", timeline:"Le sue tappe", numbers:"I suoi numeri", dreams:"I suoi sogni", letter_future:"Messaggio per te", pet:"Il suo amico" },
    subtitles:{ timeline:"Primi passi, scoperte e momenti speciali", dreams:"Desideri e sogni da realizzare", pet:"Compagno di giochi del bambino" }
  },
  photo:{
    labels:{ intro:"Il nostro album", gallery:"Galleria foto", quote:"Didascalia", timeline:"Ordine cronologico", letter_future:"Nota per il futuro" },
    subtitles:{ gallery:"Tutte le foto dell'album", timeline:"Organizza le foto per date o capitoli", quote:"Una frase per l'album" }
  },
  pet:{
    labels:{ intro:"Il nostro compagno", pet:"Scheda del pet", letter_future:"Lettera al nostro amico", quote:"Citazione", gallery:"Foto del pet" },
    subtitles:{ pet:"Nome, emoji e storia del vostro amico", letter_future:"Parole per il vostro compagno" }
  },
  travel:{
    labels:{
      intro:"Il viaggio", timeline:"Tappe & luoghi", gallery:"Diario di viaggio", numbers:"In numeri", quote:"Citazione",
      dedication:"Dedica di viaggio", rsvp:"Compagni di viaggio", promises:"Promesse di viaggio",
      dreams:"Prossime mete", countdown:"Partenza tra…", music:"Colonna sonora", letter_future:"Cartolina al futuro",
      rituals:"Rituali di viaggio", pet:"Compagno di viaggio"
    },
    subtitles:{
      intro:"Meta, partenza e perché questo viaggio conta",
      timeline:"Città, tappe e momenti del percorso",
      gallery:"Foto, video e ricordi sul campo",
      numbers:"Km, giorni, città visitate…",
      quote:"Una frase che racconta il viaggio",
      dedication:"Parole per chi segue le tue tappe",
      rsvp:"Conferma per amici in viaggio",
      promises:"Cose che volete fare insieme",
      dreams:"Destinazioni e sogni futuri",
      countdown:"Quanto manca alla partenza",
      music:"Canzone del viaggio",
      letter_future:"Un messaggio dal viaggio",
      rituals:"Abitudini quando siete in giro",
      pet:"Il pet che viaggia con voi"
    }
  },
  memorial:{
    labels:{
      intro:"In memoria", dedication:"Ricordo", gallery:"Galleria", timeline:"Momenti di vita", quote:"Citazione",
      letter_future:"Parole lasciate", music:"Musica del ricordo", numbers:"Anni e date", rituals:"Tradizioni",
      promises:"Promesse", dreams:"Sogni", countdown:"Anniversario", rsvp:"Partecipazione", pet:"Compagno"
    },
    subtitles:{
      intro:"Un tributo rispettoso",
      dedication:"Parole di affetto e gratitudine",
      gallery:"Immagini che restano nel cuore",
      timeline:"Tappe e ricordi lungo la vita",
      quote:"Una frase che parla per noi",
      letter_future:"Un messaggio da custodire nel tempo",
      music:"Brano legato al ricordo",
      numbers:"Date e cifre significative",
      rituals:"Riti o tradizioni in memoria",
      pet:"Amico che ha condiviso la vita"
    }
  },
  memory:{
    labels:{ intro:"Il ricordo", dedication:"Un pensiero", gallery:"Galleria", timeline:"Momenti nel tempo", quote:"Citazione", letter_future:"Messaggio sigillato" },
    subtitles:{ timeline:"Date e tappe che raccontano la storia" }
  },
  portfolio:{
    labels:{ intro:"Chi sono / Chi siamo", timeline:"Percorso", gallery:"Lavori selezionati", quote:"Citazione", signature:"Contatti", dedication:"Presentazione", music:"Showreel audio" },
    subtitles:{ intro:"Presentazione e ambito di lavoro", timeline:"Tappe professionali", gallery:"Progetti e portfolio", signature:"Nome e ruolo per contatti" }
  },
  friendship:{
    labels:{ dedication:"Per te, amico/a", gallery:"I nostri momenti", timeline:"I nostri capitoli", letter_future:"Lettera all'amico/a", quote:"Citazione di amicizia", music:"La nostra canzone" },
    subtitles:{ timeline:"Momenti e avventure condivise", letter_future:"Parole per il tuo amico/a" }
  },
  love:{
    labels:{ intro:"La nostra storia", dedication:"Dedica d'amore", gallery:"I nostri ricordi", timeline:"Tappe & luoghi", promises:"Le nostre promesse", quote:"Citazione" }
  },
  valentine:{
    labels:{ intro:"Per te", dedication:"Lettera d'amore", gallery:"Noi due", music:"La nostra canzone", quote:"Citazione d'amore", promises:"Promesse", letter_future:"Messaggio sigillato", countdown:"San Valentino tra…" },
    subtitles:{ dedication:"Parole per San Valentino", music:"Canzone romantica della coppia" }
  },
  wedding:{
    labels:{ timeline:"Programma del giorno", promises:"Le nostre promesse", gallery:"Le nostre foto", rsvp:"Conferma presenza", letter_future:"Lettera al futuro", quote:"Citazione nuziale", rituals:"Tradizioni" },
    subtitles:{ timeline:"Cerimonia, ricevimento e festa", rsvp:"Gli invitati rispondono su WhatsApp", letter_future:"Parole da rileggere negli anni" }
  },
  party:{
    labels:{ timeline:"Programma festa", music:"Playlist", rsvp:"Conferma presenza", dedication:"Ringraziamento", quote:"Citazione", countdown:"Countdown festa" },
    subtitles:{ timeline:"Orari e momenti della serata", music:"Brani per ballare e festeggiare" }
  },
  birthday:{
    labels:{ dedication:"Auguri di compleanno", countdown:"Quanto manca alla festa", rsvp:"Conferma presenza", letter_future:"Auguri da rileggere", music:"Playlist compleanno", quote:"Citazione", rituals:"Tradizioni" },
    subtitles:{ dedication:"Messaggio per il festeggiato", countdown:"Timer verso il grande giorno" }
  },
  christmas:{
    labels:{ rituals:"Tradizioni natalizie", dedication:"Auguri di Natale", letter_future:"Auguri per il prossimo Natale", gallery:"Momenti natalizi", timeline:"Programma delle feste", music:"Musica natalizia" },
    subtitles:{ rituals:"Albero, regali, abitudini di famiglia", dedication:"Auguri calorosi per le feste" }
  },
  communion:{
    labels:{ timeline:"Programma della giornata", gallery:"Foto del giorno", rsvp:"Conferma presenza", dedication:"Ringraziamento", letter_future:"Messaggio di fede", rituals:"Tradizioni", quote:"Citazione" },
    subtitles:{ timeline:"Celebrazione e ricevimento", rsvp:"Familiari e invitati su WhatsApp" }
  },
  baptism:{
    labels:{ timeline:"Programma", dedication:"Una preghiera", rsvp:"Conferma presenza", gallery:"Ricordi del battesimo", letter_future:"Benedizione", quote:"Citazione" },
    subtitles:{ dedication:"Parole di augurio e benedizione", timeline:"Cerimonia e festa in famiglia" }
  },
  free:{
    labels:{ intro:"Benvenuti", gallery:"Le foto", dedication:"Un messaggio", timeline:"Programma o tappe", music:"Musica", rsvp:"Conferma presenza", quote:"Citazione", rituals:"Tradizioni" },
    subtitles:{ intro:"Racconta di cosa tratta la pagina", timeline:"Orari, tappe o programma libero" }
  }
};

const GROUP_KITS = {
  family:{
    showCounter:false,
    counterLabel:"Contatore",
    sections:["intro","dedication","gallery","timeline","rituals","numbers","signature"],
    nav:{ intro:"Intro", dedication:"Messaggio", gallery:"Foto", timeline:"Tappe", rituals:"Abitudini", numbers:"Numeri", signature:"Firma" }
  },
  love:{
    showCounter:true,
    counterLabel:"Insieme da",
    sections:["intro","dedication","timeline","gallery","promises","dreams","music","quote","signature"],
    nav:{ intro:"Storia", dedication:"Dedica", gallery:"Foto", timeline:"Tappe", promises:"Promesse", dreams:"Sogni", music:"Musica", quote:"Citazione", signature:"Firma" }
  },
  celebrations:{
    showCounter:false,
    counterLabel:"Contatore",
    sections:["intro","timeline","gallery","countdown","music","dedication","signature"],
    nav:{ intro:"Intro", dedication:"Auguri", gallery:"Foto", timeline:"Programma", countdown:"Timer", music:"Musica", signature:"Firma" }
  },
  memories:{
    showCounter:false,
    counterLabel:"Contatore",
    sections:["intro","dedication","gallery","timeline","quote","signature"],
    nav:{ intro:"Intro", dedication:"Pensiero", gallery:"Galleria", timeline:"Tappe", quote:"Citazione", signature:"Firma" }
  },
  other:{
    showCounter:false,
    counterLabel:"Contatore",
    sections:["intro","dedication","gallery","timeline","pet","signature"],
    nav:{ intro:"Intro", dedication:"Messaggio", gallery:"Galleria", timeline:"Percorso", pet:"Pet", signature:"Firma" }
  }
};

const TYPE_OVERRIDES = {
  mom:{
    sections:["intro","dedication","gallery","timeline","quote","signature"],
    labels:{ dedication:"Per mamma", gallery:"Ricordi con te", letter_future:"Messaggio per mamma" },
    nav:{ dedication:"Mamma", letter_future:"Futuro" }
  },
  dad:{
    sections:["intro","dedication","gallery","timeline","quote","signature"],
    labels:{ dedication:"Per papà", gallery:"Momenti insieme", letter_future:"Messaggio per papà" },
    nav:{ dedication:"Papà", letter_future:"Futuro" }
  },
  child:{
    sections:["intro","gallery","timeline","dreams","numbers","signature"],
    labels:{ intro:"La nostra gioia", dreams:"I suoi sogni", numbers:"I suoi numeri", timeline:"Le sue tappe", letter_future:"Lettera al futuro" },
    nav:{ dreams:"Sogni", numbers:"Numeri", letter_future:"Futuro" }
  },
  kids:{
    sections:["intro","gallery","timeline","numbers","dreams","signature"],
    labels:{ intro:"Ciao piccolo!", gallery:"Le sue avventure", timeline:"Le sue tappe", numbers:"I suoi numeri", dreams:"I suoi sogni", letter_future:"Messaggio per te" },
    nav:{ timeline:"Tappe", dreams:"Sogni", letter_future:"Futuro" }
  },
  photo:{
    sections:["intro","gallery","quote","signature"],
    labels:{ intro:"Il nostro album", gallery:"Galleria foto", quote:"Didascalia" }
  },
  pet:{
    sections:["intro","pet","gallery","signature"],
    labels:{ intro:"Il nostro compagno", pet:"Scheda del pet", letter_future:"Lettera al nostro amico" }
  },
  communion:{
    sections:["intro","timeline","rsvp","gallery","dedication","signature"],
    labels:{ timeline:"Programma della giornata", gallery:"Foto del giorno", rsvp:"Conferma presenza" },
    nav:{ timeline:"Programma", rsvp:"RSVP" }
  },
  baptism:{
    sections:["intro","timeline","rsvp","gallery","dedication","signature"],
    labels:{ timeline:"Programma", dedication:"Una preghiera", rsvp:"Conferma presenza" },
    nav:{ timeline:"Programma", rsvp:"RSVP" }
  },
  birthday:{
    sections:["intro","dedication","gallery","countdown","rsvp","music","signature"],
    labels:{ dedication:"Auguri di compleanno", countdown:"Quanto manca alla festa", rsvp:"Conferma presenza", letter_future:"Auguri da rileggere" },
    nav:{ rsvp:"RSVP", letter_future:"Futuro" }
  },
  wedding:{
    showCounter:true,
    counterLabel:"Insieme da",
    sections:["intro","dedication","timeline","rsvp","gallery","promises","music","signature"],
    labels:{ timeline:"Programma del giorno", promises:"Le nostre promesse", gallery:"Le nostre foto", rsvp:"Conferma presenza", letter_future:"Lettera al futuro" },
    nav:{ timeline:"Programma", promises:"Promesse", rsvp:"RSVP", letter_future:"Futuro" }
  },
  party:{
    sections:["intro","timeline","rsvp","gallery","music","dedication","signature"],
    labels:{ timeline:"Programma festa", music:"Playlist", rsvp:"Conferma presenza" },
    nav:{ timeline:"Programma", rsvp:"RSVP" }
  },
  travel:{
    sections:["intro","timeline","gallery","numbers","quote","signature"],
    labels:{ intro:"Il viaggio", timeline:"Tappe & luoghi", gallery:"Diario di viaggio", numbers:"In numeri", quote:"Citazione", letter_future:"Cartolina al futuro" },
    nav:{ numbers:"Numeri", letter_future:"Futuro" }
  },
  memorial:{
    sections:["intro","dedication","gallery","timeline","quote","signature"],
    labels:{ intro:"In memoria", dedication:"Ricordo", gallery:"Galleria", timeline:"Momenti di vita", quote:"Citazione", letter_future:"Parole lasciate" },
    nav:{ dedication:"Ricordo", intro:"Memoria", timeline:"Vita", letter_future:"Parole" }
  },
  portfolio:{
    sections:["intro","timeline","gallery","quote","signature"],
    labels:{ intro:"Chi sono / Chi siamo", timeline:"Percorso", gallery:"Lavori selezionati", signature:"Contatti" },
    nav:{ timeline:"Percorso", signature:"Contatti" }
  },
  friendship:{
    sections:["intro","dedication","gallery","timeline","quote","signature"],
    labels:{ dedication:"Per te, amico/a", gallery:"I nostri momenti", timeline:"I nostri capitoli", letter_future:"Lettera all'amico/a" },
    nav:{ dedication:"Amicizia", timeline:"Capitoli", letter_future:"Futuro" }
  },
  love:{
    sections:["intro","dedication","timeline","gallery","promises","quote","signature"],
    labels:{ intro:"La nostra storia", dedication:"Dedica d'amore", gallery:"I nostri ricordi", timeline:"Tappe & luoghi", promises:"Le nostre promesse", quote:"Citazione" }
  },
  valentine:{
    showCounter:true,
    counterLabel:"Insieme da",
    sections:["intro","dedication","gallery","music","quote","signature"]
  },
  christmas:{
    sections:["intro","gallery","rituals","dedication","signature"],
    labels:{ rituals:"Tradizioni natalizie", dedication:"Auguri di Natale", letter_future:"Auguri per il prossimo Natale" }
  },
  memory:{
    sections:["intro","dedication","gallery","timeline","quote","signature"],
    labels:{ intro:"Il ricordo", dedication:"Un pensiero", gallery:"Galleria", timeline:"Momenti nel tempo", quote:"Citazione", letter_future:"Messaggio sigillato" },
    nav:{ timeline:"Tappe", letter_future:"Futuro" }
  },
  free:{
    sections:["intro","gallery","dedication","timeline","music","signature"]
  }
};

function mergeKit(base, override = {}){
  return {
    showCounter:override.showCounter ?? base.showCounter,
    counterLabel:override.counterLabel ?? base.counterLabel,
    sections:override.sections ?? base.sections,
    nav:{ ...base.nav, ...override.nav }
  };
}

function buildKitVocab(type, group){
  const labels = { ...BASE_SECTION_LABELS };
  const subtitles = { ...BASE_SECTION_SUBTITLES };
  const groupVocab = GROUP_VOCAB[group];
  if(groupVocab){
    Object.assign(labels, groupVocab.labels);
    Object.assign(subtitles, groupVocab.subtitles);
  }
  const typeVocab = TYPE_VOCAB[type];
  if(typeVocab){
    if(typeVocab.labels) Object.assign(labels, typeVocab.labels);
    if(typeVocab.subtitles) Object.assign(subtitles, typeVocab.subtitles);
  }
  const override = TYPE_OVERRIDES[type];
  if(override?.labels) Object.assign(labels, override.labels);
  if(override?.subtitles) Object.assign(subtitles, override.subtitles);
  return { labels, subtitles };
}

export function editorKitForType(type){
  const key = normalizeMomentType(type);
  const group = TYPE_TO_GROUP[key] || "other";
  const base = GROUP_KITS[group] || GROUP_KITS.other;
  const merged = mergeKit(base, TYPE_OVERRIDES[key] || {});
  const vocab = buildKitVocab(key, group);
  return {
    ...merged,
    optional: ALL_KIT_SECTIONS.filter(sectionKey => !merged.sections.includes(sectionKey)),
    labels: vocab.labels,
    subtitles: vocab.subtitles
  };
}

/** Ordine sezioni consigliato per tipo — usato da «Prepara tutto per me». */
export function sectionOrderForType(type){
  const kit = editorKitForType(type);
  const priority = [...kit.sections, ...kit.optional];
  return [...priority.filter(key => ALL_KIT_SECTIONS.includes(key)), ...ALL_KIT_SECTIONS.filter(key => !priority.includes(key))];
}

export function kitSectionKeys(type){
  return [...ALL_KIT_SECTIONS];
}

export function optionalSectionsForType(type){
  return editorKitForType(type).optional;
}

export function sectionAllowedForType(type, sectionKey){
  return ALL_KIT_SECTIONS.includes(sectionKey);
}

function sectionVisibleInNav(type, sectionKey, pinned = [], enabled = {}){
  const kit = editorKitForType(type);
  const on = Boolean(enabled[sectionKey]);
  if(kit.sections.includes(sectionKey)) return on;
  if(!kit.optional.includes(sectionKey)) return false;
  return pinned.includes(sectionKey) || on;
}

export function navSectionsForEditor(type, order = [], pinned = [], enabled = {}){
  return order.filter(key => (
    key !== "places"
    && ALL_KIT_SECTIONS.includes(key)
    && sectionVisibleInNav(type, key, pinned, enabled)
  ));
}

export function hiddenOptionalSections(type, pinned = [], enabled = {}){
  const kit = editorKitForType(type);
  const disabledPrimary = kit.sections.filter(key => !Boolean(enabled[key]));
  const hiddenOptional = kit.optional.filter(key => !sectionVisibleInNav(type, key, pinned, enabled));
  return [...new Set([...disabledPrimary, ...hiddenOptional])];
}

export function primarySectionsForType(type){
  return editorKitForType(type).sections;
}

/** Guida compilazione con hint adattato al template. */
export function sectionFillGuideForType(type, sectionKey){
  const base = sectionFillGuide(sectionKey);
  const contextual = sectionSubtitleForType(type, sectionKey);
  const generic = BASE_SECTION_SUBTITLES[sectionKey];
  if(contextual && contextual !== generic && !base.includes(contextual)){
    return `${base} — ${contextual}`;
  }
  return base;
}

/** @deprecated use navSectionsForEditor */
export function filterSectionsForEditor(type, order = [], pinned = [], enabled = {}){
  return navSectionsForEditor(type, order, pinned, enabled);
}

export function sectionLabelForType(type, sectionKey){
  const kit = editorKitForType(type);
  return kit.labels[sectionKey] || BASE_SECTION_LABELS[sectionKey] || sectionKey;
}

export function sectionSubtitleForType(type, sectionKey){
  const kit = editorKitForType(type);
  return kit.subtitles[sectionKey] || BASE_SECTION_SUBTITLES[sectionKey] || "";
}

export function sectionNavLabelForType(type, sectionKey){
  const kit = editorKitForType(type);
  const override = TYPE_OVERRIDES[normalizeMomentType(type)]?.nav?.[sectionKey];
  if(override) return override;
  const group = TYPE_TO_GROUP[normalizeMomentType(type)] || "other";
  const nav = GROUP_KITS[group]?.nav?.[sectionKey];
  return nav || kit.labels[sectionKey] || BASE_SECTION_LABELS[sectionKey] || sectionKey;
}

export function showCounterForType(type){
  return editorKitForType(type).showCounter;
}

export function counterLabelForType(type){
  return editorKitForType(type).counterLabel;
}

export function contentNavItems(order = [], momentType = "free", pinned = [], enabled = {}){
  const keys = navSectionsForEditor(momentType, order, pinned, enabled);
  const items = keys.map(key=>({
    id:`section-${key}`,
    label:sectionNavLabelForType(momentType, key),
    icon:SECTION_ICONS[key] || "•"
  }));
  if(showCounterForType(momentType)){
    items.unshift({ id:"counter", label:counterLabelForType(momentType), icon:"⏱" });
  }
  if(hiddenOptionalSections(momentType, pinned, enabled).length){
    items.push({ id:"extras", label:"Altre sezioni", icon:"➕" });
  }
  return items;
}
