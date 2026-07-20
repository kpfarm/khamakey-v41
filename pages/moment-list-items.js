/** Voci strutturate per sezioni lista (promesse, sogni, rituali, numeri). */

export const MAX_LIST_ITEMS = 24;

export const LIST_SECTION_MODES = {
  promises:"promise",
  dreams:"dream",
  rituals:"ritual",
  numbers:"number"
};

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

export function listItemId(){
  return crypto.randomUUID();
}

export function normalizePromiseItem(raw = {}){
  return {
    id:String(raw.id || listItemId()),
    emoji:String(raw.emoji || "✦").trim() || "✦",
    text:String(raw.text || "").trim()
  };
}

export function normalizeDreamItem(raw = {}){
  return {
    id:String(raw.id || listItemId()),
    done:Boolean(raw.done),
    text:String(raw.text || "").trim()
  };
}

export function normalizeRitualItem(raw = {}){
  return {
    id:String(raw.id || listItemId()),
    emoji:String(raw.emoji || "🕯").trim() || "🕯",
    text:String(raw.text || "").trim()
  };
}

export function normalizeNumberItem(raw = {}){
  return {
    id:String(raw.id || listItemId()),
    value:String(raw.value || "").trim(),
    label:String(raw.label || "").trim()
  };
}

const normalizers = {
  promise:normalizePromiseItem,
  dream:normalizeDreamItem,
  ritual:normalizeRitualItem,
  number:normalizeNumberItem
};

export function normalizeListItem(raw, mode){
  const fn = normalizers[mode] || normalizers.promise;
  return fn(raw);
}

export function normalizeListItems(items, mode, { keepEmpty = false } = {}){
  if(!Array.isArray(items)) return [];
  const list = items.map(item=>normalizeListItem(item, mode));
  if(keepEmpty) return list;
  return list.filter(item=>Object.values(item).some(v=>v && v !== item.id));
}

export function itemsFromSection(section, mode){
  if(Array.isArray(section?.items) && section.items.length){
    return normalizeListItems(section.items, mode);
  }
  return parseLineItems(section?.body || "", mode).map(item=>({
    id:listItemId(),
    ...item
  }));
}

export function serializeItemsToBody(items, mode){
  const list = normalizeListItems(items, mode);
  if(mode === "promise"){
    return list.map(item=>`${item.emoji} · ${item.text}`.trim()).filter(Boolean).join("\n");
  }
  if(mode === "dream"){
    return list.map(item=>`${item.done ? "✓ " : ""}${item.text}`.trim()).filter(Boolean).join("\n");
  }
  if(mode === "ritual"){
    return list.map(item=>`${item.emoji} · ${item.text}`.trim()).filter(Boolean).join("\n");
  }
  if(mode === "number"){
    return list.map(item=>item.value ? `${item.value} · ${item.label}`.trim() : item.label).filter(Boolean).join("\n");
  }
  return list.map(item=>item.text || "").filter(Boolean).join("\n");
}

export function parseListItems(value){
  if(!value) return [];
  try{
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  }catch{
    return [];
  }
}

export function serializeListItems(items){
  return JSON.stringify(Array.isArray(items) ? items : []);
}

export function resolveListItems(section, mode){
  return itemsFromSection(section || {}, mode);
}
