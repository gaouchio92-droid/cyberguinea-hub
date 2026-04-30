import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Verify caller is authenticated AND admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Accès réservé aux administrateurs" }, 403);

    // 2. Validate input
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim().slice(0, 100);
    const role = ["admin", "analyst", "operator"].includes(body.role) ? body.role : "analyst";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return json({ error: "Email invalide" }, 400);
    if (password.length < 8 || password.length > 128) return json({ error: "Mot de passe : 8 à 128 caractères" }, 400);
    if (!fullName) return json({ error: "Nom complet requis" }, 400);

    // 3. Create auth user (auto-confirmed so they can sign in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "Échec création" }, 400);

    const newId = created.user.id;

    // 4. Trigger handle_new_user already inserted profile + operator role.
    // Update profile name. If a different role is requested, replace operator with it.
    await admin.from("profiles").update({ full_name: fullName }).eq("id", newId);
    if (role !== "operator") {
      await admin.from("user_roles").delete().eq("user_id", newId).eq("role", "operator");
      await admin.from("user_roles").insert({ user_id: newId, role });
    }

    return json({ success: true, user_id: newId });
  } catch (e) {
    console.error("create-user error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
