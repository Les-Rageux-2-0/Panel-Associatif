import "server-only";
import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!host || !user || !password) {
    throw new Error("Configuration SMTP incomplète.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password }
  });
}

export async function sendVerificationCode(email: string, code: string, reference?: string) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: email,
    subject: `Code de signature — Les Rageux 2.0${reference ? ` — ${reference}` : ""}`,
    text: `Votre code de vérification est : ${code}\nDocument : ${reference ?? "Les Rageux 2.0"}\nIl expire dans 72 heures. Utilisez-le uniquement sur le portail officiel et ne le transmettez à personne.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Les Rageux 2.0</h1><p>Votre code de signature pour le document <strong>${reference ?? "Les Rageux 2.0"}</strong> :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Ce code expire dans 72 heures. Utilisez-le uniquement sur le portail officiel et ne le transmettez à personne.</p></div>`
  });
}


export async function sendSignatureInvitation(input: { email: string; fullName: string; title: string; reference: string; url: string }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  await transporter.sendMail({
    from,
    to: input.email,
    subject: `Signature requise — ${input.reference} — Les Rageux 2.0`,
    text: `Bonjour ${input.fullName},\n\nLe document « ${input.title} » (${input.reference}) attend votre signature.\nOuvrez le portail sécurisé : ${input.url}\n\nVous pourrez demander un code de vérification envoyé à cette adresse e-mail. Le code est valable 72 heures. Ne partagez pas votre lien d'invitation.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#191923"><h1 style="color:#6d3bd1">Les Rageux 2.0</h1><p>Bonjour ${escapeHtml(input.fullName)},</p><p>Le document <strong>${escapeHtml(input.title)}</strong> (<strong>${escapeHtml(input.reference)}</strong>) attend votre signature.</p><p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#6d3bd1;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Consulter et signer le document</a></p><p>Un code de vérification sera envoyé à cette adresse e-mail. Ce code sera valable 72 heures.</p><p style="font-size:12px;color:#666">Ne partagez pas ce lien d'invitation. Si vous n'attendiez pas ce document, contactez la structure.</p></div>`
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
