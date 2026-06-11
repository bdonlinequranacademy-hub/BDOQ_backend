"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const searchController_1 = require("../controllers/searchController");
const router = (0, express_1.Router)();
router.use(auth_1.auth);
router.get("/", searchController_1.searchPortal);
exports.default = router;
