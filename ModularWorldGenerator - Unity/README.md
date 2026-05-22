# Supabase License Configuration

The Unity project does not include real Supabase configuration values in the repository.

To enable license validation, each developer must create a local Unity configuration asset with their own Supabase project values.

## 1. Create the Config Asset

In Unity, open the Project window and create the config asset:

```txt
Right Click → Create → Modular World Generator → Supabase License Config
```

Name the asset exactly:

```txt
SupabaseLicenseConfig
```

Place it under:

```txt
Assets/Resources/
```

The final path should be:

```txt
Assets/Resources/SupabaseLicenseConfig.asset
```

If the `Resources` folder does not exist yet, create it manually under `Assets`.

## 2. Fill in Supabase Values

Select the `SupabaseLicenseConfig` asset in Unity and fill in the following fields:

```txt
Validate License Url
Publishable Key
```

Example format:

```txt
Validate License Url:
https://your-project-ref.supabase.co/functions/v1/validate-license

Publishable Key:
your-supabase-publishable-key
```

The `Validate License Url` should point to your deployed Supabase Edge Function named `validate-license`.

## 3. Do Not Commit the Config Asset

This file contains local project configuration and should not be committed to GitHub:

```txt
Assets/Resources/SupabaseLicenseConfig.asset
Assets/Resources/SupabaseLicenseConfig.asset.meta
```

The repository `.gitignore` already excludes these files:

```gitignore
**/SupabaseLicenseConfig.asset
**/SupabaseLicenseConfig.asset.meta
```

## 4. Why This Config Is Local

The Supabase URL and publishable key are not highly sensitive secrets, but they are still project-specific configuration values.

Keeping them outside the repository makes the project reusable, because each developer can connect the tool to their own Supabase project instead of using the original project configuration.

## 5. Required Supabase Edge Function

The Unity license system expects a Supabase Edge Function named:

```txt
validate-license
```

The Unity tool sends a `POST` request to this function.

Example request body:

```json
{
  "action": "activate",
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "userInfo": "local-user-identifier"
}
```

Expected successful response format:

```json
{
  "valid": true,
  "message": "License activated successfully",
  "features": [
    "pro_tools",
    "advanced_generation"
  ]
}
```

Example failed response format:

```json
{
  "valid": false,
  "message": "Invalid license key"
}
```

## 6. Notes

The publishable key is safe to use in client-side tools such as Unity, but it should not be confused with the Supabase secret key.

The Supabase secret key must only be used inside Supabase Edge Functions and must never be placed inside the Unity project.

The Unity project should only store:

```txt
Validate License Url
Publishable Key
```

It should never store:

```txt
Supabase secret key
Service role key
Admin secret
Real database credentials
```
