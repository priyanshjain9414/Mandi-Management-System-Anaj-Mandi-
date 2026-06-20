const express = require("express");
const router = express.Router();
const dealerController = require("../controllers/dealer.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

router.get("/profile", isLoggedIn, WrapAsync(dealerController.renderProfile));

module.exports = router;
