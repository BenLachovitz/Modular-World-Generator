using UnityEngine;

[CreateAssetMenu(
    fileName = "SupabaseLicenseConfig",
    menuName = "Modular World Generator/Supabase License Config"
)]
public class SupabaseLicenseConfig : ScriptableObject
{
    [Header("Supabase Edge Function")]
    [SerializeField] private string validateLicenseUrl =
        "https://YOUR_PROJECT_REF.supabase.co/functions/v1/validate-license";

    [Header("Supabase Public Client Key")]
    [SerializeField] private string publishableKey =
        "YOUR_SUPABASE_PUBLISHABLE_KEY";

    public string ValidateLicenseUrl => validateLicenseUrl;
    public string PublishableKey => publishableKey;
}