/** Libro degli ospiti — moderazione editor Moments. */

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

export function summarizeGuestbookMessages(rows = []){
  return {
    total:rows.length,
    pending:rows.filter(row=>row.status === "pending").length,
    approved:rows.filter(row=>row.status === "approved").length,
    rejected:rows.filter(row=>row.status === "rejected").length
  };
}

export function renderGuestbookModerationShell(){
  return `<div class="editor-card smart-card guestbook-moderation-panel" id="guestbookModerationPanel" data-guestbook-moderation>
    <p class="ecard-title"><span class="step-badge">2</span> Modera i messaggi</p>
    <p class="field-hint">I messaggi degli invitati restano in attesa finché non li approvi. Quelli rifiutati non compaiono in pagina.</p>
    <div class="guestbook-summary-chips" id="guestbookSummaryChips">
      <span class="guestbook-chip">Caricamento…</span>
    </div>
    <div class="guestbook-moderation-actions">
      <button type="button" class="ghost" id="guestbookRefreshBtn">Aggiorna</button>
    </div>
    <div class="guestbook-moderation-list" id="guestbookModerationList">
      <p class="field-hint">In attesa di messaggi…</p>
    </div>
  </div>`;
}

function statusLabel(status){
  if(status === "approved") return "Approvato";
  if(status === "rejected") return "Rifiutato";
  return "In attesa";
}

function renderSummaryChips(summary){
  return [
    `<span class="guestbook-chip"><strong>${summary.total}</strong> totali</span>`,
    summary.pending ? `<span class="guestbook-chip pending"><strong>${summary.pending}</strong> da approvare</span>` : "",
    `<span class="guestbook-chip approved"><strong>${summary.approved}</strong> pubblicati</span>`,
    summary.rejected ? `<span class="guestbook-chip rejected"><strong>${summary.rejected}</strong> rifiutati</span>` : ""
  ].filter(Boolean).join("");
}

function renderMessageCard(row){
  const pending = row.status === "pending";
  const actions = pending
    ? `<div class="guestbook-card-actions">
        <button type="button" class="primary guestbook-approve-btn" data-guestbook-approve="${esc(row.message_id)}">Approva</button>
        <button type="button" class="ghost guestbook-reject-btn" data-guestbook-reject="${esc(row.message_id)}">Rifiuta</button>
      </div>`
    : row.status === "approved"
    ? `<div class="guestbook-card-actions">
        <span class="guestbook-card-status approved">Approvato${row.moderated_at ? ` · ${esc(formatWhen(row.moderated_at))}` : ""}</span>
        <button type="button" class="ghost guestbook-reject-btn" data-guestbook-reject="${esc(row.message_id)}">Rifiuta</button>
      </div>`
    : `<div class="guestbook-card-actions">
        <span class="guestbook-card-status rejected">Rifiutato${row.moderated_at ? ` · ${esc(formatWhen(row.moderated_at))}` : ""}</span>
        <button type="button" class="primary guestbook-approve-btn" data-guestbook-approve="${esc(row.message_id)}">Approva</button>
      </div>`;
  return `<article class="guestbook-card ${esc(row.status)}" data-guestbook-card="${esc(row.message_id)}">
    <div class="guestbook-card-head">
      <strong>${esc(row.guest_name)}</strong>
      <span>${esc(formatWhen(row.created_at))}</span>
    </div>
    <p class="guestbook-card-message">${esc(row.message)}</p>
    ${actions}
  </article>`;
}

export async function fetchMomentGuestbookMessages(supabase, eventId){
  const { data, error } = await supabase.rpc("list_my_moment_guestbook",{ p_event_id:eventId });
  if(error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function moderateGuestbookMessage(supabase, messageId, status){
  const { data, error } = await supabase.rpc("moderate_moment_guestbook",{
    p_message_id:messageId,
    p_status:status
  });
  if(error) throw error;
  return data;
}

export function paintGuestbookModerationPanel(rows = [], { error = "" } = {}){
  const panel = document.getElementById("guestbookModerationPanel");
  if(!panel) return;
  const chips = panel.querySelector("#guestbookSummaryChips");
  const list = panel.querySelector("#guestbookModerationList");
  if(error){
    if(chips) chips.innerHTML = `<span class="guestbook-chip warn">Errore caricamento</span>`;
    if(list) list.innerHTML = `<p class="field-hint">${esc(error)}</p>`;
    return;
  }
  const summary = summarizeGuestbookMessages(rows);
  if(chips) chips.innerHTML = renderSummaryChips(summary);
  if(list){
    list.innerHTML = rows.length
      ? rows.map(renderMessageCard).join("")
      : `<p class="field-hint">Nessun messaggio ancora. Quando un invitato invia un pensiero, lo vedrai qui.</p>`;
  }
}

export function bindGuestbookModerationPanel({ supabase, eventId } = {}){
  const panel = document.getElementById("guestbookModerationPanel");
  if(!panel || !supabase || !eventId) return;

  const load = async()=>{
    paintGuestbookModerationPanel([],{});
    const chips = panel.querySelector("#guestbookSummaryChips");
    if(chips) chips.innerHTML = `<span class="guestbook-chip">Caricamento…</span>`;
    try{
      const rows = await fetchMomentGuestbookMessages(supabase, eventId);
      paintGuestbookModerationPanel(rows);
    }catch(error){
      paintGuestbookModerationPanel([],{ error:error.message || "Impossibile caricare i messaggi." });
    }
  };

  panel.querySelector("#guestbookRefreshBtn")?.addEventListener("click",load);
  panel.addEventListener("click",async event=>{
    const approve = event.target.closest("[data-guestbook-approve]");
    const reject = event.target.closest("[data-guestbook-reject]");
    const messageId = approve?.dataset.guestbookApprove || reject?.dataset.guestbookReject;
    if(!messageId) return;
    const status = approve ? "approved" : "rejected";
    const button = approve || reject;
    button.disabled = true;
    try{
      await moderateGuestbookMessage(supabase, messageId, status);
      await load();
    }catch(error){
      button.disabled = false;
      paintGuestbookModerationPanel([],{ error:error.message || "Moderazione non riuscita." });
    }
  });

  load();
}
