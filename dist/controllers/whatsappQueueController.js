"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhatsAppQueue = void 0;
const whatsappQueueService_1 = require("../services/whatsappQueueService");
const getWhatsAppQueue = async (_req, res) => {
    try {
        const items = await (0, whatsappQueueService_1.listWhatsAppQueue)();
        res.status(200).json({
            success: true,
            message: "WhatsApp queue fetched",
            data: items,
        });
    }
    catch (err) {
        console.error("[admin] getWhatsAppQueue failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch WhatsApp queue",
            data: null,
        });
    }
};
exports.getWhatsAppQueue = getWhatsAppQueue;
