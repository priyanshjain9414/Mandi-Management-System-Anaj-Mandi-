const mongoose = require("mongoose");
const Buyer = require("../models/buyer.model");
const Crop = require("../models/crop.model");

module.exports.dashboard = (req, res) => {
  res.render("buyer/bdash.ejs");
};

module.exports.newForm = (req, res) => {
  res.render("buyer/bnew.ejs");
};

module.exports.create = async (req, res) => {
  const { name, mobile, year, address, city, state, zip } = req.body;

  const buyer = new Buyer({
    name,
    mobile,
    year,
    address,
    city,
    state,
    zip,
    dealerId: req.user._id,
  });

  await buyer.save();

  req.flash(
    "success",
    `Buyer "${buyer.name}" registered successfully with Buyer ID: ${buyer.buyerId}`
  );

  res.redirect(`/buyer/${buyer.buyerId}/detail`);
};

module.exports.pendingCrops = async (req, res) => {
  const { search } = req.query;

  let buyerQuery = { dealerId: req.user._id };

  if (search && search.trim() !== "") {
    buyerQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { buyerId: { $regex: search, $options: "i" } },
    ];
  }

  const buyers = await Buyer.find(buyerQuery).sort({ createdAt: -1 });

  const result = [];

  for (const buyer of buyers) {
    const crops = await Crop.find({
      dealerId: req.user._id,
      personType: "BUYER",
      personBusinessId: buyer.buyerId,
    });

    const hasPendingCrop = crops.some((c) => c.paymentStatus !== "DONE");

    const hasNoCrop = crops.length === 0;

    if (hasPendingCrop || hasNoCrop) {
      result.push(buyer);
    }
  }

  res.render("buyer/bpending.ejs", {
    buyers: result,
    search,
    type: "CROP",
  });
};

module.exports.settledCrops = async (req, res) => {
  const { search } = req.query;

  let buyerQuery = { dealerId: req.user._id };

  if (search && search.trim() !== "") {
    buyerQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { buyerId: { $regex: search, $options: "i" } },
    ];
  }

  const buyers = await Buyer.find(buyerQuery).sort({ name: 1 });

  const result = [];

  for (const buyer of buyers) {
    const crops = await Crop.find({
      dealerId: req.user._id,
      personType: "BUYER",
      personBusinessId: buyer.buyerId,
    });

    if (crops.length === 0) continue;

    const allDone = crops.every((c) => c.paymentStatus === "DONE");

    if (allDone) {
      result.push(buyer);
    }
  }

  res.render("buyer/bsettled.ejs", {
    buyers: result,
    search,
    type: "CROP",
  });
};

module.exports.detail = async (req, res) => {
  const buyer = await Buyer.findOne({
    buyerId: req.params.buyerId,
    dealerId: req.user._id,
  });

  if (!buyer) {
    req.flash("error", "Buyer not found");
    return res.redirect("/buyer");
  }

  const crops = await Crop.find({
    dealerId: req.user._id,
    personType: "BUYER",
    personBusinessId: buyer.buyerId,
  });

  const cropSummary = {
    total: crops.reduce((s, c) => s + c.totalAmount, 0),
    paid: crops.reduce((s, c) => s + c.paidAmount, 0),
    pending: crops.reduce((s, c) => s + c.pendingAmount, 0),
    count: crops.length,
  };

  res.render("buyer/bdetails.ejs", { buyer, cropSummary });
};

module.exports.cropDashboard = async (req, res) => {
  const { buyerId } = req.params;

  const buyer = await Buyer.findOne({ buyerId, dealerId: req.user._id });
  if (!buyer) {
    req.flash("error", "Buyer not found");
    return res.redirect("/buyer");
  }

  const crops = await Crop.find({
    dealerId: req.user._id,
    personType: "BUYER",
    personBusinessId: buyerId,
  }).sort({ date: -1 });

  const pendingCrops = crops.filter((c) => c.paymentStatus !== "DONE");
  const doneCrops = crops.filter((c) => c.paymentStatus === "DONE");

  const totalAmount = crops.reduce((s, c) => s + c.totalAmount, 0);
  const totalPaid = crops.reduce((s, c) => s + c.paidAmount, 0);
  const totalPending = crops.reduce((s, c) => s + c.pendingAmount, 0);

  res.render("crop/cdashboard.ejs", {
    farmer: null,
    buyer,
    pendingCrops,
    doneCrops,
    totalAmount,
    totalPaid,
    totalPending,
  });
};

module.exports.delete = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const buyer = await Buyer.findOne({
      buyerId: req.params.buyerId,
      dealerId: req.user._id,
    }).session(session);

    if (!buyer) {
      req.flash("error", "Buyer not found");
      return res.redirect("/buyer");
    }

    const cropCount = await Crop.countDocuments({
      dealerId: req.user._id,
      personType: "BUYER",
      personBusinessId: buyer.buyerId,
    }).session(session);

    if (cropCount > 0) {
      req.flash("error", "Buyer cannot be deleted because crop records exist");
      return res.redirect("back");
    }

    await Buyer.deleteOne({ _id: buyer._id }, { session });

    await session.commitTransaction();

    req.flash("success", "Buyer deleted successfully");
    res.redirect("/buyer");
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    req.flash("error", err.message || "Buyer delete failed");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};
