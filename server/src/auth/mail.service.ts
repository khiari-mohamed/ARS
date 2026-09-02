import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log(`SMTP connection verified — ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    } catch (error: any) {
      this.logger.error(`SMTP connection FAILED — ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} — ${error.message}`);
    }
  }

  async sendPasswordResetEmail(to: string, fullName: string, token: string): Promise<void> {
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL must be configured before sending password reset emails');
    }
    const resetLink = `${frontendUrl}/password-reset?token=${token}`;
    const logoUrl = process.env.EMAIL_LOGO_URL || `${frontendUrl}/logo192.png`;
    const from = process.env.SMTP_FROM || 'ARS Tunisia <donotreply@arstunisie.com>';
    const year = new Date().getFullYear();
    const firstName = fullName.split(' ')[0];

    const legacyHtml = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>R&#233;initialisation du mot de passe &#8212; ARS Tunisie</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #f0f4ff; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .email-card { border-radius: 0 !important; }
      .header-td { padding: 28px 24px !important; }
      .body-td { padding: 32px 24px 28px !important; }
      .footer-td { padding: 18px 24px !important; }
      .accent-bar-td { padding: 0 24px !important; }
      .btn-td a { padding: 14px 28px !important; font-size: 14px !important; }
      .hero-title { font-size: 22px !important; }
      .divider-td { padding: 0 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f4ff;">

<!-- Preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0f4ff;line-height:1px;">
  R&#233;initialisez votre mot de passe ARS Tunisie &#8212; lien valable 30 minutes.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#f0f4ff;min-width:100%;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <!-- ═══ EMAIL CARD ═══ -->
      <table role="presentation" class="email-wrapper" width="600" cellpadding="0" cellspacing="0" border="0"
        style="max-width:600px;width:100%;">

        <!-- ── TOP ACCENT LINE ── -->
        <tr>
          <td style="padding:0;line-height:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" style="background:#1e3a5f;height:4px;line-height:4px;font-size:4px;">&nbsp;</td>
                <td width="34%" style="background:#d52b36;height:4px;line-height:4px;font-size:4px;">&nbsp;</td>
                <td width="33%" style="background:#1e3a5f;height:4px;line-height:4px;font-size:4px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── HEADER ── -->
        <tr>
          <td class="email-card header-td" style="background-color:#1e3a5f;padding:36px 48px 32px;border-radius:0;"
            align="center">

            <!-- Brand label -->
            <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:10px;
              font-weight:700;letter-spacing:4px;text-transform:uppercase;
              color:rgba(255,255,255,0.45);">ARS TUNISIE PLATFORM</p>

            <!-- Lock icon circle -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
              <tr>
                <td style="background:rgba(213,43,54,0.18);border:2px solid rgba(213,43,54,0.4);
                  border-radius:50%;width:56px;height:56px;text-align:center;vertical-align:middle;"
                  align="center" valign="middle">
                  <span style="font-size:26px;line-height:56px;">&#128274;</span>
                </td>
              </tr>
            </table>

            <!-- Title -->
            <h1 class="hero-title" style="margin:0;font-family:Georgia,'Times New Roman',serif;
              font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1.2;">
              R&#233;initialisation du<br />mot de passe
            </h1>

            <!-- Red underline accent -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;">
              <tr>
                <td width="24" style="background:#d52b36;height:2px;border-radius:1px;line-height:2px;font-size:2px;">&nbsp;</td>
                <td width="8">&nbsp;</td>
                <td width="48" style="background:#d52b36;height:2px;border-radius:1px;line-height:2px;font-size:2px;">&nbsp;</td>
                <td width="8">&nbsp;</td>
                <td width="24" style="background:#d52b36;height:2px;border-radius:1px;line-height:2px;font-size:2px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td class="body-td" style="background-color:#ffffff;padding:40px 48px 36px;">

            <!-- Greeting -->
            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;
              font-weight:700;color:#1e3a5f;line-height:1.3;">
              Bonjour ${firstName},
            </p>
            <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;
              color:#546e7a;line-height:1.7;">
              Nous avons re&#231;u une demande de r&#233;initialisation du mot de passe
              pour votre compte <strong style="color:#37474f;">ARS Tunisie</strong>.
              Cliquez sur le bouton ci-dessous pour d&#233;finir un nouveau mot de passe.
            </p>

            <!-- ── CTA BUTTON ── -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"
              style="margin:0 auto 32px;">
              <tr>
                <td class="btn-td" align="center"
                  style="background-color:#d52b36;border-radius:10px;
                    box-shadow:0 4px 16px rgba(213,43,54,0.35);">
                  <a href="${resetLink}"
                    style="display:inline-block;padding:16px 40px;
                      font-family:Arial,Helvetica,sans-serif;font-size:15px;
                      font-weight:700;color:#ffffff;text-decoration:none;
                      letter-spacing:0.4px;border-radius:10px;
                      mso-padding-alt:16px 40px;">
                    &#128274;&nbsp; R&#233;initialiser mon mot de passe
                  </a>
                </td>
              </tr>
            </table>

            <!-- ── EXPIRY NOTICE ── -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="margin-bottom:28px;">
              <tr>
                <td style="background-color:#fff8e1;border:1px solid #ffcc80;
                  border-left:4px solid #f59e0b;border-radius:8px;padding:14px 18px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                    color:#92400e;line-height:1.5;">
                    <strong>&#9201; Attention&nbsp;:</strong>
                    Ce lien expire dans <strong>30&nbsp;minutes</strong>.
                    Pass&#233; ce d&#233;lai, vous devrez faire une nouvelle demande.
                  </p>
                </td>
              </tr>
            </table>

            <!-- ── SECURITY NOTICE ── -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="margin-bottom:28px;">
              <tr>
                <td style="background-color:#f0f4ff;border:1px solid #c5d4e8;
                  border-left:4px solid #1e3a5f;border-radius:8px;padding:14px 18px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                    color:#37474f;line-height:1.5;">
                    <strong>&#128737; S&#233;curit&#233;&nbsp;:</strong>
                    Si vous n&#8217;avez pas demand&#233; cette r&#233;initialisation,
                    ignorez cet email. Votre mot de passe restera inchang&#233;.
                  </p>
                </td>
              </tr>
            </table>

            <!-- ── DIVIDER ── -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="margin-bottom:20px;">
              <tr>
                <td style="border-top:1px solid #e0e7ef;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- Fallback link -->
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;
              color:#78909c;line-height:1.5;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:
            </p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;
              color:#90a4ae;word-break:break-all;line-height:1.6;
              background:#f8faff;border:1px solid #e0e7ef;border-radius:6px;
              padding:10px 12px;">
              ${resetLink}
            </p>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td class="footer-td"
            style="background-color:#1e3a5f;padding:24px 48px;border-radius:0;"
            align="center">

            <!-- Footer brand row -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"
              style="margin:0 auto 12px;">
              <tr>
                <td style="border-right:1px solid rgba(255,255,255,0.2);padding-right:12px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                    font-weight:700;letter-spacing:2px;text-transform:uppercase;
                    color:rgba(255,255,255,0.6);">ARS TUNISIE</p>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                    color:rgba(255,255,255,0.4);">Plateforme de Gestion</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;
              color:rgba(255,255,255,0.3);line-height:1.5;">
              Cet email a &#233;t&#233; envoy&#233; automatiquement, merci de ne pas y r&#233;pondre.
            </p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
              color:rgba(255,255,255,0.2);letter-spacing:0.5px;">
              &copy; ${year} ARS Tunisie. Tous droits r&#233;serv&#233;s.
            </p>
          </td>
        </tr>

        <!-- ── BOTTOM ACCENT LINE ── -->
        <tr>
          <td style="padding:0;line-height:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" style="background:#d52b36;height:3px;line-height:3px;font-size:3px;">&nbsp;</td>
                <td width="50%" style="background:#1e3a5f;height:3px;line-height:3px;font-size:3px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- ═══ END EMAIL CARD ═══ -->

    </td>
  </tr>
</table>

</body>
</html>`;

    const html = this.buildPasswordResetHtml(firstName, resetLink, logoUrl, year);

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Réinitialisation de votre mot de passe - ARS Tunisie',
        html,
        text: `Bonjour ${firstName},\n\nNous avons reçu une demande de réinitialisation du mot de passe pour votre compte ARS Tunisie.\n\nCliquez sur ce lien pour réinitialiser votre mot de passe (valable 30 minutes) :\n${resetLink}\n\nSi vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe restera inchangé.\n\n© ${year} ARS Tunisie — Tous droits réservés.`,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }

  private buildPasswordResetHtml(firstName: string, resetLink: string, logoUrl: string, year: number): string {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Réinitialisation du mot de passe - ARS Tunisie</title>
</head>
<body style="margin:0;background:#f3f5f7;color:#263238;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e6e9;">
        <tr><td style="height:5px;background:#d52b36;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 36px 22px;background:#1e3a5f;">
          <img src="${logoUrl}" alt="ARS Tunisie" width="96" style="display:block;width:96px;height:auto;margin:0 0 20px;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:700;">Réinitialisation du<br>mot de passe</h1>
        </td></tr>
        <tr><td style="padding:36px;">
          <p style="margin:0 0 12px;color:#1e3a5f;font-size:18px;font-weight:700;">Bonjour ${firstName},</p>
          <p style="margin:0 0 24px;color:#52616b;font-size:15px;line-height:1.7;">Nous avons reçu une demande de réinitialisation du mot de passe de votre compte ARS Tunisie. Utilisez le bouton ci-dessous pour définir un nouveau mot de passe.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;"><tr><td style="background:#d52b36;">
            <a href="${resetLink}" style="display:inline-block;padding:15px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Réinitialiser mon mot de passe</a>
          </td></tr></table>
          <p style="margin:0 0 18px;padding:14px 16px;background:#fff8e1;border-left:4px solid #f59e0b;color:#6b4f00;font-size:13px;line-height:1.6;">Ce lien est valable pendant 30 minutes. Après expiration, vous devrez faire une nouvelle demande.</p>
          <p style="margin:0 0 24px;color:#52616b;font-size:13px;line-height:1.6;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe restera inchangé.</p>
          <p style="margin:0 0 8px;color:#71808a;font-size:12px;line-height:1.5;">Lien direct de réinitialisation :</p>
          <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.6;"><a href="${resetLink}" style="color:#1e5a91;">${resetLink}</a></p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#f7f8f9;border-top:1px solid #e2e6e9;color:#7a8790;font-size:11px;line-height:1.5;">Email automatique - ARS Tunisie<br>&copy; ${year} ARS Tunisie. Tous droits réservés.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
