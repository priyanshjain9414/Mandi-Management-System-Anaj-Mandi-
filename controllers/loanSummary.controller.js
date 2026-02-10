const Loan = require("../models/loan.model");
const LoanPayment = require("../models/loanPayment.model");
const LoanSummary = require("../models/loanSummary.model");
const Settlement = require("../models/settlement.model");

function getLastSummary(summaryArray) {
  if (!Array.isArray(summaryArray) || summaryArray.length === 0) {
    return {
      totalLoan: 0,
      averageInterest: 0,
      totalInterest: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
    };
  }
  return summaryArray[summaryArray.length - 1];
}

module.exports.dashboard = async (req, res) => {
  let summary = await LoanSummary.findOne({ dealerId: req.user._id });

  if (!summary) {
    summary = await LoanSummary.create({ dealerId: req.user._id });
  }

  res.render("lsummary/detail.ejs", { summary });
};

module.exports.list = async (req, res) => {
  const { search, status, fromDate, toDate, view } = req.query;

  const query = {};

  if (status) query.status = status;

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    query.$or = [
      { loanId: { $regex: search, $options: "i" } },
      { personName: { $regex: search, $options: "i" } },
      { farmerBusinessId: { $regex: search, $options: "i" } },
    ];
  }

  const loans = await Loan.find({
    dealerId: req.user._id,
    ...query,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.render("lsummary/list.ejs", {
    loans,
    search,
    status,
    fromDate,
    toDate,
    view,
  });
};

module.exports.transaction = async (req, res) => {
  const { search, status, fromDate, toDate, view } = req.query;
  const viewMode = view || "";

  const timeline = [];

  const loanQuery = {};

  if (status) {
    loanQuery.status = status;
  }

  if (fromDate || toDate) {
    loanQuery.createdAt = {};
    if (fromDate) loanQuery.createdAt.$gte = new Date(fromDate);
    if (toDate) loanQuery.createdAt.$lte = new Date(toDate);
  }

  if (search) {
    loanQuery.$or = [
      { loanId: new RegExp(search, "i") },
      { personName: new RegExp(search, "i") },
      { farmerBusinessId: new RegExp(search, "i") },
    ];
  }

  const loans = await Loan.find({
    dealerId: req.user._id,
    ...loanQuery,
  }).lean();

  loans.forEach((loan) => {
    if (!viewMode || viewMode === "LOAN") {
      const loanSnapshot = getLastSummary(loan.summary);

      timeline.push({
        type: "LOAN",
        isReversal: false,
        date: loan.createdAt,
        left: {
          loanId: loan.loanId,
          farmer: loan.personName,
          farmerId: loan.farmerBusinessId,
          loanAmount: loan.loanAmount,
          interestRate: loan.interest,
          status: loan.status,
        },
        right: {
          totalLoan: loanSnapshot.totalLoan,
          averageInterest: loanSnapshot.averageInterest,
          totalInterest: loanSnapshot.totalInterest,
          totalAmount: loanSnapshot.totalAmount,
          totalPaid: loanSnapshot.totalPaid,
          totalPending: loanSnapshot.totalPending,
        },
      });
    }
  });

  const payments = await LoanPayment.find({ dealerId: req.user._id }).lean();

  payments.forEach((paymentDoc) => {
    if (fromDate && paymentDoc.date < new Date(fromDate)) return;
    if (toDate && paymentDoc.date > new Date(toDate)) return;

    paymentDoc.payments.forEach((tx) => {
      if (status && tx.loanStatusAfter !== status) return;

      if (!viewMode || viewMode === "PAYMENT") {
        const paymentSnapshot = getLastSummary(tx.summary);

        timeline.push({
          type: "PAYMENT",
          isReversal: paymentDoc.isReversal,
          reversedPaymentId: paymentDoc.reversedPaymentId,
          date: paymentDoc.date,
          paymentId: paymentDoc.isReversal
            ? paymentDoc.reversedPaymentId
            : paymentDoc.paymentId,
          left: {
            loanId: tx.loanBusinessId,
            farmer: paymentDoc.farmerName,
            farmerId: paymentDoc.farmerBusinessId,
            loanAmount: tx.loanAmount,
            paidAmount: tx.paidAmount,
            interestAmount: tx.interestAmount,
            pendingBefore: tx.principalPendingBefore,
            pendingAfter: tx.pendingAmountAfter,
            status: tx.loanStatusAfter,
          },
          right: {
            totalLoan: paymentSnapshot.totalLoan,
            averageInterest: paymentSnapshot.averageInterest,
            totalInterest: paymentSnapshot.totalInterest,
            totalAmount: paymentSnapshot.totalAmount,
            totalPaid: paymentSnapshot.totalPaid,
            totalPending: paymentSnapshot.totalPending,
          },
        });
      }
    });
  });

  const settlements = await Settlement.find({ dealerId: req.user._id }).lean();

  if (!viewMode || viewMode === "PAYMENT") {
    settlements.forEach((st) => {
      if (fromDate && st.createdAt < new Date(fromDate)) return;
      if (toDate && st.createdAt > new Date(toDate)) return;

      st.loanPayments.forEach((tx) => {
        if (status && tx.loanStatusAfter !== status) return;
        if (
          search &&
          !tx.loanBusinessId.match(new RegExp(search, "i")) &&
          !st.farmerName.match(new RegExp(search, "i"))
        )
          return;

        const paymentSnapshot = getLastSummary(tx.summary);

        timeline.push({
          type: "SETTLEMENT",
          isReversal: st.isReversal,
          reversedPaymentId: st.reversedSettlementId,
          paymentId: st.isReversal ? st.reversedSettlementId : st.settlementId,
          date: st.createdAt,
          left: {
            loanId: tx.loanBusinessId,
            farmer: st.farmerName,
            farmerId: st.farmerBusinessId,
            loanAmount: tx.loanAmount,
            paidAmount: tx.paidAmount,
            interestAmount: tx.interestAmount,
            pendingBefore: tx.principalPendingBefore,
            pendingAfter: tx.pendingAmountAfter,
            status: tx.loanStatusAfter,
            settlementDirection: st.settlementDirection,
          },
          right: {
            totalLoan: paymentSnapshot.totalLoan,
            averageInterest: paymentSnapshot.averageInterest,
            totalInterest: paymentSnapshot.totalInterest,
            totalAmount: paymentSnapshot.totalAmount,
            totalPaid: paymentSnapshot.totalPaid,
            totalPending: paymentSnapshot.totalPending,
          },
        });
      });
    });
  }

  timeline.sort((a, b) => b.date - a.date);

  res.render("lsummary/transaction.ejs", {
    timeline,
    search,
    status,
    fromDate,
    toDate,
    view: viewMode,
  });
};
