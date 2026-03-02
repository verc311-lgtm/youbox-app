export const RESEND_API_KEY = "re_MvNw5jwf_5yFhS9KFSjGa5XQ8qDnn5tuD";

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Youbox GT <no-reply@youboxgt.com>', // Assuming domain is verified in Resend. If not, it falls back to failure.
        to,
        subject,
        html
      })
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || 'Error sending email');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Error in sendEmail utility:", error);
    return { success: false, error };
  }
}
