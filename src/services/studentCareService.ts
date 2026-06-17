export interface StudentCareFollowUpInput {
  studentName: string;
  missedClasses: number;
  totalClasses: number;
  homeworkMissed: number;
  totalHomework: number;
  tajweedScoreTrend: string;
  lastAttendanceDate: string;
  reasons: string[];
}

/** Deterministic follow-up steps from portal data — not AI-generated. */
export function buildSuggestedFollowUp(data: StudentCareFollowUpInput): string {
  const reasonLines = data.reasons.map((r) => `- ${r}`).join("\n");

  return `## Recommended actions
- Contact **${data.studentName}** or their guardian within 48 hours
- Review attendance (${data.missedClasses}/${data.totalClasses} missed) and homework (${data.homeworkMissed}/${data.totalHomework} incomplete)
- Schedule a short check-in and assign targeted revision if needed

## Risk signals
${reasonLines || "- Multiple progress indicators need attention"}

## Tajweed & attendance
- Tajweed trend: **${data.tajweedScoreTrend}**
- Last attendance: **${data.lastAttendanceDate}**`;
}
