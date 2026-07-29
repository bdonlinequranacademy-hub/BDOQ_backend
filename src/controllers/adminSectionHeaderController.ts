import { Request, Response } from "express";
import {
  listAdminSectionHeaders,
  saveSectionHeaders,
  upsertSectionHeader,
  type ISectionHeaderUpsertInput,
} from "../services/sectionHeaderService";

function isLocaleContent(
  value: unknown
): value is ISectionHeaderUpsertInput["contentEn"] {
  if (!value || typeof value !== "object") return false;
  const content = value as Record<string, unknown>;
  return typeof content.title === "string";
}

function parseHeaderInput(value: unknown): ISectionHeaderUpsertInput | null {
  if (!value || typeof value !== "object") return null;
  const header = value as Record<string, unknown>;

  if (
    typeof header.sectionKey !== "string" ||
    typeof header.label !== "string" ||
    !isLocaleContent(header.contentEn) ||
    !isLocaleContent(header.contentBn)
  ) {
    return null;
  }

  return {
    sectionKey: header.sectionKey.trim(),
    label: header.label.trim(),
    sortOrder:
      typeof header.sortOrder === "number" ? header.sortOrder : undefined,
    showOnWebsite:
      typeof header.showOnWebsite === "boolean"
        ? header.showOnWebsite
        : true,
    contentEn: header.contentEn,
    contentBn: header.contentBn,
  };
}

export const adminGetSectionHeaders = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const headers = await listAdminSectionHeaders();
    res.status(200).json({
      success: true,
      message: "Section headers fetched successfully",
      data: { headers },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch section headers",
      data: null,
    });
  }
};

export const adminSaveSectionHeaders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawHeaders = req.body?.headers;
    if (!Array.isArray(rawHeaders)) {
      res.status(400).json({
        success: false,
        message: "headers array is required",
        data: null,
      });
      return;
    }

    const headers = rawHeaders
      .map((item) => parseHeaderInput(item))
      .filter((item): item is ISectionHeaderUpsertInput => item !== null);

    if (headers.length !== rawHeaders.length) {
      res.status(400).json({
        success: false,
        message: "Invalid section header payload",
        data: null,
      });
      return;
    }

    const saved = await saveSectionHeaders(headers);
    res.status(200).json({
      success: true,
      message: "Section headers saved successfully",
      data: { headers: saved },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to save section headers",
      data: null,
    });
  }
};

export const adminUpsertSectionHeader = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = parseHeaderInput(req.body?.header ?? req.body);
    if (!parsed) {
      res.status(400).json({
        success: false,
        message: "Invalid section header payload",
        data: null,
      });
      return;
    }

    const saved = await upsertSectionHeader(parsed);
    res.status(200).json({
      success: true,
      message: "Section header saved successfully",
      data: { header: saved },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to save section header",
      data: null,
    });
  }
};
