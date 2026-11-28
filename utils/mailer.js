// Transactional email through Brevo's HTTP API.
// Render's free instances block outbound SMTP (ports 25/465/587), so mail goes over HTTPS instead.
// Env: BREVO_API_KEY, MAIL_FROM (a sender address verified in Brevo), MAIL_FROM_NAME (optional).
const mailConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM);
// Render sets RENDER=true; treat it as production even if NODE_ENV was never set there.
const isLive = () => process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) {
    if (isLive()) throw new Error('MAIL_NOT_CONFIGURED');
    // Local development: print the message instead of sending it.
    console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'Chợ UEH' },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

module.exports = { sendMail, mailConfigured, isLive };
