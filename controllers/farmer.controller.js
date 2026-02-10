const mongoose = require("mongoose");
const Farmer = require("../models/farmer.model");
const Crop = require("../models/crop.model");
const Loan = require("../models/loan.model");

module.exports.dashboard = (req, res) => {
  res.render("farmer/fdash.ejs");
};

module.exports.newForm = (req, res) => {
  res.render("farmer/fnew.ejs");
};

module.exports.create = async (req, res) => {
  const { name, mobile, village, year, address, city, state, zip } = req.body;

  const farmer = new Farmer({
    name,
    mobile,
    village,
    year,
    address,
    city,
    state,
    zip,
    dealerId: req.user._id,
  });

  await farmer.save();

  req.flash(
    "success",
    `Farmer "${farmer.name}" registered successfully with Farmer ID: ${farmer.farmerId}`
  );

  res.redirect(`/farmer/${farmer.farmerId}/fdetail`);
};

module.exports.pendingCrops = async (req, res) => {
  const { search } = req.query;

  let farmerQuery = { dealerId: req.user._id };

  if (search && search.trim() !== "") {
    farmerQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { farmerId: { $regex: search, $options: "i" } },
    ];
  }

  const farmers = await Farmer.find(farmerQuery).sort({ createdAt: -1 });

  const result = [];

  for (const farmer of farmers) {
    const crops = await Crop.find({
      dealerId: req.user._id,
      personType: "FARMER",
      personBusinessId: farmer.farmerId,
    });

    const hasPendingCrop = crops.some((c) => c.paymentStatus !== "DONE");

    const hasNoCrop = crops.length === 0;

    if (hasPendingCrop || hasNoCrop) {
      result.push(farmer);
    }
  }

  res.render("farmer/fpending.ejs", {
    farmers: result,
    search,
    type: "CROP",
  });
};

module.exports.settledCrops = async (req, res) => {
  const { search } = req.query;

  let farmerQuery = { dealerId: req.user._id };

  if (search && search.trim() !== "") {
    farmerQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { farmerId: { $regex: search, $options: "i" } },
    ];
  }

  const farmers = await Farmer.find(farmerQuery).sort({ name: 1 });

  const result = [];

  for (const farmer of farmers) {
    const crops = await Crop.find({
      dealerId: req.user._id,
      personType: "FARMER",
      personBusinessId: farmer.farmerId,
    });

    if (crops.length === 0) continue;

    const allDone = crops.every((c) => c.paymentStatus === "DONE");

    if (allDone) {
      result.push(farmer);
    }
  }

  res.render("farmer/fsettled.ejs", {
    farmers: result,
    search,
    type: "CROP",
  });
};

module.exports.detail = async (req, res) => {
  const farmer = await Farmer.findOne({
    farmerId: req.params.farmerId,
    dealerId: req.user._id,
  });

  if (!farmer) {
    req.flash("error", "Farmer not found");
    return res.redirect("/farmer");
  }

  const crops = await Crop.find({
    dealerId: req.user._id,
    personType: "FARMER",
    personBusinessId: farmer.farmerId,
  });

  const loans = await Loan.find({
    dealerId: req.user._id,
    farmerBusinessId: farmer.farmerId,
  });

  const cropSummary = {
    total: crops.reduce((s, c) => s + c.totalAmount, 0),
    paid: crops.reduce((s, c) => s + c.paidAmount, 0),
    pending: crops.reduce((s, c) => s + c.pendingAmount, 0),
    count: crops.length,
  };

  const loanSummary = {
    total: loans.reduce((s, l) => {
      return s + (l.loanAmount || 0) + (l.interestAmount || 0);
    }, 0),
    paid: loans.reduce((s, l) => s + l.paidAmount, 0),
    pending: loans.reduce((s, l) => s + l.pendingAmount, 0),
    count: loans.length,
  };

  const netAmount = cropSummary.pending - loanSummary.pending;

  res.render("farmer/fdetails.ejs", {
    farmer,
    cropSummary,
    loanSummary,
    netAmount,
  });
};

module.exports.cropDashboard = async (req, res) => {
  const { farmerId } = req.params;

  const farmer = await Farmer.findOne({ farmerId, dealerId: req.user._id });
  if (!farmer) {
    req.flash("error", "Farmer not found");
    return res.redirect("/farmer");
  }

  const crops = await Crop.find({
    dealerId: req.user._id,
    personType: "FARMER",
    personBusinessId: farmerId,
  }).sort({ date: -1 });

  const pendingCrops = crops.filter((c) => c.paymentStatus !== "DONE");
  const doneCrops = crops.filter((c) => c.paymentStatus === "DONE");

  const totalAmount = crops.reduce((s, c) => s + c.totalAmount, 0);
  const totalPaid = crops.reduce((s, c) => s + c.paidAmount, 0);
  const totalPending = crops.reduce((s, c) => s + c.pendingAmount, 0);

  res.render("crop/cdashboard.ejs", {
    farmer,
    buyer: null,
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

    const farmer = await Farmer.findOne({
      farmerId: req.params.farmerId,
      dealerId: req.user._id,
    }).session(session);

    if (!farmer) {
      req.flash("error", "Farmer not found");
      return res.redirect("/farmer");
    }

    const cropCount = await Crop.countDocuments({
      dealerId: req.user._id,
      personType: "FARMER",
      personBusinessId: farmer.farmerId,
    }).session(session);

    if (cropCount > 0) {
      req.flash("error", "Farmer cannot be deleted because crop records exist");
      return res.redirect("back");
    }

    const loanCount = await Loan.countDocuments({
      dealerId: req.user._id,
      farmerBusinessId: farmer.farmerId,
    }).session(session);

    if (loanCount > 0) {
      req.flash("error", "Farmer cannot be deleted because loan records exist");
      return res.redirect("back");
    }

    await Farmer.deleteOne({ _id: farmer._id }, { session });

    await session.commitTransaction();

    req.flash("success", "Farmer deleted successfully");
    res.redirect("/farmer");
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    req.flash("error", err.message || "Farmer delete failed");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};
