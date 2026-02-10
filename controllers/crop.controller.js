const mongoose = require("mongoose");
const Farmer = require("../models/farmer.model");
const Buyer = require("../models/buyer.model");
const Crop = require("../models/crop.model");
const Inventory = require("../models/inventory.model");
const CropPayment = require("../models/cropPayment.model");
const Settlement = require("../models/settlement.model");

const CROP_TYPES = [
  "MUSTARD",
  "SOYBEAN",
  "GROUNDNUT",
  "SUNFLOWER",
  "SESAME",
  "LINSEED",
  "WHEAT",
  "RICE",
  "MAIZE",
  "BARLEY",
  "JOWAR",
  "BAJRA",
  "RAGI",
  "GRAM",
  "ARHAR",
  "MOONG",
  "URAD",
  "MASOOR",
  "PEAS",
  "SUGARCANE",
  "COTTON",
  "TOBACCO",
  "JUTE",
];

module.exports.farmerNewCropForm = async (req, res) => {
  const farmer = await Farmer.findOne({
    farmerId: req.params.farmerId,
    dealerId: req.user._id,
  });

  if (!farmer) {
    req.flash("error", "Farmer not found");
    return res.redirect("/farmer");
  }

  res.render("crop/fcnew.ejs", {
    personType: "FARMER",
    person: farmer,
    CROP_TYPES,
  });
};

module.exports.buyerNewCropForm = async (req, res) => {
  const buyer = await Buyer.findOne({
    buyerId: req.params.buyerId,
    dealerId: req.user._id,
  });

  if (!buyer) {
    req.flash("error", "Buyer not found");
    return res.redirect("/buyer");
  }

  const inventories = await Inventory.find({
    dealerId: req.user._id,
    totalInStock: { $gt: 0 },
  });

  const inventoryMap = inventories.map((inv) => ({
    cropName: inv.cropName,
    gunnyQuantity: inv.gunnyQuantity,
    inStockGunny: inv.inStockGunny,
    totalInStock: inv.totalInStock,
    pricePerQuintalBuy: inv.averageBuyPrice,
    pricePerQuintalSell: inv.averageSellPrice,
    totalCharges:
      (inv.labourCharges || 0) +
      (inv.transportCharges || 0) +
      (inv.otherCharges || 0),
  }));

  res.render("crop/bcnew.ejs", {
    personType: "BUYER",
    person: buyer,
    inventories: inventoryMap,
  });
};

module.exports.create = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      personType,
      personRefId,
      personBusinessId,
      personName,
      cropType,
      quantity,
      gunnyQuantity,
      labourCharges,
      transportCharges,
      otherCharges,
      grade,
      pricePerQuintal,
      paidAmount = 0,
    } = req.body;

    if (!personType || !personRefId || !personBusinessId) {
      throw new Error("Invalid person details");
    }

    if (!cropType || !quantity || !pricePerQuintal) {
      throw new Error("Missing crop details");
    }

    const totalAmount = Number(quantity) * Number(pricePerQuintal);
    const pendingAmount = Number(totalAmount) - Number(paidAmount);

    let inventory = await Inventory.findOne({
      cropName: cropType,
      dealerId: req.user._id,
    }).session(session);

    if (!inventory) {
      inventory = new Inventory({
        cropName: cropType,
        dealerId: req.user._id,
      });
    }

    const effectiveGunnyQty =
      personType === "FARMER"
        ? Number(gunnyQuantity)
        : Number(inventory.gunnyQuantity);

    const gunny =
      effectiveGunnyQty > 0 ? (Number(quantity) * 100) / effectiveGunnyQty : 0;

    if (personType === "FARMER") {
      inventory.totalInStock += Number(quantity);
      inventory.totalBuyQuantity += Number(quantity);
      inventory.totalpaymentbuy += totalAmount;

      if (!inventory.gunnyQuantity || inventory.gunnyQuantity === 0) {
        inventory.gunnyQuantity = Number(gunnyQuantity);
      } else if (Number(gunnyQuantity) !== inventory.gunnyQuantity) {
        throw new Error(
          `Gunny capacity mismatch. Existing: ${inventory.gunnyQuantity} KG`
        );
      }

      inventory.buyGunny += gunny;
      inventory.inStockGunny += gunny;

      inventory.labourCharges += Number(labourCharges);
      inventory.transportCharges += Number(transportCharges);
      inventory.otherCharges += Number(otherCharges);

      inventory.paymentGivePaid += Number(paidAmount);
      inventory.paymentGivePending += pendingAmount;

      inventory.averageBuyPrice =
        inventory.totalBuyQuantity > 0
          ? (inventory.averageBuyPrice *
              (inventory.totalBuyQuantity - Number(quantity)) +
              Number(pricePerQuintal) * Number(quantity)) /
            inventory.totalBuyQuantity
          : Number(pricePerQuintal);
    } else {
      if (Number(quantity) > inventory.totalInStock) {
        throw new Error(
          `Not enough stock. Available: ${inventory.totalInStock} Qt`
        );
      }

      inventory.totalInStock -= Number(quantity);
      inventory.totalSellQuantity += Number(quantity);
      inventory.totalpaymentsell += totalAmount;

      inventory.sellGunny += gunny;
      inventory.inStockGunny -= gunny;

      inventory.paymentReceivePaid += Number(paidAmount);
      inventory.paymentReceivePending += pendingAmount;

      inventory.labourCharges += Number(labourCharges);
      inventory.transportCharges += Number(transportCharges);
      inventory.otherCharges += Number(otherCharges);

      inventory.averageSellPrice =
        inventory.totalSellQuantity > 0
          ? (inventory.averageSellPrice *
              (inventory.totalSellQuantity - Number(quantity)) +
              Number(pricePerQuintal) * Number(quantity)) /
            inventory.totalSellQuantity
          : Number(pricePerQuintal);
    }
    inventory.lastUpdatedAt = new Date();
    await inventory.save({ session });

    const crop = new Crop({
      dealerId: req.user._id,
      personType,
      personRefId,
      personBusinessId,
      personName,
      cropType,
      quantity,
      noOfGunny: gunny,
      gunnyQuantity: effectiveGunnyQty,
      labourCharges,
      transportCharges,
      otherCharges,
      grade,
      pricePerQuintal,
      paidAmount,
      inventory: [
        {
          totalQuantity: inventory.totalInStock,
          averageBuyPrice: inventory.averageBuyPrice,
          averageSellPrice: inventory.averageSellPrice,

          inStockGunny: inventory.inStockGunny,
          gunnyQuantity: effectiveGunnyQty,

          labourCharges: inventory.labourCharges,
          transportCharges: inventory.transportCharges,
          otherCharges: inventory.otherCharges,

          totalAmount:
            personType === "FARMER"
              ? inventory.totalpaymentbuy
              : inventory.totalpaymentsell,
          totalPaid:
            personType === "FARMER"
              ? inventory.paymentGivePaid
              : inventory.paymentReceivePaid,
          totalPending:
            personType === "FARMER"
              ? inventory.paymentGivePending
              : inventory.paymentReceivePending,
        },
      ],
    });

    await crop.save({ session });

    await session.commitTransaction();

    req.flash(
      "success",
      `Crop (${crop.cropType}) added successfully (${crop.cropId}) with inventory`
    );

    res.redirect(`/crop/${crop.cropId}/cdetail`);
  } catch (err) {
    await session.abortTransaction();

    console.error(err);
    req.flash("error", "Failed to save crop. No data was saved.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.detail = async (req, res) => {
  const crop = await Crop.findOne({
    cropId: req.params.cropId,
    dealerId: req.user._id,
  });

  if (!crop) {
    req.flash("error", "Crop not found");
    return res.redirect("back");
  }

  const cropPayments = await CropPayment.find({
    dealerId: req.user._id,
    "payments.cropId": crop._id,
  }).sort({ createdAt: -1 });

  const settlementPayments = await Settlement.find({
    dealerId: req.user._id,
    "cropPayments.cropId": crop._id,
  }).sort({ createdAt: -1 });

  const normalizedSettlementCropPayments = settlementPayments.map((s) => ({
    _id: s._id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,

    mode: "SETTLEMENT",
    isReversal: s.isReversal || false,
    reversedPaymentId: s.reversedSettlementId,
    paymentId: s.settlementId,

    payments: s.cropPayments,
  }));

  const payments = [...cropPayments, ...normalizedSettlementCropPayments].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  res.render("crop/cdetail.ejs", {
    crop,
    payments,
  });
};

module.exports.paymentForm = async (req, res) => {
  const { cropIds, personType, personBusinessId } = req.body;

  if (!cropIds) {
    req.flash("error", "Please select at least one crop");
    return res.redirect(
      personType === "FARMER"
        ? `/farmer/${personBusinessId}/crops`
        : `/buyer/${personBusinessId}/crops`
    );
  }

  const ids = Array.isArray(cropIds) ? cropIds : [cropIds];

  const crops = await Crop.find({
    _id: { $in: ids },
    personType,
    personBusinessId,
    dealerId: req.user._id,
  });

  if (crops.length === 0) {
    req.flash("error", "No valid crops found");
    return res.redirect(
      personType === "FARMER"
        ? `/farmer/${personBusinessId}/crops`
        : `/buyer/${personBusinessId}/crops`
    );
  }

  const person =
    personType === "FARMER"
      ? await Farmer.findOne({
          farmerId: personBusinessId,
          dealerId: req.user._id,
        })
      : await Buyer.findOne({
          buyerId: personBusinessId,
          dealerId: req.user._id,
        });

  res.render("crop/cpayment.ejs", {
    person,
    personType,
    personBusinessId,
    crops,
  });
};

module.exports.payment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      personType,
      personId,
      personName,
      mode,
      amountPaid,
      payments,
      personBusinessId,
    } = req.body;

    const paidTotal = Number(amountPaid);
    if (!payments || paidTotal <= 0) {
      throw new Error("Invalid payment");
    }

    const cropIds = payments.map((p) => p.cropId);

    const crops = await Crop.find({
      _id: { $in: cropIds },
      pendingAmount: { $gt: 0 },
      dealerId: req.user._id,
    })
      .sort({ createdAt: 1 })
      .session(session);

    let remainingAmount = paidTotal;
    let totalCropAmount = 0;

    crops.forEach((crop) => {
      totalCropAmount += crop.pendingAmount;
    });

    if (remainingAmount > totalCropAmount) {
      throw new Error("Paid amount exceeds total pending");
    }

    const cropTypes = [...new Set(crops.map((c) => c.cropType))];
    const inventories = await Inventory.find({
      cropName: { $in: cropTypes },
      dealerId: req.user._id,
    }).session(session);

    const inventoryMap = {};
    inventories.forEach((inv) => {
      inventoryMap[inv.cropName] = inv;
    });

    const paymentDetails = [];

    for (const crop of crops) {
      if (remainingAmount <= 0) break;

      const cropPendingBefore = crop.pendingAmount;
      const pay = Math.min(cropPendingBefore, remainingAmount);

      crop.paidAmount += pay;
      crop.pendingAmount -= pay;
      crop.paymentStatus = crop.pendingAmount === 0 ? "DONE" : "PARTIAL-DONE";
      await crop.save({ session });

      const inventory = inventoryMap[crop.cropType];
      if (!inventory) continue;

      if (personType === "FARMER") {
        inventory.paymentGivePaid += pay;
        inventory.paymentGivePending -= pay;
        if (inventory.paymentGivePending < 0) inventory.paymentGivePending = 0;
      } else {
        inventory.paymentReceivePaid += pay;
        inventory.paymentReceivePending -= pay;
        if (inventory.paymentReceivePending < 0)
          inventory.paymentReceivePending = 0;
      }

      inventory.lastUpdatedAt = new Date();
      await inventory.save({ session });

      paymentDetails.push({
        cropId: crop._id,
        cropBusinessId: crop.cropId,
        cropType: crop.cropType,
        quantity: crop.quantity,
        pricePerQuintal: crop.pricePerQuintal,
        totalAmount: crop.totalAmount,
        pendingBefore: cropPendingBefore,
        paidAmount: pay,
        pendingAfter: cropPendingBefore - pay,
        statusAfter: cropPendingBefore - pay === 0 ? "DONE" : "PARTIAL-DONE",
        inventory: [
          {
            totalAmount:
              personType === "FARMER"
                ? inventory.totalpaymentbuy
                : inventory.totalpaymentsell,
            averageBuyPrice: inventory.averageBuyPrice,
            averageSellPrice: inventory.averageSellPrice,
            totalQuantity: inventory.totalInStock,
            totalPaid:
              personType === "FARMER"
                ? inventory.paymentGivePaid
                : inventory.paymentReceivePaid,
            totalPending:
              personType === "FARMER"
                ? inventory.paymentGivePending
                : inventory.paymentReceivePending,
          },
        ],
      });

      remainingAmount -= pay;
    }

    await CropPayment.create(
      [
        {
          dealerId: req.user._id,
          personType,
          personId,
          personBusinessId,
          personName,
          mode,
          payments: paymentDetails,
          totalCropAmount,
          amountPaid: paidTotal,
          pendingAmount: totalCropAmount - paidTotal,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    req.flash("success", "Crop payment saved successfully");
    res.redirect(
      personType === "FARMER"
        ? `/farmer/${personBusinessId}/crops`
        : `/buyer/${personBusinessId}/crops`
    );
  } catch (err) {
    await session.abortTransaction();

    console.error(err);
    req.flash("error", "Payment failed. No data was saved.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.delete = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const crop = await Crop.findOne({
      cropId: req.params.cropId,
      dealerId: req.user._id,
    }).session(session);

    if (!crop) {
      req.flash("error", "Crop not found");
      return res.redirect("back");
    }

    if (crop.paidAmount > 0 || crop.paymentStatus !== "NOT-DONE") {
      req.flash(
        "error",
        "Crop cannot be deleted because payment has already started"
      );
      return res.redirect("back");
    }

    const inventory = await Inventory.findOne({
      cropName: crop.cropType,
      dealerId: req.user._id,
    }).session(session);

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    const qty = Number(crop.quantity);
    const gunny = Number(crop.noOfGunny || 0);
    const totalAmount = crop.totalAmount;

    if (crop.personType === "FARMER") {
      inventory.totalInStock -= qty;
      inventory.totalBuyQuantity -= qty;
      inventory.totalpaymentbuy -= totalAmount;

      inventory.buyGunny -= gunny;
      inventory.inStockGunny -= gunny;

      inventory.paymentGivePending -= crop.pendingAmount;
      inventory.averageBuyPrice =
        inventory.totalBuyQuantity > 0
          ? inventory.totalpaymentbuy / inventory.totalBuyQuantity
          : 0;
    } else {
      inventory.totalInStock += qty;
      inventory.totalSellQuantity -= qty;
      inventory.totalpaymentsell -= totalAmount;

      inventory.sellGunny -= gunny;
      inventory.inStockGunny += gunny;

      inventory.paymentReceivePending -= crop.pendingAmount;
      inventory.averageSellPrice =
        inventory.totalSellQuantity > 0
          ? inventory.totalpaymentsell / inventory.totalSellQuantity
          : 0;
    }

    inventory.labourCharges -= crop.labourCharges;
    inventory.transportCharges -= crop.transportCharges;
    inventory.otherCharges -= crop.otherCharges;

    if (inventory.totalBuyQuantity === 0) {
      inventory.gunnyQuantity = 0;
    }

    if (
      inventory.totalBuyQuantity === 0 &&
      inventory.totalSellQuantity === 0 &&
      inventory.totalInStock === 0
    ) {
      await Inventory.deleteOne({ _id: inventory._id }, { session });
    } else {
      inventory.lastUpdatedAt = new Date();
      await inventory.save({ session });
    }

    await Crop.deleteOne({ _id: crop._id }).session(session);

    await session.commitTransaction();

    req.flash("success", "Crop deleted successfully and inventory updated");
    res.redirect(
      crop.personType === "FARMER"
        ? `/farmer/${crop.personBusinessId}/crops`
        : `/buyer/${crop.personBusinessId}/crops`
    );
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    req.flash("error", err.message || "Crop delete failed");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.reverseCropPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const original = await CropPayment.findOne({
      paymentId: req.params.paymentId,
      dealerId: req.user._id,
      isReversal: false,
    }).session(session);

    if (!original) throw new Error("Original payment not found");

    const alreadyReversed = await CropPayment.exists({
      paymentId: original.paymentId,
      isReversal: true,
      dealerId: req.user._id,
    });

    if (alreadyReversed) {
      throw new Error("Payment already reversed");
    }

    const usedInSettlement = await Settlement.exists({
      dealerId: req.user._id,
      "cropPayments.paymentId": original.paymentId,
    });

    if (usedInSettlement) {
      throw new Error("Payment used in settlement. Cannot reverse.");
    }

    const reversalPayments = [];

    let totalPendingBefore = 0;
    let totalReversedAmount = 0;

    for (const p of original.payments) {
      totalPendingBefore += p.pendingBefore;
      totalReversedAmount += p.paidAmount;

      const crop = await Crop.findById(p.cropId).session(session);
      if (!crop) continue;
      const amt = Math.abs(p.paidAmount);
      crop.paidAmount -= amt;
      crop.pendingAmount += amt;
      crop.paymentStatus = crop.paidAmount === 0 ? "NOT-DONE" : "PARTIAL-DONE";
      await crop.save({ session });

      const inventory = await Inventory.findOne({
        cropName: crop.cropType,
        dealerId: req.user._id,
      }).session(session);

      if (!inventory) continue;
      let inventorySnapshot = [];

      if (inventory) {
        if (original.personType === "FARMER") {
          inventory.paymentGivePaid -= amt;
          inventory.paymentGivePending += amt;
        } else {
          inventory.paymentReceivePaid -= amt;
          inventory.paymentReceivePending += amt;
        }

        inventory.lastUpdatedAt = new Date();
        await inventory.save({ session });

        inventorySnapshot.push({
          totalQuantity: inventory.totalInStock,
          averageBuyPrice: inventory.averageBuyPrice,
          averageSellPrice: inventory.averageSellPrice,
          totalAmount:
            original.personType === "FARMER"
              ? inventory.totalpaymentbuy
              : inventory.totalpaymentsell,
          totalPaid:
            original.personType === "FARMER"
              ? inventory.paymentGivePaid
              : inventory.paymentReceivePaid,
          totalPending:
            original.personType === "FARMER"
              ? inventory.paymentGivePending
              : inventory.paymentReceivePending,
        });
      }
      reversalPayments.push({
        ...p.toObject(),
        paidAmount: -amt,
        pendingAfter: p.pendingBefore,
        statusAfter: "REVERSED",
        inventory: inventorySnapshot,
      });
    }

    await CropPayment.create(
      [
        {
          dealerId: req.user._id,
          personType: original.personType,
          personId: original.personId,
          personName: original.personName,
          personBusinessId: original.personBusinessId,
          mode: original.mode,
          isReversal: true,
          paymentId: original.paymentId,
          totalCropAmount: totalPendingBefore - totalReversedAmount,
          amountPaid: totalReversedAmount,
          pendingAmount: totalPendingBefore,
          payments: reversalPayments,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    req.flash("success", "Payment reversed successfully");

    if (original.personType == "FARMER") {
      res.redirect(`/farmer/${original.personBusinessId}/transaction`);
    } else {
      res.redirect(`/buyer/${original.personBusinessId}/transaction`);
    }
  } catch (err) {
    await session.abortTransaction();
    req.flash("error", err.message);
    res.redirect("back");
  } finally {
    session.endSession();
  }
};
