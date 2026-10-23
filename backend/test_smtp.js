require('dotenv').config();
const nodemailer = require('nodemailer');

const user = (process.env.SMTP_EMAIL || '').replace(/"/g, '').trim();
const pass = (process.env.SMTP_PASSWORD || '').replace(/"/g, '').replace(/\s+/g, '').trim();

console.log('Testing SMTP with User:', user, 'Password Length:', pass.length);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('VERIFY FAILED:');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    if (err.response) console.error('Error Response:', err.response);
  } else {
    console.log('VERIFY SUCCESS! Ready to send emails.');
  }
});
