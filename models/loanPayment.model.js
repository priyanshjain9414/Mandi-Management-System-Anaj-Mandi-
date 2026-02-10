const mongoose = require("mongoose");
const Counter = require("./counter.model");

const loanPaymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
    },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
    farmerName: { type: String, required: true },
    farmerBusinessId: { type: String, required: true, index: true },
    mode: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    payments: [
      {
        loanId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Loan",
          required: true,
        },

        loanBusinessId: {
          type: String,
          required: true,
        },

        loanAmount: { type: Number, required: true },

        principalPendingBefore: {
          type: Number,
          required: true,
        },

        interestRate: {
          type: Number,
          required: true,
        },

        periodIndays: {
          type: Number,
          required: true,
        },

        interestAmount: {
          type: Number,
          required: true,
        },

        totalPayableBefore: {
          type: Number,
          required: true,
        },

        paidAmount: {
          type: Number,
          required: true,
        },

        pendingAmountAfter: {
          type: Number,
          required: true,
        },

        loanStatusAfter: {
          type: String,
          enum: ["PARTIAL-FINISHED", "FINISHED", "REVERSED"],
          required: true,
        },
        summary: [
          {
            totalLoan: {
              type: Number,
              required: true,
            },
            averageInterest: {
              type: Number,
              required: true,
            },
            totalInterest: {
              type: Number,
              required: true,
            },
            totalAmount: {
              type: Number,
              required: true,
            },
            totalPaid: {
              type: Number,
              required: true,
            },
            totalPending: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
    totalLoanAmount: { type: Number, required: true },
    amountReceived: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["DONE", "PARTIAL-DONE"],
      default: "PARTIAL-DONE",
    },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
    isReversal: { type: Boolean, default: false, index: true },
    reversedPaymentId: { type: String, index: true },
  },
  { timestamps: true }
);

loanPaymentSchema.pre("save", async function () {
  if (this.pendingAmount === 0) {
    this.status = "DONE";
  } else {
    this.status = "PARTIAL-DONE";
  }

  if (!this.isNew) return;

  const counterType = this.isReversal ? "REV" : "PAY";

  const counterId = `${counterType}-${this.dealerId}-${this.farmerBusinessId}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (!this.isReversal) {
    this.paymentId = `PAY-${this.farmerBusinessId}-LN-${counter.seq}`;
  }

  if (this.isReversal) {
    this.reversedPaymentId = `REV-${this.farmerBusinessId}-LN-${counter.seq}`;
  }
});

module.exports = mongoose.model("LoanPayment", loanPaymentSchema);
