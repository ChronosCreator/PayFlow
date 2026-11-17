
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

// Razorpay webhook must receive the original raw body.
// Keep this route BEFORE express.json().
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// Parse JSON for all other API routes.
app.use(express.json());

app.use("/api", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PayFlow API is running 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PayFlow API running on port ${PORT}`);
});
