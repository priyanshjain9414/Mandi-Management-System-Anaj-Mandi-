const mongoose = require("mongoose");
const Counter = require("./counter.model");

const loanSchema = new mongoose.Schema(
  {
    loanId: { type: String },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    farmerBusinessId: { type: String, required: true, index: true },
    personName: { type: String, required: true },
    loanAmount: { type: Number, required: true },
    interest: { type: Number, required: true },
    periodIndays: { type: Number, default: 0 },
    interestAmount: { type: Number, default: 0 },
    calculatedAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    remark: { type: String, required: true },
    status: {
      type: String,
      enum: ["ONGOING", "FINISHED", "PARTIAL-FINISHED"],
      default: "ONGOING",
    },
    updatedAt: { type: Date, default: Date.now },
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
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

loanSchema.pre("save", async function () {
  if (this.paidAmount === 0) {
    this.status = "ONGOING";
  } else if (this.pendingAmount === 0) {
    this.status = "FINISHED";
  } else {
    this.status = "PARTIAL-FINISHED";
  }

  if (!this.isNew) return;

  const counterId = `LOAN-${this.dealerId}-${this.farmerBusinessId}`;

  const counter = await Counter.findByIdAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.loanId = `LN-${this.farmerBusinessId}-${counter.seq}`;
});

module.exports = mongoose.model("Loan", loanSchema);
