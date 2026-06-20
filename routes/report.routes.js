const express = require("express");
const router = express.Router();
const reportCtrl = require("../controllers/report.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   PROFIT & LOSS REPORT
======================= */
router.get("/report", isLoggedIn, WrapAsync(reportCtrl.profitLoss));

module.exports = router;
