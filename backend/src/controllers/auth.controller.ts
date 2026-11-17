import type { Request, Response } from "express";

import {
  registerMerchant,
  loginMerchant,
} from "../services/auth.service";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const merchant = await registerMerchant({
      name,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Merchant registered successfully",
      data: merchant,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const merchant = await loginMerchant(
      email,
      password
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: merchant,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (
      error instanceof Error &&
      error.message === "MERCHANT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found",
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};