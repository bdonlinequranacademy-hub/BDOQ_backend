"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const studentCareController_1 = require("../controllers/studentCareController");
const router = (0, express_1.Router)();
/** Rule-based student care alerts (no generative AI). */
router.get("/at-risk-students", auth_1.auth, (0, auth_1.checkRole)("admin", "super_admin", "teacher"), studentCareController_1.getAtRiskStudents);
exports.default = router;
