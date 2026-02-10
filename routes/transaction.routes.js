const express = require("express");
const router = express.Router();
const txCtrl = require("../controllers/transaction.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get(
  "/farmer/:farmerBusinessId/transaction",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(txCtrl.farmerTransactions)
);

router.get(
  "/buyer/:buyerBusinessId/transaction",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(txCtrl.buyerTransactions)
);

router.get(
  "/crop/payment/:paymentId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(txCtrl.cropPaymentDetail)
);

router.get(
  "/loan/payment/:paymentId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(txCtrl.loanPaymentDetail)
);

router.get(
  "/settlement/:settlementId/detail",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(txCtrl.settlementDetail)
);

module.exports = router;
