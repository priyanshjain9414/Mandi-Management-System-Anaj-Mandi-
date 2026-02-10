const express = require("express");
const router = express.Router();
const dealerController = require("../controllers/dealer.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

router.get("/profile", isLoggedIn, WrapAsync(dealerController.renderProfile));

router.post("/send-otp", isLoggedIn, WrapAsync(dealerController.sendOtp));
router.get(
  "/verify-otp",
  isLoggedIn,
  WrapAsync(dealerController.verifyOtpForm)
);
router.post("/verify-otp", isLoggedIn, WrapAsync(dealerController.verifyOtp));
router.post("/resend-otp", isLoggedIn, WrapAsync(dealerController.resendOtp));

router.get(
  "/change-password",
  isLoggedIn,
  WrapAsync(dealerController.changePasswordForm)
);

router.get("/forgot-password", WrapAsync(dealerController.forgotPasswordForm));

router.post(
  "/change-password/send-otp",
  WrapAsync(dealerController.sendPasswordOtp)
);
router.post(
  "/change-password/verify-otp",
  isLoggedIn,
  WrapAsync(dealerController.verifyPasswordOtp)
);

module.exports = router;
