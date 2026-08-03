import { EMAIL_BRAND } from "./emailConfig";

export interface IBrandEmailContent {
  title: string;
  greeting: string;
  messageBody: string;
  buttonText?: string;
  buttonLink?: string;
  preheader?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessageBody(body: string): string {
  const escaped = escapeHtml(body);
  return escaped.replace(/\n/g, "<br />");
}

export function buildBrandEmailHtml(content: IBrandEmailContent): string {
  const title = escapeHtml(content.title);
  const greeting = escapeHtml(content.greeting);
  const messageHtml = formatMessageBody(content.messageBody);
  const preheader = escapeHtml(content.preheader ?? content.title);
  const year = new Date().getFullYear();

  const buttonBlock =
    content.buttonText && content.buttonLink
      ? `
        <tr>
          <td align="center" style="padding: 8px 28px 20px;">
            <a href="${escapeHtml(content.buttonLink)}"
               style="display:inline-block;background:${EMAIL_BRAND.primaryColor};color:#ffffff;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:999px;">
              ${escapeHtml(content.buttonText)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 28px 28px;font-family:Inter,Arial,sans-serif;">
            <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.textMuted};">
              Or copy and paste this link into your browser:
            </p>
            <div style="padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
              <a href="${escapeHtml(content.buttonLink)}"
                 style="font-size:12px;line-height:1.6;color:${EMAIL_BRAND.primaryDark};word-break:break-all;text-decoration:none;">
                ${escapeHtml(content.buttonLink)}
              </a>
            </div>
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="padding:28px 24px 12px;background:${EMAIL_BRAND.background};border-bottom:3px solid ${EMAIL_BRAND.accentGold};">
              <img src="${EMAIL_BRAND.logoUrl}" alt="${EMAIL_BRAND.name}" width="160" height="auto" style="display:block;max-width:160px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;font-family:Inter,Arial,sans-serif;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${EMAIL_BRAND.textDark};font-weight:700;">${title}</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.textDark};">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${EMAIL_BRAND.textMuted};">${messageHtml}</p>
            </td>
          </tr>
          ${buttonBlock}
          <tr>
            <td style="padding:8px 28px 32px;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.textMuted};">
              With salaam,<br />
              <strong style="color:${EMAIL_BRAND.primaryDark};">${EMAIL_BRAND.name}</strong>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 24px;background:#0D9488;font-family:Inter,Arial,sans-serif;">
              <p style="margin:0 0 6px;font-size:12px;color:#ecfdf5;">
                <a href="${EMAIL_BRAND.websiteUrl}" style="color:#ecfdf5;text-decoration:none;">${EMAIL_BRAND.websiteUrl.replace(/^https?:\/\//, "")}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1fae5;">© ${year} ${EMAIL_BRAND.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildBrandEmailText(content: IBrandEmailContent): string {
  const lines = [
    content.greeting,
    "",
    content.messageBody,
  ];

  if (content.buttonText && content.buttonLink) {
    lines.push("", `${content.buttonText}: ${content.buttonLink}`);
  }

  lines.push("", `— ${EMAIL_BRAND.name}`, `© ${new Date().getFullYear()} ${EMAIL_BRAND.name}. All rights reserved.`);

  return lines.join("\n");
}
