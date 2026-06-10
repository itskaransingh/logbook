/// <reference types="./types.d.ts" />

/**
 * @fileoverview Admin user creation Edge Function
 * Public signup is disabled for Logbook; this function lets admins create
 * employee accounts. It authenticates the caller, verifies they have the
 * admin role, then creates the user with the service-role key.
 */

import { createClient } from "npm:@supabase/supabase-js@^2.75.0";

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
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

    // Only admins may create users.
    const { data: callerProfile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return jsonResponse({ error: "Admin access required" } as ErrorResponse, 403);
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

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName =
      typeof body.full_name === "string" ? body.full_name.trim() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(
        { error: "A valid email is required" } as ErrorResponse,
        400
      );
    }
    if (password.length < 6) {
      return jsonResponse(
        { error: "Password must be at least 6 characters" } as ErrorResponse,
        400
      );
    }
    if (fullName.length === 0 || fullName.length > 100) {
      return jsonResponse(
        { error: "Full name is required (max 100 characters)" } as ErrorResponse,
        400
      );
    }

    // New users are always employees (the profiles trigger applies the
    // default role); admins are promoted only via SQL/Studio.
    const { data, error: createError } =
      await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError) {
      const isDuplicate =
        createError.message.toLowerCase().includes("already") ||
        createError.code === "email_exists";
      return jsonResponse(
        {
          error: isDuplicate
            ? "A user with this email already exists"
            : "Failed to create user",
          details: createError.message,
        } as ErrorResponse,
        isDuplicate ? 409 : 500
      );
    }

    return jsonResponse(
      { user: { id: data.user.id, email: data.user.email } },
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
