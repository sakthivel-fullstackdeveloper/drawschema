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
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

const APP_URL = process.env.APP_URL || 'https://drawschema.fwitech.com';
const PORTFOLIO_URL = process.env.PORTFOLIO_URL || 'https://sakthivel.fwitech.com';
const FROM_EMAIL = process.env.SMTP_USER || 'admin@fwitech.com';

class MailService {
  /**
   * Resolve logo as:
   * 1. Embedded CID attachment
   * 2. Embedded base64 data URI fallback (renders offline & across all webmail clients)
   */
  getLogoData() {
    const candidatePaths = [
      path.join(__dirname, '../../public/logo.png'),
      path.join(__dirname, '../public/logo.png'),
      path.join(process.cwd(), 'public/logo.png'),
      path.join(process.cwd(), 'backend/public/logo.png')
    ];

    let foundPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      try {
        const fileBuffer = fs.readFileSync(foundPath);
        const base64Uri = `data:image/png;base64,${fileBuffer.toString('base64')}`;
        return {
          logoSrc: base64Uri,
          attachments: [{
            filename: 'logo.png',
            path: foundPath,
            cid: 'drawschema-logo'
          }]
        };
      } catch (err) {
        console.warn('⚠️ Could not read logo file for embedding:', err.message);
      }
    }

    // Hosted fallback
    return {
      logoSrc: `${APP_URL}/logo.png`,
      attachments: []
    };
  }

  async sendOtpEmail(toEmail, otpCode, userName = 'User') {
    const rawOtp = String(otpCode).replace(/\s+/g, '').trim();
    const { logoSrc, attachments } = this.getLogoData();
    const fromAddress = `"DrawSchema Security" <${FROM_EMAIL}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DrawSchema Security Verification Code</title>
      </head>
      <body style="margin: 0; padding: 28px 16px; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; line-height: 1.6;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #151d2a; border-radius: 16px; border: 1px solid #283548; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0e1626; border-bottom: 2px solid #4f46e5; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <img src="${logoSrc}" width="52" height="52" alt="DrawSchema Logo" style="display: block; border-radius: 12px; margin: 0 auto 10px auto; border: 1px solid rgba(99,102,241,0.3); background-color: #1e1b4b;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 2px 0; letter-spacing: -0.5px;">DrawSchema</h1>
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 500; display: block;">Visual Database Schema Designer</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 14px 0;">Email Verification Required</h2>
              
              <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 16px 0;">
                Hello <strong>${userName}</strong>,
              </p>

              <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 22px 0;">
                Please use the following 6-digit verification code to complete your security sign-in. This code is strictly valid for <strong>10 minutes</strong>:
              </p>

              <!-- Space-Free Copyable OTP Box -->
              <div style="background-color: #0b0f17; border: 1.5px solid #6366f1; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 0 0 22px 0;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; display: block; margin-bottom: 8px;">Security Verification Code</span>
                <div style="font-size: 38px; font-weight: 800; font-family: Consolas, Monaco, 'Courier New', monospace; letter-spacing: 6px; color: #a5b4fc; user-select: all; -webkit-user-select: all;">${rawOtp}</div>
                <span style="display: block; font-size: 11px; color: #64748b; margin-top: 6px;">Single code • Ready to paste</span>
              </div>

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 24px 0; text-align: center;">
                Never share this code with anyone. DrawSchema staff will never ask for your verification code.
              </p>

              <!-- Action Buttons -->
              <div style="text-align: center; padding-top: 18px; border-top: 1px solid #283548;">
                <a href="${APP_URL}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; display: inline-block; margin: 4px; box-shadow: 0 4px 12px rgba(79,70,229,0.35);">Open DrawSchema App</a>
                <a href="${PORTFOLIO_URL}" target="_blank" style="background-color: #283548; color: #cbd5e1; padding: 11px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; margin: 4px;">Sakthivel Portfolio</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #0b0f17; border-top: 1px solid #283548; font-size: 11.5px; color: #64748b; text-align: center; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">&copy; ${new Date().getFullYear()} DrawSchema Platform &bull; Developed by Sakthivel</p>
              <p style="margin: 0;">This is an automated security transmission sent to ${toEmail}. If you did not request this code, you can safely ignore this email.</p>
            </td>
          </tr>

        </table>
      </body>
      </html>
    `;

    const textContent = `DrawSchema Security Code\n\nHello ${userName},\n\nYour 6-digit verification code is: ${rawOtp}\n\nThis code expires in 10 minutes.\n\nOpen DrawSchema: ${APP_URL}\nPortfolio: ${PORTFOLIO_URL}\n\nIf you did not request this code, please ignore this email.`;

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      replyTo: `support@fwitech.com`,
      subject: `Your DrawSchema Security Code: ${rawOtp}`,
      text: textContent,
      html: htmlContent,
      attachments: attachments,
      headers: {
        'X-Entity-Ref-ID': `DrawSchema-OTP-${Date.now()}`,
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      }
    };

    console.log(`✉️ Sending OTP email to ${toEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully! MessageId: ${info.messageId}`);
    return info;
  }

  async sendWelcomeEmail(toEmail, userName = 'User') {
    const { logoSrc, attachments } = this.getLogoData();
    const fromAddress = `"DrawSchema" <${FROM_EMAIL}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DrawSchema Visual Database Designer</title>
      </head>
      <body style="margin: 0; padding: 28px 16px; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; line-height: 1.6;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #151d2a; border-radius: 16px; border: 1px solid #283548; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0e1626; border-bottom: 2px solid #4f46e5; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <img src="${logoSrc}" width="52" height="52" alt="DrawSchema Logo" style="display: block; border-radius: 12px; margin: 0 auto 10px auto; border: 1px solid rgba(99,102,241,0.3); background-color: #1e1b4b;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 2px 0; letter-spacing: -0.5px;">DrawSchema</h1>
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 500; display: block;">Visual Database Schema Designer</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="background-color: rgba(79, 70, 229, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 12px; padding: 16px; text-align: center; margin: 0 0 22px 0; color: #a5b4fc; font-weight: 700; font-size: 16px;">
                🎉 Welcome aboard, ${userName}!
              </div>

              <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 16px 0;">
                Your DrawSchema account is verified and ready. You now have full access to create visual ER diagrams, generate production MySQL scripts, export 6K diagrams, and manage version history.
              </p>

              <!-- Feature Highlights -->
              <div style="background-color: #0b0f17; border: 1px solid #283548; border-radius: 12px; padding: 18px 20px; margin: 0 0 24px 0;">
                <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #818cf8; margin: 0 0 10px 0;">What you can do:</p>
                <div style="font-size: 13.5px; color: #cbd5e1; margin: 8px 0;">&bull; <strong style="color: #ffffff;">Interactive Canvas:</strong> Drag-and-drop tables, define fields, and link foreign keys.</div>
                <div style="font-size: 13.5px; color: #cbd5e1; margin: 8px 0;">&bull; <strong style="color: #ffffff;">High-Resolution Exports:</strong> Export PNG, SVG, and PDF schematics up to 6K resolution.</div>
                <div style="font-size: 13.5px; color: #cbd5e1; margin: 8px 0;">&bull; <strong style="color: #ffffff;">Production SQL:</strong> Generate clean, compliant DDL statements with one click.</div>
              </div>

              <!-- Action Buttons -->
              <div style="text-align: center; padding-top: 18px; border-top: 1px solid #283548;">
                <a href="${APP_URL}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block; margin: 4px; box-shadow: 0 4px 12px rgba(79,70,229,0.35);">Start Designing Schemas &rarr;</a>
                <a href="${PORTFOLIO_URL}" target="_blank" style="background-color: #283548; color: #cbd5e1; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; margin: 4px;">Sakthivel Portfolio</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #0b0f17; border-top: 1px solid #283548; font-size: 11.5px; color: #64748b; text-align: center; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">&copy; ${new Date().getFullYear()} DrawSchema &bull; Developed by Sakthivel</p>
              <p style="margin: 0;"><a href="${APP_URL}" style="color: #818cf8; text-decoration: none;">drawschema.fwitech.com</a> &bull; <a href="${PORTFOLIO_URL}" style="color: #818cf8; text-decoration: none;">sakthivel.fwitech.com</a></p>
            </td>
          </tr>

        </table>
      </body>
      </html>
    `;

    const textContent = `Welcome to DrawSchema!\n\nHi ${userName},\n\nYour DrawSchema account is verified and ready.\nStart designing database schemas at: ${APP_URL}\nPortfolio: ${PORTFOLIO_URL}`;

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      replyTo: `support@fwitech.com`,
      subject: `🎉 Welcome to DrawSchema Visual Database Designer!`,
      text: textContent,
      html: htmlContent,
      attachments: attachments,
      headers: {
        'X-Entity-Ref-ID': `DrawSchema-Welcome-${Date.now()}`
      }
    };

    console.log(`✉️ Sending Welcome email to ${toEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully! MessageId: ${info.messageId}`);
    return info;
  }
}

module.exports = new MailService();
