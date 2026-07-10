/** Pannello risposte RSVP — editor Moments (Supabase list_my_moment_rsvp). */

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function formatWhen(value){
  if(!value) return "—";
  try{
    return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
  }catch{
    return String(value);
  }
}

export function summarizeRsvpResponses(rows = []){
  const summary = { total:0, yes:0, no:0, maybe:0, guests:0 };
  rows.forEach(row=>{
    summary.total += 1;
    const attending = String(row.attending || "").toLowerCase();
    if(attending.includes("sì") || attending.includes("si")) summary.yes += 1;
    else if(attending.includes("no")) summary.no += 1;
    else summary.maybe += 1;
    const guests = Number(row.guests_count);
    if(Number.isFinite(guests) && guests > 0) summary.guests += guests;
  });
  return summary;
}

export function renderRsvpResponsesShell(){
  return `<div class="editor-card smart-card rsvp-responses-panel" id="rsvpResponsesPanel" data-rsvp-responses>
    <p class="ecard-title"><span class="step-badge">4</span> Risposte ricevute</p>
    <p class="field-hint">Ogni invitato che invia il modulo viene registrato qui. WhatsApp resta il canale principale.</p>
    <div class="rsvp-summary-chips" id="rsvpSummaryChips">
      <span class="rsvp-chip">Caricamento…</span>
    </div>
    <div class="rsvp-responses-actions">
      <button type="button" class="ghost" id="rsvpRefreshResponsesBtn">Aggiorna</button>
      <button type="button" class="ghost" id="rsvpExportCsvBtn" hidden>Esporta CSV</button>
    </div>
    <div class="rsvp-responses-table-wrap" id="rsvpResponsesTableWrap">
      <p class="field-hint" id="rsvpResponsesStatus">In attesa di risposte…</p>
    </div>
  </div>`;
}

function renderSummaryChips(summary){
  return [
    `<span class="rsvp-chip"><strong>${summary.total}</strong> risposte</span>`,
    `<span class="rsvp-chip yes"><strong>${summary.yes}</strong> sì</span>`,
    `<span class="rsvp-chip no"><strong>${summary.no}</strong> no</span>`,
    summary.maybe ? `<span class="rsvp-chip maybe"><strong>${summary.maybe}</strong> forse</span>` : "",
    summary.guests ? `<span class="rsvp-chip guests"><strong>${summary.guests}</strong> ospiti totali</span>` : ""
  ].filter(Boolean).join("");
}

function customFieldsText(row){
  const custom = row.custom_fields && typeof row.custom_fields === "object" ? row.custom_fields : {};
  return Object.entries(custom)
    .map(([key,value])=>`${key}: ${value}`)
    .join(" · ");
}

function renderResponsesTable(rows){
  if(!rows.length){
    return `<p class="field-hint">Nessuna risposta ancora. Condividi il link invito con gli ospiti.</p>`;
  }
  const body = rows.map(row=>{
    const extras = [
      row.guests_count ? `Ospiti: ${row.guests_count}` : "",
      row.phone ? `Tel. ${row.phone}` : "",
      row.email ? row.email : "",
      row.notes ? `Note: ${row.notes}` : "",
      customFieldsText(row)
    ].filter(Boolean).join(" · ");
    return `<tr>
      <td>${esc(formatWhen(row.created_at))}</td>
      <td><strong>${esc(row.guest_name)}</strong></td>
      <td>${esc(row.attending)}</td>
      <td class="rsvp-row-meta">${esc(extras || "—")}</td>
    </tr>`;
  }).join("");
  return `<table class="rsvp-responses-table">
    <thead><tr><th>Data</th><th>Nome</th><th>Presenza</th><th>Dettagli</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export async function fetchMomentRsvpResponses(supabase, eventId){
  const { data, error } = await supabase.rpc("list_my_moment_rsvp",{ p_event_id:eventId });
  if(error) throw error;
  return Array.isArray(data) ? data : [];
}

export function paintRsvpResponsesPanel(rows = [], { error = "" } = {}){
  const panel = document.getElementById("rsvpResponsesPanel");
  if(!panel) return;
  const chips = panel.querySelector("#rsvpSummaryChips");
  const tableWrap = panel.querySelector("#rsvpResponsesTableWrap");
  const exportBtn = panel.querySelector("#rsvpExportCsvBtn");
  if(error){
    if(chips) chips.innerHTML = `<span class="rsvp-chip warn">Errore caricamento</span>`;
    if(tableWrap) tableWrap.innerHTML = `<p class="field-hint">${esc(error)}</p>`;
    if(exportBtn) exportBtn.hidden = true;
    return;
  }
  const summary = summarizeRsvpResponses(rows);
  if(chips) chips.innerHTML = renderSummaryChips(summary);
  if(tableWrap) tableWrap.innerHTML = renderResponsesTable(rows);
  if(exportBtn) exportBtn.hidden = rows.length === 0;
  panel.dataset.rsvpRows = JSON.stringify(rows);
}

export function bindRsvpResponsesPanel({ supabase, eventId } = {}){
  const panel = document.getElementById("rsvpResponsesPanel");
  if(!panel || !supabase || !eventId) return;

  const load = async()=>{
    paintRsvpResponsesPanel([],{});
    const chips = panel.querySelector("#rsvpSummaryChips");
    if(chips) chips.innerHTML = `<span class="rsvp-chip">Caricamento…</span>`;
    try{
      const rows = await fetchMomentRsvpResponses(supabase, eventId);
      paintRsvpResponsesPanel(rows);
    }catch(error){
      paintRsvpResponsesPanel([],{ error:error.message || "Impossibile caricare le risposte." });
    }
  };

  panel.querySelector("#rsvpRefreshResponsesBtn")?.addEventListener("click",load);
  panel.querySelector("#rsvpExportCsvBtn")?.addEventListener("click",()=>{
    let rows = [];
    try{ rows = JSON.parse(panel.dataset.rsvpRows || "[]"); }catch{ rows = []; }
    if(!rows.length) return;
    const header = ["Data","Nome","Presenza","Ospiti","Telefono","Email","Note","Extra"];
    const lines = [header.join(";")];
    rows.forEach(row=>{
      lines.push([
        formatWhen(row.created_at),
        row.guest_name || "",
        row.attending || "",
        row.guests_count ?? "",
        row.phone || "",
        row.email || "",
        (row.notes || "").replace(/;/g, ","),
        customFieldsText(row).replace(/;/g, ",")
      ].map(value=>`"${String(value).replace(/"/g,'""')}"`).join(";"));
    });
    const blob = new Blob([lines.join("\n")],{ type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rsvp-${eventId.slice(0,8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  load();
}
