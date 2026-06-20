const express = require("express");
const router = express.Router();
const inventoryCtrl = require("../controllers/inventory.controller");
const WrapAsync = require("../utils/WrapAsync");
const { isLoggedIn } = require("../middlewares");

/* =======================
   INVENTORY GLOBAL DASHBOARD
======================= */
router.get("/inventory", isLoggedIn, WrapAsync(inventoryCtrl.globalDashboard));

/* =======================
   INVENTORY LIST
======================= */
router.get("/inventory/list", isLoggedIn, WrapAsync(inventoryCtrl.list));

/* =======================
   INVENTORY DETAIL
======================= */
router.get(
  "/inventory/:inventoryId",
  isLoggedIn,
  WrapAsync(inventoryCtrl.detail),
);

/* =======================
   INVENTORY BUY DASHBOARD
======================= */
router.get(
  "/inventory/:inventoryId/buy",
  isLoggedIn,

  WrapAsync(inventoryCtrl.buyDashboard),
);

/* =======================
   INVENTORY SELL DASHBOARD
======================= */
router.get(
  "/inventory/:inventoryId/sell",
  isLoggedIn,
  WrapAsync(inventoryCtrl.sellDashboard),
);

module.exports = router;
