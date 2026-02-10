const express = require("express");
const router = express.Router();
const inventoryCtrl = require("../controllers/inventory.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn, isEmailVerified } = require("../middlewares");

router.get(
  "/inventory",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(inventoryCtrl.globalDashboard)
);

router.get(
  "/inventory/list",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(inventoryCtrl.list)
);

router.get(
  "/inventory/:inventoryId",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(inventoryCtrl.detail)
);

router.get(
  "/inventory/:inventoryId/buy",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(inventoryCtrl.buyDashboard)
);

router.get(
  "/inventory/:inventoryId/sell",
  isLoggedIn,
  isEmailVerified,
  WrapAsync(inventoryCtrl.sellDashboard)
);

module.exports = router;
