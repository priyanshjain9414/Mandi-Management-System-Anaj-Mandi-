const mongoose = require("mongoose");
const Counter = require("./counter.model");

const settlementSchema = new mongoose.Schema(
  {
    settlementId: {
      type: String,
    },

    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },

    farmerName: {
      type: String,
      required: true,
    },

    farmerBusinessId: {
      type: String,
      required: true,
    },

    cropPayments: [
      {
        cropId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Crop",
          required: true,
        },

        cropBusinessId: { type: String, required: true },
        cropType: { type: String, required: true },

        quantity: {
          type: Number,
          required: true,
        },
        pricePerQuintal: {
          type: Number,
          required: true,
        },

        totalAmount: { type: Number, required: true },

        pendingBefore: { type: Number, required: true },
        paidAmount: { type: Number, required: true },
        pendingAfter: { type: Number, required: true },

        statusAfter: {
          type: String,
          enum: ["DONE", "PARTIAL-DONE", "REVERSED"],
        },

        inventory: [
          {
            totalQuantity: {
              type: Number,
              required: true,
            },
            averageBuyPrice: {
              type: Number,
              required: true,
            },
            averageSellPrice: {
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

    loanPayments: [
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

    totalCropAmount: {
      type: Number,
      default: 0,
      required: true,
    },

    totalLoanAmount: {
      type: Number,
      default: 0,
      required: true,
    },

    netAmount: {
      type: Number,
      default: 0,
      required: true,
    },

    settlementDirection: {
      type: String,
      enum: ["DEALER_TO_FARMER", "FARMER_TO_DEALER", "SETTLED"],
      default: "SETTLED",
      required: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      required: true,
    },

    pendingAmount: {
      type: Number,
      default: 0,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
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
    reversedSettlementId: { type: String, index: true },
  },
  { timestamps: true }
);

settlementSchema.pre("save", async function () {
  if (this.netAmount > 0) {
    this.settlementDirection = "DEALER_TO_FARMER";
  } else if (this.netAmount < 0) {
    this.settlementDirection = "FARMER_TO_DEALER";
  } else {
    this.settlementDirection = "SETTLED";
  }

  this.pendingAmount = Math.abs(this.netAmount) - this.paidAmount;

  if (this.pendingAmount === 0) {
    this.status = "DONE";
  } else {
    this.status = "PARTIAL-DONE";
  }

  if (!this.isNew) return;

  const counterType = this.isReversal ? "REV-SETL" : "SETL";

  const counterId = `${counterType}-${this.dealerId}-${this.farmerBusinessId}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (!this.isReversal) {
    this.settlementId = `SETL-${this.farmerBusinessId}-${counter.seq}`;
  }

  if (this.isReversal) {
    this.reversedSettlementId = `REV-SETL-${this.farmerBusinessId}-${counter.seq}`;
  }
});

module.exports = mongoose.model("Settlement", settlementSchema);
