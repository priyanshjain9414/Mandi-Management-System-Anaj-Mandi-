const mongoose = require("mongoose");
const Counter = require("./counter.model");

const farmerSchema = new mongoose.Schema(
  {
    farmerId: { type: String },
    name: { type: String, required: true },
    mobile: { type: Number, required: true },
    year: { type: Number, required: true },
    address: { type: String, required: true },
    village: { type: String, required: true },
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

farmerSchema.pre("save", async function () {
  if (!this.isNew) return;

  if (!this.dealerId) {
    throw new Error("Dealer ID is required to generate Farmer ID");
  }

  const counterId = `farmerId-${this.dealerId.toString()}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.farmerId = `FM-${counter.seq}`;
});

module.exports = mongoose.model("Farmer", farmerSchema);
