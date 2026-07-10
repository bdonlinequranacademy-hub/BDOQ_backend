"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublishedBlogPostBySlug = exports.getPublishedBlogPosts = void 0;
const BlogPost_1 = require("../models/BlogPost");
/** Public fields only — no draft posts, no admin metadata. */
const formatPublicPost = (post, includeBody = false, locale = "en") => {
    const bn = locale === "bn" && post.translations?.bn
        ? post.translations.bn
        : undefined;
    const base = {
        slug: post.slug,
        title: bn?.title ?? post.title,
        description: bn?.description ?? post.description,
        pubDate: post.pubDate,
        category: post.category,
        tags: (0, BlogPost_1.filterPublicBlogTags)(bn?.tags ?? post.tags),
        author: post.author,
        readMinutes: post.readMinutes,
        featured: post.featured,
        faqs: post.faqs,
        translations: post.translations,
    };
    if (includeBody) {
        return { ...base, body: bn?.body ?? post.body };
    }
    return base;
};
/** Public read — published educational posts only (for marketing site). */
const getPublishedBlogPosts = async (req, res) => {
    try {
        const { category, page = "1", limit = "12", locale = "en" } = req.query;
        const filter = { status: "published" };
        if (category)
            filter.category = String(category);
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
        const allPublished = await BlogPost_1.BlogPost.find(filter)
            .sort({ pubDate: -1 })
            .select("-body");
        const educational = allPublished.filter((post) => (0, BlogPost_1.isPublicBlogPost)({
            category: post.category,
            tags: post.tags,
            slug: post.slug,
        }));
        const total = educational.length;
        const skip = (pageNum - 1) * limitNum;
        const posts = educational.slice(skip, skip + limitNum);
        res.status(200).json({
            success: true,
            message: "Published blog posts fetched successfully",
            data: {
                posts: posts.map((p) => formatPublicPost(p, false, String(locale))),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch blog posts",
            data: null,
        });
    }
};
exports.getPublishedBlogPosts = getPublishedBlogPosts;
const getPublishedBlogPostBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const locale = String(req.query.locale ?? "en");
        const post = await BlogPost_1.BlogPost.findOne({
            slug: slug.toLowerCase(),
            status: "published",
        });
        if (!post ||
            !(0, BlogPost_1.isPublicBlogPost)({
                category: post.category,
                tags: post.tags,
                slug: post.slug,
            })) {
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
            data: formatPublicPost(post, true, locale),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch blog post",
            data: null,
        });
    }
};
exports.getPublishedBlogPostBySlug = getPublishedBlogPostBySlug;
