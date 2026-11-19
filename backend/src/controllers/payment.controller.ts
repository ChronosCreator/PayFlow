
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../config/prisma";
import {
  verifyPayment,
  handleRazorpayWebhook,
  recordFailedPayment,
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

// Verify Razorpay checkout signature and payment status
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
    } = req.body ?? {};

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid payment verification details are required",
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
      message:
        payment.status === "SUCCESS"
          ? "Payment captured and verified successfully"
          : payment.status === "FAILED"
            ? "Payment failed"
            : "Payment signature verified; awaiting capture confirmation",
      data: payment,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PAYMENT_NOT_FOUND":
          return res.status(404).json({
            success: false,
            message: "Payment not found",
          });

        case "INVALID_PAYMENT_SIGNATURE":
          return res.status(400).json({
            success: false,
            message: "Invalid payment signature",
          });

        case "PAYMENT_ALREADY_VERIFIED":
          return res.status(409).json({
            success: false,
            message: "Payment already verified with another payment ID",
          });

        case "RAZORPAY_PAYMENT_MISMATCH":
        case "PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH":
          return res.status(400).json({
            success: false,
            message: "Payment details do not match Razorpay records",
          });

        default:
          break;
      }
    }

    console.error("Payment verification error:", error);

    return res.status(502).json({
      success: false,
      message: "Unable to confirm payment status with Razorpay",
    });
  }
};


export const reportFailure = async (
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
    } = req.body ?? {};

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid Razorpay payment details are required",
      });
    }

    const payment = await recordFailedPayment(
      req.user.merchantId,
      razorpay_order_id,
      razorpay_payment_id
    );

    return res.status(200).json({
      success: true,
      message:
        payment.status === "FAILED"
          ? "Failed payment recorded successfully"
          : payment.status === "SUCCESS"
            ? "Payment was actually captured successfully"
            : "Payment status is still pending confirmation",
      data: payment,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PAYMENT_NOT_FOUND":
          return res.status(404).json({
            success: false,
            message: "Payment not found",
          });

        case "RAZORPAY_PAYMENT_MISMATCH":
        case "PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH":
          return res.status(400).json({
            success: false,
            message: "Payment details do not match Razorpay records",
          });
      }
    }

    console.error("Payment failure reporting error:", error);

    return res.status(502).json({
      success: false,
      message: "Unable to confirm payment status with Razorpay",
    });
  }
};


// Handle Razorpay webhook events
export const razorpayWebhook = async (
  req: Request,
  res: Response
) => {
  const eventId = req.headers["x-razorpay-event-id"];
  const signature = req.headers["x-razorpay-signature"];

  console.log("[WEBHOOK] Request received", {
    eventId,
    signaturePresent: Boolean(signature),
    bodyIsBuffer: Buffer.isBuffer(req.body),
  });

  try {
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

