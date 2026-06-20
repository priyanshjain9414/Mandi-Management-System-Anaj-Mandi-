const express = require("express");
const router = express.Router();
const settlementCtrl = require("../controllers/settlement.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   SETTLEMENT DASHBOARD
======================= */
router.get(
  "/farmer/:farmerId/settlement",
  isLoggedIn,
  WrapAsync(settlementCtrl.dashboard),
);

/* =======================
   SETTLEMENT PAYMENT FORM
======================= */
router.post(
  "/settlement/payment-form",
  isLoggedIn,
  WrapAsync(settlementCtrl.paymentForm),
);

/* =======================
   SETTLEMENT PAYMENT SAVE
======================= */
router.post(
  "/settlement/payment",
  isLoggedIn,
  WrapAsync(settlementCtrl.payment),
);

router.post(
  "/settlement/:settlementId/reverse",
  isLoggedIn,
  WrapAsync(settlementCtrl.reverseSettlement),
);

module.exports = router;
