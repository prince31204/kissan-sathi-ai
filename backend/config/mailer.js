const nodemailer = require('nodemailer');

const getTransporter = () => {
  const user = (process.env.SMTP_EMAIL || '').replace(/"/g, '').trim();
  const pass = (process.env.SMTP_PASSWORD || '').replace(/"/g, '').replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
};

const sendOtpEmail = async (toEmail, otp) => {
  const user = (process.env.SMTP_EMAIL || '').replace(/"/g, '').trim();
  const transporter = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f6f8; }
        .card { max-width: 520px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 32px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 28px; text-align: center; }
        .title { color: #1e293b; font-size: 20px; font-weight: 600; margin-bottom: 12px; }
        .desc { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
        .otp-code { font-size: 36px; font-weight: 800; color: #166534; letter-spacing: 8px; font-family: monospace; }
        .warning { color: #dc2626; font-size: 13px; margin-top: 8px; font-weight: 500; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🌾 KisanSaathi AI</h1>
          <p>Smart Farming & Agriculture Assistant</p>
        </div>
        <div class="content">
          <div class="title">Password Reset Verification</div>
          <div class="desc">
            We received a request to reset your password. Use the verification code (OTP) below to proceed.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="warning">
            ⚠️ This OTP is valid for <strong>10 minutes</strong>. Do NOT share it with anyone.
          </div>
        </div>
        <div class="footer">
          If you didn't request this reset, you can safely ignore this email.<br/>
          &copy; ${new Date().getFullYear()} KisanSaathi AI. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return await transporter.sendMail({
    from: `"KisanSaathi AI Support" <${user}>`,
    to: toEmail,
    subject: `🔐 KisanSaathi AI - Your Password Reset OTP is ${otp}`,
    html: html,
  });
};

module.exports = { sendOtpEmail };
