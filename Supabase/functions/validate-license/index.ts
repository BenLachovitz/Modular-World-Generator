import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Content-Type": "application/json",
};

const PRO_FEATURES = ["pro_tools", "advanced_generation"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        valid: false,
        message: "Method not allowed",
      },
      405,
    );
  }

  try {
    const { licenseKey, userInfo, action } = await req.json();

    console.log("Received license request:", { action });

    if (!licenseKey || typeof licenseKey !== "string") {
      return jsonResponse(
        {
          valid: false,
          message: "Missing license key",
        },
        400,
      );
    }

    if (!userInfo || typeof userInfo !== "string") {
      return jsonResponse(
        {
          valid: false,
          message: "Missing user information",
        },
        400,
      );
    }

    const supabase = createSupabaseAdminClient();

    if (action === "activate") {
      const { data: existingKey, error: fetchError } = await supabase
        .from("license_keys")
        .select("*")
        .eq("key", licenseKey)
        .maybeSingle();

      if (fetchError) {
        return jsonResponse({
          valid: false,
          message: "Database error",
        });
      }

      if (!existingKey) {
        return jsonResponse({
          valid: false,
          message: "Invalid license key",
        });
      }

      if (existingKey.user_info === null) {
        const { error: updateError } = await supabase
          .from("license_keys")
          .update({
            is_active: true,
            user_info: userInfo,
            activated_at: new Date().toISOString(),
          })
          .eq("key", licenseKey)
          .is("user_info", null);

        if (updateError) {
          return jsonResponse({
            valid: false,
            message: "Database error",
          });
        }

        return jsonResponse({
          valid: true,
          message: "License activated successfully",
          features: PRO_FEATURES,
        });
      }

      if (existingKey.user_info === userInfo) {
        if (existingKey.is_active) {
          return jsonResponse({
            valid: true,
            message: "License synchronized successfully - welcome back!",
            features: PRO_FEATURES,
          });
        }

        const { error: updateError } = await supabase
          .from("license_keys")
          .update({
            is_active: true,
            activated_at: new Date().toISOString(),
          })
          .eq("key", licenseKey)
          .eq("user_info", userInfo);

        if (updateError) {
          return jsonResponse({
            valid: false,
            message: "Database error",
          });
        }

        return jsonResponse({
          valid: true,
          message: "License reactivated successfully",
          features: PRO_FEATURES,
        });
      }

      return jsonResponse({
        valid: false,
        message: "This license key is already owned by another user",
      });
    }

    if (action === "deactivate") {
      const { error: updateError } = await supabase
        .from("license_keys")
        .update({
          is_active: false,
        })
        .eq("key", licenseKey)
        .eq("user_info", userInfo);

      if (updateError) {
        return jsonResponse({
          valid: false,
          message: "Database error",
        });
      }

      return jsonResponse({
        valid: true,
        message: "License deactivated successfully",
      });
    }

    return jsonResponse(
      {
        valid: false,
        message: "Unsupported action",
      },
      400,
    );
  } catch (err) {
    console.error("validate-license error:", err);

    return jsonResponse(
      {
        valid: false,
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
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeysRaw) {
    try {
      const secretKeys = JSON.parse(secretKeysRaw);
      const defaultSecretKey = secretKeys.default;

      if (typeof defaultSecretKey === "string" && defaultSecretKey.length > 0) {
        return defaultSecretKey;
      }
    } catch (_err) {
      // Continue to fallback options.
    }
  }

  const customSecretKey = Deno.env.get("SUPABASE_SECRET_KEY");
  if (customSecretKey) {
    return customSecretKey;
  }

  const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  return "";
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