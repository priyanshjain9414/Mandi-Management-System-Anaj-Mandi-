const express = require("express");
const router = express.Router();
const WrapAsync = require("../utils/WrapAsync");
const receiptController = require("../controllers/receipt.controller");

router.get("/crop/:cropId", WrapAsync(receiptController.cropReceipt));
router.get("/loan/:loanId", WrapAsync(receiptController.loanReceipt));
router.get(
  "/crop-payment/:paymentId",
  WrapAsync(receiptController.cropPaymentReceipt)
);
router.get(
  "/loan-payment/:paymentId",
  WrapAsync(receiptController.loanPaymentReceipt)
);
router.get(
  "/settlement/:settlementId",
  WrapAsync(receiptController.settlementReceipt)
);

router.get("/crops/all", WrapAsync(receiptController.allCropsReceipt));

router.get("/crops/pending", WrapAsync(receiptController.pendingCropsReceipt));

router.get("/crops/paid", WrapAsync(receiptController.paidCropsReceipt));

router.get("/loans/all", WrapAsync(receiptController.allLoansReceipt));

router.get("/loans/pending", WrapAsync(receiptController.pendingLoansReceipt));

router.get("/loans/paid", WrapAsync(receiptController.paidLoansReceipt));

module.exports = router;
