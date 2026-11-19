
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import customerRoutes from "./routes/customer.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import { razorpayWebhook } from "./controllers/payment.controller";
import analyticsRoutes from "./routes/analytics.routes";

dotenv.config();



const app = express();

app.use(cors());

// Razorpay webhook route (keep before express.json)
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

app.use(express.json());

// Health check FIRST
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "PayFlow API is running 🚀",
  });
});

// API routes
app.use("/api", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PayFlow API running on port ${PORT}`);
});
