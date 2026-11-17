
import crypto from "node:crypto";
import prisma from "../config/prisma";
import { verifyRazorpaySignature } from "../utils/razorpaySignature";

export interface PaymentProviderOrder {
  providerOrderId: string;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  createOrder(
    amount: number,
    currency: string,
    receipt: string
  ): Promise<PaymentProviderOrder>;
}

// Verify Razorpay checkout signature
export const verifyPayment = async (
  merchantId: string,
  providerOrderId: string,
  providerPaymentId: string,
  signature: string
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      merchantId,
      providerOrderId,
      provider: "RAZORPAY",
    },
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  const isValid = verifyRazorpaySignature(
    payment.providerOrderId!,
    providerPaymentId,
    signature
  );

  if (!isValid) {
    throw new Error("INVALID_PAYMENT_SIGNATURE");
  }

  if (
    payment.providerPaymentId &&
    payment.providerPaymentId !== providerPaymentId
  ) {
    throw new Error("PAYMENT_ALREADY_VERIFIED");
  }

  // Never downgrade a successfully captured payment.
  if (payment.status === "SUCCESS") {
    return payment;
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: {
          not: "SUCCESS",
        },
      },
      data: {
        providerPaymentId,
        status: "PENDING",
      },
    });

    const updatedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
    });

    if (!updatedPayment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (updatedPayment.status !== "SUCCESS") {
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: "PENDING",
        },
      });
    }

    return updatedPayment;
  });
};

// Razorpay webhook event structure
interface RazorpayWebhookEvent {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
  };
}

// Process Razorpay webhook events

export const handleRazorpayWebhook = async (
  rawBody: string,
  signature: string,
  event: RazorpayWebhookEvent,
  eventId: string
) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  // Verify Razorpay webhook signature.
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  }

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  }

  if (!eventId) {
    throw new Error("WEBHOOK_EVENT_ID_MISSING");
  }

  if (
    event.event !== "payment.captured" &&
    event.event !== "payment.failed"
  ) {
    return { ignored: true };
  }

  const entity = event.payload?.payment?.entity;

  if (
    !entity?.id ||
    !entity.order_id ||
    typeof entity.amount !== "number" ||
    !entity.currency
  ) {
    throw new Error("INVALID_WEBHOOK_PAYLOAD");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Find the corresponding PayFlow payment.
      const payment = await tx.payment.findFirst({
        where: {
          provider: "RAZORPAY",
          providerOrderId: entity.order_id,
        },
      });

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      // Validate amount and currency.
      const expectedAmount = Math.round(
        Number(payment.amount) * 100
      );

      if (
        expectedAmount !== entity.amount ||
        payment.currency !== entity.currency
      ) {
        throw new Error("PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH");
      }

      if (
        payment.providerPaymentId &&
        payment.providerPaymentId !== entity.id
      ) {
        throw new Error("PAYMENT_ID_MISMATCH");
      }

      // Register each webhook event independently.
      await tx.webhookEvent.create({
        data: {
          eventId,
          provider: "RAZORPAY",
          event: event.event,
          paymentId: payment.id,
        },
      });

      const nextStatus =
        event.event === "payment.captured"
          ? "SUCCESS"
          : "FAILED";

      // Never downgrade a successful payment.
      if (payment.status !== "SUCCESS") {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerPaymentId: entity.id,
            status: nextStatus,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status:
              nextStatus === "SUCCESS" ? "PAID" : "FAILED",
          },
        });
      }

      await tx.webhookEvent.update({
        where: { eventId },
        data: { processedAt: new Date() },
      });

      return {
        processed: true,
        status:
          payment.status === "SUCCESS"
            ? "SUCCESS"
            : nextStatus,
      };
    });
  } catch (error) {
    // A previously registered event is a duplicate.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });

      if (existingEvent) {
        return { duplicate: true };
      }
    }

    throw error;
  }
};
