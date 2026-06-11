"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPortal = void 0;
const searchService_1 = require("../services/searchService");
const searchPortal = async (req, res) => {
    try {
        const q = typeof req.query.q === "string" ? req.query.q : "";
        const results = await (0, searchService_1.globalSearch)(req.user._id, req.user.role, q);
        res.status(200).json({
            success: true,
            message: "Search completed",
            data: results,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Search failed",
            data: null,
        });
    }
};
exports.searchPortal = searchPortal;
