
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getPayments,
  verify,
  reportFailure,
} from "../controllers/payment.controller";

const router = Router();

router.get("/", authenticate, getPayments);
router.post("/verify", authenticate, verify);
router.post("/failure", authenticate, reportFailure);

export default router;
