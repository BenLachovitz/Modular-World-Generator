import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        message: "Method not allowed",
      },
      405,
    );
  }

  try {
    const { action, adminKey, count } = await req.json();

    const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");

    if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
      return jsonResponse(
        {
          success: false,
          message: "Unauthorized admin access",
        },
        401,
      );
    }

    const supabase = createSupabaseAdminClient();

    if (action === "check_and_generate") {
      const { data: availableKeys, error: checkError } = await supabase
        .from("license_keys")
        .select("*")
        .is("user_info", null);

      if (checkError) {
        return jsonResponse({
          success: false,
          message: "Database error: " + checkError.message,
        });
      }

      const availableCount = availableKeys?.length || 0;

      if (availableCount < 3) {
        const keysToGenerate = 5 - availableCount;
        const newKeys = [];

        for (let i = 0; i < keysToGenerate; i++) {
          const newKey = generateLicenseKey();
          newKeys.push({
            key: newKey,
            is_active: false,
            user_info: null,
            activated_at: null,
          });
        }

        const { error: insertError } = await supabase
          .from("license_keys")
          .insert(newKeys);

        if (insertError) {
          return jsonResponse({
            success: false,
            message: "Failed to insert keys: " + insertError.message,
          });
        }

        return jsonResponse({
          success: true,
          message: `Generated ${keysToGenerate} new keys`,
          generated_keys: newKeys.map((k) => k.key),
          available_before: availableCount,
          available_after: availableCount + keysToGenerate,
        });
      }

      return jsonResponse({
        success: true,
        message: `Sufficient keys available (${availableCount})`,
        available_keys: availableCount,
      });
    }

    if (action === "manual_generate") {
      const keysToGenerate = normalizeKeyCount(count);
      const newKeys = [];

      for (let i = 0; i < keysToGenerate; i++) {
        const newKey = generateLicenseKey();
        newKeys.push({
          key: newKey,
          is_active: false,
          user_info: null,
          activated_at: null,
        });
      }

      const { error: insertError } = await supabase
        .from("license_keys")
        .insert(newKeys);

      if (insertError) {
        return jsonResponse({
          success: false,
          message: "Failed to insert keys: " + insertError.message,
        });
      }

      return jsonResponse({
        success: true,
        message: `Manually generated ${keysToGenerate} keys`,
        generated_keys: newKeys.map((k) => k.key),
      });
    }

    if (action === "get_stats") {
      const { data: allKeys, error: statsError } = await supabase
        .from("license_keys")
        .select("*");

      if (statsError) {
        return jsonResponse({
          success: false,
          message: "Database error: " + statsError.message,
        });
      }

      const keys = allKeys ?? [];

      const available = keys.filter((k) => k.user_info === null).length;
      const activeUsed = keys.filter(
        (k) => k.user_info !== null && k.is_active === true,
      ).length;
      const inactiveUsed = keys.filter(
        (k) => k.user_info !== null && k.is_active === false,
      ).length;

      return jsonResponse({
        success: true,
        stats: {
          total_keys: keys.length,
          available_keys: available,
          active_licenses: activeUsed,
          inactive_licenses: inactiveUsed,
        },
      });
    }

    return jsonResponse(
      {
        success: false,
        message: "Unsupported action",
      },
      400,
    );
  } catch (err) {
    console.error("key-management error:", err);

    return jsonResponse(
      {
        success: false,
        message: "Server error: " + getErrorMessage(err),
      },
      500,
    );
  }
});

function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing Supabase URL or secret key configuration");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSupabaseSecretKey() {
  // New Supabase key system:
  // SUPABASE_SECRET_KEYS is a JSON object, for example:
  // { "default": "sb_secret_..." }
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeysRaw) {
    try {
      const secretKeys = JSON.parse(secretKeysRaw);
      const defaultSecretKey = secretKeys.default;

      if (typeof defaultSecretKey === "string" && defaultSecretKey.length > 0) {
        return defaultSecretKey;
      }
    } catch (_err) {
      // If parsing fails, continue to fallback options below.
    }
  }

  // Optional fallback if you manually add a single secret in Edge Function Secrets.
  const customSecretKey = Deno.env.get("SUPABASE_SECRET_KEY");
  if (customSecretKey) {
    return customSecretKey;
  }

  // Legacy fallback for older Supabase projects.
  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  return "";
}

function normalizeKeyCount(count: unknown) {
  const parsedCount = Number(count || 1);

  if (!Number.isInteger(parsedCount) || parsedCount < 1) {
    return 1;
  }

  if (parsedCount > 50) {
    return 50;
  }

  return parsedCount;
}

function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];

  for (let i = 0; i < 4; i++) {
    let segment = "";

    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    segments.push(segment);
  }

  return segments.join("-");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}