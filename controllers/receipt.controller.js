const Crop = require("../models/crop.model");
const CropPayment = require("../models/cropPayment.model");
const Loan = require("../models/loan.model");
const LoanPayment = require("../models/loanPayment.model");
const Settlement = require("../models/settlement.model");
const Dealer = require("../models/dealer.model");

module.exports.cropReceipt = async (req, res) => {
  const crop = await Crop.findOne({ cropId: req.params.cropId });
  if (!crop) throw new Error("Crop not found");

  const dealer = await Dealer.findById(crop.dealerId);

  const cropPayments = await CropPayment.find({
    dealerId: dealer._id,
    "payments.cropId": crop._id,
  });

  const settlementPayments = await Settlement.find({
    dealerId: dealer._id,
    "cropPayments.cropId": crop._id,
  });

  const normalizedSettlementPayments = settlementPayments.map((s) => ({
    createdAt: s.createdAt,
    mode: "SETTLEMENT",
    isReversal: s.isReversal || false,
    reversedPaymentId: s.reversedSettlementId,
    paymentId: s.settlementId,
    payments: s.cropPayments,
  }));

  const payments = [...cropPayments, ...normalizedSettlementPayments].sort(
    (a, b) => a.createdAt - b.createdAt
  );

  res.render("receipt/crop.ejs", {
    crop,
    dealer,
    payments,
  });
};

module.exports.loanReceipt = async (req, res) => {
  const loan = await Loan.findOne({ loanId: req.params.loanId });
  if (!loan) throw new Error("Loan not found");

  const dealer = await Dealer.findById(loan.dealerId);

  const loanPayments = await LoanPayment.find({
    dealerId: dealer._id,
    "payments.loanId": loan._id,
  });

  const settlements = await Settlement.find({
    dealerId: dealer._id,
    "loanPayments.loanId": loan._id,
  });

  const normalizedSettlementPayments = settlements.map((s) => ({
    createdAt: s.createdAt,
    mode: "SETTLEMENT",
    isReversal: s.isReversal || false,
    reversedPaymentId: s.reversedSettlementId,
    paymentId: s.settlementId,
    payments: s.loanPayments,
  }));

  const payments = [...loanPayments, ...normalizedSettlementPayments].sort(
    (a, b) => a.createdAt - b.createdAt
  );

  res.render("receipt/loan.ejs", {
    loan,
    dealer,
    payments,
  });
};

module.exports.cropPaymentReceipt = async (req, res) => {
  const pid = req.params.paymentId;

  const cp = await CropPayment.findOne({
    $or: [{ paymentId: pid }, { reversedPaymentId: pid }],
  })
    .populate("payments.cropId")
    .lean();

  if (!cp) throw new Error("Crop payment not found");

  const dealer = await Dealer.findById(cp.dealerId);

  res.render("receipt/crop-payment.ejs", {
    cp,
    dealer,
    receiptId: pid,
  });
};

module.exports.loanPaymentReceipt = async (req, res) => {
  const pid = req.params.paymentId;

  const lp = await LoanPayment.findOne({
    $or: [{ paymentId: pid }, { reversedPaymentId: pid }],
  })
    .populate("payments.loanId")
    .lean();

  if (!lp) throw new Error("Loan payment not found");

  const dealer = await Dealer.findById(lp.dealerId);

  res.render("receipt/loan-payment.ejs", {
    lp,
    dealer,
    receiptId: pid,
  });
};

module.exports.settlementReceipt = async (req, res) => {
  const sid = req.params.settlementId;

  const st = await Settlement.findOne({
    $or: [{ settlementId: sid }, { reversedSettlementId: sid }],
  })
    .populate("cropPayments.cropId")
    .populate("loanPayments.loanId")
    .lean();

  if (!st) throw new Error("Settlement not found");

  const dealer = await Dealer.findById(st.dealerId);

  res.render("receipt/settlement.ejs", {
    st,
    dealer,
    receiptId: sid,
  });
};

function buildCropFilter(req) {
  const { farmerId, buyerId } = req.query;

  if (!farmerId && !buyerId) {
    throw new Error("Farmer or Buyer ID is required");
  }

  return {
    dealerId: req.user._id,
    ...(farmerId && {
      personType: "FARMER",
      personBusinessId: farmerId,
    }),
    ...(buyerId && {
      personType: "BUYER",
      personBusinessId: buyerId,
    }),
  };
}

module.exports.allCropsReceipt = async (req, res) => {
  const filter = buildCropFilter(req);

  const crops = await Crop.find(filter).sort({ date: 1 }).lean();
  const dealer = await Dealer.findById(req.user._id);

  res.render("receipt/crops.ejs", {
    dealer,
    crops,
    mode: "ALL",
    title: "All Crops Receipt",
    person: {
      type: crops[0]?.personType,
      name: crops[0]?.personName,
      businessId: crops[0]?.personBusinessId,
    },
  });
};

module.exports.pendingCropsReceipt = async (req, res) => {
  const filter = {
    ...buildCropFilter(req),
    paymentStatus: { $ne: "DONE" },
  };

  const crops = await Crop.find(filter).sort({ date: 1 }).lean();
  const dealer = await Dealer.findById(req.user._id);

  res.render("receipt/crops.ejs", {
    dealer,
    crops,
    mode: "PENDING",
    title: "Pending Crops Receipt",
    person: {
      type: crops[0]?.personType,
      name: crops[0]?.personName,
      businessId: crops[0]?.personBusinessId,
    },
  });
};

module.exports.paidCropsReceipt = async (req, res) => {
  const filter = {
    ...buildCropFilter(req),
    paymentStatus: "DONE",
  };

  const crops = await Crop.find(filter).sort({ date: 1 }).lean();
  const dealer = await Dealer.findById(req.user._id);

  res.render("receipt/crops.ejs", {
    dealer,
    crops,
    mode: "PAID",
    title: "Paid Crops Receipt",
    person: {
      type: crops[0]?.personType,
      name: crops[0]?.personName,
      businessId: crops[0]?.personBusinessId,
    },
  });
};

module.exports.allLoansReceipt = async (req, res) => {
  const dealerId = req.user._id;
  const { farmerId } = req.query;

  if (!farmerId) throw new Error("Farmer ID required");

  const loans = await Loan.find({
    dealerId,
    farmerBusinessId: farmerId,
  })
    .sort({ createdAt: 1 })
    .lean();

  const dealer = await Dealer.findById(dealerId);

  res.render("receipt/loans.ejs", {
    dealer,
    loans,
    title: "All Loans Receipt",
    mode: "ALL",
    person: {
      type: "FARMER",
      name: loans[0]?.personName,
      businessId: loans[0]?.farmerBusinessId,
    },
  });
};

module.exports.pendingLoansReceipt = async (req, res) => {
  const dealerId = req.user._id;
  const { farmerId } = req.query;

  if (!farmerId) throw new Error("Farmer ID required");

  const loans = await Loan.find({
    dealerId,
    farmerBusinessId: farmerId,
    status: { $ne: "FINISHED" },
  })
    .sort({ createdAt: 1 })
    .lean();

  const dealer = await Dealer.findById(dealerId);

  res.render("receipt/loans.ejs", {
    dealer,
    loans,
    title: "Pending Loans Receipt",
    mode: "PENDING",
    person: {
      type: "FARMER",
      name: loans[0]?.personName,
      businessId: loans[0]?.farmerBusinessId,
    },
  });
};

module.exports.paidLoansReceipt = async (req, res) => {
  const dealerId = req.user._id;
  const { farmerId } = req.query;

  if (!farmerId) throw new Error("Farmer ID required");

  const loans = await Loan.find({
    dealerId,
    farmerBusinessId: farmerId,
    status: "FINISHED",
  })
    .sort({ createdAt: 1 })
    .lean();

  const dealer = await Dealer.findById(dealerId);

  res.render("receipt/loans.ejs", {
    dealer,
    loans,
    title: "Paid Loans Receipt",
    mode: "PAID",
    person: {
      type: "FARMER",
      name: loans[0]?.personName,
      businessId: loans[0]?.farmerBusinessId,
    },
  });
};
