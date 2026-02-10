const express = require("express");
const router = express.Router();
const farmerCtrl = require("../controllers/farmer.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get("/farmer", isLoggedIn, isEmailVerified, farmerCtrl.dashboard);

router.get("/farmer/new", isLoggedIn, isEmailVerified, farmerCtrl.newForm);

router.post(
  "/farmer/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(farmerCtrl.create)
);

router.get(
  "/farmer/pending",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(farmerCtrl.pendingCrops)
);

router.get(
  "/farmer/settled",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(farmerCtrl.settledCrops)
);

router.get(
  "/farmer/:farmerId/fdetail",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(farmerCtrl.detail)
);

router.get(
  "/farmer/:farmerId/crops",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(farmerCtrl.cropDashboard)
);

router.delete(
  "/farmer/:farmerId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(farmerCtrl.delete)
);

module.exports = router;
