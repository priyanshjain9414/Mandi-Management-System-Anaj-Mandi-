const mongoose = require("mongoose");
const Counter = require("./counter.model");

const cropPaymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
    },

    personType: {
      type: String,
      enum: ["FARMER", "BUYER"],
      required: true,
    },

    personId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "personType",
    },

    personName: {
      type: String,
      required: true,
    },

    personBusinessId: {
      type: String,
      required: true,
    },

    mode: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    payments: [
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

    totalCropAmount: {
      type: Number,
      default: 0,
    },

    amountPaid: {
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
    isReversal: {
      type: Boolean,
      default: false,
      index: true,
    },

    reversedPaymentId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

cropPaymentSchema.pre("save", async function () {
  if (this.pendingAmount === 0) {
    this.status = "DONE";
  } else {
    this.status = "PARTIAL-DONE";
  }

  if (!this.isNew) return;

  const counterType = this.isReversal ? "REV" : "PAY";

  const counterId = `${counterType}-${this.dealerId}-${this.personBusinessId}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (!this.isReversal) {
    this.paymentId = `PAY-${this.personBusinessId}-CR-${counter.seq}`;
  }

  if (this.isReversal) {
    this.reversedPaymentId = `REV-${this.personBusinessId}-CR-${counter.seq}`;
  }
});

module.exports = mongoose.model("CropPayment", cropPaymentSchema);
