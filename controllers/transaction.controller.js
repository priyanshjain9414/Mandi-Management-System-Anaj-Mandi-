const CropPayment = require("../models/cropPayment.model");
const LoanPayment = require("../models/loanPayment.model");
const Settlement = require("../models/settlement.model");

module.exports.farmerTransactions = async (req, res) => {
  const { farmerBusinessId } = req.params;
  const { view, search, status, fromDate, toDate } = req.query;

  const timeline = [];
  const dealerId = req.user._id;

  const dateFilter = {};
  if (fromDate) dateFilter.$gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }

  if (!view || view === "LOAN") {
    const loanQuery = { farmerBusinessId, dealerId };
    if (status) loanQuery.status = status;
    if (Object.keys(dateFilter).length) loanQuery.createdAt = dateFilter;

    const loanPayments = await LoanPayment.find(loanQuery).lean();

    loanPayments.forEach((lp) => {
      timeline.push({
        type: "LOAN",
        date: lp.createdAt,
        isReversal: lp.isReversal,
        reversedPaymentId: lp.reversedPaymentId,
        status: lp.status,
        payId: lp.paymentId,

        loanIds: lp.payments.map((p) => p.loanBusinessId),

        totalLoanAmount: lp.totalLoanAmount,
        amountReceived: lp.amountReceived,
        amountPaid: lp.paidAmount,
        amountPending: lp.pendingAmount,

        link: `/loan/payment/${lp.paymentId}`,
        link1: `/loan/payment/${lp.reversedPaymentId}`,
      });
    });
  }

  if (!view || view === "CROP") {
    const cropQuery = {
      dealerId,
      personBusinessId: farmerBusinessId,
      personType: "FARMER",
    };
    if (status) cropQuery.status = status;
    if (Object.keys(dateFilter).length) cropQuery.createdAt = dateFilter;

    const cropPayments = await CropPayment.find(cropQuery).lean();

    cropPayments.forEach((cp) => {
      timeline.push({
        type: "CROP",
        date: cp.createdAt,
        isReversal: cp.isReversal,
        reversedPaymentId: cp.reversedPaymentId,
        status: cp.status,
        payId: cp.paymentId,

        cropIds: cp.payments.map((p) => p.cropBusinessId),

        totalCropAmount: cp.totalCropAmount,
        amountPaid: cp.amountPaid,
        amountPending: cp.pendingAmount,

        link: `/crop/payment/${cp.paymentId}`,
        link1: `/crop/payment/${cp.reversedPaymentId}`,
      });
    });
  }

  if (!view || view === "SETTLEMENT") {
    const settlementQuery = { farmerBusinessId, dealerId };
    if (status) settlementQuery.status = status;
    if (Object.keys(dateFilter).length) settlementQuery.createdAt = dateFilter;
    const settlements = await Settlement.find(settlementQuery).lean();

    settlements.forEach((st) => {
      timeline.push({
        type: "SETTLEMENT",
        date: st.createdAt,
        isReversal: st.isReversal,
        reversedPaymentId: st.reversedSettlementId,
        status: st.status,
        payId: st.settlementId,

        cropIds: st.cropPayments.map((p) => p.cropBusinessId),
        loanIds: st.loanPayments.map((p) => p.loanBusinessId),

        totalLoanAmount: st.totalLoanAmount,
        totalCropAmount: st.totalCropAmount,
        netAmount: st.netAmount,
        settlementDirection: st.settlementDirection,
        amountPaid: st.paidAmount,
        amountPending: st.pendingAmount,

        link: `/settlement/${st.settlementId}/detail`,
        link1: `/settlement/${st.reversedSettlementId}/detail`,
      });
    });
  }
  if (search) {
    timeline = timeline.filter((tx) =>
      tx.payId.toLowerCase().includes(search.toLowerCase())
    );
  }

  timeline.sort((a, b) => b.date - a.date);

  res.render("transaction/flist.ejs", {
    timeline,
    view,
    search,
    status,
    fromDate,
    toDate,
  });
};

module.exports.buyerTransactions = async (req, res) => {
  const { buyerBusinessId } = req.params;
  const { search, status, fromDate, toDate } = req.query;
  const dealerId = req.user._id;

  let timeline = [];

  const dateFilter = {};
  if (fromDate) dateFilter.$gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }

  const cropQuery = {
    dealerId,
    personBusinessId: buyerBusinessId,
    personType: "BUYER",
  };
  if (status) cropQuery.status = status;
  if (Object.keys(dateFilter).length) cropQuery.createdAt = dateFilter;

  const cropPayments = await CropPayment.find(cropQuery).lean();

  cropPayments.forEach((cp) => {
    timeline.push({
      type: "CROP",
      date: cp.createdAt,
      isReversal: cp.isReversal,
      reversedPaymentId: cp.reversedPaymentId,
      status: cp.status,
      payId: cp.paymentId,

      cropIds: cp.payments.map((p) => p.cropBusinessId),

      totalCropAmount: cp.totalCropAmount,
      amountPaid: cp.amountPaid,
      amountPending: cp.pendingAmount,

      link: `/crop/payment/${cp.paymentId}`,
      link1: `/crop/payment/${cp.reversedPaymentId}`,
    });
  });

  if (search && search.trim() !== "") {
    const s = search.trim().toLowerCase();
    timeline = timeline.filter((tx) => tx.payId?.toLowerCase().includes(s));
  }

  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.render("transaction/blist.ejs", {
    timeline,
    search,
    status,
    fromDate,
    toDate,
    view: null,
  });
};

module.exports.cropPaymentDetail = async (req, res) => {
  const cp = await CropPayment.findOne({
    dealerId: req.user._id,
    $or: [
      { paymentId: req.params.paymentId },
      { reversedPaymentId: req.params.paymentId },
    ],
  })
    .populate("payments.cropId")
    .lean();

  if (!cp) {
    req.flash("error", "Crop payment not found");
    return res.redirect("back");
  }

  res.render("transaction/cpay.ejs", { cp });
};

module.exports.loanPaymentDetail = async (req, res) => {
  const lp = await LoanPayment.findOne({
    dealerId: req.user._id,
    $or: [
      { paymentId: req.params.paymentId },
      { reversedPaymentId: req.params.paymentId },
    ],
  })
    .populate("payments.loanId")
    .lean();

  if (!lp) {
    req.flash("error", "Loan payment not found");
    return res.redirect("back");
  }

  res.render("transaction/lpay.ejs", { lp });
};

module.exports.settlementDetail = async (req, res) => {
  const st = await Settlement.findOne({
    dealerId: req.user._id,
    $or: [
      { settlementId: req.params.settlementId },
      { reversedSettlementId: req.params.settlementId },
    ],
  })
    .populate("cropPayments.cropId")
    .populate("loanPayments.loanId")
    .lean();

  if (!st) {
    req.flash("error", "Settlement not found");
    return res.redirect("back");
  }

  res.render("transaction/spay.ejs", { st });
};
