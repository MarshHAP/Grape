const db = require('../config/database');

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = q.toLowerCase().replace(/^@/, '');

    const { rows } = await db.query(
      `SELECT id, username, bio, profile_pic_url,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as follower_count
       FROM users
       WHERE LOWER(username) LIKE $1
       ORDER BY
         CASE WHEN LOWER(username) = $2 THEN 0
              WHEN LOWER(username) LIKE $3 THEN 1
              ELSE 2
         END,
         follower_count DESC
       LIMIT $4 OFFSET $5`,
      [`%${searchTerm}%`, searchTerm, `${searchTerm}%`, limit, offset]
    );

    // Save search if user is authenticated
    if (req.user) {
      await db.query(
        `INSERT INTO recent_searches (user_id, search_type, search_term)
         VALUES ($1, 'user', $2)
         ON CONFLICT DO NOTHING`,
        [req.user.id, searchTerm]
      );
    }

    // Check if user follows each result
    let users = rows.map(u => ({
      id: u.id,
      username: u.username,
      bio: u.bio,
      profilePicUrl: u.profile_pic_url,
      followerCount: parseInt(u.follower_count),
      isFollowing: false
    }));

    if (req.user && users.length > 0) {
      const userIds = users.map(u => u.id);
      const { rows: following } = await db.query(
        `SELECT following_id FROM follows
         WHERE follower_id = $1 AND following_id = ANY($2)`,
        [req.user.id, userIds]
      );
      const followingSet = new Set(following.map(f => f.following_id));
      users = users.map(u => ({
        ...u,
        isFollowing: followingSet.has(u.id)
      }));
    }

    const countResult = await db.query(
      'SELECT COUNT(*) FROM users WHERE LOWER(username) LIKE $1',
      [`%${searchTerm}%`]
    );

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
};

const searchHashtags = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = q.toLowerCase().replace(/^#/, '');

    // Get hashtags with post counts
    const { rows } = await db.query(
      `SELECT tag, COUNT(*) as post_count
       FROM hashtags
       WHERE LOWER(tag) LIKE $1
       GROUP BY tag
       ORDER BY
         CASE WHEN LOWER(tag) = $2 THEN 0
              WHEN LOWER(tag) LIKE $3 THEN 1
              ELSE 2
         END,
         post_count DESC
       LIMIT $4 OFFSET $5`,
      [`%${searchTerm}%`, searchTerm, `${searchTerm}%`, limit, offset]
    );

    // Save search if user is authenticated
    if (req.user) {
      await db.query(
        `INSERT INTO recent_searches (user_id, search_type, search_term)
         VALUES ($1, 'hashtag', $2)
         ON CONFLICT DO NOTHING`,
        [req.user.id, searchTerm]
      );
    }

    const hashtags = rows.map(h => ({
      tag: h.tag,
      postCount: parseInt(h.post_count)
    }));

    const countResult = await db.query(
      `SELECT COUNT(DISTINCT tag) FROM hashtags WHERE LOWER(tag) LIKE $1`,
      [`%${searchTerm}%`]
    );

    res.json({
      hashtags,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Search hashtags error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
};

const getHashtagPosts = async (req, res) => {
  try {
    const { tag } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const searchTag = tag.toLowerCase().replace(/^#/, '');

    const { rows } = await db.query(
      `SELECT p.*, u.username, u.profile_pic_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        ${req.user ? 'EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2)' : 'false'} as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       JOIN hashtags h ON h.post_id = p.id
       WHERE LOWER(h.tag) = $1
       ORDER BY p.created_at DESC
       LIMIT $${req.user ? '3' : '2'} OFFSET $${req.user ? '4' : '3'}`,
      req.user ? [searchTag, req.user.id, limit, offset] : [searchTag, limit, offset]
    );

    const posts = rows.map(post => ({
      id: post.id,
      videoUrl: post.video_url,
      caption: post.caption,
      duration: parseFloat(post.duration),
      createdAt: post.created_at,
      user: {
        id: post.user_id,
        username: post.username,
        profilePicUrl: post.profile_pic_url
      },
      likeCount: parseInt(post.like_count),
      commentCount: parseInt(post.comment_count),
      isLiked: post.is_liked
    }));

    const countResult = await db.query(
      'SELECT COUNT(*) FROM hashtags WHERE LOWER(tag) = $1',
      [searchTag]
    );

    res.json({
      tag: searchTag,
      posts,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get hashtag posts error:', err);
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

const getRecentSearches = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (search_type, search_term)
        search_type, search_term, created_at
       FROM recent_searches
       WHERE user_id = $1
       ORDER BY search_type, search_term, created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    // Sort by most recent
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      searches: rows.map(s => ({
        type: s.search_type,
        term: s.search_term
      }))
    });
  } catch (err) {
    console.error('Get recent searches error:', err);
    res.status(500).json({ error: 'Failed to get recent searches' });
  }
};

const clearRecentSearches = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM recent_searches WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ message: 'Recent searches cleared' });
  } catch (err) {
    console.error('Clear recent searches error:', err);
    res.status(500).json({ error: 'Failed to clear searches' });
  }
};

module.exports = {
  searchUsers,
  searchHashtags,
  getHashtagPosts,
  getRecentSearches,
  clearRecentSearches
};
