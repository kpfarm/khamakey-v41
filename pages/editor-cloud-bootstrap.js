import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, WORKER_BASE_URL } from "./config.js";

function normalizeEditorState(raw){
  if(!raw) return {};
  if(typeof raw === "string"){
    try{
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }catch{
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

export async function fetchEditorCloudBootstrap(){
  if(window.top === window.self) return null;
  const businessId = String(new URLSearchParams(location.search).get("business") || "").trim();
  if(!businessId) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false }
  });
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session?.user) return null;

  const [businessRes, stateRes, nfcRes] = await Promise.all([
    supabase.from("businesses").select("id,nome,slug,categoria").eq("id", businessId).maybeSingle(),
    supabase.from("business_editor_states").select("state").eq("business_id", businessId).maybeSingle(),
    supabase.from("nfc_tags").select("code,url").eq("business_id", businessId).order("created_at",{ ascending:true }).limit(1).maybeSingle()
  ]);

  if(businessRes.error || !businessRes.data) return null;

  const business = businessRes.data;
  const state = normalizeEditorState(stateRes.data?.state);
  const businessName = String(business.nome || "").trim();
  if(businessName){
    if(!state.fields || typeof state.fields !== "object") state.fields = {};
    if(!String(state.fields.nome || "").trim()) state.fields.nome = businessName;
    if(!String(state.fields.categoria || "").trim() && business.categoria){
      state.fields.categoria = business.categoria;
    }
  }

  const slug = String(business.slug || "").trim();
  const nfcCode = String(nfcRes.data?.code || "").trim().toUpperCase();
  const nfcUrl = String(nfcRes.data?.url || "").trim() || (nfcCode ? `${WORKER_BASE_URL}/k/${nfcCode}` : "");
  const publicPageUrl = slug ? `${WORKER_BASE_URL}/p/${encodeURIComponent(slug)}` : "";
  const publicUrl = nfcUrl || publicPageUrl;

  return {
    type:"khamakey:load-state",
    state,
    businessId,
    businessName:business.nome || "",
    businessSlug:slug,
    publicUrl,
    publicPageUrl,
    workerUrl:WORKER_BASE_URL,
    nfcCode,
    account:{},
    analytics:{},
    source:"cloud-direct"
  };
}
