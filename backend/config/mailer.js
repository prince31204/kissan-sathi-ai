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

const sendExcessRainAlertEmail = async (toEmail, alertData) => {
  const user = (process.env.SMTP_EMAIL || '').replace(/"/g, '').trim();
  const transporter = getTransporter();

  const {
    farmerName = 'Kisan Bhai',
    crop = 'Wheat (गेहूं)',
    district = 'Dehradun, Uttarakhand',
    rainfallMm = 45,
    cropWaterNeedMm = 15,
    rainProbability = 85,
    recentIrrigationStatus = '1-2 Days Ago',
    timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  } = alertData || {};

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }
        .card { max-width: 580px; margin: 25px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #fee2e2; }
        .header { background: linear-gradient(135deg, #b91c1c, #dc2626); padding: 28px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; opacity: 0.95; font-size: 13px; font-weight: 500; }
        .badge { display: inline-block; background: rgba(255,255,255,0.25); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px; border: 1px solid rgba(255,255,255,0.4); }
        .content { padding: 26px 24px; }
        .alert-box { background: #fef2f2; border-left: 5px solid #dc2626; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
        .alert-title { color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 6px; }
        .alert-text { color: #7f1d1d; font-size: 13px; line-height: 1.5; margin: 0; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
        .grid td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .grid td.label { color: #64748b; font-weight: 600; width: 45%; }
        .grid td.val { color: #0f172a; font-weight: 700; }
        .danger-text { color: #dc2626 !important; font-weight: 800; }
        .action-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
        .action-title { color: #166534; font-size: 14px; font-weight: 700; margin-top: 0; margin-bottom: 8px; }
        .action-list { margin: 0; padding-left: 20px; color: #15803d; font-size: 13px; line-height: 1.6; }
        .footer { background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🚨 KisanSaathi AI — मौसम चेतावनी</h1>
          <p>अत्यधिक वर्षा एवं जलभराव अलर्ट (Excess Rain & Flood Risk)</p>
          <div class="badge">⚠️ HIGH PRIORITY CROP ALERT</div>
        </div>
        <div class="content">
          <div class="alert-box">
            <h2 class="alert-title">सावधान! फसल को अतिरिक्त पानी से क्षति का खतरा</h2>
            <p class="alert-text">
              आपके क्षेत्र <strong>${district}</strong> में अगले 24-48 घंटों में <strong>${rainfallMm} mm</strong> भारी वर्षा का अनुमान है।
              आपकी फसल <strong>${crop}</strong> को इस समय इतने पानी की आवश्यकता नहीं है, जिससे मिट्टी में जलभराव और जड़ सड़न (Root Rot) हो सकती है।
            </p>
          </div>

          <table class="grid">
            <tr>
              <td class="label">📍 स्थान / जिला</td>
              <td class="val">${district}</td>
            </tr>
            <tr>
              <td class="label">🌾 प्रभावित फसल</td>
              <td class="val">${crop}</td>
            </tr>
            <tr>
              <td class="label">🌧️ अनुमानित वर्षा</td>
              <td class="val danger-text">${rainfallMm} mm (${rainProbability}% सम्भावना)</td>
            </tr>
            <tr>
              <td class="label">💧 फसल की वास्तविक आवश्यकता</td>
              <td class="val">केवल ~${cropWaterNeedMm} mm</td>
            </tr>
            <tr>
              <td class="label">⚠️ अतिरिक्त अधिशेष जल</td>
              <td class="val danger-text">+${Math.max(0, rainfallMm - cropWaterNeedMm)} mm (अत्यधिक)</td>
            </tr>
            <tr>
              <td class="label">⏱️ पिछली सिंचाई</td>
              <td class="val">${recentIrrigationStatus}</td>
            </tr>
            <tr>
              <td class="label">🕒 अलर्ट जारी समय</td>
              <td class="val">${timestamp}</td>
            </tr>
          </table>

          <div class="action-card">
            <h3 class="action-title">🛡️ किसान भाइयों के लिए तत्काल बचाव के कदम:</h3>
            <ul class="action-list">
              <li><strong>जल निकासी खोलें:</strong> खेत के निचले कोनों की मेड़ काटकर तुरंत नालियां (Drainage) खोलें ताकि पानी जमा न रहे।</li>
              <li><strong>सिंचाई तुरंत रोकें:</strong> अगले 5-7 दिनों तक पंप, मोटर या कूल से नया पानी बिल्कुल न दें।</li>
              <li><strong>पहाड़ी सीढ़ीदार खेत:</strong> पानी को ऊपर की क्यारी से धीरे-धीरे रिसने दें ताकि भू-कटाव न हो।</li>
              <li><strong>फफूंदनाशक छिड़काव:</strong> बारिश रुकने और खेत सूखने पर फंगल इन्फेक्शन से बचाव हेतु नीम तेल या अनुशंसित फफूंदनाशक का छिड़काव करें।</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          यह अलर्ट KisanSaathi AI के JalTwin मौसम एवं सिंचाई इंजन द्वारा स्वचालित रूप से भेजा गया है।<br/>
          &copy; ${new Date().getFullYear()} KisanSaathi AI • उत्तराखंड कृषि संरक्षण
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"KisanSaathi AI Weather Alert" <${user}>`,
      to: toEmail,
      subject: `🚨 [मौसम अलर्ट] ${district}: ${rainfallMm} mm भारी बारिश व जलभराव चेतावनी (${crop})`,
      html: html,
    });
    return {
      success: true,
      delivered: true,
      messageId: info.messageId,
      targetEmail: toEmail,
    };
  } catch (err) {
    console.warn('Live SMTP send failed (e.g. invalid Google app password):', err.message);
    return {
      success: false,
      delivered: false,
      simulated: true,
      error: err.message,
      note: 'Alert generated. Live delivery requires a fresh 16-character Gmail App Password.',
      messageId: 'alert_sim_' + Date.now(),
      targetEmail: toEmail,
      alertData,
    };
  }
};

module.exports = { sendOtpEmail, sendExcessRainAlertEmail };
