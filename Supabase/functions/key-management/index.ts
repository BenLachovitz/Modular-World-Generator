import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  try {
    const { action, adminKey, count } = await req.json()
    
    // Simple admin authentication
    const ADMIN_SECRET = "UNITY_ADMIN_2025_SECRET"
    if (adminKey !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Unauthorized admin access' 
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'check_and_generate') {
      // Check available keys (user_info is NULL)
      const { data: availableKeys, error: checkError } = await supabase
        .from('license_keys')
        .select('*')
        .is('user_info', null)

      if (checkError) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Database error: ' + checkError.message 
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }

      const availableCount = availableKeys?.length || 0
      console.log(`Available keys: ${availableCount}`)

      if (availableCount < 3) {
        // Generate new keys to reach minimum of 5
        const keysToGenerate = 5 - availableCount
        const newKeys = []

        for (let i = 0; i < keysToGenerate; i++) {
          const newKey = generateLicenseKey()
          newKeys.push({
            key: newKey,
            is_active: false,
            user_info: null,
            activated_at: null
          })
        }

        const { error: insertError } = await supabase
          .from('license_keys')
          .insert(newKeys)

        if (insertError) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Failed to insert keys: ' + insertError.message 
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          })
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Generated ${keysToGenerate} new keys`,
          generated_keys: newKeys.map(k => k.key),
          available_before: availableCount,
          available_after: availableCount + keysToGenerate
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      } else {
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Sufficient keys available (${availableCount})`,
          available_keys: availableCount
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }

    } else if (action === 'manual_generate') {
      // Manual key generation
      const keysToGenerate = count || 1
      const newKeys = []

      for (let i = 0; i < keysToGenerate; i++) {
        const newKey = generateLicenseKey()
        newKeys.push({
          key: newKey,
          is_active: false,
          user_info: null,
          activated_at: null
        })
      }

      const { error: insertError } = await supabase
        .from('license_keys')
        .insert(newKeys)

      if (insertError) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to insert keys: ' + insertError.message 
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Manually generated ${keysToGenerate} keys`,
        generated_keys: newKeys.map(k => k.key)
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })

    } else if (action === 'get_stats') {
      // Get statistics
      const { data: allKeys, error: statsError } = await supabase
        .from('license_keys')
        .select('*')

      if (statsError) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Database error: ' + statsError.message 
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }

      const available = allKeys.filter(k => k.user_info === null).length
      const activeUsed = allKeys.filter(k => k.user_info !== null && k.is_active === true).length
      const inactiveUsed = allKeys.filter(k => k.user_info !== null && k.is_active === false).length

      return new Response(JSON.stringify({ 
        success: true, 
        stats: {
          total_keys: allKeys.length,
          available_keys: available,
          active_licenses: activeUsed,
          inactive_licenses: inactiveUsed
        }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Server error: ' + err.message 
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})

function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = []
  
  for (let i = 0; i < 4; i++) {
    let segment = ''
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  
  return segments.join('-') // Example: ABCD-1234-EFGH-5678
}