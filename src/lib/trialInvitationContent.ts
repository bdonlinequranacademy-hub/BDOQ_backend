import type { ITrialBooking } from "../models/TrialBooking";
import {
  formatTrialBangladeshSchedule,
  formatTrialLocalSchedule,
} from "./countryTimezone";
import { formatTrialMeetingPlatform } from "./trialMeetingPlatform";
import { normalizeMeetingLink } from "./trialMeetingPlatform";

const ACADEMY = "BD Online Quran Academy";
const WHATSAPP_SUPPORT = "+8801923-947460";

export interface ITrialInvitationContentInput {
  booking: ITrialBooking;
  teacherName: string;
  courseLabel: string;
}

export interface ITrialInvitationContent {
  subject: string;
  emailTitle: string;
  greeting: string;
  messageBody: string;
  whatsappMessage: string;
  meetingLink?: string;
}

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

export function buildTrialInvitationContent(
  input: ITrialInvitationContentInput
): ITrialInvitationContent {
  const { booking, teacherName, courseLabel } = input;
  const studentName = booking.studentName?.trim() || booking.parentName;
  const parentName = booking.parentName;
  const platformLabel = formatTrialMeetingPlatform(booking.meetingPlatform);
  const localSchedule =
    formatTrialLocalSchedule(
      booking.preferredTrialDate,
      booking.preferredTrialTime,
      booking.timezone
    ) ?? "To be confirmed";
  const bdSchedule =
    formatTrialBangladeshSchedule(
      booking.preferredTrialDate,
      booking.preferredTrialTime,
      booking.timezone
    ) ?? "To be confirmed";
  const meetingLink = normalizeMeetingLink(booking.meetingLink);

  const lines = [
    `Student: ${studentName}`,
    `Course: ${courseLabel}`,
    `Teacher: ${teacherName}`,
    `Your local time: ${localSchedule}`,
    `Bangladesh time: ${bdSchedule}`,
    `Platform: ${platformLabel}`,
    meetingLink ? `Join link: ${meetingLink}` : null,
    "",
    "Please join on time. If you need to reschedule, reply on WhatsApp.",
    "",
    `Support WhatsApp: ${WHATSAPP_SUPPORT}`,
    "",
    `JazakAllah Khair,\n${ACADEMY}`,
  ].filter((line) => line !== null) as string[];

  const messageBody = lines.join("\n");

  const whatsappLines = [
    `Assalamu Alaikum ${firstName(parentName)},`,
    "",
    `Your *free trial class* at ${ACADEMY} is confirmed.`,
    "",
    `*Student:* ${studentName}`,
    `*Course:* ${courseLabel}`,
    `*Teacher:* ${teacherName}`,
    `*Your time:* ${localSchedule}`,
    `*BD time:* ${bdSchedule}`,
    `*Platform:* ${platformLabel}`,
    meetingLink ? `*Join:* ${meetingLink}` : null,
    "",
    "Please join on time. Reply here if you need to reschedule.",
    "",
    "JazakAllah Khair.",
  ].filter((line) => line !== null) as string[];

  return {
    subject: `Free Trial Class Confirmed — ${studentName} | ${ACADEMY}`,
    emailTitle: "Your Free Trial Class is Confirmed",
    greeting: `Assalamu Alaikum ${parentName},`,
    messageBody,
    whatsappMessage: whatsappLines.join("\n"),
    meetingLink,
  };
}
