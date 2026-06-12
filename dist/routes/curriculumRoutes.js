"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const curriculumController_1 = require("../controllers/curriculumController");
const router = (0, express_1.Router)();
router.use(auth_1.auth);
router.get("/tree", curriculumController_1.getCurriculumTree);
exports.default = router;
