/** Oroscopo Moments — fino a 5 persone (nome opzionale + segno), testo daily via AstroWay (Worker). */

export const MAX_HOROSCOPE_PEOPLE = 5;

export const ZODIAC_SIGNS = Object.freeze([
  { value: "aries", label: "Ariete" },
  { value: "taurus", label: "Toro" },
  { value: "gemini", label: "Gemelli" },
  { value: "cancer", label: "Cancro" },
  { value: "leo", label: "Leone" },
  { value: "virgo", label: "Vergine" },
  { value: "libra", label: "Bilancia" },
  { value: "scorpio", label: "Scorpione" },
  { value: "sagittarius", label: "Sagittario" },
  { value: "capricorn", label: "Capricorno" },
  { value: "aquarius", label: "Acquario" },
  { value: "pisces", label: "Pesci" }
]);

const SIGN_SET = new Set(ZODIAC_SIGNS.map(item => item.value));

export function normalizeZodiacSign(value){
  const key = String(value || "").trim().toLowerCase();
  return SIGN_SET.has(key) ? key : "";
}

export function zodiacSignLabel(value){
  const key = normalizeZodiacSign(value);
  return ZODIAC_SIGNS.find(item => item.value === key)?.label || "";
}

export function horoscopePersonId(){
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `hp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeHoroscopePerson(raw = {}){
  return {
    id: String(raw.id || horoscopePersonId()),
    name: String(raw.name || "").trim().slice(0, 48),
    sign: normalizeZodiacSign(raw.sign)
  };
}

/** Slot editor: tiene anche righe senza segno (per «Aggiungi persona»). */
export function horoscopePeopleSlots(section = {}){
  const fromPeople = Array.isArray(section.people)
    ? section.people.map(normalizeHoroscopePerson).slice(0, MAX_HOROSCOPE_PEOPLE)
    : [];
  if(fromPeople.length) return fromPeople;
  const legacy = normalizeZodiacSign(section.sign);
  if(legacy) return [normalizeHoroscopePerson({ name: "", sign: legacy })];
  return [normalizeHoroscopePerson()];
}

/** Persistenza / pagina pubblica: solo persone con segno valido. */
export function normalizeHoroscopePeople(section = {}){
  const slots = Array.isArray(section.people)
    ? section.people.map(normalizeHoroscopePerson)
    : [];
  const withSign = slots.filter(person => person.sign);
  if(withSign.length) return withSign.slice(0, MAX_HOROSCOPE_PEOPLE);
  const legacy = normalizeZodiacSign(section.sign);
  return legacy ? [normalizeHoroscopePerson({ name: "", sign: legacy })] : [];
}

export function horoscopePeopleForEditor(section = {}){
  return horoscopePeopleSlots(section);
}

export function serializeHoroscopePeople(people){
  return JSON.stringify(
    (Array.isArray(people) ? people : [])
      .map(normalizeHoroscopePerson)
      .slice(0, MAX_HOROSCOPE_PEOPLE)
  );
}

/** Parse per UI editor — non scarta le righe senza segno. */
export function parseHoroscopePeopleSlots(raw){
  if(Array.isArray(raw)) return raw.map(normalizeHoroscopePerson).slice(0, MAX_HOROSCOPE_PEOPLE);
  try{
    const parsed = JSON.parse(String(raw || "[]"));
    if(!Array.isArray(parsed)) return [];
    return parsed.map(normalizeHoroscopePerson).slice(0, MAX_HOROSCOPE_PEOPLE);
  }catch{
    return [];
  }
}

/** Parse per salvataggio — solo segni validi. */
export function parseHoroscopePeople(raw){
  if(Array.isArray(raw)) return normalizeHoroscopePeople({ people: raw });
  try{
    const parsed = JSON.parse(String(raw || "[]"));
    return normalizeHoroscopePeople({ people: Array.isArray(parsed) ? parsed : [] });
  }catch{
    return [];
  }
}

export function renderZodiacSignOptions(selected = ""){
  const current = normalizeZodiacSign(selected);
  return [
    `<option value="">Scegli il segno</option>`,
    ...ZODIAC_SIGNS.map(item =>
      `<option value="${item.value}" ${item.value === current ? "selected" : ""}>${item.label}</option>`
    )
  ].join("");
}

function esc(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function personRowHtml(person, index){
  return `<div class="list-item-card horoscope-person-card" data-horoscope-id="${esc(person.id)}" data-horoscope-index="${index}">
    <div class="journey-step-top">
      <span class="journey-step-badge">${index + 1}</span>
      <button type="button" class="ghost journey-remove" data-horoscope-remove="${esc(person.id)}" aria-label="Rimuovi persona">Rimuovi</button>
    </div>
    <label>Nome (facoltativo)<input class="horoscope-person-field" data-horoscope-field="name" value="${esc(person.name || "")}" placeholder="Es. Marco" maxlength="48" autocomplete="off"></label>
    <label>Segno zodiacale<select class="horoscope-person-field" data-horoscope-field="sign">${renderZodiacSignOptions(person.sign)}</select></label>
  </div>`;
}

export function renderHoroscopePeoplePanel(section = {}){
  const people = horoscopePeopleForEditor(section);
  return `<div class="list-items-panel horoscope-people-panel" data-horoscope-panel>
    <p class="field-hint">Fino a <strong>${MAX_HOROSCOPE_PEOPLE} persone</strong> (bundle). Ogni segno mostra l’oroscopo <strong>del giorno</strong>, aggiornato automaticamente.</p>
    <div class="journey-steps-head">
      <span class="journey-steps-count"><strong id="horoscopePeopleCount">${people.length}</strong> / ${MAX_HOROSCOPE_PEOPLE} persone</span>
      <button type="button" class="primary journey-add-btn" data-horoscope-add>+ Aggiungi persona</button>
    </div>
    <div class="list-items-list journey-steps-list" id="horoscopePeopleList">${people.map(personRowHtml).join("")}</div>
    <input type="hidden" name="section_horoscope_people" value="${esc(serializeHoroscopePeople(people))}">
  </div>`;
}

function readPeopleHidden(formNode){
  const input = formNode?.querySelector?.('[name="section_horoscope_people"]');
  return parseHoroscopePeopleSlots(input?.value || "[]");
}

function writePeopleHidden(formNode, people){
  const input = formNode?.querySelector?.('[name="section_horoscope_people"]');
  if(input) input.value = serializeHoroscopePeople(people);
  const count = document.getElementById("horoscopePeopleCount");
  if(count) count.textContent = String(people.length);
}

function renderPeopleList(formNode){
  const list = document.getElementById("horoscopePeopleList");
  if(!list || !formNode) return;
  const people = readPeopleHidden(formNode);
  list.innerHTML = people.length
    ? people.map(personRowHtml).join("")
    : `<div class="journey-empty"><p><strong>Nessuna persona</strong></p><p>Aggiungi almeno un segno per mostrare l’oroscopo.</p></div>`;
  writePeopleHidden(formNode, people);
}

export function bindHoroscopePeopleEditor(formNode){
  if(!formNode || formNode.dataset.horoscopePeopleBound === "1") return;
  formNode.dataset.horoscopePeopleBound = "1";
  let previewTimer = null;
  formNode.addEventListener("click", event => {
    const addBtn = event.target.closest("[data-horoscope-add]");
    if(addBtn && formNode.contains(addBtn)){
      event.preventDefault();
      event.stopPropagation();
      const people = readPeopleHidden(formNode);
      if(people.length >= MAX_HOROSCOPE_PEOPLE){
        alert(`Massimo ${MAX_HOROSCOPE_PEOPLE} persone (bundle).`);
        return;
      }
      const next = [...people, normalizeHoroscopePerson()];
      writePeopleHidden(formNode, next);
      renderPeopleList(formNode);
      formNode.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const removeBtn = event.target.closest("[data-horoscope-remove]");
    if(removeBtn && formNode.contains(removeBtn)){
      event.preventDefault();
      event.stopPropagation();
      const id = removeBtn.dataset.horoscopeRemove;
      let people = readPeopleHidden(formNode).filter(person => person.id !== id);
      if(!people.length) people = [normalizeHoroscopePerson()];
      writePeopleHidden(formNode, people);
      renderPeopleList(formNode);
      formNode.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  formNode.addEventListener("input", event => {
    const card = event.target.closest(".horoscope-person-card");
    if(!card || !formNode.contains(card) || !event.target.classList.contains("horoscope-person-field")) return;
    const people = readPeopleHidden(formNode);
    const index = people.findIndex(person => person.id === card.dataset.horoscopeId);
    if(index < 0) return;
    const field = event.target.dataset.horoscopeField;
    if(field === "sign"){
      people[index].sign = normalizeZodiacSign(event.target.value);
    }else if(field === "name"){
      people[index].name = String(event.target.value || "").trim().slice(0, 48);
    }
    writePeopleHidden(formNode, people);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => formNode.dispatchEvent(new Event("input", { bubbles: true })), 400);
  });
  formNode.addEventListener("change", event => {
    if(!event.target.classList.contains("horoscope-person-field") || event.target.tagName !== "SELECT") return;
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export function refreshHoroscopePeopleEditor(formNode){
  if(!formNode?.querySelector?.("[data-horoscope-panel]")) return;
  renderPeopleList(formNode);
}
