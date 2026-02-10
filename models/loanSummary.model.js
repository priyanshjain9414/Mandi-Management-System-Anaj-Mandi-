const mongoose = require("mongoose");

const loanSummarySchema = new mongoose.Schema(
  {
    totalLoanGiven: {
      type: Number,
      default: 0,
    },

    totalInterestAccrued: {
      type: Number,
      default: 0,
    },

    totalPayableAmount: {
      type: Number,
      default: 0,
    },

    totalPaidAmount: {
      type: Number,
      default: 0,
    },

    totalPendingAmount: {
      type: Number,
      default: 0,
    },

    averageInterestRate: {
      type: Number,
      default: 0,
    },

    totalLoans: {
      type: Number,
      default: 0,
    },

    ongoingLoans: {
      type: Number,
      default: 0,
    },

    finishedLoans: {
      type: Number,
      default: 0,
    },

    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      index: true,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoanSummary", loanSummarySchema);
