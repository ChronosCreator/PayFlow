import Razorpay from "razorpay";
import "dotenv/config";

import type {
  PaymentProvider,
  PaymentProviderOrder,
} from "./payment.service";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error("Razorpay credentials are not configured");
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export class RazorpayProvider implements PaymentProvider {
  async createOrder(
    amount: number,
    currency: string,
    receipt: string
  ): Promise<PaymentProviderOrder> {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
    });

    return {
      providerOrderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }
}