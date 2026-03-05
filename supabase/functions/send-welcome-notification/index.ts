import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    
    // Solo ejecutamos esto cuando se inserta un nuevo cliente
    if (!record || !record.email || !record.locker_id) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos (email, locker)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { nombre, email, telefono, locker_id } = record

    // Textos de las direcciones
    const direccionesEmail = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
      <h2 style="color: #0284c7; text-align: center;">¡Bienvenido a YOUBOX GT!</h2>
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Tu cuenta ha sido creada exitosamente. Tu número de casillero exclusivo es:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; padding: 10px 20px; background-color: #dbeafe; color: #1e3a8a; border-radius: 6px;">${locker_id}</span>
      </div>
      <p>Usa las siguientes direcciones exactas para tus compras:</p>

      <div style="background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #10b981;">
        <h4 style="margin: 0 0 10px 0; color: #064e3b;">🇺🇸 Greensboro, NC — Vía Marítima (USA)</h4>
        <p style="margin: 3px 0; font-family: monospace;"><b>Nombre:</b> YBG ${nombre} ${locker_id}</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Dir:</b> 4100 Tulsa Dr</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Suite/Apt:</b> ${locker_id}</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Ciudad:</b> Greensboro, NC 27406</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Tel:</b> 3365496890</p>
      </div>

      <div style="background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #3b82f6;">
        <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">🇺🇸 Laredo, TX — Vía Terrestre (USA)</h4>
        <p style="margin: 3px 0; font-family: monospace;"><b>Nombre:</b> YBG ${nombre} ${locker_id}</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Dir:</b> 1900 Justo Penn St</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Suite/Apt:</b> ${locker_id}</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Ciudad:</b> Laredo, TX 78041</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Tel:</b> 7572437074</p>
      </div>

      <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <h4 style="margin: 0 0 10px 0; color: #78350f;">🇲🇽 Tapachula, Chiapas — Vía Terrestre (México)</h4>
        <p style="margin: 3px 0; font-family: monospace;"><b>Nombre:</b> YBG ${nombre} ${locker_id}</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Dir:</b> Calle El Carmen Manzana 6 Casa 4</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Ref:</b> Infonavit El Carmen + ${locker_id}</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Ciudad:</b> Tapachula, Chiapas CP 30799</p>
        <p style="margin: 3px 0; font-family: monospace;"><b>Tel:</b> 9621210423</p>
      </div>

      <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px;">
        ⚠️ Recuerda escribir los datos tal cual aparecen arriba para evitar pérdidas.
      </p>
    </div>
    `;

    // 1. Enviar Email vía Resend API (si está configurado)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    let emailStatus = 'skipped (no key)'
    
    if (RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'YOUBOX GT <onboarding@youbox.gt>', // Idealmente cambiar a un dominio verificado
          to: email,
          subject: `¡Tu casillero YOUBOX está listo! (${locker_id})`,
          html: direccionesEmail
        })
      })
      emailStatus = resendRes.ok ? 'sent' : `failed: ${await resendRes.text()}`
    }

    // 2. Enviar WhatsApp vía UltraMsg (Pausado a petición del usuario)
    /*
    const ULTRAMSG_INSTANCE_ID = Deno.env.get('ULTRAMSG_INSTANCE_ID')
    const ULTRAMSG_TOKEN = Deno.env.get('ULTRAMSG_TOKEN')
    
    if (ULTRAMSG_INSTANCE_ID && ULTRAMSG_TOKEN && telefono) {
      const waMessage = `🎉 ¡Bienvenido a YOUBOX GT! Tu casillero es: *${locker_id}*\n\nUsa las 3 direcciones (Greensboro, Laredo, Tapachula) que te enviamos al correo electrónico.\n\nRecomendamos copiar "YBG ${nombre} ${locker_id}" en tu nombre de envío.`;
      
      const cleanPhone = telefono.replace(/\D/g, ''); // Deja solo números (ej: 50255551234)
      
      const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;
      const data = new URLSearchParams();
      data.append("token", ULTRAMSG_TOKEN);
      data.append("to", `+${cleanPhone}`);
      data.append("body", waMessage);

      const umRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data
      });

      waStatus = umRes.ok ? 'sent' : `failed: ${await umRes.text()}`
    }
    */
    let waStatus = 'skipped (paused by user)'

    return new Response(
      JSON.stringify({ 
        message: 'Notificaciones enviadas', 
        locker_id,
        email: emailStatus,
        whatsapp: waStatus 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
