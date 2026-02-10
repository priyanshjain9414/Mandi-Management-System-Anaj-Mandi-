const express = require("express");
const router = express.Router();
const loanCtrl = require("../controllers/loan.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get("/loan", isLoggedIn, isEmailVerified, loanCtrl.dashboard);

router.get(
  "/farmer/:farmerId/loan/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.newForm)
);

router.post(
  "/loan/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.create)
);

router.get(
  "/loan/pending",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.pending)
);

router.get(
  "/loan/settled",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.settled)
);

router.get(
  "/farmer/:farmerId/loans",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.farmerLoans)
);

router.post(
  "/loan/payment-form",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.paymentForm)
);

router.post(
  "/loan/payment",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.payment)
);

router.get(
  "/loan/:loanId/ldetail",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.detail)
);

router.delete(
  "/loan/:loanId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.delete)
);

router.post(
  "/loan/payment/:paymentId/reverse",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanCtrl.reverseLoanPayment)
);

module.exports = router;
