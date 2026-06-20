const Dealer = require("../models/dealer.model");
const Inventory = require("../models/inventory.model");
const LoanSummary = require("../models/loanSummary.model");

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
