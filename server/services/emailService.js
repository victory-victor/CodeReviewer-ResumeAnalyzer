const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const sendWelcomeVerificationEmail = async ({ name, email, token }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || 'Merge AI';
  if (!apiKey || !senderEmail) throw new Error('Brevo email is not configured');

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verificationUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name || 'there');
  const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Welcome to Merge AI</title></head><body style="margin:0;background:#f3f5f0;font-family:Arial,Helvetica,sans-serif;color:#263329"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Welcome to Merge AI. Verify your email to get started.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f0;padding:38px 14px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e6eae3;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 38px;background:linear-gradient(135deg,#26392d,#506d55);color:#fff"><div style="font-size:13px;font-weight:bold;letter-spacing:.5px">✳ &nbsp; MERGE AI</div><div style="margin-top:30px;font-size:12px;letter-spacing:1.5px;color:#c8d5c7">YOUR ENGINEERING PARTNER</div><h1 style="margin:10px 0 0;font-size:34px;line-height:1.15;letter-spacing:-1px">A thoughtful welcome<br>to better code.</h1></td></tr><tr><td style="padding:34px 38px 18px"><div style="display:inline-block;padding:8px 11px;background:#f1f5ef;border-radius:30px;color:#547258;font-size:11px;font-weight:bold;letter-spacing:.4px">✦ YOUR WORKSPACE IS ALMOST READY</div><h2 style="margin:22px 0 10px;font-size:23px;letter-spacing:-.5px">Welcome, ${safeName}.</h2><p style="margin:0;color:#657166;font-size:15px;line-height:1.75">We’re glad you’re here. Merge AI helps you review code with more confidence, understand your progress, and make your next career move with clarity.</p><p style="margin:20px 0;color:#657166;font-size:15px;line-height:1.75">To make sure this email belongs to you, confirm your email address below.</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 22px"><tr><td align="center" bgcolor="#405b45" style="border-radius:9px"><a href="${verificationUrl}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">Verify my email&nbsp; →</a></td></tr></table><p style="margin:0;color:#8a9388;font-size:12px;line-height:1.7">This secure link expires in 24 hours. If you didn’t create a Merge AI account, you can ignore this message.</p><div style="height:1px;background:#edf0eb;margin:26px 0 18px"></div><p style="margin:0;color:#9aa198;font-size:11px;line-height:1.7">Button not working? Copy and paste this link into your browser:<br><a href="${verificationUrl}" style="color:#59785e;word-break:break-all">${verificationUrl}</a></p></td></tr><tr><td style="padding:18px 38px 28px;background:#fafbf9"><p style="margin:0;color:#8b9388;font-size:11px;line-height:1.7">Made for people who build.<br>Merge AI · Your code and data stay private to your workspace.</p></td></tr></table><div style="padding:18px;color:#a0a79d;font-size:10px">© ${new Date().getFullYear()} Merge AI</div></td></tr></table></body></html>`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email, name }],
      subject: 'Welcome to Merge AI — verify your email',
      htmlContent,
      textContent: `Welcome to Merge AI, ${name || 'there'}! Verify your email address: ${verificationUrl}\n\nThis link expires in 24 hours. If you did not create an account, ignore this email.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const error = new Error('Brevo could not send the verification email');
    error.status = response.status;
    error.providerMessage = detail.message;
    throw error;
  }
};

const sendPasswordResetOtpEmail = async ({ name, email, otp }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || 'Merge AI';
  if (!apiKey || !senderEmail) throw new Error('Brevo email is not configured');

  const safeName = escapeHtml(name || 'there');
  const safeOtp = escapeHtml(otp);
  const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Reset your Merge AI password</title></head><body style="margin:0;background:#f3f5f0;font-family:Arial,Helvetica,sans-serif;color:#263329"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your Merge AI verification code is ${safeOtp}.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f0;padding:38px 14px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e6eae3;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 38px;background:linear-gradient(135deg,#26392d,#506d55);color:#fff"><div style="font-size:13px;font-weight:bold;letter-spacing:.5px">✳ &nbsp; MERGE AI</div><div style="margin-top:30px;font-size:12px;letter-spacing:1.5px;color:#c8d5c7">ACCOUNT SECURITY</div><h1 style="margin:10px 0 0;font-size:34px;line-height:1.15;letter-spacing:-1px">Your password<br>reset code.</h1></td></tr><tr><td style="padding:34px 38px 18px"><div style="display:inline-block;padding:8px 11px;background:#f1f5ef;border-radius:30px;color:#547258;font-size:11px;font-weight:bold;letter-spacing:.4px">✦ VERIFICATION CODE</div><h2 style="margin:22px 0 10px;font-size:23px;letter-spacing:-.5px">Hello, ${safeName}.</h2><p style="margin:0;color:#657166;font-size:15px;line-height:1.75">We received a request to reset the password for your Merge AI account. Enter the 6-digit verification code below on the login page to choose a new password.</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 22px"><tr><td align="center" bgcolor="#f5f7f2" style="border:1px solid #dce2d7;border-radius:12px;padding:18px 32px"><div style="font-family:'Courier New',Courier,monospace,sans-serif;font-size:36px;font-weight:bold;letter-spacing:8px;color:#283a2d">${safeOtp}</div></td></tr></table><p style="margin:0;color:#8a9388;font-size:12px;line-height:1.7">This code is valid for 10 minutes and can only be used once. If you did not request a password reset, you can safely ignore this email — your account remains secure.</p><div style="height:1px;background:#edf0eb;margin:26px 0 18px"></div><p style="margin:0;color:#9aa198;font-size:11px;line-height:1.7">Never share this code with anyone. Merge AI will never ask for your code outside the official reset form.</p></td></tr><tr><td style="padding:18px 38px 28px;background:#fafbf9"><p style="margin:0;color:#8b9388;font-size:11px;line-height:1.7">Made for people who build.<br>Merge AI · Your code and data stay private to your workspace.</p></td></tr></table><div style="padding:18px;color:#a0a79d;font-size:10px">© ${new Date().getFullYear()} Merge AI</div></td></tr></table></body></html>`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email, name }],
      subject: `${safeOtp} is your Merge AI verification code`,
      htmlContent,
      textContent: `Hello ${name || 'there'}! Your Merge AI password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request a password reset, ignore this email.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const error = new Error('Brevo could not send the OTP email');
    error.status = response.status;
    error.providerMessage = detail.message;
    throw error;
  }
};

module.exports = { sendWelcomeVerificationEmail, sendPasswordResetOtpEmail };
