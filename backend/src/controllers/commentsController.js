const db = require('../config/database');

const createComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { text } = req.body;

    // Check if post exists
    const postCheck = await db.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create comment
    const { rows } = await db.query(
      `INSERT INTO comments (user_id, post_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, postId, text]
    );

    const comment = rows[0];

    // Create notification if not own post
    if (postCheck.rows[0].user_id !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
         VALUES ($1, $2, 'comment', $3, $4)`,
        [postCheck.rows[0].user_id, req.user.id, postId, comment.id]
      );
    }

    // Check for mentions in comment
    const mentions = text.match(/@[\w]+/g) || [];
    if (mentions.length > 0) {
      const usernames = mentions.map(m => m.substring(1).toLowerCase());
      const { rows: mentionedUsers } = await db.query(
        'SELECT id FROM users WHERE LOWER(username) = ANY($1)',
        [usernames]
      );

      for (const user of mentionedUsers) {
        if (user.id !== req.user.id) {
          await db.query(
            `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
             VALUES ($1, $2, 'mention', $3, $4)`,
            [user.id, req.user.id, postId, comment.id]
          );
        }
      }
    }

    res.status(201).json({
      message: 'Comment added',
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.created_at,
        user: {
          id: req.user.id,
          username: req.user.username,
          profilePicUrl: req.user.profile_pic_url
        }
      }
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

const getComments = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT c.*, u.username, u.profile_pic_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    const comments = rows.map(comment => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.created_at,
      user: {
        id: comment.user_id,
        username: comment.username,
        profilePicUrl: comment.profile_pic_url
      }
    }));

    const countResult = await db.query(
      'SELECT COUNT(*) FROM comments WHERE post_id = $1',
      [postId]
    );

    res.json({
      comments,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists and belongs to user
    const { rows } = await db.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = {
  createComment,
  getComments,
  deleteComment
};
