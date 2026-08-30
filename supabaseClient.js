import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Toutes les données (joueurs, barème, amendes) sont stockées dans une seule
// ligne JSON de la table "fc_crissier_data", identifiée par ROW_ID.
// C'est le plus simple pour un outil d'équipe à faible volume.
const ROW_ID = "amendes";

export async function loadData() {
  const { data, error } = await supabase
    .from("fc_crissier_data")
    .select("payload")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? data.payload : null;
}

export async function saveData(payload) {
  const { error } = await supabase
    .from("fc_crissier_data")
    .upsert({ id: ROW_ID, payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}
