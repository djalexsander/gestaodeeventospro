import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);

    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin_master
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin_master")
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Apenas Admin Master pode executar esta ação" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    // 1. Delete event_staff (depends on events and staff_members)
    const { error: esErr } = await supabaseAdmin.from("event_staff").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (esErr) results.push(`event_staff error: ${esErr.message}`);
    else results.push("event_staff limpo");

    // 2. Delete events
    const { error: evErr } = await supabaseAdmin.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (evErr) results.push(`events error: ${evErr.message}`);
    else results.push("events limpo");

    // 3. Delete technical_riders
    const { error: trErr } = await supabaseAdmin.from("technical_riders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (trErr) results.push(`technical_riders error: ${trErr.message}`);
    else results.push("technical_riders limpo");

    // 4. Delete artists
    const { error: arErr } = await supabaseAdmin.from("artists").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (arErr) results.push(`artists error: ${arErr.message}`);
    else results.push("artists limpo");

    // 5. Delete cities
    const { error: ciErr } = await supabaseAdmin.from("cities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (ciErr) results.push(`cities error: ${ciErr.message}`);
    else results.push("cities limpo");

    // 6. Delete staff_members
    const { error: smErr } = await supabaseAdmin.from("staff_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (smErr) results.push(`staff_members error: ${smErr.message}`);
    else results.push("staff_members limpo");

    // 7. Get all non-master users to delete from auth
    const { data: nonMasterRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .neq("role", "admin_master");

    const userIdsToDelete = nonMasterRoles?.map(r => r.user_id) || [];

    // 8. Delete non-master user_roles
    if (userIdsToDelete.length > 0) {
      const { error: urErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .in("user_id", userIdsToDelete);
      if (urErr) results.push(`user_roles error: ${urErr.message}`);
      else results.push(`user_roles: ${userIdsToDelete.length} removidos`);
    }

    // 9. Delete non-master profiles
    if (userIdsToDelete.length > 0) {
      const { error: prErr } = await supabaseAdmin
        .from("profiles")
        .delete()
        .in("id", userIdsToDelete);
      if (prErr) results.push(`profiles error: ${prErr.message}`);
      else results.push(`profiles: ${userIdsToDelete.length} removidos`);
    }

    // 10. Delete all companies
    const { error: coErr } = await supabaseAdmin.from("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (coErr) results.push(`companies error: ${coErr.message}`);
    else results.push("companies limpo");

    // 11. Delete non-master auth users
    let authDeleted = 0;
    for (const userId of userIdsToDelete) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authErr) {
        results.push(`auth delete ${userId}: ${authErr.message}`);
      } else {
        authDeleted++;
      }
    }
    results.push(`auth users: ${authDeleted} removidos`);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
