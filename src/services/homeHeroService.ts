import {
  HomeHeroSlide,
  type IHomeHeroLocaleContent,
  type IHomeHeroSlide,
} from "../models/HomeHeroSlide";

export interface IHomeHeroSlideAdminDto {
  id: string;
  slideId: string;
  sortOrder: number;
  imageUrl: string;
  imagePublicId?: string;
  imageObjectPosition: string;
  imageScale: number;
  primaryHref: string;
  secondaryHref: string;
  theme: "light" | "dark";
  showOnWebsite: boolean;
  contentEn: IHomeHeroLocaleContent;
  contentBn: IHomeHeroLocaleContent;
  createdAt: string;
  updatedAt: string;
}

export interface IHomeHeroSlidePublicDto {
  id: string;
  slideId: string;
  sortOrder: number;
  image: string;
  imageObjectPosition: string;
  imageScale: number;
  primaryHref: string;
  secondaryHref: string;
  theme: "light" | "dark";
  badge: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  imageAlt: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface IHomeHeroSlideUpsertInput {
  slideId: string;
  sortOrder?: number;
  imageUrl: string;
  imagePublicId?: string;
  imageObjectPosition?: string;
  imageScale?: number;
  primaryHref: string;
  secondaryHref: string;
  theme?: "light" | "dark";
  showOnWebsite?: boolean;
  contentEn: IHomeHeroLocaleContent;
  contentBn: IHomeHeroLocaleContent;
}

function formatAdminSlide(doc: IHomeHeroSlide): IHomeHeroSlideAdminDto {
  return {
    id: doc._id.toString(),
    slideId: doc.slideId,
    sortOrder: doc.sortOrder,
    imageUrl: doc.imageUrl,
    imagePublicId: doc.imagePublicId,
    imageObjectPosition: doc.imageObjectPosition,
    imageScale: doc.imageScale,
    primaryHref: doc.primaryHref,
    secondaryHref: doc.secondaryHref,
    theme: doc.theme,
    showOnWebsite: doc.showOnWebsite,
    contentEn: doc.contentEn,
    contentBn: doc.contentBn,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function pickLocaleContent(
  doc: IHomeHeroSlide,
  locale: string
): IHomeHeroLocaleContent {
  return locale === "bn" ? doc.contentBn : doc.contentEn;
}

function formatPublicSlide(
  doc: IHomeHeroSlide,
  locale: string
): IHomeHeroSlidePublicDto {
  const content = pickLocaleContent(doc, locale);

  return {
    id: doc.slideId,
    slideId: doc.slideId,
    sortOrder: doc.sortOrder,
    image: doc.imageUrl,
    imageObjectPosition: doc.imageObjectPosition,
    imageScale: doc.imageScale,
    primaryHref: doc.primaryHref,
    secondaryHref: doc.secondaryHref,
    theme: doc.theme,
    badge: content.badge,
    title: content.title,
    titleHighlight: content.titleHighlight,
    subtitle: content.subtitle,
    imageAlt: content.imageAlt,
    primaryCta: content.primaryCta,
    secondaryCta: content.secondaryCta,
  };
}

export async function listAdminHomeHeroSlides(): Promise<IHomeHeroSlideAdminDto[]> {
  const docs = await HomeHeroSlide.find().sort({ sortOrder: 1, createdAt: 1 });
  return docs.map((doc) => formatAdminSlide(doc));
}

export async function listPublicHomeHeroSlides(
  locale: string
): Promise<IHomeHeroSlidePublicDto[]> {
  const docs = await HomeHeroSlide.find({ showOnWebsite: true }).sort({
    sortOrder: 1,
    createdAt: 1,
  });

  return docs.map((doc) => formatPublicSlide(doc, locale));
}

export async function saveHomeHeroSlides(
  slides: IHomeHeroSlideUpsertInput[]
): Promise<IHomeHeroSlideAdminDto[]> {
  const saved: IHomeHeroSlide[] = [];

  for (const [index, slide] of slides.entries()) {
    const doc = await HomeHeroSlide.findOneAndUpdate(
      { slideId: slide.slideId },
      {
        $set: {
          slideId: slide.slideId,
          sortOrder: slide.sortOrder ?? index,
          imageUrl: slide.imageUrl,
          imagePublicId: slide.imagePublicId,
          imageObjectPosition: slide.imageObjectPosition ?? "50% 25%",
          imageScale: slide.imageScale ?? 100,
          primaryHref: slide.primaryHref,
          secondaryHref: slide.secondaryHref,
          theme: slide.theme ?? "light",
          showOnWebsite: slide.showOnWebsite ?? true,
          contentEn: slide.contentEn,
          contentBn: slide.contentBn,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    saved.push(doc);
  }

  const keepIds = slides.map((slide) => slide.slideId);
  await HomeHeroSlide.deleteMany({ slideId: { $nin: keepIds } });

  return saved
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((doc) => formatAdminSlide(doc));
}
