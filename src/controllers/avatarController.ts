import { Request, Response } from "express";
import { User } from "../models/User";
import {
  deleteCloudinaryAsset,
  uploadUserAvatar,
} from "../services/cloudinaryUploadService";

export const uploadProfileAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: "Avatar image is required",
        data: null,
      });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    if (user.avatarPublicId) {
      await deleteCloudinaryAsset(user.avatarPublicId);
    }

    const { url, publicId } = await uploadUserAvatar(
      file.buffer,
      user._id.toString(),
      file.mimetype
    );

    user.avatarUrl = url;
    user.avatarPublicId = publicId;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      data: { avatarUrl: url },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "CLOUDINARY_NOT_CONFIGURED") {
      res.status(503).json({
        success: false,
        message: "Image upload is not configured on the server",
        data: null,
      });
      return;
    }
    if (message === "FILE_TOO_LARGE") {
      res.status(400).json({
        success: false,
        message: "Image must be 5 MB or smaller",
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
      data: null,
    });
  }
};
