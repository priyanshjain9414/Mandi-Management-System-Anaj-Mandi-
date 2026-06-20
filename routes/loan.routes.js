const express = require("express");
const router = express.Router();
const loanCtrl = require("../controllers/loan.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   LOAN DASHBOARD
======================= */
router.get("/loan", isLoggedIn, loanCtrl.dashboard);

/* =======================
   NEW LOAN
======================= */
router.get(
  "/farmer/:farmerId/loan/new",
  isLoggedIn,
  WrapAsync(loanCtrl.newForm),
);

router.post("/loan/new", isLoggedIn, WrapAsync(loanCtrl.create));

/* =======================
   LOAN PENDING / SETTLED
======================= */
router.get("/loan/pending", isLoggedIn, WrapAsync(loanCtrl.pending));

router.get("/loan/settled", isLoggedIn, WrapAsync(loanCtrl.settled));

/* =======================
   FARMER LOANS DASHBOARD
======================= */
router.get(
  "/farmer/:farmerId/loans",
  isLoggedIn,
  WrapAsync(loanCtrl.farmerLoans),
);

/* =======================
   LOAN PAYMENT
======================= */
router.post("/loan/payment-form", isLoggedIn, WrapAsync(loanCtrl.paymentForm));

router.post("/loan/payment", isLoggedIn, WrapAsync(loanCtrl.payment));

/* =======================
   LOAN DETAIL
======================= */
router.get("/loan/:loanId/ldetail", isLoggedIn, WrapAsync(loanCtrl.detail));

router.delete("/loan/:loanId", isLoggedIn, WrapAsync(loanCtrl.delete));

router.post(
  "/loan/payment/:paymentId/reverse",
  isLoggedIn,
  WrapAsync(loanCtrl.reverseLoanPayment),
);

module.exports = router;
