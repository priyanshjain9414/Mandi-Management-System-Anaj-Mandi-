const express = require("express");
const router = express.Router();
const settlementCtrl = require("../controllers/settlement.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get(
  "/farmer/:farmerId/settlement",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(settlementCtrl.dashboard)
);

router.post(
  "/settlement/payment-form",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(settlementCtrl.paymentForm)
);

router.post(
  "/settlement/payment",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(settlementCtrl.payment)
);

router.post(
  "/settlement/:settlementId/reverse",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(settlementCtrl.reverseSettlement)
);

module.exports = router;
