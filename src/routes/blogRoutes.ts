import { Router } from "express";
import {
  getPublishedBlogPosts,
  getPublishedBlogPostBySlug,
} from "../controllers/blogController";

const router = Router();

/** Read-only public blog API (published posts only). */
router.get("/posts", getPublishedBlogPosts);
router.get("/posts/:slug", getPublishedBlogPostBySlug);

export default router;
