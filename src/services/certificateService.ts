import { Certificate } from "../models/Certificate";
import { ACADEMY_BRAND } from "../lib/academyBrand";

export const DEFAULT_PERFORMANCE_EN =
  "For excellent performance, dedication, and good Islamic manners throughout the course.";

export const DEFAULT_PERFORMANCE_BN =
  "কোর্স চলাকালীন চমৎকার পারফরম্যান্স, নিষ্ঠা এবং উত্তম ইসলামী আচরণের জন্য।";

export interface CertificateView {
  id: string;
  certificateId: string;
  studentName: string;
  studentNameBn: string;
  courseName: string;
  courseNameBn: string;
  studentPortalId: string;
  issueDate: string;
  courseDuration: string;
  grade: string;
  showExcellentBadge: boolean;
  performanceTextEn: string;
  performanceTextBn: string;
  verifyUrl: string;
  academy: typeof ACADEMY_BRAND & {
    founderName: string;
    founderTitle: string;
    sinceYear: string;
  };
  createdAt: string;
}

const FOUNDER_NAME = "Hafez Mawlana Mufti Abdul Mumin Khan";
const FOUNDER_TITLE = "Founder & Director, BD Online Quran Academy";
const SINCE_YEAR = "2019";

export function buildVerifyUrl(certificateId: string): string {
  const base = (
    process.env.CLIENT_URL ||
    process.env.PUBLIC_SITE_URL ||
    ACADEMY_BRAND.website
  ).replace(/\/$/, "");
  return `${base}/verify-certificate/${encodeURIComponent(certificateId)}`;
}

export function formatCertificate(
  doc: InstanceType<typeof Certificate>
): CertificateView {
  return {
    id: doc._id.toString(),
    certificateId: doc.certificateId,
    studentName: doc.studentName,
    studentNameBn: doc.studentNameBn,
    courseName: doc.courseName,
    courseNameBn: doc.courseNameBn,
    studentPortalId: doc.studentPortalId,
    issueDate: doc.issueDate.toISOString(),
    courseDuration: doc.courseDuration,
    grade: doc.grade,
    showExcellentBadge: doc.showExcellentBadge,
    performanceTextEn: doc.performanceTextEn || DEFAULT_PERFORMANCE_EN,
    performanceTextBn: doc.performanceTextBn || DEFAULT_PERFORMANCE_BN,
    verifyUrl: buildVerifyUrl(doc.certificateId),
    academy: {
      ...ACADEMY_BRAND,
      founderName: FOUNDER_NAME,
      founderTitle: FOUNDER_TITLE,
      sinceYear: SINCE_YEAR,
    },
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function generateCertificateId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BDOQ-${year}-`;
  const count = await Certificate.countDocuments({
    certificateId: { $regex: `^${prefix}` },
  });
  return `${prefix}${String(count + 1).padStart(6, "0")}`;
}

export function shouldShowExcellentBadge(grade: string): boolean {
  const normalized = grade.trim().toLowerCase();
  return (
    /excellent|a\+|a\s*\+|outstanding|distinction/.test(normalized) ||
    normalized.startsWith("a+")
  );
}
