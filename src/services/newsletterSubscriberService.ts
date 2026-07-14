import {
  NewsletterSubscriber,
  type INewsletterSubscriber,
  type NewsletterSubscriberStatus,
} from "../models/NewsletterSubscriber";
import { sendEmail } from "./emailService";
import { signalAdminPending } from "./notificationService";

export type { NewsletterSubscriberStatus };

export interface CreateNewsletterSubscriberInput {
  email: string;
  locale?: "en" | "bn";
  source?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyEmail(): string | null {
  const to =
    process.env.NEWSLETTER_NOTIFY_EMAIL?.trim() ||
    process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
    process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.TEST_EMAIL_TO?.trim();
  return to || null;
}

export function formatNewsletterSubscriber(row: INewsletterSubscriber) {
  return {
    _id: row._id.toString(),
    email: row.email,
    locale: row.locale,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createNewsletterSubscriber(
  input: CreateNewsletterSubscriberInput
): Promise<
  | { subscriber: INewsletterSubscriber; created: boolean }
  | { error: string }
> {
  const email = input.email?.trim().toLowerCase();

  if (!email) {
    return { error: "Email is required." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Invalid email address." };
  }

  const locale =
    input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;
  const source = input.source?.trim().slice(0, 80) || "footer";

  const existing = await NewsletterSubscriber.findOne({ email });

  if (existing) {
    if (existing.status === "unsubscribed") {
      existing.status = "active";
      if (locale) existing.locale = locale;
      existing.source = source;
      await existing.save();

      signalAdminPending("newsletter-subscribe");
      return { subscriber: existing, created: false };
    }

    return { subscriber: existing, created: false };
  }

  const subscriber = await NewsletterSubscriber.create({
    email,
    locale,
    source,
    status: "active",
  });

  const notifyTo = notifyEmail();
  if (notifyTo) {
    const text = [
      `New newsletter subscriber: ${email}`,
      locale ? `Locale: ${locale}` : null,
      `Source: ${source}`,
      `Submitted: ${subscriber.createdAt.toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendEmail({
      to: notifyTo,
      subject: `[Newsletter] ${email}`,
      text,
      html: text.replace(/\n/g, "<br>"),
    }).catch((err) => {
      console.warn("[newsletter] Notification email failed:", err);
    });
  } else {
    console.log("\n--- New newsletter subscriber (no notify email) ---");
    console.log(email, source, locale ?? "-");
    console.log("---\n");
  }

  signalAdminPending("newsletter-subscribe");

  return { subscriber, created: true };
}

export async function listNewsletterSubscribers(
  status?: NewsletterSubscriberStatus,
  limit = 200
) {
  const filter = status ? { status } : {};
  const rows = await NewsletterSubscriber.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);
  return rows.map(formatNewsletterSubscriber);
}

export async function updateNewsletterSubscriberStatus(
  id: string,
  status: NewsletterSubscriberStatus
): Promise<
  | { subscriber: ReturnType<typeof formatNewsletterSubscriber> }
  | { error: string }
> {
  const subscriber = await NewsletterSubscriber.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!subscriber) {
    return { error: "Subscriber not found" };
  }

  return { subscriber: formatNewsletterSubscriber(subscriber) };
}
