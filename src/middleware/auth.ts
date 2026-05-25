import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

interface JwtPayload {
  id: string;
}

export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "No token provided",
        data: null,
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
        data: null,
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid token",
      data: null,
    });
  }
};

export const checkRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied",
        data: null,
      });
      return;
    }

    next();
  };
