import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  try {
    const { licenseKey, userInfo, action } = await req.json();
    console.log('Received request:', {
      licenseKey,
      userInfo,
      action
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    if (action === 'activate') {
      // First, check if the license key exists
      const { data: existingKey, error: fetchError } = await supabase.from('license_keys').select('*').eq('key', licenseKey).single();
      if (fetchError || !existingKey) {
        return new Response(JSON.stringify({
          valid: false,
          message: 'Invalid license key'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      // Check ownership logic
      if (existingKey.user_info === null) {
        // Key is unowned - can be activated by this user
        const { error: updateError } = await supabase.from('license_keys').update({
          is_active: true,
          user_info: userInfo,
          activated_at: new Date().toLocaleString('en-US', { 
            timeZone: 'Asia/Jerusalem',  // Or your timezone
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })
        }).eq('key', licenseKey);
        if (updateError) {
          return new Response(JSON.stringify({
            valid: false,
            message: 'Database error'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        return new Response(JSON.stringify({
          valid: true,
          message: 'License activated successfully',
          features: [
            'pro_tools',
            'advanced_generation'
          ]
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else if (existingKey.user_info === userInfo) {
        // Same user - either reactivating or syncing from new installation
        if (existingKey.is_active) {
          // License is already active in database - just sync locally
          return new Response(JSON.stringify({
            valid: true,
            message: 'License synchronized successfully - welcome back!',
            features: [
              'pro_tools',
              'advanced_generation'
            ]
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } else {
          // User reactivating their deactivated license
          const { error: updateError } = await supabase.from('license_keys').update({
            is_active: true,
            activated_at: new Date().toISOString()
          }).eq('key', licenseKey);
          if (updateError) {
            return new Response(JSON.stringify({
              valid: false,
              message: 'Database error'
            }), {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          return new Response(JSON.stringify({
            valid: true,
            message: 'License reactivated successfully',
            features: [
              'pro_tools',
              'advanced_generation'
            ]
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } else {
        // Different user trying to use someone else's key
        return new Response(JSON.stringify({
          valid: false,
          message: 'This license key is already owned by another user'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } else if (action === 'deactivate') {
      // Deactivate the license
      const { error: updateError } = await supabase.from('license_keys').update({
        is_active: false
      }).eq('key', licenseKey).eq('user_info', userInfo);
      if (updateError) {
        return new Response(JSON.stringify({
          valid: false,
          message: 'Database error'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return new Response(JSON.stringify({
        valid: true,
        message: 'License deactivated successfully'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({
      valid: false,
      message: 'Server error: ' + err.message
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
