const express = require("express");
const router = express.Router();
const farmerCtrl = require("../controllers/farmer.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   FARMER DASHBOARD
======================= */
router.get("/farmer", isLoggedIn, farmerCtrl.dashboard);

/* =======================
   NEW FARMER
======================= */
router.get("/farmer/new", isLoggedIn, farmerCtrl.newForm);
router.post("/farmer/new", isLoggedIn, WrapAsync(farmerCtrl.create));

/* =======================
   FARMER PENDING / SETTLED (CROP)
======================= */
router.get("/farmer/pending", isLoggedIn, WrapAsync(farmerCtrl.pendingCrops));
router.get("/farmer/settled", isLoggedIn, WrapAsync(farmerCtrl.settledCrops));

/* =======================
   FARMER DETAIL
======================= */
router.get(
  "/farmer/:farmerId/fdetail",
  isLoggedIn,
  WrapAsync(farmerCtrl.detail),
);

/* =======================
   FARMER CROPS DASHBOARD
======================= */
router.get(
  "/farmer/:farmerId/crops",
  isLoggedIn,
  WrapAsync(farmerCtrl.cropDashboard),
);

router.delete("/farmer/:farmerId", isLoggedIn, WrapAsync(farmerCtrl.delete));

module.exports = router;
