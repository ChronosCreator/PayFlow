import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  type AuthRequest,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/db-test", async (req, res) => {
  try {
    const userCount = await prisma.user.count();

    res.json({
      success: true,
      message: "Database connection is working 🚀",
      userCount,
    });
  } catch (error) {
    console.error("Database test failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

router.get(
  "/protected-test",
  authenticate,
  (req: AuthRequest, res) => {
    res.json({
      success: true,
      message: "You accessed a protected route 🔐",
      user: req.user,
    });
  }
);

export default router;