const mongoose = require("mongoose");
const Counter = require("./counter.model");

const CROP_TYPES = [
  "MUSTARD",
  "SOYBEAN",
  "GROUNDNUT",
  "SUNFLOWER",
  "SESAME",
  "LINSEED",
  "WHEAT",
  "RICE",
  "MAIZE",
  "BARLEY",
  "JOWAR",
  "BAJRA",
  "RAGI",
  "GRAM",
  "ARHAR",
  "MOONG",
  "URAD",
  "MASOOR",
  "PEAS",
  "SUGARCANE",
  "COTTON",
  "TOBACCO",
  "JUTE",
];

const PERSON_TYPES = ["FARMER", "BUYER"];

const cropSchema = new mongoose.Schema({
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealer",
    required: true,
    index: true,
  },

  personType: {
    type: String,
    enum: PERSON_TYPES,
    required: true,
  },

  personRefId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "personType",
  },

  personBusinessId: {
    type: String,
    required: true,
    index: true,
  },

  personName: {
    type: String,
    required: true,
  },

  cropType: {
    type: String,
    enum: CROP_TYPES,
    required: true,
  },

  cropId: {
    type: String,
  },

  quantity: {
    type: Number,
    required: true,
  },

  noOfGunny: {
    type: Number,
  },

  gunnyQuantity: {
    type: Number,
  },

  labourCharges: {
    type: Number,
    required: true,
  },

  transportCharges: {
    type: Number,
    required: true,
  },

  otherCharges: {
    type: Number,
    required: true,
  },

  grade: {
    type: String,
    enum: ["A", "B", "C", "D", "E"],
    required: true,
  },

  pricePerQuintal: {
    type: Number,
    required: true,
  },

  totalAmount: {
    type: Number,
  },
  paidAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["DONE", "NOT-DONE", "PARTIAL-DONE"],
    default: "NOT-DONE",
  },

  date: {
    type: Date,
    default: Date.now,
  },
  inventory: [
    {
      totalQuantity: {
        type: Number,
        required: true,
      },
      inStockGunny: {
        type: Number,
        default: 0,
      },
      gunnyQuantity: {
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
});

cropSchema.pre("save", async function () {
  this.totalAmount = this.quantity * this.pricePerQuintal;
  this.pendingAmount = this.totalAmount - (this.paidAmount || 0);

  if (!this.paidAmount || this.paidAmount === 0) {
    this.paymentStatus = "NOT-DONE";
  } else if (this.pendingAmount === 0) {
    this.paymentStatus = "DONE";
  } else {
    this.paymentStatus = "PARTIAL-DONE";
  }

  if (this.isNew) {
    const counterId = `CROP-${this.dealerId}-${this.personType}-${this.personBusinessId}-${this.cropType}`;

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.cropId = `CR-${this.personBusinessId}-${this.cropType}-${counter.seq}`;
  }
});

module.exports = mongoose.model("Crop", cropSchema);
