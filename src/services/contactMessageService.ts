import {
  ContactMessage,
  type IContactMessage,
  type ContactMessageStatus,
} from "../models/ContactMessage";
import { sendEmail } from "./emailService";
import { signalAdminPending } from "./notificationService";

export type { ContactMessageStatus };

export interface CreateContactMessageInput {
  name: string;
  email: string;
  message: string;
  subject?: string;
  locale?: "en" | "bn";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyEmail(): string | null {
  const to =
    process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
    process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.TEST_EMAIL_TO?.trim();
  return to || null;
}

function formatMessageText(message: IContactMessage): string {
  const lines = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    message.subject ? `Subject: ${message.subject}` : null,
    message.locale ? `Locale: ${message.locale}` : null,
    "",
    message.message,
    "",
    `Submitted: ${message.createdAt.toISOString()}`,
  ].filter((line) => line !== null);

  return lines.join("\n");
}

export function formatContactMessage(message: IContactMessage) {
  return {
    _id: message._id.toString(),
    name: message.name,
    email: message.email,
    subject: message.subject,
    message: message.message,
    locale: message.locale,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

export async function createContactMessage(
  input: CreateContactMessageInput
): Promise<{ message: IContactMessage } | { error: string }> {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const body = input.message?.trim();

  if (!name || !email || !body) {
    return { error: "Name, email, and message are required." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Invalid email address." };
  }

  if (body.length < 10) {
    return { error: "Message is too short." };
  }

  const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;

  const message = await ContactMessage.create({
    name,
    email,
    subject: input.subject?.trim() || undefined,
    message: body,
    locale,
  });

  const notifyTo = notifyEmail();
  if (notifyTo) {
    const text = formatMessageText(message);
    await sendEmail({
      to: notifyTo,
      subject: `[Contact] ${name}`,
      text,
      html: text.replace(/\n/g, "<br>"),
    }).catch((err) => {
      console.warn("[contact] Notification email failed:", err);
    });
  } else {
    console.log("\n--- New contact message (no CONTACT_NOTIFY_EMAIL) ---");
    console.log(formatMessageText(message));
    console.log("---\n");
  }

  signalAdminPending("contact-message");

  return { message };
}

export async function listContactMessages(status?: ContactMessageStatus, limit = 100) {
  const filter = status ? { status } : {};
  const rows = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(limit);
  return rows.map(formatContactMessage);
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus
): Promise<{ message: ReturnType<typeof formatContactMessage> } | { error: string }> {
  const message = await ContactMessage.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!message) {
    return { error: "Contact message not found" };
  }

  return { message: formatContactMessage(message) };
}
