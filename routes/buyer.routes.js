const express = require("express");
const router = express.Router();
const buyerCtrl = require("../controllers/buyer.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   BUYER DASHBOARD
======================= */
router.get("/buyer", isLoggedIn, buyerCtrl.dashboard);

/* =======================
   NEW BUYER
======================= */
router.get("/buyer/new", isLoggedIn, buyerCtrl.newForm);
router.post("/buyer/new", isLoggedIn, WrapAsync(buyerCtrl.create));

/* =======================
   BUYER PENDING / SETTLED (CROP)
======================= */
router.get("/buyer/pending", isLoggedIn, WrapAsync(buyerCtrl.pendingCrops));
router.get("/buyer/settled", isLoggedIn, WrapAsync(buyerCtrl.settledCrops));

/* =======================
   BUYER DETAIL
======================= */
router.get("/buyer/:buyerId/detail", isLoggedIn, WrapAsync(buyerCtrl.detail));

/* =======================
   BUYER CROPS DASHBOARD
======================= */
router.get(
  "/buyer/:buyerId/crops",
  isLoggedIn,
  WrapAsync(buyerCtrl.cropDashboard),
);

router.delete("/buyer/:buyerId", isLoggedIn, WrapAsync(buyerCtrl.delete));

module.exports = router;
