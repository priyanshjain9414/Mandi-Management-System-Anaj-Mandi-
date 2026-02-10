const mongoose = require("mongoose");
const Counter = require("./counter.model");

const buyerSchema = new mongoose.Schema(
  {
    buyerId: { type: String },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    year: { type: Number, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: Number, required: true },
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

buyerSchema.index({ dealerId: 1, buyerId: 1 }, { unique: true });

buyerSchema.pre("save", async function () {
  if (!this.isNew) return;

  if (!this.dealerId) {
    throw new Error("Dealer ID is required to generate Buyer ID");
  }

  const counterId = `buyerId-${this.dealerId.toString()}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.buyerId = `BR-${counter.seq}`;
});

module.exports = mongoose.model("Buyer", buyerSchema);
