const express = require('express');
const router = express.Router();
const { getUserProfile, updateProfile, getGreenScore, getReviews, getFavorites, toggleFavorite } = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/me/favorites', protect, getFavorites);
router.post('/me/favorites/:productId', protect, toggleFavorite);
router.get('/:id/green-score', protect, getGreenScore);
router.get('/:id/reviews', getReviews);
router.get('/:id', optionalAuth, getUserProfile);
router.put('/:id', protect, updateProfile);

module.exports = router;
