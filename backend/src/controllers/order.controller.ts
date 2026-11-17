import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";

import {
  createOrder,
  getMerchantOrders,
  retryOrderPayment,
} from "../services/order.service";

export const create = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      customerId,
      amount,
      currency,
    } = req.body;
    const idempotencyKey = req.header("Idempotency-Key");

    if (!idempotencyKey) {
  return res.status(400).json({
    success: false,
    message: "Idempotency-Key header is required",
  });
}


    if (!customerId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Customer ID and amount are required",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const order = await createOrder(
  req.user.merchantId,
  {
    customerId,
    amount: Number(amount),
    currency,
    idempotencyKey,
  }
);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CUSTOMER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Order creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

export const getAll = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orders = await getMerchantOrders(
      req.user.merchantId
    );

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

export const retry = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orderId = req.params.orderId;

if (typeof orderId !== "string") {
  return res.status(400).json({
    success: false,
    message: "Invalid order ID",
  });
}

    const result = await retryOrderPayment(
      req.user.merchantId,
      orderId
    );

    return res.status(200).json({
      success: true,
      message: "Payment retry created successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      const errors: Record<string, { status: number; message: string }> = {
        ORDER_NOT_FOUND: { status: 404, message: "Order not found" },
        ORDER_ALREADY_PAID: { status: 400, message: "Order is already paid" },
        ORDER_CANCELLED: { status: 400, message: "Cancelled orders cannot be retried" },
        ORDER_NOT_ELIGIBLE_FOR_RETRY: { status: 400, message: "This order is not eligible for payment retry" },
      };

      const knownError = errors[error.message];

      if (knownError) {
        return res.status(knownError.status).json({
          success: false,
          message: knownError.message,
        });
      }
    }

    console.error("Payment retry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retry payment",
    });
  }
};