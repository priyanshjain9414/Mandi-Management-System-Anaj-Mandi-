const express = require("express");
const router = express.Router();
const txCtrl = require("../controllers/transaction.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   FARMER TRANSACTIONS
======================= */
router.get(
  "/farmer/:farmerBusinessId/transaction",
  isLoggedIn,
  WrapAsync(txCtrl.farmerTransactions),
);

/* =======================
   BUYER TRANSACTIONS
======================= */
router.get(
  "/buyer/:buyerBusinessId/transaction",
  isLoggedIn,
  WrapAsync(txCtrl.buyerTransactions),
);

/* =======================
   CROP PAYMENT DETAIL
======================= */
router.get(
  "/crop/payment/:paymentId",
  isLoggedIn,
  WrapAsync(txCtrl.cropPaymentDetail),
);

/* =======================
   LOAN PAYMENT DETAIL
======================= */
router.get(
  "/loan/payment/:paymentId",
  isLoggedIn,
  WrapAsync(txCtrl.loanPaymentDetail),
);

/* =======================
   SETTLEMENT DETAIL
======================= */
router.get(
  "/settlement/:settlementId/detail",
  isLoggedIn,
  WrapAsync(txCtrl.settlementDetail),
);

module.exports = router;
