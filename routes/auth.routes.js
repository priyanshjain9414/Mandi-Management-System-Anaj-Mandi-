const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/auth.controller");
const WrapAsync = require("../utils/WrapAsync");
const passport = require("passport");
const {
  saveRedirectUrl,
  isLoggedIn,
  isEmailVerified,
} = require("../middlewares");

router.get("/", authCtrl.home);
router.get("/dashboard", isLoggedIn, isEmailVerified, authCtrl.dashboard);

router.get("/login", authCtrl.loginForm);
router.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  authCtrl.login
);

router.get("/signup", authCtrl.signupForm);
router.post("/signup", WrapAsync(authCtrl.signup));
router.get("/logout", authCtrl.logout);

module.exports = router;
