const express = require("express");
const router = express.Router();
const loanSummaryCtrl = require("../controllers/loanSummary.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   LOAN SUMMARY DASHBOARD
======================= */
router.get("/loan/summary", isLoggedIn, WrapAsync(loanSummaryCtrl.dashboard));

/* =======================
   LOAN SUMMARY LIST (ALL LOANS)
======================= */
router.get("/loan/summary/list", isLoggedIn, WrapAsync(loanSummaryCtrl.list));

/* =======================
   LOAN SUMMARY TRANSACTIONS
======================= */
router.get(
  "/loan/summary/transaction",
  isLoggedIn,
  WrapAsync(loanSummaryCtrl.transaction),
);

module.exports = router;
