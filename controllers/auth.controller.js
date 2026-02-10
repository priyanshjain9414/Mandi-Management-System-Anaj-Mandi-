const Dealer = require("../models/dealer.model");
const nodemailer = require("nodemailer");

module.exports.home = (req, res) => {
  res.render("home.ejs");
};

module.exports.dashboard = (req, res) => {
  res.render("dashboard.ejs");
};

module.exports.signupForm = (req, res) => {
  res.render("dealer/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
  try {
    const {
      name,
      shopNo,
      firmName,
      contactNumber1,
      contactNumber2,
      email,
      emailSender,
      emailAppPassword,
      gstNo,
      address,
      city,
      state,
      zip,
      security,
    } = req.body;

    const dealer = new Dealer({
      name,
      shopNo,
      firmName,
      contactNumber1,
      contactNumber2,
      email,
      emailSender,
      emailAppPassword,
      gstNo,
      address,
      city,
      state,
      zip,
      emailVerified: false,
    });

    const registeredDealer = await Dealer.register(dealer, security);

    req.login(registeredDealer, (err) => {
      if (err) return next(err);
      req.flash("success", "Account created. Please verify your email.");
      res.redirect("/dealer/profile");
    });
  } catch (err) {
    next(err);
  }
};

module.exports.loginForm = (req, res) => {
  res.render("dealer/login.ejs");
};

module.exports.login = (req, res) => {
  if (!req.user.emailVerified) {
    req.flash("error", "Please verify your email to unlock all features");
  }
  res.redirect("/dashboard");
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "Logged out successfully");
    res.redirect("/");
  });
};
