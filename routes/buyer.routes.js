const express = require("express");
const router = express.Router();
const buyerCtrl = require("../controllers/buyer.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get("/buyer", isLoggedIn, isEmailVerified, buyerCtrl.dashboard);

router.get("/buyer/new", isLoggedIn, isEmailVerified, buyerCtrl.newForm);

router.post(
  "/buyer/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(buyerCtrl.create)
);

router.get(
  "/buyer/pending",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(buyerCtrl.pendingCrops)
);
router.get(
  "/buyer/settled",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(buyerCtrl.settledCrops)
);

router.get(
  "/buyer/:buyerId/detail",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(buyerCtrl.detail)
);

router.get(
  "/buyer/:buyerId/crops",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(buyerCtrl.cropDashboard)
);

router.delete(
  "/buyer/:buyerId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(buyerCtrl.delete)
);

module.exports = router;
