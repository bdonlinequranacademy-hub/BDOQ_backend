"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanTextHandler = void 0;
const complianceScanService_1 = require("../services/complianceScanService");
const scanTextHandler = async (req, res) => {
    try {
        const { text, context } = req.body;
        if (typeof text !== "string") {
            res.status(400).json({
                success: false,
                message: "text is required",
                data: null,
            });
            return;
        }
        const compliance = (0, complianceScanService_1.scanComplianceText)(text);
        let quality = null;
        if (context === "class_log") {
            quality = (0, complianceScanService_1.assessLogQuality)(text);
        }
        res.status(200).json({
            success: true,
            message: "Scan complete",
            data: {
                compliance,
                quality,
                warnings: [
                    ...(compliance.severity === "warn" ? [compliance.message] : []),
                    ...(quality?.severity === "warn" ? [quality.message] : []),
                ].filter(Boolean),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to scan text",
            data: null,
        });
    }
};
exports.scanTextHandler = scanTextHandler;
