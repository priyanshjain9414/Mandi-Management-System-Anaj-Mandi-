const Inventory = require("../models/inventory.model");
const Crop = require("../models/crop.model");
const CropPayment = require("../models/cropPayment.model");
const Settlement = require("../models/settlement.model");

module.exports.globalDashboard = async (req, res) => {
  const { from, to } = req.query;

  const match = {};
  if (from && to) {
    match.updatedAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const inventories = await Inventory.find({
    dealerId: req.user._id,
    ...match,
  }).lean();

  const totals = {
    totalBuyQuantity: 0,
    totalSellQuantity: 0,
    totalInStock: 0,

    buyAmount: 0,
    sellAmount: 0,
    totalInAmount: 0,

    labourCharges: 0,
    transportCharges: 0,
    otherCharges: 0,
    totalCharges: 0,

    grossProfit: 0,
    profit: 0,

    paymentGivePaid: 0,
    paymentGivePending: 0,
    paymentReceivePaid: 0,
    paymentReceivePending: 0,
  };

  inventories.forEach((inv) => {
    totals.totalBuyQuantity += inv.totalBuyQuantity || 0;
    totals.totalSellQuantity += inv.totalSellQuantity || 0;
    totals.totalInStock += inv.totalInStock || 0;

    const buyCost = (inv.totalSellQuantity || 0) * (inv.averageBuyPrice || 0);

    const sellValue =
      (inv.totalSellQuantity || 0) * (inv.averageSellPrice || 0);

    const stockValue = (inv.totalInStock || 0) * (inv.averageBuyPrice || 0);

    totals.buyAmount += inv.totalpaymentbuy || 0;
    totals.sellAmount += inv.totalpaymentsell || 0;
    totals.totalInAmount += stockValue;

    const labour = inv.labourCharges || 0;
    const transport = inv.transportCharges || 0;
    const other = inv.otherCharges || 0;

    const totalCharges = labour + transport + other;
    const grossProfit = sellValue - buyCost;

    totals.labourCharges += labour;
    totals.transportCharges += transport;
    totals.otherCharges += other;
    totals.totalCharges += totalCharges;

    totals.grossProfit += grossProfit;
    totals.profit += grossProfit - totalCharges;

    totals.paymentGivePaid += inv.paymentGivePaid || 0;
    totals.paymentGivePending += inv.paymentGivePending || 0;
    totals.paymentReceivePaid += inv.paymentReceivePaid || 0;
    totals.paymentReceivePending += inv.paymentReceivePending || 0;
  });

  res.render("inventory/global.ejs", {
    totals,
    from,
    to,
  });
};

module.exports.list = async (req, res) => {
  const { search } = req.query;

  const query = search ? { cropName: { $regex: search, $options: "i" } } : {};

  const inventories = await Inventory.find({
    dealerId: req.user._id,
    ...query,
  }).sort({ cropName: 1 });

  res.render("inventory/dash.ejs", {
    inventories,
    search,
  });
};

module.exports.detail = async (req, res) => {
  const inventory = await Inventory.findOne({
    inventoryId: req.params.inventoryId,
    dealerId: req.user._id,
  });

  if (!inventory) {
    req.flash("error", "Inventory not found");
    return res.redirect("/inventory");
  }

  res.render("inventory/detail.ejs", { inventory });
};

module.exports.buyDashboard = async (req, res) => {
  const { inventoryId } = req.params;
  const { search, status, fromDate, toDate, view } = req.query;

  const viewMode = req.query.view || "";

  const inventory = await Inventory.findOne({
    inventoryId,
    dealerId: req.user._id,
  });
  if (!inventory) throw new Error("Inventory not found");

  const timeline = [];

  const cropQuery = {
    cropType: inventory.cropName,
    personType: "FARMER",
  };

  if (search) {
    cropQuery.$or = [
      { cropId: new RegExp(search, "i") },
      { personName: new RegExp(search, "i") },
      { personBusinessId: new RegExp(search, "i") },
    ];
  }

  if (status) cropQuery.paymentStatus = status;

  if (fromDate || toDate) {
    cropQuery.date = {};
    if (fromDate) cropQuery.date.$gte = new Date(fromDate);
    if (toDate) cropQuery.date.$lte = new Date(toDate);
  }

  const crops = await Crop.find({
    dealerId: req.user._id,
    ...cropQuery,
  });

  crops.forEach((crop) => {
    if (!view || view === "CROP") {
      timeline.push({
        type: "CROP",
        date: crop.date,
        isReversal: false,
        link: `/crop/${crop.cropId}/cdetail`,
        link1: null,
        left: {
          cropId: crop.cropId,
          farmer: crop.personName,
          farmerId: crop.personBusinessId,
          quantity: crop.quantity,
          totalAmount: crop.totalAmount,
          grade: crop.grade,
          pricePerQuintal: crop.pricePerQuintal,
          paid: crop.paidAmount,
          pending: crop.pendingAmount,
          status: crop.paymentStatus,
          noOfGunny: crop.noOfGunny,
          gunnyQuantity: crop.gunnyQuantity,
          totalCharges:
            crop.labourCharges + crop.transportCharges + crop.otherCharges,
        },
        right: {
          totalQuantity: crop.inventory.at(-1)?.totalQuantity ?? 0,
          averagePrice: crop.inventory.at(-1)?.averageBuyPrice ?? 0,
          totalAmount: crop.inventory.at(-1)?.totalAmount ?? 0,
          totalPaid: crop.inventory.at(-1)?.totalPaid ?? 0,
          totalPending: crop.inventory.at(-1)?.totalPending ?? 0,
          inStockGunny: crop.inventory.at(-1)?.inStockGunny ?? 0,
          chargeTotal:
            (crop.inventory.at(-1)?.labourCharges ?? 0) +
            (crop.inventory.at(-1)?.transportCharges ?? 0) +
            (crop.inventory.at(-1)?.otherCharges ?? 0),
        },
      });
    }
  });

  const payments = await CropPayment.find({
    dealerId: req.user._id,
    personType: "FARMER",
    "payments.cropType": inventory.cropName,
  });

  payments.forEach((p) => {
    if (fromDate && new Date(p.date) < new Date(fromDate)) return;
    if (toDate && new Date(p.date) > new Date(toDate)) return;
    p.payments.forEach((tx) => {
      if (tx.cropType !== inventory.cropName) return;

      if (search) {
        const s = search.toLowerCase();
        const match =
          tx.cropBusinessId.toLowerCase().includes(s) ||
          p.personName.toLowerCase().includes(s) ||
          p.personBusinessId.toLowerCase().includes(s);

        if (!match) return;
      }

      if (status && tx.statusAfter !== status) return;
      if (!view || view === "PAYMENT") {
        timeline.push({
          type: "PAYMENT",
          isReversal: p.isReversal,
          reversedPaymentId: p.reversedPaymentId,
          paymentId: p.paymentId,
          date: p.date || p.createdAt,
          link: `/crop/payment/${p.paymentId}`,
          link1: `/crop/payment/${p.reversedPaymentId}`,
          left: {
            cropId: tx.cropBusinessId,
            farmer: p.personName,
            farmerId: p.personBusinessId,
            quantity: tx.quantity,
            totalAmount: tx.totalAmount,
            paid: tx.paidAmount,
            pendingBefore: tx.pendingBefore,
            pendingAfter: tx.pendingAfter,
            status: tx.statusAfter,
          },
          right: {
            totalQuantity: tx.inventory.at(-1)?.totalQuantity ?? 0,
            averagePrice: tx.inventory.at(-1)?.averageBuyPrice ?? 0,
            totalAmount: tx.inventory.at(-1)?.totalAmount ?? 0,
            totalPaid: tx.inventory.at(-1)?.totalPaid ?? 0,
            totalPending: tx.inventory.at(-1)?.totalPending ?? 0,
          },
        });
      }
    });
  });

  const settlements = await Settlement.find({
    "cropPayments.cropType": inventory.cropName,
    dealerId: req.user._id,
  }).lean();

  settlements.forEach((st) => {
    const settlementDate = st.date || st.createdAt;

    if (fromDate && settlementDate < new Date(fromDate)) return;
    if (toDate && settlementDate > new Date(toDate)) return;

    st.cropPayments.forEach((tx) => {
      if (tx.cropType !== inventory.cropName) return;

      if (search) {
        const s = search.toLowerCase();
        const match =
          tx.cropBusinessId.toLowerCase().includes(s) ||
          st.farmerName.toLowerCase().includes(s) ||
          st.farmerBusinessId.toLowerCase().includes(s);

        if (!match) return;
      }

      if (status && tx.statusAfter !== status) return;

      if (!view || view === "PAYMENT") {
        const inv =
          tx.inventory && tx.inventory.length
            ? tx.inventory[tx.inventory.length - 1]
            : {};

        timeline.push({
          type: "PAYMENT",
          isReversal: st.isReversal,
          reversedPaymentId: st.reversedSettlementId,
          paymentId: st.settlementId,
          date: settlementDate,
          link: `/settlement/${st.settlementId}/detail`,
          link1: `/settlement/${st.reversedSettlementId}/detail`,
          left: {
            cropId: tx.cropBusinessId,
            farmer: st.farmerName,
            farmerId: st.farmerBusinessId,
            quantity: tx.quantity,
            pricePerQuintal: tx.pricePerQuintal,
            totalAmount: tx.totalAmount,
            paid: tx.paidAmount,
            pendingBefore: tx.pendingBefore,
            pendingAfter: tx.pendingAfter,
            status: tx.statusAfter,
            direction: st.settlementDirection,
          },
          right: {
            totalQuantity: inv.totalQuantity || 0,
            averagePrice: inv.averageBuyPrice || 0,
            totalAmount: inv.totalAmount || 0,
            totalPaid: inv.totalPaid || 0,
            totalPending: inv.totalPending || 0,
          },
        });
      }
    });
  });

  const sellCropQuery = {
    cropType: inventory.cropName,
    personType: "BUYER",
  };

  if (fromDate || toDate) {
    sellCropQuery.date = {};
    if (fromDate) sellCropQuery.date.$gte = new Date(fromDate);
    if (toDate) sellCropQuery.date.$lte = new Date(toDate);
  }

  if (search) {
    sellCropQuery.cropId = new RegExp(search, "i");
  }

  const sellCrops = await Crop.find({
    dealerId: req.user._id,
    ...sellCropQuery,
  });

  sellCrops.forEach((crop) => {
    if (!view || view === "CROP") {
      timeline.push({
        type: "SELL",
        date: crop.date,
        isReversal: false,
        link: `/crop/${crop.cropId}/cdetail`,
        link1: null,
        left: {
          cropId: crop.cropId,
          quantity: crop.quantity,
          noOfGunny: crop.noOfGunny,
          gunnyQuantity: crop.gunnyQuantity,
          totalCharges:
            crop.labourCharges + crop.transportCharges + crop.otherCharges,
        },
        right: {
          totalQuantity: crop.inventory.at(-1)?.totalQuantity ?? 0,
          inStockGunny: crop.inventory.at(-1)?.inStockGunny ?? 0,
          chargeTotal:
            (crop.inventory.at(-1)?.labourCharges ?? 0) +
            (crop.inventory.at(-1)?.transportCharges ?? 0) +
            (crop.inventory.at(-1)?.otherCharges ?? 0),
        },
      });
    }
  });

  timeline.sort((a, b) => b.date - a.date);

  res.render("inventory/buy.ejs", {
    inventory,
    timeline,
    search,
    status,
    fromDate,
    toDate,
    view: viewMode,
  });
};

module.exports.sellDashboard = async (req, res) => {
  const { inventoryId } = req.params;
  const { search, status, fromDate, toDate, view } = req.query;

  const viewMode = view || "";

  const inventory = await Inventory.findOne({
    inventoryId,
    dealerId: req.user._id,
  });
  if (!inventory) throw new Error("Inventory not found");

  const timeline = [];

  const cropQuery = {
    cropType: inventory.cropName,
    personType: "BUYER",
  };

  if (search) {
    cropQuery.$or = [
      { cropId: new RegExp(search, "i") },
      { personName: new RegExp(search, "i") },
      { personBusinessId: new RegExp(search, "i") },
    ];
  }

  if (status) cropQuery.paymentStatus = status;

  if (fromDate || toDate) {
    cropQuery.date = {};
    if (fromDate) cropQuery.date.$gte = new Date(fromDate);
    if (toDate) cropQuery.date.$lte = new Date(toDate);
  }

  const crops = await Crop.find({
    dealerId: req.user._id,
    ...cropQuery,
  });

  crops.forEach((crop) => {
    if (!viewMode || viewMode === "CROP") {
      timeline.push({
        type: "CROP",
        date: crop.date,
        isReversal: false,
        link: `/crop/${crop.cropId}/cdetail`,
        link1: null,
        left: {
          cropId: crop.cropId,
          buyer: crop.personName,
          buyerId: crop.personBusinessId,
          quantity: crop.quantity,
          totalAmount: crop.totalAmount,
          grade: crop.grade,
          pricePerQuintal: crop.pricePerQuintal,
          paid: crop.paidAmount,
          pending: crop.pendingAmount,
          status: crop.paymentStatus,
          noOfGunny: crop.noOfGunny,
          gunnyQuantity: crop.gunnyQuantity,
          totalCharges:
            crop.labourCharges + crop.transportCharges + crop.otherCharges,
        },
        right: {
          totalQuantity: crop.inventory.at(-1)?.totalQuantity ?? 0,
          buyAveragePrice: crop.inventory.at(-1)?.averageBuyPrice ?? 0,
          sellAveragePrice: crop.inventory.at(-1)?.averageSellPrice ?? 0,
          totalAmount: crop.inventory.at(-1)?.totalAmount ?? 0,
          totalPaid: crop.inventory.at(-1)?.totalPaid ?? 0,
          totalPending: crop.inventory.at(-1)?.totalPending ?? 0,
          inStockGunny: crop.inventory.at(-1)?.inStockGunny ?? 0,
          chargeTotal:
            (crop.inventory.at(-1)?.labourCharges ?? 0) +
            (crop.inventory.at(-1)?.transportCharges ?? 0) +
            (crop.inventory.at(-1)?.otherCharges ?? 0),
        },
      });
    }
  });

  const payments = await CropPayment.find({
    dealerId: req.user._id,
    personType: "BUYER",
    "payments.cropType": inventory.cropName,
  });

  payments.forEach((p) => {
    if (fromDate && new Date(p.date) < new Date(fromDate)) return;
    if (toDate && new Date(p.date) > new Date(toDate)) return;

    p.payments.forEach((tx) => {
      if (tx.cropType !== inventory.cropName) return;

      if (search) {
        const s = search.toLowerCase();
        const match =
          tx.cropBusinessId.toLowerCase().includes(s) ||
          p.personName.toLowerCase().includes(s) ||
          p.personBusinessId.toLowerCase().includes(s);

        if (!match) return;
      }

      if (status && tx.statusAfter !== status) return;

      if (!viewMode || viewMode === "PAYMENT") {
        timeline.push({
          type: "PAYMENT",
          isReversal: p.isReversal,
          reversedPaymentId: p.reversedPaymentId,
          paymentId: p.paymentId,
          date: p.date || p.createdAt,
          link: `/crop/payment/${p.paymentId}`,
          link1: `/crop/payment/${p.reversedPaymentId}`,
          left: {
            cropId: tx.cropBusinessId,
            buyer: p.personName,
            buyerId: p.personBusinessId,
            quantity: tx.quantity,
            totalAmount: tx.totalAmount,
            paid: tx.paidAmount,
            pendingBefore: tx.pendingBefore,
            pendingAfter: tx.pendingAfter,
            status: tx.statusAfter,
          },
          right: {
            buyAveragePrice: tx.inventory.at(-1)?.averageBuyPrice ?? 0,
            sellAveragePrice: tx.inventory.at(-1)?.averageSellPrice ?? 0,
            totalQuantity: tx.inventory.at(-1)?.totalQuantity ?? 0,
            totalAmount: tx.inventory.at(-1)?.totalAmount ?? 0,
            totalPaid: tx.inventory.at(-1)?.totalPaid ?? 0,
            totalPending: tx.inventory.at(-1)?.totalPending ?? 0,
          },
        });
      }
    });
  });

  const buyCropQuery = {
    cropType: inventory.cropName,
    personType: "FARMER",
  };

  if (fromDate || toDate) {
    buyCropQuery.date = {};
    if (fromDate) buyCropQuery.date.$gte = new Date(fromDate);
    if (toDate) buyCropQuery.date.$lte = new Date(toDate);
  }

  if (search) {
    buyCropQuery.cropId = new RegExp(search, "i");
  }

  const buyCrops = await Crop.find({
    dealerId: req.user._id,
    ...buyCropQuery,
  });

  buyCrops.forEach((crop) => {
    if (!view || view === "CROP") {
      timeline.push({
        type: "BUY",
        date: crop.date,
        isReversal: false,
        link: `/crop/${crop.cropId}/cdetail`,
        link1: null,
        left: {
          cropId: crop.cropId,
          quantity: crop.quantity,
          noOfGunny: crop.noOfGunny,
          gunnyQuantity: crop.gunnyQuantity,
          totalCharges:
            crop.labourCharges + crop.transportCharges + crop.otherCharges,
        },
        right: {
          totalQuantity: crop.inventory.at(-1)?.totalQuantity ?? 0,
          inStockGunny: crop.inventory.at(-1)?.inStockGunny ?? 0,
          chargeTotal:
            (crop.inventory.at(-1)?.labourCharges ?? 0) +
            (crop.inventory.at(-1)?.transportCharges ?? 0) +
            (crop.inventory.at(-1)?.otherCharges ?? 0),
        },
      });
    }
  });

  timeline.sort((a, b) => b.date - a.date);

  res.render("inventory/sell.ejs", {
    inventory,
    timeline,
    search,
    status,
    fromDate,
    toDate,
    view: viewMode,
  });
};
