const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const dealerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    shopNo: { type: String, required: true },
    firmName: { type: String, required: true },
    contactNumber1: { type: Number, required: true },
    contactNumber2: { type: Number, required: true },
    email: { type: String, unique: true, required: true },

    emailSender: { type: String, required: true },
    emailAppPassword: { type: String, required: true },

    gstNo: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: Number, required: true },

    emailVerified: { type: Boolean, default: false },
    emailOTP: String,
    emailOTPExpires: Date,
    otpPurpose: {
      type: String,
      enum: ["verify-email", "change-password"],
    },
  },
  { timestamps: true }
);

const plugin = passportLocalMongoose.default || passportLocalMongoose;

dealerSchema.plugin(plugin, {
  usernameField: "email",
  usernameUnique: false,
});

module.exports = mongoose.model("Dealer", dealerSchema);
