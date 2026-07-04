import { Router } from "express";
import {
  getPublishedResourceBySlug,
  getPublishedResources,
} from "../controllers/resourceController";

const router = Router();

router.get("/:type", getPublishedResources);
router.get("/:type/:slug", getPublishedResourceBySlug);

export default router;
