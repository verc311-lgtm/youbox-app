const RESEND_API_KEY = "re_MvNw5jwf_5yFhS9KFSjGa5XQ8qDnn5tuD";

async function testResend() {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'Youbox GT <no-reply@youboxgt.com>',
            to: 'verc311@gmail.com',
            subject: 'Prueba de Correo - Youbox GT',
            html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;"><h2 style="color:#2563eb;">✅ Prueba de Correo Exitosa</h2><p>Si recibes este correo, el sistema de notificaciones de Youbox GT está funcionando correctamente.</p><p style="color:#64748b;font-size:12px;margin-top:30px;">Este es un mensaje de prueba automático.</p></div>'
        })
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
}

testResend();
