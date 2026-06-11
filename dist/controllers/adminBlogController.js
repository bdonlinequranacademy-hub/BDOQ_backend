"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteBlogPost = exports.adminUpdateBlogPost = exports.adminCreateBlogPost = exports.adminGetBlogPostById = exports.adminGetBlogPosts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BlogPost_1 = require("../models/BlogPost");
const slugify_1 = require("../utils/slugify");
const VALID_STATUS = ["draft", "published"];
const formatPost = (post) => ({
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
async function ensureUniqueSlug(base, excludeId) {
    let slug = base;
    let n = 0;
    while (true) {
        const filter = { slug };
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await BlogPost_1.BlogPost.findOne(filter).select("_id");
        if (!exists)
            return slug;
        n += 1;
        slug = `${base}-${n}`;
    }
}
const adminGetBlogPosts = async (req, res) => {
    try {
        const { status, category } = req.query;
        const filter = {};
        if (status) {
            if (!VALID_STATUS.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid status filter",
                    data: null,
                });
                return;
            }
            filter.status = status;
        }
        if (category) {
            if (!BlogPost_1.BLOG_CATEGORIES.includes(category)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid category filter",
                    data: null,
                });
                return;
            }
            filter.category = category;
        }
        const posts = await BlogPost_1.BlogPost.find(filter).sort({ pubDate: -1 });
        res.status(200).json({
            success: true,
            message: "Blog posts fetched successfully",
            data: posts.map((p) => formatPost(p)),
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
exports.adminGetBlogPosts = adminGetBlogPosts;
const adminGetBlogPostById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid post id",
                data: null,
            });
            return;
        }
        const post = await BlogPost_1.BlogPost.findById(id);
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch blog post",
            data: null,
        });
    }
};
exports.adminGetBlogPostById = adminGetBlogPostById;
const adminCreateBlogPost = async (req, res) => {
    try {
        const { title, slug: slugInput, description, body, pubDate, category, tags, author, readMinutes, featured, status, faqs, } = req.body;
        if (!title?.trim() || !description?.trim() || !body?.trim()) {
            res.status(400).json({
                success: false,
                message: "Title, description, and body are required",
                data: null,
            });
            return;
        }
        if (!category || !BlogPost_1.BLOG_CATEGORIES.includes(category)) {
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
        const baseSlug = (0, slugify_1.slugifyTitle)(slugInput?.trim() || title);
        const slug = await ensureUniqueSlug(baseSlug);
        const post = await BlogPost_1.BlogPost.create({
            title: title.trim(),
            slug,
            description: description.trim(),
            body,
            pubDate: pubDate ? new Date(pubDate) : new Date(),
            category,
            tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
            author: {
                name: author?.name?.trim() || req.user.name,
                role: author?.role?.trim() || "Al Bayaan Academy",
            },
            readMinutes,
            featured: Boolean(featured),
            status: status || "draft",
            faqs: Array.isArray(faqs) ? faqs : [],
            createdBy: req.user._id,
        });
        res.status(201).json({
            success: true,
            message: "Blog post created successfully",
            data: formatPost(post),
        });
    }
    catch (err) {
        const message = err instanceof Error && err.message.includes("duplicate")
            ? "Slug already exists"
            : "Failed to create blog post";
        res.status(500).json({
            success: false,
            message,
            data: null,
        });
    }
};
exports.adminCreateBlogPost = adminCreateBlogPost;
const adminUpdateBlogPost = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid post id",
                data: null,
            });
            return;
        }
        const post = await BlogPost_1.BlogPost.findById(id);
        if (!post) {
            res.status(404).json({
                success: false,
                message: "Blog post not found",
                data: null,
            });
            return;
        }
        const { title, slug: slugInput, description, body, pubDate, category, tags, author, readMinutes, featured, status, faqs, } = req.body;
        if (category && !BlogPost_1.BLOG_CATEGORIES.includes(category)) {
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
        if (title !== undefined)
            post.title = String(title).trim();
        if (description !== undefined)
            post.description = String(description).trim();
        if (body !== undefined)
            post.body = body;
        if (pubDate !== undefined)
            post.pubDate = new Date(pubDate);
        if (category !== undefined)
            post.category = category;
        if (tags !== undefined) {
            post.tags = Array.isArray(tags)
                ? tags.map((t) => String(t).trim()).filter(Boolean)
                : [];
        }
        if (author !== undefined) {
            post.author = {
                name: author.name?.trim() || post.author.name,
                role: author.role?.trim() ?? post.author.role,
            };
        }
        if (readMinutes !== undefined)
            post.readMinutes = readMinutes;
        if (featured !== undefined)
            post.featured = Boolean(featured);
        if (status !== undefined)
            post.status = status;
        if (faqs !== undefined)
            post.faqs = Array.isArray(faqs) ? faqs : [];
        if (slugInput !== undefined || title !== undefined) {
            const base = (0, slugify_1.slugifyTitle)(slugInput?.trim() || post.title);
            post.slug = await ensureUniqueSlug(base, id);
        }
        post.updatedBy = req.user._id;
        await post.save();
        res.status(200).json({
            success: true,
            message: "Blog post updated successfully",
            data: formatPost(post),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update blog post",
            data: null,
        });
    }
};
exports.adminUpdateBlogPost = adminUpdateBlogPost;
const adminDeleteBlogPost = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid post id",
                data: null,
            });
            return;
        }
        const post = await BlogPost_1.BlogPost.findByIdAndDelete(id);
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete blog post",
            data: null,
        });
    }
};
exports.adminDeleteBlogPost = adminDeleteBlogPost;
