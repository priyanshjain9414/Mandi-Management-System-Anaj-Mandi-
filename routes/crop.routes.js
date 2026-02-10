const express = require("express");
const router = express.Router();
const cropCtrl = require("../controllers/crop.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get(
  "/farmer/:farmerId/crop/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.farmerNewCropForm)
);

router.get(
  "/buyer/:buyerId/crop/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.buyerNewCropForm)
);

router.post(
  "/crop/new",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.create)
);

router.get(
  "/crop/:cropId/cdetail",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.detail)
);

router.post(
  "/crop/payment-form",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.paymentForm)
);

router.post(
  "/crop/payment",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.payment)
);

router.delete(
  "/crop/:cropId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.delete)
);

router.post(
  "/crop/payment/:paymentId/reverse",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(cropCtrl.reverseCropPayment)
);

module.exports = router;
