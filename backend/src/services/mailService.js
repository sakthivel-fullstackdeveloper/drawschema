const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.fwitech.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  secure: process.env.SMTP_PORT == 587 ? false : true,
  auth: {
    user: process.env.SMTP_USER || 'admin@fwitech.com',
    pass: process.env.SMTP_PASS || 'VZE293VBL](H]KY}'
  },
  tls: {
    rejectUnauthorized: false
  }
});

const APP_URL = process.env.APP_URL || 'https://drawschema.fwitech.com';
const PORTFOLIO_URL = process.env.PORTFOLIO_URL || 'https://sakthivel.fwitech.com';

class MailService {
  getLogoAttachment() {
    const logoPath = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoPath)) {
      return [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'drawschema-logo'
      }];
    }
    return [];
  }

  async sendOtpEmail(toEmail, otpCode, userName = 'User') {
    const fromAddress = process.env.EMAIL_FROM || `"DrawSchema" <${process.env.SMTP_USER || 'admin@fwitech.com'}>`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DrawSchema Security Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; margin: 0; padding: 32px 12px; color: #f8fafc; }
          .wrapper { max-width: 520px; margin: 0 auto; background: #151d2a; border: 1px solid #283548; border-radius: 20px; padding: 40px 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
          .brand-container { text-align: center; margin-bottom: 32px; }
          .logo-img { display: inline-block; width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px; box-shadow: 0 8px 20px -4px rgba(79,70,229,0.5); }
          .brand-title { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; letter-spacing: -0.5px; }
          .subtitle { font-size: 13px; color: #94a3b8; margin: 0; font-weight: 500; }
          .otp-container { background: #0b0f17; border: 1.5px solid #6366f1; border-radius: 14px; padding: 28px 20px; text-align: center; margin: 28px 0; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.4); }
          .otp-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; margin-bottom: 10px; display: block; }
          .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #a5b4fc; font-family: Consolas, Monaco, 'Courier New', monospace; display: inline-block; -webkit-user-select: all; user-select: all; }
          .body-text { color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 16px 0; }
          .btn-group { margin-top: 36px; padding-top: 24px; border-top: 1px solid #283548; text-align: center; }
          .btn { display: inline-block; padding: 13px 26px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; margin: 6px 4px; transition: all 0.2s; }
          .btn-primary { background-color: #4f46e5; color: #ffffff !important; box-shadow: 0 4px 14px rgba(79,70,229,0.3); }
          .btn-secondary { background-color: #283548; color: #cbd5e1 !important; }
          .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 28px; line-height: 1.6; }
          .footer a { color: #818cf8; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="brand-container">
            <img src="cid:drawschema-logo" alt="DrawSchema Logo" width="56" height="56" class="logo-img" />
            <h1 class="brand-title">DrawSchema</h1>
            <p class="subtitle">Visual Database Schema Designer</p>
          </div>
          
          <p class="body-text">Hi <strong>${userName}</strong>,</p>
          <p class="body-text">Use the 6-digit security code below to complete your verification:</p>
          
          <div class="otp-container">
            <span class="otp-label">Security Verification Code</span>
            <div class="otp-code">${otpCode}</div>
          </div>
          
          <p class="body-text" style="font-size: 13px; color: #94a3b8; text-align: center;">
            This security code expires in <strong>10 minutes</strong>. Please do not share it with anyone.
          </p>

          <div class="btn-group">
            <a href="${APP_URL}" target="_blank" class="btn btn-primary">Open DrawSchema App</a>
            <a href="${PORTFOLIO_URL}" target="_blank" class="btn btn-secondary">Sakthivel Portfolio</a>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} <a href="${APP_URL}">DrawSchema</a> &bull; Developed by <a href="${PORTFOLIO_URL}" target="_blank">Sakthivel Portfolio</a>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `Your DrawSchema Security Code: ${otpCode}`,
      html: htmlContent,
      attachments: this.getLogoAttachment()
    };

    console.log(`✉️ Sending OTP email with embedded CID logo to ${toEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully! MessageId: ${info.messageId}`);
    return info;
  }

  async sendWelcomeEmail(toEmail, userName = 'User') {
    const fromAddress = process.env.EMAIL_FROM || `"DrawSchema" <${process.env.SMTP_USER || 'admin@fwitech.com'}>`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DrawSchema</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; margin: 0; padding: 32px 12px; color: #f8fafc; }
          .wrapper { max-width: 520px; margin: 0 auto; background: #151d2a; border: 1px solid #283548; border-radius: 20px; padding: 40px 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
          .brand-container { text-align: center; margin-bottom: 32px; }
          .logo-img { display: inline-block; width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px; box-shadow: 0 8px 20px -4px rgba(79,70,229,0.5); }
          .brand-title { font-size: 26px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; letter-spacing: -0.5px; }
          .subtitle { font-size: 13px; color: #94a3b8; margin: 0; font-weight: 500; }
          .welcome-banner { background: rgba(79, 70, 229, 0.12); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; color: #a5b4fc; font-weight: 700; font-size: 18px; }
          .body-text { color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 16px 0; }
          .feature-list { background: #0b0f17; border-radius: 14px; padding: 20px 24px; margin: 24px 0; border: 1px solid #283548; }
          .feature-item { font-size: 13.5px; color: #94a3b8; margin: 10px 0; line-height: 1.5; }
          .feature-item strong { color: #f1f5f9; }
          .btn-group { margin-top: 36px; padding-top: 24px; border-top: 1px solid #283548; text-align: center; }
          .btn { display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; margin: 6px 4px; transition: all 0.2s; }
          .btn-primary { background-color: #4f46e5; color: #ffffff !important; box-shadow: 0 4px 14px rgba(79,70,229,0.35); }
          .btn-secondary { background-color: #283548; color: #cbd5e1 !important; }
          .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 28px; line-height: 1.6; }
          .footer a { color: #818cf8; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="brand-container">
            <img src="cid:drawschema-logo" alt="DrawSchema Logo" width="56" height="56" class="logo-img" />
            <h1 class="brand-title">DrawSchema</h1>
            <p class="subtitle">Visual Database Schema Designer</p>
          </div>
          
          <div class="welcome-banner">
            🎉 Welcome aboard, ${userName}!
          </div>

          <p class="body-text">
            Your DrawSchema account is officially active. You can now build interactive ERD diagrams, generate MySQL DDL scripts, export crisp 6K diagrams, and track version histories.
          </p>

          <div class="feature-list">
            <div class="feature-item">&bull; <strong>Visual Designer</strong>: Interactive table builder with foreign key constraints.</div>
            <div class="feature-item">&bull; <strong>6K Retina Exports</strong>: Export PNG, Vector SVG, and PDF diagrams.</div>
            <div class="feature-item">&bull; <strong>SQL Generator</strong>: Export production-ready MySQL SQL queries.</div>
          </div>

          <div class="btn-group">
            <a href="${APP_URL}" target="_blank" class="btn btn-primary">Start Designing Schemas &rarr;</a>
            <a href="${PORTFOLIO_URL}" target="_blank" class="btn btn-secondary">Sakthivel Portfolio</a>
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} <a href="${APP_URL}">DrawSchema</a> &bull; Developed by <a href="${PORTFOLIO_URL}" target="_blank">Sakthivel Portfolio</a>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `🎉 Welcome to DrawSchema Visual Database Designer!`,
      html: htmlContent,
      attachments: this.getLogoAttachment()
    };

    console.log(`✉️ Sending Welcome email with embedded CID logo to ${toEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully! MessageId: ${info.messageId}`);
    return info;
  }
}

module.exports = new MailService();
