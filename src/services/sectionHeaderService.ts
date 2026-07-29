import {
  SiteSectionHeader,
  type ISectionHeaderLocaleContent,
  type ISiteSectionHeader,
} from "../models/SiteSectionHeader";

export interface ISectionHeaderAdminDto {
  id: string;
  sectionKey: string;
  label: string;
  sortOrder: number;
  showOnWebsite: boolean;
  contentEn: ISectionHeaderLocaleContent;
  contentBn: ISectionHeaderLocaleContent;
  createdAt: string;
  updatedAt: string;
}

export interface ISectionHeaderPublicDto {
  sectionKey: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  titleHighlight?: string;
  titleAccent?: string;
  intro?: string;
}

export interface ISectionHeaderUpsertInput {
  sectionKey: string;
  label: string;
  sortOrder?: number;
  showOnWebsite?: boolean;
  contentEn: ISectionHeaderLocaleContent;
  contentBn: ISectionHeaderLocaleContent;
}

function formatAdmin(doc: ISiteSectionHeader): ISectionHeaderAdminDto {
  return {
    id: doc._id.toString(),
    sectionKey: doc.sectionKey,
    label: doc.label,
    sortOrder: doc.sortOrder,
    showOnWebsite: doc.showOnWebsite,
    contentEn: doc.contentEn,
    contentBn: doc.contentBn,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function pickLocale(
  doc: ISiteSectionHeader,
  locale: string
): ISectionHeaderLocaleContent {
  return locale === "bn" ? doc.contentBn : doc.contentEn;
}

function formatPublic(
  doc: ISiteSectionHeader,
  locale: string
): ISectionHeaderPublicDto {
  const content = pickLocale(doc, locale);
  return {
    sectionKey: doc.sectionKey,
    eyebrow: content.eyebrow,
    title: content.title,
    subtitle: content.subtitle,
    titleHighlight: content.titleHighlight,
    titleAccent: content.titleAccent,
    intro: content.intro,
  };
}

export async function listAdminSectionHeaders(): Promise<
  ISectionHeaderAdminDto[]
> {
  const docs = await SiteSectionHeader.find().sort({
    sortOrder: 1,
    sectionKey: 1,
  });
  return docs.map((doc) => formatAdmin(doc));
}

export async function listPublicSectionHeaders(
  locale: string,
  keys?: string[]
): Promise<ISectionHeaderPublicDto[]> {
  const filter: Record<string, unknown> = { showOnWebsite: true };
  if (keys && keys.length > 0) {
    filter.sectionKey = { $in: keys };
  }

  const docs = await SiteSectionHeader.find(filter).sort({
    sortOrder: 1,
    sectionKey: 1,
  });

  return docs.map((doc) => formatPublic(doc, locale));
}

export async function saveSectionHeaders(
  headers: ISectionHeaderUpsertInput[]
): Promise<ISectionHeaderAdminDto[]> {
  const saved: ISiteSectionHeader[] = [];

  for (const [index, header] of headers.entries()) {
    const doc = await SiteSectionHeader.findOneAndUpdate(
      { sectionKey: header.sectionKey },
      {
        $set: {
          sectionKey: header.sectionKey,
          label: header.label,
          sortOrder: header.sortOrder ?? index,
          showOnWebsite: header.showOnWebsite ?? true,
          contentEn: header.contentEn,
          contentBn: header.contentBn,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    saved.push(doc);
  }

  return saved
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((doc) => formatAdmin(doc));
}

export async function upsertSectionHeader(
  header: ISectionHeaderUpsertInput
): Promise<ISectionHeaderAdminDto> {
  const [saved] = await saveSectionHeaders([header]);
  return saved;
}
