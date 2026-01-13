const express = require('express');
const { authenticate } = require('../middleware/auth');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

// GET /notifications - Get notifications
router.get('/', authenticate, notificationsController.getNotifications);

// GET /notifications/unread-count - Get unread count
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticate, notificationsController.markAsRead);

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', authenticate, notificationsController.markAllAsRead);

module.exports = router;
