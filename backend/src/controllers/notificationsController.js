const db = require('../config/database');

const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT n.*,
        u.username as actor_username,
        u.profile_pic_url as actor_profile_pic,
        p.video_url as post_video_url,
        p.thumbnail_url as post_thumbnail_url,
        c.text as comment_text
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       LEFT JOIN posts p ON n.post_id = p.id
       LEFT JOIN comments c ON n.comment_id = c.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const notifications = rows.map(n => ({
      id: n.id,
      type: n.type,
      read: n.read,
      createdAt: n.created_at,
      actor: {
        id: n.actor_id,
        username: n.actor_username,
        profilePicUrl: n.actor_profile_pic
      },
      post: n.post_id ? {
        id: n.post_id,
        videoUrl: n.post_video_url,
        thumbnailUrl: n.post_thumbnail_url
      } : null,
      comment: n.comment_id ? {
        id: n.comment_id,
        text: n.comment_text
      } : null
    }));

    const countResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [req.user.id]
    );

    const unreadResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );

    res.json({
      notifications,
      unreadCount: parseInt(unreadResult.rows[0].count),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE notifications SET read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read = true WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );

    res.json({ unreadCount: parseInt(rows[0].count) });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
