const express = require("express");
const router = express.Router();
const loanSummaryCtrl = require("../controllers/loanSummary.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get(
  "/loan/summary",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanSummaryCtrl.dashboard)
);

router.get(
  "/loan/summary/list",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanSummaryCtrl.list)
);

router.get(
  "/loan/summary/transaction",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(loanSummaryCtrl.transaction)
);

module.exports = router;
