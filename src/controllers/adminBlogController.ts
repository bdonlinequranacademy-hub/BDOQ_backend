import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  BLOG_CATEGORIES,
  BlogPost,
  IBlogPost,
  type BlogCategory,
  type BlogPostStatus,
} from "../models/BlogPost";
import { slugifyTitle } from "../utils/slugify";

const VALID_STATUS: BlogPostStatus[] = ["draft", "published"];

const formatPost = (post: IBlogPost) => ({
  id: post._id,
  title: post.title,
  slug: post.slug,
  description: post.description,
  body: post.body,
  pubDate: post.pubDate,
  category: post.category,
  tags: post.tags,
  author: post.author,
  readMinutes: post.readMinutes,
  featured: post.featured,
  status: post.status,
  faqs: post.faqs,
  createdBy: post.createdBy,
  updatedBy: post.updatedBy,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await BlogPost.findOne(filter).select("_id");
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export const adminGetBlogPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, category } = req.query;
    const filter: Record<string, string> = {};

    if (status) {
      if (!VALID_STATUS.includes(status as BlogPostStatus)) {
        res.status(400).json({
          success: false,
          message: "Invalid status filter",
          data: null,
        });
        return;
      }
      filter.status = status as string;
    }

    if (category) {
      if (!BLOG_CATEGORIES.includes(category as BlogCategory)) {
        res.status(400).json({
          success: false,
          message: "Invalid category filter",
          data: null,
        });
        return;
      }
      filter.category = category as string;
    }

    const posts = await BlogPost.find(filter).sort({ pubDate: -1 });

    res.status(200).json({
      success: true,
      message: "Blog posts fetched successfully",
      data: posts.map((p) => formatPost(p)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog posts",
      data: null,
    });
  }
};

export const adminGetBlogPostById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid post id",
        data: null,
      });
      return;
    }

    const post = await BlogPost.findById(id);
    if (!post) {
      res.status(404).json({
        success: false,
        message: "Blog post not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Blog post fetched successfully",
      data: formatPost(post),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog post",
      data: null,
    });
  }
};

export const adminCreateBlogPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      slug: slugInput,
      description,
      body,
      pubDate,
      category,
      tags,
      author,
      readMinutes,
      featured,
      status,
      faqs,
    } = req.body;

    if (!title?.trim() || !description?.trim() || !body?.trim()) {
      res.status(400).json({
        success: false,
        message: "Title, description, and body are required",
        data: null,
      });
      return;
    }

    if (!category || !BLOG_CATEGORIES.includes(category)) {
      res.status(400).json({
        success: false,
        message: "Invalid category",
        data: null,
      });
      return;
    }

    if (status && !VALID_STATUS.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status",
        data: null,
      });
      return;
    }

    const baseSlug = slugifyTitle(slugInput?.trim() || title);
    const slug = await ensureUniqueSlug(baseSlug);

    const post = await BlogPost.create({
      title: title.trim(),
      slug,
      description: description.trim(),
      body,
      pubDate: pubDate ? new Date(pubDate) : new Date(),
      category,
      tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
      author: {
        name: author?.name?.trim() || req.user!.name,
        role: author?.role?.trim() || "Al Bayaan Academy",
      },
      readMinutes,
      featured: Boolean(featured),
      status: status || "draft",
      faqs: Array.isArray(faqs) ? faqs : [],
      createdBy: req.user!._id,
    });

    res.status(201).json({
      success: true,
      message: "Blog post created successfully",
      data: formatPost(post),
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("duplicate")
        ? "Slug already exists"
        : "Failed to create blog post";
    res.status(500).json({
      success: false,
      message,
      data: null,
    });
  }
};

export const adminUpdateBlogPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid post id",
        data: null,
      });
      return;
    }

    const post = await BlogPost.findById(id);
    if (!post) {
      res.status(404).json({
        success: false,
        message: "Blog post not found",
        data: null,
      });
      return;
    }

    const {
      title,
      slug: slugInput,
      description,
      body,
      pubDate,
      category,
      tags,
      author,
      readMinutes,
      featured,
      status,
      faqs,
    } = req.body;

    if (category && !BLOG_CATEGORIES.includes(category)) {
      res.status(400).json({
        success: false,
        message: "Invalid category",
        data: null,
      });
      return;
    }

    if (status && !VALID_STATUS.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status",
        data: null,
      });
      return;
    }

    if (title !== undefined) post.title = String(title).trim();
    if (description !== undefined) post.description = String(description).trim();
    if (body !== undefined) post.body = body;
    if (pubDate !== undefined) post.pubDate = new Date(pubDate);
    if (category !== undefined) post.category = category;
    if (tags !== undefined) {
      post.tags = Array.isArray(tags)
        ? tags.map((t: string) => String(t).trim()).filter(Boolean)
        : [];
    }
    if (author !== undefined) {
      post.author = {
        name: author.name?.trim() || post.author.name,
        role: author.role?.trim() ?? post.author.role,
      };
    }
    if (readMinutes !== undefined) post.readMinutes = readMinutes;
    if (featured !== undefined) post.featured = Boolean(featured);
    if (status !== undefined) post.status = status;
    if (faqs !== undefined) post.faqs = Array.isArray(faqs) ? faqs : [];

    if (slugInput !== undefined || title !== undefined) {
      const base = slugifyTitle(
        slugInput?.trim() || post.title
      );
      post.slug = await ensureUniqueSlug(base, id);
    }

    post.updatedBy = req.user!._id;
    await post.save();

    res.status(200).json({
      success: true,
      message: "Blog post updated successfully",
      data: formatPost(post),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update blog post",
      data: null,
    });
  }
};

export const adminDeleteBlogPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid post id",
        data: null,
      });
      return;
    }

    const post = await BlogPost.findByIdAndDelete(id);
    if (!post) {
      res.status(404).json({
        success: false,
        message: "Blog post not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Blog post deleted successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete blog post",
      data: null,
    });
  }
};
