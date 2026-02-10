const express = require("express");
const router = express.Router();
const reportCtrl = require("../controllers/report.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get(
  "/report",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(reportCtrl.profitLoss)
);

module.exports = router;
