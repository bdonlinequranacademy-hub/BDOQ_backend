import { Request, Response } from "express";
import { BlogPost, IBlogPost } from "../models/BlogPost";

/** Public fields only — no draft posts, no admin metadata. */
const formatPublicPost = (post: IBlogPost, includeBody = false) => {
  const base = {
    slug: post.slug,
    title: post.title,
    description: post.description,
    pubDate: post.pubDate,
    category: post.category,
    tags: post.tags,
    author: post.author,
    readMinutes: post.readMinutes,
    featured: post.featured,
    faqs: post.faqs,
  };
  if (includeBody) {
    return { ...base, body: post.body };
  }
  return base;
};

/** Public read — published posts only (for marketing site / headless consumers). */
export const getPublishedBlogPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category, page = "1", limit = "12" } = req.query;
    const filter: Record<string, string> = { status: "published" };

    if (category) filter.category = String(category);

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .sort({ pubDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-body"),
      BlogPost.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Published blog posts fetched successfully",
      data: {
        posts: posts.map((p) => formatPublicPost(p, false)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog posts",
      data: null,
    });
  }
};

export const getPublishedBlogPostBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    const post = await BlogPost.findOne({
      slug: slug.toLowerCase(),
      status: "published",
    });

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
      data: formatPublicPost(post, true),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blog post",
      data: null,
    });
  }
};
