const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

const router = express.Router();

// GET /search/users - Search users
router.get('/users', optionalAuth, searchController.searchUsers);

// GET /search/hashtags - Search hashtags
router.get('/hashtags', optionalAuth, searchController.searchHashtags);

// GET /search/hashtags/:tag - Get posts for a hashtag
router.get('/hashtags/:tag', optionalAuth, searchController.getHashtagPosts);

// GET /search/recent - Get recent searches
router.get('/recent', authenticate, searchController.getRecentSearches);

// DELETE /search/recent - Clear recent searches
router.delete('/recent', authenticate, searchController.clearRecentSearches);

module.exports = router;
