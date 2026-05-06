import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, password, fullName, permissionNames, profileName } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create auth user
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (createErr) {
      // Maybe exists — find them
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) throw createErr;
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      userId = created.user!.id;
    }

    // 2. Upsert profile in public.profiles
    await supabase.from("profiles").upsert({
      id: userId,
      username: email,
      full_name: fullName,
    }, { onConflict: "id" });

    // 3. Find or create System Administrator security profile
    let { data: sp } = await supabase
      .from("security_profiles")
      .select("id")
      .eq("name", profileName)
      .maybeSingle();

    if (!sp) {
      const { data: ins, error: spErr } = await supabase
        .from("security_profiles")
        .insert({ name: profileName, description: "Full system access", is_system: true })
        .select("id")
        .single();
      if (spErr) throw spErr;
      sp = ins;
    }
    const profileId = sp.id;

    // 4. Grant all permissions to that profile
    const rows = permissionNames.map((name: string) => ({
      profile_id: profileId,
      object_name: name,
      can_read: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      can_view_all: true,
      can_modify_all: true,
    }));
    // Wipe existing then insert (chunked)
    await supabase.from("profile_object_permissions").delete().eq("profile_id", profileId);
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error } = await supabase.from("profile_object_permissions").insert(rows.slice(i, i + chunkSize));
      if (error) throw error;
    }

    // 5. Link user -> profile via user_profiles
    await supabase.from("user_profiles").delete().eq("user_id", userId);
    const { error: upErr } = await supabase.from("user_profiles").insert({
      user_id: userId,
      profile_id: profileId,
    });
    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({ ok: true, userId, profileId, permissionsGranted: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
