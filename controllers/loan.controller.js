const mongoose = require("mongoose");
const Farmer = require("../models/farmer.model");
const Loan = require("../models/loan.model");
const LoanPayment = require("../models/loanPayment.model");
const LoanSummary = require("../models/loanSummary.model");
const Settlement = require("../models/settlement.model");

module.exports.dashboard = (req, res) => {
  res.render("loan/ldash.ejs");
};

module.exports.newForm = async (req, res) => {
  const farmer = await Farmer.findOne({
    farmerId: req.params.farmerId,
    dealerId: req.user._id,
  });

  if (!farmer) {
    req.flash("error", "Farmer not found");
    return res.redirect("/farmer");
  }

  res.render("loan/lnew.ejs", { farmer });
};

module.exports.create = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      farmerId,
      farmerBusinessId,
      personName,
      loanAmount,
      interest,
      remark,
    } = req.body;

    if (!farmerId || !farmerBusinessId || !personName) {
      throw new Error("Invalid farmer details");
    }

    if (!loanAmount || !interest || !remark) {
      throw new Error("Missing loan details");
    }

    const amount = Number(loanAmount);
    const interestRate = Number(interest);

    let loanSummary = await LoanSummary.findOne({
      dealerId: req.user._id,
    }).session(session);

    if (!loanSummary) {
      loanSummary = new LoanSummary({ dealerId: req.user._id });
    }

    loanSummary.totalLoanGiven += amount;
    loanSummary.totalPayableAmount += amount;
    loanSummary.totalPendingAmount += amount;

    loanSummary.totalLoans += 1;
    loanSummary.ongoingLoans += 1;

    loanSummary.averageInterestRate =
      loanSummary.totalLoans > 0
        ? (loanSummary.averageInterestRate * (loanSummary.totalLoans - 1) +
            interestRate) /
          loanSummary.totalLoans
        : interestRate;

    loanSummary.lastUpdatedAt = new Date();
    await loanSummary.save({ session });

    const loan = new Loan({
      dealerId: req.user._id,
      farmerId,
      farmerBusinessId,
      personName,
      loanAmount: amount,
      interest: interestRate,
      pendingAmount: amount,
      remark,
      paidAmount: 0,
      summary: [
        {
          totalLoan: loanSummary.totalLoanGiven,
          averageInterest: loanSummary.averageInterestRate,
          totalInterest: loanSummary.totalInterestAccrued,
          totalAmount: loanSummary.totalPayableAmount,
          totalPaid: loanSummary.totalPaidAmount,
          totalPending: loanSummary.totalPendingAmount,
        },
      ],
    });

    await loan.save({ session });

    await session.commitTransaction();
    req.flash(
      "success",
      `Loan For (${personName}) with Id (${farmerBusinessId}) added successfully (${loan.loanId})`
    );

    res.redirect(`/loan/${loan.loanId}/ldetail`);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);

    req.flash("error", "Loan creation failed. No data was saved.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.pending = async (req, res) => {
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
    const loans = await Loan.find({
      dealerId: req.user._id,
      farmerBusinessId: farmer.farmerId,
    });

    const hasPendingLoan = loans.some((l) => l.status !== "FINISHED");

    const hasNoLoan = loans.length === 0;

    if (hasPendingLoan || hasNoLoan) {
      result.push(farmer);
    }
  }

  res.render("farmer/fpending.ejs", {
    farmers: result,
    search,
    type: "LOAN",
  });
};

module.exports.settled = async (req, res) => {
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
    const loans = await Loan.find({
      dealerId: req.user._id,
      farmerBusinessId: farmer.farmerId,
    });

    if (loans.length === 0) continue;

    const allFinished = loans.every((l) => l.status === "FINISHED");

    if (allFinished) {
      result.push(farmer);
    }
  }

  res.render("farmer/fsettled.ejs", {
    farmers: result,
    search,
    type: "LOAN",
  });
};

module.exports.farmerLoans = async (req, res) => {
  const { farmerId } = req.params;

  const farmer = await Farmer.findOne({ farmerId, dealerId: req.user._id });
  if (!farmer) {
    req.flash("error", "Farmer not found");
    return res.redirect("/farmer");
  }

  const loans = await Loan.find({
    farmerBusinessId: farmerId,
    dealerId: req.user._id,
  }).sort({ createdAt: -1 });

  const pendingLoans = loans.filter((l) => l.status !== "FINISHED");

  const settledLoans = loans.filter((l) => l.status === "FINISHED");

  const totalLoanAmount = loans.reduce((sum, l) => {
    return sum + (l.loanAmount || 0) + (l.interestAmount || 0);
  }, 0);

  const totalPaid = loans.reduce((sum, l) => sum + l.paidAmount, 0);

  const totalPending = loans.reduce((sum, l) => sum + l.pendingAmount, 0);

  const settledLoanSummary = settledLoans.reduce(
    (acc, loan) => {
      acc.totalLoanAmount += loan.loanAmount;
      acc.totalInterest += loan.interestAmount || 0;
      acc.totalPaid += loan.paidAmount;
      return acc;
    },
    {
      totalLoanAmount: 0,
      totalInterest: 0,
      totalPaid: 0,
    }
  );

  settledLoanSummary.totalAmount =
    settledLoanSummary.totalLoanAmount + settledLoanSummary.totalInterest;

  res.render("loan/ldashboard.ejs", {
    farmer,
    pendingLoans,
    settledLoans,
    totalLoanAmount,
    totalPaid,
    totalPending,
    settledLoanSummary,
  });
};

module.exports.paymentForm = async (req, res) => {
  const { loanIds, farmerId } = req.body;

  if (!loanIds || loanIds.length === 0) {
    req.flash("error", "Select at least one loan");
    return res.redirect(`/farmer/${farmerId}/loans`);
  }

  const farmer = await Farmer.findOne({ farmerId, dealerId: req.user._id });

  const loans = await Loan.find({
    _id: { $in: loanIds },
    dealerId: req.user._id,
  }).sort({ createdAt: 1 });

  res.render("loan/lpayment.ejs", {
    farmer,
    loans,
    farmerId,
  });
};

module.exports.payment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      farmerId,
      farmerName,
      farmerBusinessId,
      mode,
      amountReceived,
      payments,
    } = req.body;

    if (!payments || amountReceived <= 0) {
      throw new Error("Invalid payment");
    }

    const paymentArray = Array.isArray(payments)
      ? payments
      : Object.values(payments);

    const loanIds = paymentArray.map((p) => p.loanId);
    const loans = await Loan.find({
      _id: { $in: loanIds },
      dealerId: req.user._id,
    })
      .sort({
        createdAt: 1,
      })
      .session(session);

    let loanSummary = await LoanSummary.findOne({
      dealerId: req.user._id,
    }).session(session);

    if (!loanSummary) {
      loanSummary = new LoanSummary({ dealerId: req.user._id });
    }

    let remainingAmount = Number(amountReceived);
    let totalLoanAmount = 0;
    const paymentDetails = [];

    for (const loan of loans) {
      if (remainingAmount <= 0) break;

      const fromDate = loan.updatedAt || loan.createdAt;
      const days = Math.max(
        1,
        Math.ceil((Date.now() - new Date(fromDate)) / (1000 * 60 * 60 * 24))
      );

      const principalPending =
        loan.pendingAmount > 0 ? loan.pendingAmount : loan.loanAmount;

      const interestAmount = Math.round(
        (principalPending * loan.interest * days) / 36500
      );

      const totalPayable = principalPending + interestAmount;
      const pay = Math.min(totalPayable, remainingAmount);
      const pendingAfter = totalPayable - pay;

      loanSummary.totalPaidAmount += pay;
      loanSummary.totalPendingAmount = Math.max(
        0,
        loanSummary.totalPendingAmount + interestAmount - pay
      );
      loanSummary.totalInterestAccrued += interestAmount;
      loanSummary.totalPayableAmount += interestAmount;

      loanSummary.lastUpdatedAt = new Date();
      await loanSummary.save({ session });

      const summarySnapshot = {
        totalLoan: loanSummary.totalLoanGiven,
        averageInterest: loanSummary.averageInterestRate,
        totalInterest: loanSummary.totalInterestAccrued,
        totalAmount: loanSummary.totalPayableAmount,
        totalPaid: loanSummary.totalPaidAmount,
        totalPending: loanSummary.totalPendingAmount,
      };

      paymentDetails.push({
        loanId: loan._id,
        loanBusinessId: loan.loanId,
        loanAmount: loan.loanAmount,
        principalPendingBefore: principalPending,
        interestRate: loan.interest,
        periodIndays: days,
        interestAmount,
        totalPayableBefore: totalPayable,
        paidAmount: pay,
        pendingAmountAfter: pendingAfter,
        loanStatusAfter: pendingAfter === 0 ? "FINISHED" : "PARTIAL-FINISHED",
        summary: [summarySnapshot],
      });

      const previousStatus = loan.status;

      loan.paidAmount += pay;
      loan.pendingAmount = pendingAfter;
      loan.interestAmount += interestAmount;
      loan.periodIndays = days;
      loan.updatedAt = new Date();
      loan.status = pendingAfter === 0 ? "FINISHED" : "PARTIAL-FINISHED";

      await loan.save({ session });

      if (previousStatus !== "FINISHED" && loan.status === "FINISHED") {
        loanSummary.finishedLoans += 1;
        loanSummary.ongoingLoans = Math.max(0, loanSummary.ongoingLoans - 1);
        loanSummary.lastUpdatedAt = new Date();
      }

      await loanSummary.save({ session });
      totalLoanAmount += totalPayable;
      remainingAmount -= pay;
    }

    await LoanPayment.create(
      [
        {
          dealerId: req.user._id,
          farmerId,
          farmerName,
          farmerBusinessId,
          mode,
          payments: paymentDetails,
          totalLoanAmount,
          amountReceived,
          paidAmount: amountReceived - remainingAmount,
          pendingAmount: totalLoanAmount - amountReceived,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    req.flash("success", "Loan payment recorded successfully");
    res.redirect(`/farmer/${farmerBusinessId}/loans`);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);

    req.flash("error", "Loan payment failed. No data was saved.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.detail = async (req, res) => {
  const loan = await Loan.findOne({
    loanId: req.params.loanId,
    dealerId: req.user._id,
  });

  if (!loan) {
    req.flash("error", "Loan not found");
    return res.redirect("back");
  }

  const loanPayments = await LoanPayment.find({
    "payments.loanId": loan._id,
    dealerId: req.user._id,
  }).sort({ createdAt: -1 });

  const settlements = await Settlement.find({
    "loanPayments.loanId": loan._id,
    dealerId: req.user._id,
  }).sort({ createdAt: -1 });

  const normalizedSettlements = settlements.map((s) => ({
    _id: s._id,
    createdAt: s.createdAt,
    mode: "SETTLEMENT",
    isReversal: s.isReversal || false,
    reversedPaymentId: s.reversedSettlementId,
    paymentId: s.settlementId,
    payments: s.loanPayments,
  }));

  const payments = [...loanPayments, ...normalizedSettlements].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  res.render("loan/ldetail.ejs", {
    loan,
    payments,
  });
};

module.exports.delete = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const loan = await Loan.findOne({
      loanId: req.params.loanId,
      dealerId: req.user._id,
    }).session(session);

    if (!loan) {
      req.flash("error", "Loan not found");
      return res.redirect("back");
    }

    if (
      loan.paidAmount > 0 ||
      loan.interestAmount > 0 ||
      loan.status !== "ONGOING"
    ) {
      req.flash(
        "error",
        "Loan cannot be deleted once payment or interest has started"
      );
      return res.redirect("back");
    }

    const loanSummary = await LoanSummary.findOne({
      dealerId: req.user._id,
    }).session(session);

    if (!loanSummary) {
      throw new Error("Loan summary not found");
    }

    loanSummary.totalLoanGiven -= loan.loanAmount;
    loanSummary.totalPayableAmount -= loan.loanAmount;
    loanSummary.totalPendingAmount -= loan.loanAmount;

    loanSummary.totalLoans -= 1;
    loanSummary.ongoingLoans = Math.max(0, loanSummary.ongoingLoans - 1);

    if (loanSummary.totalLoans > 0) {
      const remainingLoans = await Loan.find({
        dealerId: req.user._id,
        _id: { $ne: loan._id },
      }).session(session);

      const totalInterestRate = remainingLoans.reduce(
        (sum, l) => sum + l.interest,
        0
      );

      loanSummary.averageInterestRate =
        totalInterestRate / remainingLoans.length;
    } else {
      loanSummary.averageInterestRate = 0;
    }

    loanSummary.lastUpdatedAt = new Date();
    await loanSummary.save({ session });

    await Loan.deleteOne({ _id: loan._id }, { session });

    await session.commitTransaction();

    req.flash("success", "Loan deleted successfully");
    res.redirect(`/farmer/${loan.farmerBusinessId}/loans`);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    req.flash("error", err.message || "Loan delete failed");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.reverseLoanPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const original = await LoanPayment.findOne({
      paymentId: req.params.paymentId,
      dealerId: req.user._id,
      isReversal: false,
    }).session(session);

    if (!original) throw new Error("Original payment not found");

    const alreadyReversed = await LoanPayment.exists({
      paymentId: original.paymentId,
      isReversal: true,
      dealerId: req.user._id,
    });

    if (alreadyReversed) throw new Error("Payment already reversed");

    const usedInSettlement = await Settlement.exists({
      dealerId: req.user._id,
      "loanPayments.paymentId": original.paymentId,
    });

    if (usedInSettlement)
      throw new Error("Payment used in settlement. Cannot reverse.");

    const reversalPayments = [];

    let totalPendingBefore = 0;
    let totalReversedAmount = 0;
    let pending = 0;

    const loanSummary = await LoanSummary.findOne({
      dealerId: req.user._id,
    }).session(session);

    for (const p of original.payments) {
      pending += p.principalPendingBefore;
      totalPendingBefore += p.totalPayableBefore;
      totalReversedAmount += p.paidAmount;

      const loan = await Loan.findById(p.loanId).session(session);
      if (!loan) continue;

      const amt = Math.abs(p.paidAmount);

      loan.paidAmount -= amt;
      loan.pendingAmount = p.principalPendingBefore;
      loan.interestAmount -= p.interestAmount;

      loan.status = loan.pendingAmount === 0 ? "FINISHED" : "PARTIAL-FINISHED";

      const wasFinished = p.loanStatusAfter === "FINISHED";
      const isNowFinished = loan.pendingAmount === 0;

      await loan.save({ session });

      if (loanSummary && wasFinished && !isNowFinished) {
        loanSummary.finishedLoans -= 1;
        loanSummary.ongoingLoans += 1;
      }

      if (loanSummary) {
        loanSummary.totalPaidAmount -= amt;
        loanSummary.totalPendingAmount += amt - p.interestAmount;
        loanSummary.totalInterestAccrued -= p.interestAmount;
        loanSummary.totalPayableAmount -= p.interestAmount;
      }

      reversalPayments.push({
        ...p.toObject(),
        paidAmount: -amt,
        pendingAmountAfter: p.principalPendingBefore,
        loanStatusAfter: "REVERSED",

        summary: [
          {
            totalLoan: loanSummary.totalLoanGiven,
            averageInterest: loanSummary.averageInterestRate,
            totalInterest: loanSummary.totalInterestAccrued,
            totalAmount: loanSummary.totalPayableAmount,
            totalPaid: loanSummary.totalPaidAmount,
            totalPending: loanSummary.totalPendingAmount,
          },
        ],
      });
    }

    if (loanSummary) {
      loanSummary.lastUpdatedAt = new Date();
      await loanSummary.save({ session });
    }

    await LoanPayment.create(
      [
        {
          dealerId: req.user._id,
          farmerId: original.farmerId,
          farmerName: original.farmerName,
          farmerBusinessId: original.farmerBusinessId,
          mode: original.mode,

          isReversal: true,
          paymentId: original.paymentId,

          totalLoanAmount: totalPendingBefore - totalReversedAmount,
          amountReceived: totalReversedAmount,
          paidAmount: totalReversedAmount,
          pendingAmount: pending,

          payments: reversalPayments,
          status: "DONE",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    req.flash("success", "Loan payment reversed successfully");

    res.redirect(`/farmer/${original.farmerBusinessId}/transaction`);
  } catch (err) {
    await session.abortTransaction();
    req.flash("error", err.message);
    res.redirect("back");
  } finally {
    session.endSession();
  }
};
