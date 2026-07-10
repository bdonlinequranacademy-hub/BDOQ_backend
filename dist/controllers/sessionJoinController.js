"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordStudentSessionJoin = exports.recordTeacherSessionJoin = void 0;
const sessionJoinService_1 = require("../services/sessionJoinService");
function getUser(req) {
    return req.user;
}
const recordTeacherSessionJoin = async (req, res) => {
    try {
        const { slotId } = req.params;
        const user = getUser(req);
        const { role } = await (0, sessionJoinService_1.assertUserCanJoinSlot)(slotId, user);
        if (role !== "teacher") {
            res.status(403).json({
                success: false,
                message: "Only the assigned teacher can record this join",
                data: null,
            });
            return;
        }
        const source = req.body?.source === "portal" ? "portal" : "meeting_link";
        const data = await (0, sessionJoinService_1.recordSessionJoin)({
            sessionSlotId: slotId,
            userId: user._id.toString(),
            role: "teacher",
            source,
            sessionDate: req.body?.sessionDate,
        });
        res.status(200).json({
            success: true,
            message: data.alreadyJoined ? "Already recorded" : "Join recorded",
            data,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to record join";
        const status = message.includes("not found") ? 404 : 403;
        res.status(status).json({ success: false, message, data: null });
    }
};
exports.recordTeacherSessionJoin = recordTeacherSessionJoin;
const recordStudentSessionJoin = async (req, res) => {
    try {
        const { slotId } = req.params;
        const user = getUser(req);
        const { role } = await (0, sessionJoinService_1.assertUserCanJoinSlot)(slotId, user);
        if (role !== "student") {
            res.status(403).json({
                success: false,
                message: "Only the assigned student can record this join",
                data: null,
            });
            return;
        }
        const source = req.body?.source === "portal" ? "portal" : "meeting_link";
        const data = await (0, sessionJoinService_1.recordSessionJoin)({
            sessionSlotId: slotId,
            userId: user._id.toString(),
            role: "student",
            source,
            sessionDate: req.body?.sessionDate,
        });
        res.status(200).json({
            success: true,
            message: data.alreadyJoined ? "Already recorded" : "Join recorded",
            data,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to record join";
        const status = message.includes("not found") ? 404 : 403;
        res.status(status).json({ success: false, message, data: null });
    }
};
exports.recordStudentSessionJoin = recordStudentSessionJoin;
