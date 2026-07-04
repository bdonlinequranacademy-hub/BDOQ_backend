"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resourceController_1 = require("../controllers/resourceController");
const router = (0, express_1.Router)();
router.get("/:type", resourceController_1.getPublishedResources);
router.get("/:type/:slug", resourceController_1.getPublishedResourceBySlug);
exports.default = router;
