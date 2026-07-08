/** Tappe & luoghi — sezione unificata (ex timeline + places). */

export const MAX_JOURNEY_STEPS = 24;

export function journeyStepId(){
  return crypto.randomUUID();
}

export function normalizeJourneyStep(raw = {}){
  return {
    id:String(raw.id || journeyStepId()),
    date:String(raw.date || "").trim(),
    place:String(raw.place || raw.name || "").trim(),
    text:String(raw.text || raw.description || "").trim(),
    image_url:String(raw.image_url || raw.image || "").trim(),
    maps_url:String(raw.maps_url || raw.url || "").trim()
  };
}

export function normalizeJourneySteps(list){
  if(!Array.isArray(list)) return [];
  return list.map(normalizeJourneyStep);
}

/** Rimuove tappe vuote — solo al salvataggio / pagina pubblica. */
export function compactJourneySteps(list){
  return normalizeJourneySteps(list).filter(step=>step.date || step.place || step.text || step.image_url || step.maps_url);
}

export function serializeJourneySteps(steps){
  return JSON.stringify(normalizeJourneySteps(steps));
}

export function parseJourneySteps(value){
  if(!value) return [];
  if(Array.isArray(value)) return normalizeJourneySteps(value);
  try{
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(normalizeJourneyStep) : [];
  }catch{
    return [];
  }
}

/** Converte righe legacy «data · testo» o «📍 · luogo · url». */
export function parseLegacyTimelineBody(body){
  return String(body || "")
    .split("\n")
    .map(line=>line.trim())
    .filter(Boolean)
    .map(line=>{
      const parts = line.split("·").map(part=>part.trim());
      if(parts.length >= 2 && /^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(parts[0] || "")){
        const icon = parts.shift();
        const url = parts.find(part=>/^https?:\/\//i.test(part)) || "";
        const name = parts.filter(part=>part !== url).join(" · ");
        return normalizeJourneyStep({ place:name || line.replace(/^[\p{Extended_Pictographic}\u2600-\u27BF]\s*/u,""), maps_url:url, text:"" });
      }
      if(parts.length >= 2){
        return normalizeJourneyStep({ date:parts[0], text:parts.slice(1).join(" · ") });
      }
      return normalizeJourneyStep({ text:line });
    });
}

export function resolveJourneySteps(timelineSection = {}, placesSection = null){
  const fromItems = parseJourneySteps(timelineSection.items);
  if(fromItems.length) return fromItems.slice(0,MAX_JOURNEY_STEPS);
  const fromTimeline = parseLegacyTimelineBody(timelineSection.body);
  const fromPlaces = placesSection?.body ? parseLegacyTimelineBody(placesSection.body) : [];
  return compactJourneySteps([...fromTimeline,...fromPlaces]).slice(0,MAX_JOURNEY_STEPS);
}

export function journeyStepsToLegacyBody(steps){
  return compactJourneySteps(steps).map(step=>{
    if(step.place && !step.date){
      const bits = ["📍", step.place];
      if(step.maps_url) bits.push(step.maps_url);
      return bits.join(" · ");
    }
    if(step.date && step.text) return `${step.date} · ${step.text}`;
    if(step.date) return step.date;
    return step.text || step.place || "";
  }).filter(Boolean).join("\n");
}

export function mergePlacesIntoTimeline(sections = {}){
  const next = {...sections};
  const timeline = {...(next.timeline || {})};
  const places = next.places || {};
  const items = resolveJourneySteps(timeline, places);
  timeline.items = items;
  if(!timeline.title && places.title) timeline.title = places.title;
  if(places.enabled) timeline.enabled = true;
  timeline.body = journeyStepsToLegacyBody(items);
  next.timeline = timeline;
  next.places = {...places, enabled:false, body:"", items:[]};
  return next;
}
