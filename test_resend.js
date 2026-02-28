const RESEND_API_KEY = "re_MvNw5jwf_5yFhS9KFSjGa5XQ8qDnn5tuD";

async function testResend() {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'Youbox GT <onboarding@resend.dev>',
            to: 'coastalvavictor@gmail.com',
            subject: 'Test API',
            html: '<p>Test</p>'
        })
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
}

testResend();
