const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const usersController = require('../controllers/usersController');
const multer = require('multer');

const router = express.Router();

// Configure multer for profile pic uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

// GET /users/:username
router.get('/:username', optionalAuth, usersController.getUser);

// PUT /users/:id
router.put('/:id',
  authenticate,
  validate([
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('bio')
      .optional()
      .isLength({ max: 150 })
      .withMessage('Bio must be 150 characters or less')
  ]),
  usersController.updateUser
);

// POST /users/:id/profile-pic
router.post('/:id/profile-pic',
  authenticate,
  upload.single('image'),
  usersController.updateProfilePic
);

// GET /users/:id/followers
router.get('/:id/followers', optionalAuth, usersController.getFollowers);

// GET /users/:id/following
router.get('/:id/following', optionalAuth, usersController.getFollowing);

// POST /users/:id/follow
router.post('/:id/follow', authenticate, usersController.followUser);

// DELETE /users/:id/unfollow
router.delete('/:id/unfollow', authenticate, usersController.unfollowUser);

module.exports = router;
