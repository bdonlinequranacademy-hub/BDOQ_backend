import { Router } from "express";
import { auth } from "../middleware/auth";
import { searchPortal } from "../controllers/searchController";

const router = Router();

router.use(auth);
router.get("/", searchPortal);

export default router;
