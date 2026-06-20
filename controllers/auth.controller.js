const Dealer = require("../models/dealer.model");

/* =======================
   HOME
======================= */
module.exports.home = (req, res) => {
  res.render("home.ejs");
};

module.exports.dashboard = (req, res) => {
  res.render("dashboard.ejs");
};

/* =======================
   SIGNUP FORM
======================= */
module.exports.signupForm = (req, res) => {
  res.render("dealer/signup.ejs");
};

/* =======================
   SIGNUP LOGIC
======================= */
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
      security, // password
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
      emailVerified: true,
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

/* =======================
   LOGIN FORM
======================= */
module.exports.loginForm = (req, res) => {
  res.render("dealer/login.ejs");
};

/* =======================
   LOGIN SUCCESS
======================= */
module.exports.login = (req, res) => {
  res.redirect("/dashboard");
};

/* =======================
   LOGOUT
======================= */
module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "Logged out successfully");
    res.redirect("/");
  });
};
