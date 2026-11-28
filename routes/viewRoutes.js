const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');

const CATEGORIES = [
  { slug: 'sach', label: 'Sách & tài liệu', icon: 'menu_book' },
  { slug: 'dien-tu', label: 'Điện tử', icon: 'devices' },
  { slug: 'do-dung', label: 'Đồ dùng', icon: 'chair' },
  { slug: 'thoi-trang', label: 'Thời trang', icon: 'apparel' },
  { slug: 'xe', label: 'Xe', icon: 'pedal_bike' },
  { slug: 'khac', label: 'Khác', icon: 'category' }
];

// Order of the school day, used by the homepage timetable.
const DAY_SLOTS = [
  { slot: 'Sau tiết 2', clock: '9:30' },
  { slot: 'Buổi trưa 11h-13h', clock: '11:00' },
  { slot: 'Sau tiết 4', clock: '13:30' },
  { slot: 'Buổi chiều 15h-17h', clock: '15:00' }
];

// "Cơ sở A - 59 Nguyễn Đình Chiểu" -> "Cơ sở A"
const shortPlace = (place) => String(place || '').split(' - ')[0];

router.get('/', async (req, res, next) => {
  try {
    const live = { status: 'available', listingType: 'sell' };
    const wantedLive = { status: 'available', listingType: 'wanted' };
    const [latest, wanted, categoryCounts, activeCount, soldCount, userCount, wantedCount, wantedCodes] = await Promise.all([
      Product.find(live).sort({ createdAt: -1 }).limit(24)
        .select('title price condition images location meetingPoints preferredTimeSlots courseCode category transactionStatus createdAt')
        .lean(),
      Product.find(wantedLive).sort({ createdAt: -1 }).limit(3)
        .select('title budgetMin budgetMax urgency courseCode description meetingPoints createdAt')
        .lean(),
      Product.aggregate([{ $match: live }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
      Product.countDocuments(live),
      Product.countDocuments({ $or: [{ status: 'sold' }, { transactionStatus: 'sold' }] }),
      User.countDocuments(),
      Product.countDocuments(wantedLive),
      // Course codes students are hunting for most on the "Đang cần" board
      Product.aggregate([
        { $match: { ...wantedLive, courseCode: { $nin: [null, ''] } } },
        { $group: { _id: '$courseCode', n: { $sum: 1 } } },
        { $sort: { n: -1, _id: 1 } },
        { $limit: 5 }
      ])
    ]);

    const withImage = latest.filter((p) => p.images && p.images.length);
    const counts = Object.fromEntries(categoryCounts.map((c) => [c._id, c.n]));

    // Timetable: each listing shows up in every slot its seller offered.
    const timetable = DAY_SLOTS.map(({ slot, clock }) => {
      const items = withImage.filter((p) => (p.preferredTimeSlots || []).includes(slot));
      return {
        slot,
        clock,
        items: items.slice(0, 3).map((p) => ({
          ...p,
          places: [...new Set((p.meetingPoints && p.meetingPoints.length ? p.meetingPoints : [p.location]).map(shortPlace))]
        })),
        more: Math.max(items.length - 3, 0)
      };
    });

    const placesOf = (p) => [...new Set((p.meetingPoints && p.meetingPoints.length ? p.meetingPoints : [p.location]).filter(Boolean).map(shortPlace))];
    const WEEK = 7 * 24 * 3600 * 1000;
    // Homepage grid: newest first; the campus chips and sort buttons rearrange it in the browser.
    const grid = withImage.slice(0, 16).map((p) => ({
      ...p,
      places: placesOf(p),
      isNew: Date.now() - new Date(p.createdAt).getTime() < WEEK
    }));
    const campusCount = (c) => grid.filter((p) => p.places.includes(c)).length;

    res.render('index', {
      hero: withImage[0] || null,
      rail: withImage.slice(0, 8),
      grid,
      campuses: ['Cơ sở A', 'Cơ sở B', 'Cơ sở N'].map((c) => ({ name: c, count: campusCount(c) })),
      popular: ['KTVM', 'Toán cao cấp', 'Tư tưởng HCM', 'Laptop', 'Máy tính', 'Xe đạp'],
      wanted: wanted.map((p) => ({ ...p, places: placesOf(p) })),
      wantedCount,
      wantedCodes: wantedCodes.map((c) => c._id),
      categories: CATEGORIES.map((c) => ({ ...c, count: counts[c.slug] || 0 })),
      timetable,
      stats: { activeCount, soldCount, userCount },
      shortPlace
    });
  } catch (error) {
    next(error);
  }
});

router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));
router.get('/forgot-password', (req, res) => res.render('forgot-password'));
router.get('/reset-password', (req, res) => res.render('reset-password'));
router.get('/products', (req, res) => res.render('products'));
router.get('/product/:id', (req, res) => res.render('product-detail', { productId: req.params.id }));
router.get('/post-ad', (req, res) => res.render('post-ad'));
router.get('/messages', (req, res) => res.render('messages'));
router.get('/dashboard', (req, res) => res.render('dashboard'));
router.get('/profile', (req, res) => res.render('profile'));
router.get('/admin', (req, res) => res.render('admin'));
router.get('/admin/users', (req, res) => res.render('admin-users'));
router.get('/admin/products', (req, res) => res.render('admin-products'));
router.get('/sellers/:id', (req, res) => res.render('seller-profile', { sellerId: req.params.id }));
router.get('/terms', (req, res) => res.render('terms'));
router.get('/privacy', (req, res) => res.render('privacy'));

module.exports = router;
