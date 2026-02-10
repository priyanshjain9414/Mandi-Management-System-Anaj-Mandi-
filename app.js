const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
require("dotenv").config();

const ExpressError = require("./utils/ExpressError");

const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const { MongoStore } = require("connect-mongo");

const Dealer = require("./models/dealer.model");

const DBurl = process.env.ATLASDB_URL;
const PORT = process.env.PORT || 8080;

mongoose
  .connect(DBurl)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("DB Error:", err));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const store = MongoStore.create({
  mongoUrl: DBurl,
  crypto: {
    secret: process.env.SESSION_SECRET || "MANDI_SECRET",
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("Session Store Error:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || "MANDI_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 3,
    maxAge: 1000 * 60 * 60 * 24 * 3,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
    },
    Dealer.authenticate()
  )
);
passport.serializeUser(Dealer.serializeUser());
passport.deserializeUser(Dealer.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.use("/", require("./routes/auth.routes"));
app.use("/", require("./routes/farmer.routes"));
app.use("/", require("./routes/buyer.routes"));
app.use("/", require("./routes/crop.routes"));
app.use("/", require("./routes/loan.routes"));
app.use("/", require("./routes/inventory.routes"));
app.use("/", require("./routes/settlement.routes"));
app.use("/", require("./routes/report.routes"));
app.use("/", require("./routes/transaction.routes"));
app.use("/", require("./routes/loanSummary.routes"));
app.use("/receipt", require("./routes/receipt.routes"));
app.use("/dealer", require("./routes/dealer.routes"));

app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong!";
  console.error(err);

  if (req.flash) {
    req.flash("error", message);
  }

  res.status(status).render("error.ejs", {
    status,
    message,
    err,
  });
});

app.listen(PORT, () => {
  console.log(" Server running on port 8080");
});
