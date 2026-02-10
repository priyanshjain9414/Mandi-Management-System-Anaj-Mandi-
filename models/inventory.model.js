const mongoose = require("mongoose");

const cropInventorySchema = new mongoose.Schema(
  {
    inventoryId: {
      type: String,
    },
    cropName: {
      type: String,
      required: true,
    },

    gunnyQuantity: {
      type: Number,
      default: 0,
    },

    buyGunny: {
      type: Number,
      default: 0,
    },

    sellGunny: {
      type: Number,
      default: 0,
    },

    inStockGunny: {
      type: Number,
      default: 0,
    },

    labourCharges: {
      type: Number,
      default: 0,
    },

    transportCharges: {
      type: Number,
      default: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
    },

    totalInStock: {
      type: Number,
      default: 0,
    },

    totalBuyQuantity: {
      type: Number,
      default: 0,
    },

    totalSellQuantity: {
      type: Number,
      default: 0,
    },

    averageBuyPrice: {
      type: Number,
      default: 0,
    },

    averageSellPrice: {
      type: Number,
      default: 0,
    },

    totalpaymentbuy: {
      type: Number,
      default: 0,
    },

    totalpaymentsell: {
      type: Number,
      default: 0,
    },

    paymentReceivePaid: {
      type: Number,
      default: 0,
    },

    paymentReceivePending: {
      type: Number,
      default: 0,
    },

    paymentGivePaid: {
      type: Number,
      default: 0,
    },

    paymentGivePending: {
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
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

cropInventorySchema.index({ dealerId: 1, cropName: 1 }, { unique: true });

cropInventorySchema.pre("save", function () {
  if (this.isNew && !this.inventoryId) {
    this.inventoryId = `CR-${this.cropName.toUpperCase()}`;
  }
});

module.exports = mongoose.model("Inventory", cropInventorySchema);
