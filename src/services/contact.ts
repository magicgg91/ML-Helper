import nodemailer from "nodemailer";
import { contactMessageSchema, contactSubjectLabels } from "../lib/contact";

export class ContactNotConfiguredError extends Error {}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const to = process.env.CONTACT_EMAIL;
  if (!host || !port || !user || !password || !to) return null;
  return { host, port: Number(port), user, password, to };
}

export async function sendContactMessage(input: unknown) {
  const data = contactMessageSchema.parse(input);
  const config = smtpConfig();
  if (!config) throw new ContactNotConfiguredError();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
  });

  await transporter.sendMail({
    from: config.user,
    to: config.to,
    replyTo: data.email,
    subject: `[ML-Helper] ${contactSubjectLabels[data.subject]}`,
    text: `De : ${data.email}\nObjet : ${contactSubjectLabels[data.subject]}\n\n${data.message}`,
  });
}
