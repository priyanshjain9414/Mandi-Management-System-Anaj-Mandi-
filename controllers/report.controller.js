const Inventory = require("../models/inventory.model");
const Loan = require("../models/loan.model");
const LoanSummary = require("../models/loanSummary.model");

async function calculateTotalCropProfit(dealerId, from, to) {
  const match = { dealerId };

  if (from && to) {
    match.updatedAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const inventories = await Inventory.find(match).lean();

  let totalProfit = 0;

  inventories.forEach((inv) => {
    const buyCost = (inv.totalSellQuantity || 0) * (inv.averageBuyPrice || 0);

    const sellValue =
      (inv.totalSellQuantity || 0) * (inv.averageSellPrice || 0);

    const grossProfit = sellValue - buyCost;

    const totalCharges =
      (inv.labourCharges || 0) +
      (inv.transportCharges || 0) +
      (inv.otherCharges || 0);

    totalProfit += grossProfit - totalCharges;
  });

  return totalProfit;
}

async function calculateTotalLoanProfit(dealerId, from, to) {
  const match = { dealerId, status: "FINISHED" };

  if (from && to) {
    match.updatedAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const result = await Loan.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalLoanProfit: { $sum: "$interestAmount" },
      },
    },
  ]);

  return result[0]?.totalLoanProfit || 0;
}

module.exports.profitLoss = async (req, res) => {
  const { from, to } = req.query;
  const dealerId = req.user._id;

  const loanProfit = await calculateTotalLoanProfit(dealerId, from, to);
  const cropProfit = await calculateTotalCropProfit(dealerId, from, to);

  const inventories = await Inventory.find({ dealerId });

  const loan = (await LoanSummary.findOne({ dealerId })) || {
    totalLoanGiven: 0,
    totalInterestAccrued: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  };

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

  res.render("report/report.ejs", {
    loanProfit,
    cropProfit,
    totalProfit: loanProfit + cropProfit,
    totals,
    loan,
    from,
    to,
  });
};
