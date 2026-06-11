"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blogController_1 = require("../controllers/blogController");
const router = (0, express_1.Router)();
/** Read-only public blog API (published posts only). */
router.get("/posts", blogController_1.getPublishedBlogPosts);
router.get("/posts/:slug", blogController_1.getPublishedBlogPostBySlug);
exports.default = router;
