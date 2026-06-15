import { Types } from "mongoose";
import {
  Notification,
  type INotification,
  type NotificationType,
} from "../models/Notification";
import { User } from "../models/User";
import { emitAdminPending, emitToUser } from "../realtime/socketServer";

export type NotificationPayload = {
  _id: string;
  user: string;
  title: string;
  message: string;
  type?: NotificationType;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotificationInput = {
  userId: Types.ObjectId | string;
  title: string;
  message: string;
  type?: NotificationType;
};

export function serializeNotification(doc: INotification): NotificationPayload {
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

export async function createUserNotification(
  input: CreateNotificationInput
): Promise<INotification> {
  const doc = await Notification.create({
    user: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
  });

  emitToUser(doc.user.toString(), "notification:new", serializeNotification(doc));
  return doc;
}

export async function createUserNotifications(
  inputs: CreateNotificationInput[]
): Promise<INotification[]> {
  if (inputs.length === 0) return [];

  const docs = (await Notification.insertMany(
    inputs.map((input) => ({
      user: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
    }))
  )) as INotification[];

  for (const doc of docs) {
    emitToUser(doc.user.toString(), "notification:new", serializeNotification(doc));
  }

  return docs;
}

/** In-app notifications for all active admins + realtime badge refresh. */
export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = "general"
): Promise<void> {
  const admins = await User.find({
    role: { $in: ["admin", "super_admin"] },
    isActive: true,
  }).select("_id");
  if (admins.length > 0) {
    await createUserNotifications(
      admins.map((admin) => ({
        userId: admin._id,
        title,
        message,
        type,
      }))
    );
  }
  emitAdminPending(type);
}

/** Realtime admin dashboard refresh (trial form, contact, etc.) without DB rows. */
export function signalAdminPending(reason?: string): void {
  emitAdminPending(reason);
}
