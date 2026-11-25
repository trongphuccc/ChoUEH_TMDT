const express = require('express');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route POST /api/reports   body: { productId, reason, note }
router.post('/', protect, async (req, res) => {
  try {
    const { productId, reason, note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId) || !Report.REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu báo cáo không hợp lệ' });
    }
    const product = await Product.findById(productId).select('seller');
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy bài đăng' });
    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể tự báo cáo bài của mình' });
    }

    await Report.create({ product: productId, reporter: req.user._id, reason, note: String(note || '').slice(0, 500) });
    res.status(201).json({ success: true, message: 'Đã gửi báo cáo. Admin sẽ xem xét sớm.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Bạn đã báo cáo bài đăng này rồi' });
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

module.exports = router;
