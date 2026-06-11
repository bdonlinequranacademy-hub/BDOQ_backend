import { Router } from "express";
import { auth } from "../middleware/auth";
import { getCurriculumTree } from "../controllers/curriculumController";

const router = Router();

router.use(auth);
router.get("/tree", getCurriculumTree);

export default router;
