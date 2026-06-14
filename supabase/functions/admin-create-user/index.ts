/// <reference types="./types.d.ts" />

/**
 * @fileoverview Admin user creation Edge Function
 * Creates Org Members with org-scoped emails (username@orgslug.logbook).
 * Caller must be the org's Owner or a super_admin within the org.
 */

import { createClient } from "npm:@supabase/supabase-js@^2.75.0";

interface CreateUserRequest {
  username: string;
  full_name: string;
  password: string;
  org_id: string;
  role?: "employee" | "admin" | "super_admin";
}

interface ErrorResponse {
  error: string;
  details?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: object, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" } as ErrorResponse, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Server configuration error" } as ErrorResponse,
        500
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate the caller from their JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: authError,
    } = await serviceClient.auth.getUser(jwt);

    if (authError || !caller) {
      return jsonResponse({ error: "Not authenticated" } as ErrorResponse, 401);
    }

    let body: CreateUserRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON in request body" } as ErrorResponse,
        400
      );
    }

    const username = typeof body.username === "string"
      ? body.username.trim().toLowerCase()
      : "";
    const fullName = typeof body.full_name === "string"
      ? body.full_name.trim()
      : "";
    const password = typeof body.password === "string" ? body.password : "";
    const orgId = typeof body.org_id === "string" ? body.org_id.trim() : "";
    const role = body.role ?? "employee";

    // Validate inputs
    if (!/^[a-z0-9]+$/.test(username) || username.length < 2 || username.length > 30) {
      return jsonResponse(
        { error: "Username must be 2–30 lowercase alphanumeric characters" } as ErrorResponse,
        400
      );
    }
    if (fullName.length === 0 || fullName.length > 100) {
      return jsonResponse(
        { error: "Full name is required (max 100 characters)" } as ErrorResponse,
        400
      );
    }
    if (password.length < 6) {
      return jsonResponse(
        { error: "Password must be at least 6 characters" } as ErrorResponse,
        400
      );
    }
    if (!orgId) {
      return jsonResponse(
        { error: "org_id is required" } as ErrorResponse,
        400
      );
    }
    if (!["employee", "admin", "super_admin"].includes(role)) {
      return jsonResponse(
        { error: "Invalid role" } as ErrorResponse,
        400
      );
    }

    // Verify the org exists and caller is authorized (owner or super_admin in org)
    const { data: org } = await serviceClient
      .from("organizations")
      .select("id, slug, owner_id")
      .eq("id", orgId)
      .single();

    if (!org) {
      return jsonResponse({ error: "Organization not found" } as ErrorResponse, 404);
    }

    const { data: callerProfile } = await serviceClient
      .from("profiles")
      .select("role, org_id")
      .eq("id", caller.id)
      .single();

    const isOwner = org.owner_id === caller.id;
    const isSuperAdminInOrg =
      callerProfile?.role === "super_admin" && callerProfile?.org_id === orgId;

    if (!isOwner && !isSuperAdminInOrg) {
      return jsonResponse({ error: "Not authorized to add members to this organization" } as ErrorResponse, 403);
    }

    const email = `${username}@${org.slug}.logbook`;

    const { data, error: createError } =
      await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, org_id: orgId },
      });

    if (createError) {
      const isDuplicate =
        createError.message.toLowerCase().includes("already") ||
        createError.code === "email_exists";
      return jsonResponse(
        {
          error: isDuplicate
            ? `Username '${username}' is already taken in this organization`
            : "Failed to create user",
          details: createError.message,
        } as ErrorResponse,
        isDuplicate ? 409 : 500
      );
    }

    // Set the role on the newly created profile (default is 'employee')
    if (role !== "employee") {
      await serviceClient
        .from("profiles")
        .update({ role })
        .eq("id", data.user.id);
    }

    return jsonResponse(
      { user: { id: data.user.id, email, username, org_id: orgId } },
      200
    );
  } catch (error) {
    console.error("admin-create-user error:", error);
    return jsonResponse(
      {
        error: "Failed to process your request",
        details: error instanceof Error ? error.message : undefined,
      } as ErrorResponse,
      500
    );
  }
});
