const Dealer = require("../models/dealer.model");
const Inventory = require("../models/inventory.model");
const LoanSummary = require("../models/loanSummary.model");
const nodemailer = require("nodemailer");

module.exports.renderProfile = async (req, res) => {
  const dealerId = req.user._id;

  const dealer = await Dealer.findById(dealerId);

  const inventories = await Inventory.find({ dealerId });

  const loanSummary = await LoanSummary.findOne({ dealerId });

  let totals = {
    totalBuy: 0,
    totalSell: 0,

    givePaid: 0,
    givePending: 0,

    receivePaid: 0,
    receivePending: 0,
  };

  inventories.forEach((inv) => {
    totals.totalBuy += inv.totalpaymentbuy;
    totals.totalSell += inv.totalpaymentsell;

    totals.givePaid += inv.paymentGivePaid;
    totals.givePending += inv.paymentGivePending;

    totals.receivePaid += inv.paymentReceivePaid;
    totals.receivePending += inv.paymentReceivePending;
  });

  const loan = loanSummary || {
    totalLoanGiven: 0,
    totalInterestAccrued: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  };

  const summary = {
    toPay: totals.givePending,
    toReceive: totals.receivePending + loan.totalPendingAmount,
    paid: totals.givePaid,
    received: totals.receivePaid + loan.totalPaidAmount,
  };

  res.render("dealer/profile.ejs", {
    dealer,
    totals,
    loan,
    summary,
  });
};

module.exports.sendOtp = async (req, res, next) => {
  try {
    const dealer = req.user;
    const { emailAppPassword } = req.body;

    if (dealer.emailVerified) {
      req.flash("success", "Email already verified");
      return res.redirect("/dealer/profile");
    }

    if (emailAppPassword) {
      dealer.emailAppPassword = emailAppPassword;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    dealer.emailOTP = otp;
    dealer.otpPurpose = "verify-email";
    dealer.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await dealer.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: dealer.emailSender,
        pass: dealer.emailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"Mandi App" <${dealer.emailSender}>`,
      to: dealer.email,
      subject: "Verify your email - Mandi App",
      html: `<h2>Your OTP is ${otp}</h2>`,
    });

    req.flash("success", "OTP sent to your email");
    res.redirect("/dealer/verify-otp");
  } catch (err) {
    next(err);
  }
};

module.exports.verifyOtpForm = (req, res) => {
  const dealer = req.user;

  res.render("dealer/verify-otp.ejs", {
    dealer,
  });
};

module.exports.verifyOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const dealer = req.user;

    if (
      dealer.otpPurpose !== "verify-email" ||
      dealer.emailOTP !== otp ||
      dealer.emailOTPExpires < Date.now()
    ) {
      req.flash("error", "Invalid or expired OTP");
      return res.redirect("/dealer/verify-otp");
    }

    dealer.emailVerified = true;
    dealer.emailOTP = undefined;
    dealer.emailOTPExpires = undefined;
    await dealer.save();

    req.flash("success", "Email verified successfully");
    res.redirect("/dealer/profile");
  } catch (err) {
    next(err);
  }
};

module.exports.resendOtp = async (req, res, next) => {
  try {
    const dealer = req.user;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    dealer.emailOTP = otp;
    dealer.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    await dealer.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: dealer.emailSender,
        pass: dealer.emailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"Mandi App" <${dealer.emailSender}>`,
      to: dealer.email,
      subject: "New OTP - Mandi App",
      html: `<h2>Your new OTP is ${otp}</h2>`,
    });

    req.flash("success", "New OTP sent");
    res.redirect("/dealer/verify-otp");
  } catch (err) {
    next(err);
  }
};

module.exports.changePasswordForm = (req, res) => {
  res.render("dealer/change-password.ejs", {
    dealer: req.user,
    isLoggedInUser: true,
  });
};

module.exports.forgotPasswordForm = (req, res) => {
  res.render("dealer/change-password.ejs", {
    dealer: null,
    isLoggedInUser: false,
  });
};

module.exports.sendPasswordOtp = async (req, res, next) => {
  try {
    let dealer;

    if (req.isAuthenticated()) {
      dealer = req.user;

      if (req.body.emailAppPassword) {
        dealer.emailAppPassword = req.body.emailAppPassword;
      }
    } else {
      const { email, emailAppPassword } = req.body;

      if (!email || !emailAppPassword) {
        req.flash("error", "Email and App Password are required");
        return res.redirect("/forgot-password");
      }

      dealer = await Dealer.findOne({ email });

      if (!dealer) {
        req.flash("error", "No account found with this email");
        return res.redirect("/forgot-password");
      }

      dealer.emailAppPassword = emailAppPassword;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    dealer.emailOTP = otp;
    dealer.emailOTPExpires = Date.now() + 10 * 60 * 1000;
    dealer.otpPurpose = "change-password";

    await dealer.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: dealer.emailSender,
        pass: dealer.emailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"Mandi App" <${dealer.emailSender}>`,
      to: dealer.email,
      subject: "OTP to change your Mandi password",
      html: `<h2>Your OTP is ${otp}</h2>`,
    });

    req.flash("success", "OTP sent to your email");

    return req.isAuthenticated()
      ? res.redirect("/dealer/change-password")
      : res.redirect("/dealer/forgot-password");
  } catch (err) {
    next(err);
  }
};

module.exports.verifyPasswordOtp = async (req, res, next) => {
  try {
    const { otp, newPassword, email } = req.body;

    let dealer = req.isAuthenticated()
      ? req.user
      : await Dealer.findOne({ email });

    if (!dealer) {
      req.flash("error", "Dealer not found");
      return res.redirect("/forgot-password");
    }

    if (
      dealer.otpPurpose !== "change-password" ||
      dealer.emailOTP !== otp ||
      dealer.emailOTPExpires < Date.now()
    ) {
      req.flash("error", "Invalid or expired OTP");
      return res.redirect(
        req.isAuthenticated() ? "/dealer/change-password" : "/forgot-password"
      );
    }

    await dealer.setPassword(newPassword);

    dealer.emailOTP = undefined;
    dealer.emailOTPExpires = undefined;
    dealer.otpPurpose = undefined;

    await dealer.save();

    req.flash("success", "Password changed successfully");

    res.redirect(req.isAuthenticated() ? "/dealer/profile" : "/login");
  } catch (err) {
    next(err);
  }
};
