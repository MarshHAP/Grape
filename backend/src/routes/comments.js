const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const commentsController = require('../controllers/commentsController');

const router = express.Router();

// POST /posts/:id/comments - Add comment to post
router.post('/:id/comments',
  authenticate,
  validate([
    body('text')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be 1-500 characters')
  ]),
  commentsController.createComment
);

// GET /posts/:id/comments - Get comments for a post
router.get('/:id/comments', commentsController.getComments);

// DELETE /comments/:id - Delete a comment
router.delete('/:id', authenticate, commentsController.deleteComment);

module.exports = router;
