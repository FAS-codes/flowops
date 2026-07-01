import nodemailer, { Transporter } from 'nodemailer';
import { env, primaryClientUrl } from '../config/env';

/**
 * Lazily-built mail transport. When SMTP env vars are present we send for real;
 * otherwise we fall back to a JSON transport that just logs the message, so the
 * app is fully functional in development without any email provider.
 */
let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (transporter) return transporter;
  if (env.smtp.enabled) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: MailInput): Promise<void> {
  const info = await getTransport().sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
    text,
  });
  if (!env.smtp.enabled) {
    // Dev fallback: surface the email (and any links) in the server logs.
    console.log(`\n[mailer] (dev) email not sent — SMTP not configured`);
    console.log(`[mailer] to=${to} subject="${subject}"`);
    console.log(`[mailer] body:\n${text}\n`);
  } else {
    console.log(`[mailer] sent "${subject}" to ${to} (id=${info.messageId})`);
  }
}

function layout(title: string, body: string, cta?: { label: string; url: string }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1b22">
    <div style="font-size:20px;font-weight:600;margin-bottom:16px">Flow<span style="color:#5145e5">Ops</span></div>
    <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#4b4a55">${body}</div>
    ${
      cta
        ? `<a href="${cta.url}" style="display:inline-block;margin-top:20px;background:#5145e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:500">${cta.label}</a>`
        : ''
    }
    <p style="font-size:12px;color:#9d9ca8;margin-top:28px">If you didn't expect this email, you can safely ignore it.</p>
  </div>`;
}

export async function sendInvitationEmail(params: {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  token: string;
}): Promise<void> {
  const url = `${primaryClientUrl()}/invite/accept?token=${params.token}`;
  await send({
    to: params.to,
    subject: `${params.inviterName} invited you to ${params.orgName} on FlowOps`,
    text: `${params.inviterName} invited you to join "${params.orgName}" as ${params.role}.\n\nAccept your invitation: ${url}`,
    html: layout(
      `You've been invited to ${params.orgName}`,
      `<strong>${params.inviterName}</strong> invited you to join <strong>${params.orgName}</strong> as <strong>${params.role}</strong>.`,
      { label: 'Accept invitation', url }
    ),
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await send({
    to,
    subject: 'Welcome to FlowOps',
    text: `Hi ${name}, welcome to FlowOps! Your workspace is ready.`,
    html: layout(
      `Welcome aboard, ${name}!`,
      `Your FlowOps workspace is ready. Jump in to set up your pipeline, projects and team.`,
      { label: 'Open FlowOps', url: `${primaryClientUrl()}/app/dashboard` }
    ),
  });
}
