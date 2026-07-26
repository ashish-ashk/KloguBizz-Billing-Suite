const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
  itemCode: { type: String, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['goods', 'service'], default: 'goods' },
  hsn: { type: String, trim: true },
  category: { type: String, trim: true },
  unit: { type: String, trim: true, default: 'Nos' },
  // No hardcoded enum here on purpose. It used to be `enum: [0,5,12,18,28]`,
  // which meant the super admin could add a slab in Masters (3% applies to gold
  // and jewellery) and the API would then reject the very rate they had just
  // configured. The valid set now comes from the Master collection, checked in
  // services/masterService.js.
  gstRate: { type: Number, default: 18, min: 0, max: 100 },
  cessRate: { type: Number, default: 0 },
  sellingPrice: { type: Number, required: true },
  mrp: Number,
  purchasePrice: Number,
  taxInclusive: { type: Boolean, default: false },
  stockQty: { type: Number, default: 0 },
  reorderLevel: Number,
  barcode: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

itemSchema.index({ orgId: 1, name: 1 });
itemSchema.index({ orgId: 1, itemCode: 1 });

module.exports = { Item: mongoose.model('Item', itemSchema) };
