const db = require('../config/database');
const { uploadFile, deleteFile } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

const getUser = async (req, res) => {
  try {
    const { username } = req.params;

    const { rows } = await db.query(
      `SELECT id, username, bio, profile_pic_url, created_at
       FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Get counts
    const [followerCount, followingCount, postCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [user.id]),
      db.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [user.id]),
      db.query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [user.id])
    ]);

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user) {
      const followCheck = await db.query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, user.id]
      );
      isFollowing = followCheck.rows.length > 0;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        profilePicUrl: user.profile_pic_url,
        createdAt: user.created_at,
        followerCount: parseInt(followerCount.rows[0].count),
        followingCount: parseInt(followingCount.rows[0].count),
        postCount: parseInt(postCount.rows[0].count),
        isFollowing
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { username, bio } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      // Check if username is taken
      const usernameCheck = await db.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, id]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push(`username = $${paramCount++}`);
      values.push(username.toLowerCase());
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, bio, profile_pic_url, created_at`,
      values
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        bio: rows[0].bio,
        profilePicUrl: rows[0].profile_pic_url,
        createdAt: rows[0].created_at
      }
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const updateProfilePic = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Delete old profile pic if exists
    const { rows: oldUser } = await db.query(
      'SELECT profile_pic_url FROM users WHERE id = $1',
      [id]
    );

    // Upload new profile pic to S3
    const key = `profile-pics/${id}/${uuidv4()}.${req.file.originalname.split('.').pop()}`;
    const url = await uploadFile(key, req.file.buffer, req.file.mimetype);

    // Update user
    const { rows } = await db.query(
      `UPDATE users SET profile_pic_url = $1
       WHERE id = $2
       RETURNING id, username, email, bio, profile_pic_url, created_at`,
      [url, id]
    );

    res.json({
      message: 'Profile picture updated',
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        bio: rows[0].bio,
        profilePicUrl: rows[0].profile_pic_url,
        createdAt: rows[0].created_at
      }
    });
  } catch (err) {
    console.error('Update profile pic error:', err);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
};

const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.bio, u.profile_pic_url
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [id]
    );

    // If authenticated, check which users the current user follows
    let followers = rows.map(u => ({
      id: u.id,
      username: u.username,
      bio: u.bio,
      profilePicUrl: u.profile_pic_url,
      isFollowing: false
    }));

    if (req.user && followers.length > 0) {
      const followerIds = followers.map(f => f.id);
      const { rows: following } = await db.query(
        `SELECT following_id FROM follows
         WHERE follower_id = $1 AND following_id = ANY($2)`,
        [req.user.id, followerIds]
      );
      const followingSet = new Set(following.map(f => f.following_id));
      followers = followers.map(f => ({
        ...f,
        isFollowing: followingSet.has(f.id)
      }));
    }

    res.json({
      followers,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ error: 'Failed to get followers' });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.bio, u.profile_pic_url
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [id]
    );

    // If authenticated, check which users the current user follows
    let following = rows.map(u => ({
      id: u.id,
      username: u.username,
      bio: u.bio,
      profilePicUrl: u.profile_pic_url,
      isFollowing: false
    }));

    if (req.user && following.length > 0) {
      const followingIds = following.map(f => f.id);
      const { rows: currentFollowing } = await db.query(
        `SELECT following_id FROM follows
         WHERE follower_id = $1 AND following_id = ANY($2)`,
        [req.user.id, followingIds]
      );
      const followingSet = new Set(currentFollowing.map(f => f.following_id));
      following = following.map(f => ({
        ...f,
        isFollowing: followingSet.has(f.id)
      }));
    }

    res.json({
      following,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'Failed to get following' });
  }
};

const followUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const followCheck = await db.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, id]
    );

    if (followCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow
    await db.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [req.user.id, id]
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (user_id, actor_id, type)
       VALUES ($1, $2, 'follow')`,
      [id, req.user.id]
    );

    res.status(201).json({ message: 'Successfully followed user' });
  } catch (err) {
    console.error('Follow user error:', err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING id',
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (err) {
    console.error('Unfollow user error:', err);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

module.exports = {
  getUser,
  updateUser,
  updateProfilePic,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser
};
