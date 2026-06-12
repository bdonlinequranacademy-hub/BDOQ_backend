"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeNotification = serializeNotification;
exports.createUserNotification = createUserNotification;
exports.createUserNotifications = createUserNotifications;
exports.notifyAdmins = notifyAdmins;
exports.signalAdminPending = signalAdminPending;
const Notification_1 = require("../models/Notification");
const User_1 = require("../models/User");
const socketServer_1 = require("../realtime/socketServer");
function serializeNotification(doc) {
    return {
        _id: doc._id.toString(),
        user: doc.user.toString(),
        title: doc.title,
        message: doc.message,
        type: doc.type,
        isRead: doc.isRead,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
async function createUserNotification(input) {
    const doc = await Notification_1.Notification.create({
        user: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
    });
    (0, socketServer_1.emitToUser)(doc.user.toString(), "notification:new", serializeNotification(doc));
    return doc;
}
async function createUserNotifications(inputs) {
    if (inputs.length === 0)
        return [];
    const docs = (await Notification_1.Notification.insertMany(inputs.map((input) => ({
        user: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
    }))));
    for (const doc of docs) {
        (0, socketServer_1.emitToUser)(doc.user.toString(), "notification:new", serializeNotification(doc));
    }
    return docs;
}
/** In-app notifications for all active admins + realtime badge refresh. */
async function notifyAdmins(title, message, type = "general") {
    const admins = await User_1.User.find({ role: "admin", isActive: true }).select("_id");
    if (admins.length > 0) {
        await createUserNotifications(admins.map((admin) => ({
            userId: admin._id,
            title,
            message,
            type,
        })));
    }
    (0, socketServer_1.emitAdminPending)(type);
}
/** Realtime admin dashboard refresh (trial form, contact, etc.) without DB rows. */
function signalAdminPending(reason) {
    (0, socketServer_1.emitAdminPending)(reason);
}
