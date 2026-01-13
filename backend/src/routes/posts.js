const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const postsController = require('../controllers/postsController');
const multer = require('multer');

const router = express.Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (will be compressed)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files allowed'), false);
    }
  }
});

// POST /posts - Create new post with video upload
router.post('/',
  authenticate,
  upload.single('video'),
  validate([
    body('caption')
      .optional()
      .isLength({ max: 280 })
      .withMessage('Caption must be 280 characters or less'),
    body('duration')
      .isFloat({ min: 0.1, max: 6 })
      .withMessage('Duration must be between 0.1 and 6 seconds')
  ]),
  postsController.createPost
);

// GET /posts/upload-url - Get presigned URL for direct upload
router.get('/upload-url', authenticate, postsController.getUploadUrlForVideo);

// POST /posts/confirm - Confirm upload and create post
router.post('/confirm',
  authenticate,
  validate([
    body('key')
      .notEmpty()
      .withMessage('Video key is required'),
    body('caption')
      .optional()
      .isLength({ max: 280 })
      .withMessage('Caption must be 280 characters or less'),
    body('duration')
      .isFloat({ min: 0.1, max: 6 })
      .withMessage('Duration must be between 0.1 and 6 seconds')
  ]),
  postsController.confirmUpload
);

// GET /posts/feed - Get home feed
router.get('/feed', authenticate, postsController.getFeed);

// GET /posts/discover - Get discover/trending feed
router.get('/discover', optionalAuth, postsController.getDiscover);

// GET /posts/:id - Get single post
router.get('/:id', optionalAuth, postsController.getPost);

// DELETE /posts/:id - Delete post
router.delete('/:id', authenticate, postsController.deletePost);

// POST /posts/:id/like - Like a post
router.post('/:id/like', authenticate, postsController.likePost);

// DELETE /posts/:id/unlike - Unlike a post
router.delete('/:id/unlike', authenticate, postsController.unlikePost);

// GET /posts/:id/likes - Get users who liked a post
router.get('/:id/likes', optionalAuth, postsController.getLikes);

// POST /posts/:id/report - Report a post
router.post('/:id/report',
  authenticate,
  validate([
    body('reason')
      .isIn(['spam', 'inappropriate', 'harassment', 'violence', 'other'])
      .withMessage('Invalid report reason'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less')
  ]),
  postsController.reportPost
);

module.exports = router;
