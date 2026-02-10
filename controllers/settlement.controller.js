const mongoose = require("mongoose");
const Farmer = require("../models/farmer.model");
const Crop = require("../models/crop.model");
const Loan = require("../models/loan.model");
const Settlement = require("../models/settlement.model");
const Inventory = require("../models/inventory.model");
const LoanSummary = require("../models/loanSummary.model");

module.exports.dashboard = async (req, res) => {
  const farmer = await Farmer.findOne({
    farmerId: req.params.farmerId,
    dealerId: req.user._id,
  });

  if (!farmer) {
    req.flash("error", "Farmer not found");
    return res.redirect("/farmer");
  }

  const pendingLoans = await Loan.find({
    farmerBusinessId: farmer.farmerId,
    dealerId: req.user._id,
    status: { $ne: "FINISHED" },
  });

  const pendingCrops = await Crop.find({
    personType: "FARMER",
    personBusinessId: farmer.farmerId,
    dealerId: req.user._id,
    paymentStatus: { $ne: "DONE" },
  });

  const totalLoanPending = pendingLoans.reduce(
    (sum, l) => sum + (l.pendingAmount || l.loanAmount),
    0
  );

  const totalCropPending = pendingCrops.reduce(
    (sum, c) => sum + c.pendingAmount,
    0
  );

  res.render("settlement/dashboard.ejs", {
    farmer,
    pendingLoans,
    pendingCrops,
    totalLoanPending,
    totalCropPending,
    netAmount: totalCropPending - totalLoanPending,
  });
};

module.exports.paymentForm = async (req, res) => {
  let { loanIds, cropIds, farmerId } = req.body;

  loanIds = loanIds ? (Array.isArray(loanIds) ? loanIds : [loanIds]) : [];

  cropIds = cropIds ? (Array.isArray(cropIds) ? cropIds : [cropIds]) : [];

  if (loanIds.length === 0 && cropIds.length === 0) {
    req.flash("error", "Select at least one loan or crop");
    return res.redirect(`/farmer/${farmerId}/settlement`);
  }

  const farmer = await Farmer.findOne({ farmerId, dealerId: req.user._id });

  const loans = loanIds.length
    ? await Loan.find({ _id: { $in: loanIds }, dealerId: req.user._id })
    : [];

  const crops = cropIds.length
    ? await Crop.find({ _id: { $in: cropIds }, dealerId: req.user._id })
    : [];

  res.render("settlement/spayment.ejs", {
    farmer,
    loans,
    crops,
  });
};

module.exports.payment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      farmerId,
      farmerName,
      farmerBusinessId,
      totalCropAmount,
      totalLoanAmount,
      paidAmount,
      loanPayments,
      cropPayments,
    } = req.body;

    const cropTotal = Number(totalCropAmount);
    const loanTotal = Number(totalLoanAmount);

    let loanSummary = await LoanSummary.findOne({
      dealerId: req.user._id,
    }).session(session);

    if (!loanSummary) {
      loanSummary = new LoanSummary({ dealerId: req.user._id });
    }

    const netAmount = cropTotal - loanTotal;

    let settlementDirection = "SETTLED";
    if (netAmount > 0) settlementDirection = "DEALER_TO_FARMER";
    else if (netAmount < 0) settlementDirection = "FARMER_TO_DEALER";

    const loanArray = loanPayments
      ? Array.isArray(loanPayments)
        ? loanPayments
        : Object.values(loanPayments)
      : [];

    const cropArray = cropPayments
      ? Array.isArray(cropPayments)
        ? cropPayments
        : Object.values(cropPayments)
      : [];

    const crops = await Crop.find({
      _id: { $in: cropArray.map((p) => p.cropId) },
      pendingAmount: { $gt: 0 },
      dealerId: req.user._id,
    })
      .sort({ createdAt: 1 })
      .session(session);

    const loans = await Loan.find({
      _id: { $in: loanArray.map((p) => p.loanId) },
      status: { $ne: "FINISHED" },
      dealerId: req.user._id,
    })
      .sort({ createdAt: 1 })
      .session(session);

    const cropTypes = [...new Set(crops.map((c) => c.cropType))];

    const inventories = await Inventory.find({
      cropName: { $in: cropTypes },
      dealerId: req.user._id,
    }).session(session);

    const inventoryMap = {};
    inventories.forEach((inv) => {
      inventoryMap[inv.cropName] = inv;
    });

    const settlementCropPayments = [];
    const settlementLoanPayments = [];

    if (settlementDirection === "DEALER_TO_FARMER") {
      for (const loan of loans) {
        const fromDate = loan.updatedAt || loan.createdAt;
        const days = Math.max(
          1,
          Math.ceil((Date.now() - new Date(fromDate)) / (1000 * 60 * 60 * 24))
        );

        const principal =
          loan.pendingAmount > 0 ? loan.pendingAmount : loan.loanAmount;

        const interestAmount = Math.round(
          (principal * loan.interest * days) / 36500
        );

        const totalPayable = principal + interestAmount;

        const prevStatus = loan.status;

        loan.paidAmount += totalPayable;
        loan.pendingAmount = 0;
        loan.interestAmount += interestAmount;
        loan.periodIndays = days;
        loan.status = "FINISHED";
        loan.updatedAt = new Date();
        await loan.save({ session });

        loanSummary.totalInterestAccrued += interestAmount;
        loanSummary.totalPayableAmount += interestAmount;
        loanSummary.totalPaidAmount += totalPayable;
        loanSummary.totalPendingAmount = Math.max(
          0,
          loanSummary.totalPendingAmount + interestAmount - totalPayable
        );

        if (prevStatus !== "FINISHED") {
          loanSummary.finishedLoans += 1;
          loanSummary.ongoingLoans = Math.max(0, loanSummary.ongoingLoans - 1);
        }

        loanSummary.lastUpdatedAt = new Date();
        await loanSummary.save({ session });

        const summarySnapshot = {
          totalLoan: loanSummary.totalLoanGiven,
          averageInterest: loanSummary.averageInterestRate,
          totalInterest: loanSummary.totalInterestAccrued,
          totalAmount: loanSummary.totalPayableAmount,
          totalPaid: loanSummary.totalPaidAmount,
          totalPending: loanSummary.totalPendingAmount,
        };
        settlementLoanPayments.push({
          loanId: loan._id,
          loanBusinessId: loan.loanId,
          loanAmount: loan.loanAmount,
          principalPendingBefore: principal,
          interestRate: loan.interest,
          periodIndays: days,
          interestAmount,
          totalPayableBefore: totalPayable,
          paidAmount: totalPayable,
          pendingAmountAfter: 0,
          loanStatusAfter: "FINISHED",
          summary: [summarySnapshot],
        });
      }

      let payAmount = Number(paidAmount) + loanTotal;

      for (const crop of crops) {
        if (payAmount <= 0) break;

        const pendingBefore = crop.pendingAmount;
        const pay = Math.min(pendingBefore, payAmount);

        crop.paidAmount += pay;
        crop.pendingAmount -= pay;
        crop.paymentStatus = crop.pendingAmount === 0 ? "DONE" : "PARTIAL-DONE";

        await crop.save({ session });

        const inventory = inventoryMap[crop.cropType];

        if (inventory) {
          inventory.paymentGivePaid += pay;
          inventory.paymentGivePending -= pay;
          if (inventory.paymentGivePending < 0)
            inventory.paymentGivePending = 0;

          inventory.lastUpdatedAt = new Date();
          await inventory.save({ session });
        }

        settlementCropPayments.push({
          cropId: crop._id,
          cropBusinessId: crop.cropId,
          cropType: crop.cropType,
          quantity: crop.quantity,
          pricePerQuintal: crop.pricePerQuintal,
          totalAmount: crop.totalAmount,
          pendingBefore,
          paidAmount: pay,
          pendingAfter: crop.pendingAmount,
          statusAfter: crop.paymentStatus,
          inventory: [
            {
              averageSellPrice: inventory?.averageSellPrice || 0,
              averageBuyPrice: inventory?.averageBuyPrice || 0,
              totalQuantity: inventory?.totalInStock || 0,
              totalAmount: inventory?.totalpaymentbuy || 0,
              totalPaid: inventory?.paymentGivePaid || 0,
              totalPending: inventory?.paymentGivePending || 0,
            },
          ],
        });

        payAmount -= pay;
      }
    }

    if (settlementDirection === "FARMER_TO_DEALER") {
      for (const crop of crops) {
        const pendingBefore = crop.pendingAmount;

        crop.paidAmount += pendingBefore;
        crop.pendingAmount = 0;
        crop.paymentStatus = "DONE";
        await crop.save({ session });

        const inventory = inventoryMap[crop.cropType];

        if (inventory) {
          inventory.paymentGivePaid += pendingBefore;
          inventory.paymentGivePending -= pendingBefore;
          if (inventory.paymentGivePending < 0)
            inventory.paymentGivePending = 0;

          inventory.lastUpdatedAt = new Date();
          await inventory.save({ session });
        }

        settlementCropPayments.push({
          cropId: crop._id,
          cropBusinessId: crop.cropId,
          cropType: crop.cropType,
          quantity: crop.quantity,
          pricePerQuintal: crop.pricePerQuintal,
          totalAmount: crop.totalAmount,
          pendingBefore,
          paidAmount: pendingBefore,
          pendingAfter: 0,
          statusAfter: "DONE",
          inventory: [
            {
              averageSellPrice: inventory?.averageSellPrice || 0,
              averageBuyPrice: inventory?.averageBuyPrice || 0,
              totalQuantity: inventory?.totalInStock || 0,
              totalAmount: inventory?.totalpaymentbuy || 0,
              totalPaid: inventory?.paymentGivePaid || 0,
              totalPending: inventory?.paymentGivePending || 0,
            },
          ],
        });
      }
      let payAmount = Number(paidAmount) + cropTotal;

      for (const loan of loans) {
        if (payAmount <= 0) break;

        const fromDate = loan.updatedAt || loan.createdAt;
        const days = Math.max(
          1,
          Math.ceil((Date.now() - new Date(fromDate)) / (1000 * 60 * 60 * 24))
        );

        const principal =
          loan.pendingAmount > 0 ? loan.pendingAmount : loan.loanAmount;

        const interestAmount = Math.round(
          (principal * loan.interest * days) / 36500
        );

        const totalPayable = principal + interestAmount;
        const pay = Math.min(totalPayable, payAmount);
        const pendingAfter = totalPayable - pay;

        const prevStatus = loan.status;
        loan.paidAmount += pay;
        loan.pendingAmount = pendingAfter;
        loan.interestAmount += interestAmount;
        loan.periodIndays = days;
        loan.status = pendingAfter === 0 ? "FINISHED" : "PARTIAL-FINISHED";
        loan.updatedAt = new Date();

        await loan.save({ session });

        loanSummary.totalInterestAccrued += interestAmount;
        loanSummary.totalPayableAmount += interestAmount;
        loanSummary.totalPaidAmount += pay;
        loanSummary.totalPendingAmount = Math.max(
          0,
          loanSummary.totalPendingAmount + interestAmount - pay
        );

        if (prevStatus !== "FINISHED" && loan.status === "FINISHED") {
          loanSummary.finishedLoans += 1;
          loanSummary.ongoingLoans = Math.max(0, loanSummary.ongoingLoans - 1);
        }

        loanSummary.lastUpdatedAt = new Date();
        await loanSummary.save({ session });

        const summarySnapshot = {
          totalLoan: loanSummary.totalLoanGiven,
          averageInterest: loanSummary.averageInterestRate,
          totalInterest: loanSummary.totalInterestAccrued,
          totalAmount: loanSummary.totalPayableAmount,
          totalPaid: loanSummary.totalPaidAmount,
          totalPending: loanSummary.totalPendingAmount,
        };

        settlementLoanPayments.push({
          loanId: loan._id,
          loanBusinessId: loan.loanId,
          loanAmount: loan.loanAmount,
          principalPendingBefore: principal,
          interestRate: loan.interest,
          periodIndays: days,
          interestAmount,
          totalPayableBefore: totalPayable,
          paidAmount: pay,
          pendingAmountAfter: pendingAfter,
          loanStatusAfter: loan.status,
          summary: [summarySnapshot],
        });

        payAmount -= pay;
      }
    }

    if (settlementDirection === "SETTLED") {
      for (const crop of crops) {
        const pendingBefore = crop.pendingAmount;

        crop.paidAmount += pendingBefore;
        crop.pendingAmount = 0;
        crop.paymentStatus = "DONE";
        await crop.save({ session });

        if (inventory) {
          inventory.paymentGivePaid += pendingBefore;
          inventory.paymentGivePending -= pendingBefore;
          if (inventory.paymentGivePending < 0)
            inventory.paymentGivePending = 0;

          inventory.lastUpdatedAt = new Date();
          await inventory.save({ session });
        }

        settlementCropPayments.push({
          cropId: crop._id,
          cropBusinessId: crop.cropId,
          cropType: crop.cropType,
          quantity: crop.quantity,
          pricePerQuintal: crop.pricePerQuintal,
          totalAmount: crop.totalAmount,
          pendingBefore,
          paidAmount: pendingBefore,
          pendingAfter: 0,
          statusAfter: "DONE",
          inventory: [
            {
              averageSellPrice: inventory?.averageSellPrice || 0,
              averageBuyPrice: inventory?.averageBuyPrice || 0,
              totalAmount: inventory?.totalpaymentbuy || 0,
              totalQuantity: inventory?.totalInStock || 0,
              totalPaid: inventory?.paymentGivePaid || 0,
              totalPending: inventory?.paymentGivePending || 0,
            },
          ],
        });
      }

      for (const loan of loans) {
        const fromDate = loan.updatedAt || loan.createdAt;
        const days = Math.max(
          1,
          Math.ceil((Date.now() - new Date(fromDate)) / (1000 * 60 * 60 * 24))
        );

        const principal =
          loan.pendingAmount > 0 ? loan.pendingAmount : loan.loanAmount;

        const interestAmount = Math.round(
          (principal * loan.interest * days) / 36500
        );

        const totalPayable = principal + interestAmount;

        const prevStatus = loan.status;
        loan.paidAmount += totalPayable;
        loan.pendingAmount = 0;
        loan.interestAmount += interestAmount;
        loan.periodIndays = days;
        loan.status = "FINISHED";
        loan.updatedAt = new Date();
        await loan.save({ session });

        const pay = totalPayable;
        loanSummary.totalInterestAccrued += interestAmount;
        loanSummary.totalPayableAmount += interestAmount;
        loanSummary.totalPaidAmount += pay;
        loanSummary.totalPendingAmount = Math.max(
          0,
          loanSummary.totalPendingAmount + interestAmount - pay
        );

        if (prevStatus !== "FINISHED" && loan.status === "FINISHED") {
          loanSummary.finishedLoans += 1;
          loanSummary.ongoingLoans = Math.max(0, loanSummary.ongoingLoans - 1);
        }

        loanSummary.lastUpdatedAt = new Date();
        await loanSummary.save({ session });

        const summarySnapshot = {
          totalLoan: loanSummary.totalLoanGiven,
          averageInterest: loanSummary.averageInterestRate,
          totalInterest: loanSummary.totalInterestAccrued,
          totalAmount: loanSummary.totalPayableAmount,
          totalPaid: loanSummary.totalPaidAmount,
          totalPending: loanSummary.totalPendingAmount,
        };

        settlementLoanPayments.push({
          loanId: loan._id,
          loanBusinessId: loan.loanId,
          loanAmount: loan.loanAmount,
          principalPendingBefore: principal,
          interestRate: loan.interest,
          periodIndays: days,
          interestAmount,
          totalPayableBefore: totalPayable,
          paidAmount: totalPayable,
          pendingAmountAfter: 0,
          loanStatusAfter: "FINISHED",
          summary: [summarySnapshot],
        });
      }
    }

    await Settlement.create(
      [
        {
          dealerId: req.user._id,
          farmerId,
          farmerName,
          farmerBusinessId,
          cropPayments: settlementCropPayments,
          loanPayments: settlementLoanPayments,
          totalCropAmount: cropTotal,
          totalLoanAmount: loanTotal,
          netAmount,
          settlementDirection,
          paidAmount,
          pendingAmount: Math.max(0, Math.abs(netAmount) - paidAmount),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    req.flash("success", "Settlement completed successfully");
    res.redirect(`/farmer/${farmerBusinessId}/fdetail`);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);

    req.flash("error", "Settlement failed. No data was saved.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

module.exports.reverseSettlement = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const original = await Settlement.findOne({
      settlementId: req.params.settlementId,
      dealerId: req.user._id,
      isReversal: false,
    }).session(session);

    if (!original) throw new Error("Settlement not found");

    const already = await Settlement.exists({
      settlementId: original.settlementId,
      isReversal: true,
      dealerId: req.user._id,
    });

    if (already) throw new Error("Settlement already reversed");

    const reversedCropPayments = [];
    const reversedLoanPayments = [];

    const loanSummary = await LoanSummary.findOne({
      dealerId: req.user._id,
    }).session(session);

    let totalPendingBefore = 0;
    let totalReversedAmount = 0;

    let loanPendingBefore = 0;
    let loanReversedAmount = 0;
    let pending = 0;

    for (const p of original.cropPayments) {
      totalPendingBefore += p.pendingBefore;
      totalReversedAmount += p.paidAmount;

      const crop = await Crop.findById(p.cropId).session(session);
      if (!crop) continue;

      const amt = Math.abs(p.paidAmount);

      crop.paidAmount -= amt;
      crop.pendingAmount += amt;
      crop.paymentStatus =
        crop.pendingAmount === crop.totalAmount ? "NOT-DONE" : "PARTIAL-DONE";

      await crop.save({ session });

      const inventory = await Inventory.findOne({
        cropName: p.cropType,
        dealerId: req.user._id,
      }).session(session);

      let inventorySnapshot = [];

      if (inventory) {
        inventory.paymentGivePaid -= amt;
        inventory.paymentGivePending += amt;

        inventory.lastUpdatedAt = new Date();
        await inventory.save({ session });

        inventorySnapshot.push({
          totalQuantity: inventory.totalInStock,
          averageBuyPrice: inventory.averageBuyPrice,
          averageSellPrice: inventory.averageSellPrice,
          totalAmount: inventory.totalpaymentbuy,
          totalPaid: inventory.paymentGivePaid,
          totalPending: inventory.paymentGivePending,
        });
      }
      reversedCropPayments.push({
        ...p.toObject(),
        paidAmount: -amt,
        pendingAfter: p.pendingBefore,
        statusAfter: "REVERSED",
        inventory: inventorySnapshot,
      });
    }

    for (const p of original.loanPayments) {
      pending += p.principalPendingBefore;
      loanPendingBefore += p.totalPayableBefore;
      loanReversedAmount += p.paidAmount;

      const loan = await Loan.findById(p.loanId).session(session);
      if (!loan) continue;

      loan.paidAmount -= p.paidAmount;
      loan.pendingAmount = p.principalPendingBefore;
      loan.interestAmount -= p.interestAmount;

      loan.status = loan.pendingAmount === 0 ? "FINISHED" : "PARTIAL-FINISHED";

      await loan.save({ session });

      if (loanSummary) {
        loanSummary.totalPaidAmount -= p.paidAmount;
        loanSummary.totalPendingAmount += p.paidAmount - p.interestAmount;
        loanSummary.totalInterestAccrued -= p.interestAmount;
        loanSummary.totalPayableAmount -= p.interestAmount;
      }

      reversedLoanPayments.push({
        ...p.toObject(),
        paidAmount: -p.paidAmount,
        pendingAmountAfter: p.principalPendingBefore,
        loanStatusAfter: "REVERSED",
        summary: [
          {
            totalLoan: loanSummary.totalLoanGiven,
            averageInterest: loanSummary.averageInterestRate,
            totalInterest: loanSummary.totalInterestAccrued,
            totalAmount: loanSummary.totalPayableAmount,
            totalPaid: loanSummary.totalPaidAmount,
            totalPending: loanSummary.totalPendingAmount,
          },
        ],
      });
    }

    if (loanSummary) {
      loanSummary.lastUpdatedAt = new Date();
      await loanSummary.save({ session });
    }

    await Settlement.create(
      [
        {
          dealerId: req.user._id,

          farmerId: original.farmerId,
          farmerName: original.farmerName,
          farmerBusinessId: original.farmerBusinessId,

          isReversal: true,
          settlementId: original.settlementId,

          cropPayments: reversedCropPayments,
          loanPayments: reversedLoanPayments,

          totalCropAmount: totalPendingBefore - totalReversedAmount,
          totalLoanAmount: loanPendingBefore - loanReversedAmount,

          netAmount: -original.netAmount,
          settlementDirection: original.settlementDirection,

          paidAmount: -original.paidAmount,
          pendingAmount: Math.abs(original.netAmount),

          status: "DONE",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    req.flash("success", "Settlement reversed successfully");
    res.redirect(`/farmer/${original.farmerBusinessId}/transaction`);
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    req.flash("error", err.message);
    res.redirect("back");
  } finally {
    session.endSession();
  }
};
