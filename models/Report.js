const mongoose = require('mongoose');

const REPORT_REASONS = ['spam', 'fake', 'duplicate', 'inappropriate', 'other'];

const reportSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' }
}, { timestamps: true });

// One report per user per listing.
reportSchema.index({ product: 1, reporter: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
