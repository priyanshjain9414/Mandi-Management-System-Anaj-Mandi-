const express = require("express");
const router = express.Router();
const cropCtrl = require("../controllers/crop.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   FARMER NEW CROP
======================= */
router.get(
  "/farmer/:farmerId/crop/new",
  isLoggedIn,
  WrapAsync(cropCtrl.farmerNewCropForm),
);

/* =======================
   BUYER NEW CROP
======================= */
router.get(
  "/buyer/:buyerId/crop/new",
  isLoggedIn,
  WrapAsync(cropCtrl.buyerNewCropForm),
);

/* =======================
   SAVE CROP
======================= */
router.post("/crop/new", isLoggedIn, WrapAsync(cropCtrl.create));

/* =======================
   CROP DETAIL
======================= */
router.get("/crop/:cropId/cdetail", isLoggedIn, WrapAsync(cropCtrl.detail));

/* =======================
   CROP PAYMENT
======================= */
router.post("/crop/payment-form", isLoggedIn, WrapAsync(cropCtrl.paymentForm));

router.post("/crop/payment", isLoggedIn, WrapAsync(cropCtrl.payment));

router.delete("/crop/:cropId", isLoggedIn, WrapAsync(cropCtrl.delete));

router.post(
  "/crop/payment/:paymentId/reverse",
  isLoggedIn,
  WrapAsync(cropCtrl.reverseCropPayment),
);

module.exports = router;
