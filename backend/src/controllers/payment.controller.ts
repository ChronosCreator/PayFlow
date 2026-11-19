
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../config/prisma";
import {
  verifyPayment,
  handleRazorpayWebhook,
} from "../services/payment.service";

// Get all payments belonging to the logged-in merchant
export const getPayments = async (
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

    const payments = await prisma.payment.findMany({
      where: {
        merchantId: req.user.merchantId,
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payments",
    });
  }
};

// Verify Razorpay checkout signature
export const verify = async (
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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required",
      });
    }

    const payment = await verifyPayment(
      req.user.merchantId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    return res.status(200).json({
      success: true,
      message: "Payment signature verified successfully",
      data: payment,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PAYMENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (error.message === "INVALID_PAYMENT_SIGNATURE") {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature",
        });
      }

      if (error.message === "PAYMENT_ALREADY_VERIFIED") {
        return res.status(409).json({
          success: false,
          message: "Payment already verified with another payment ID",
        });
      }
    }

    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};


// Handle Razorpay webhook events
export const razorpayWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("[WEBHOOK] Request received", {
      eventId: req.headers["x-razorpay-event-id"],
      signaturePresent: Boolean(
        req.headers["x-razorpay-signature"]
      ),
      bodyIsBuffer: Buffer.isBuffer(req.body),
    });

    const signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"];

    if (!signature || typeof signature !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing webhook signature",
      });
    }

    if (!eventId || typeof eventId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing webhook event ID",
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook body",
      });
    }

    const rawBody = req.body.toString("utf8");

    // Parse and type the Razorpay webhook event
    let event: Parameters<typeof handleRazorpayWebhook>[2];

    try {
      event = JSON.parse(rawBody) as Parameters<
        typeof handleRazorpayWebhook
      >[2];
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook JSON",
      });
    }

    const result = await handleRazorpayWebhook(
      rawBody,
      signature,
      event,
      eventId
    );

    console.log("[WEBHOOK] Processing result:", result);

    return res.status(200).json({
      success: true,
      message: "Webhook received",
      data: result,
    });
  } catch (error) {
    console.error("[WEBHOOK] Processing error:", error);

    return res.status(400).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};
