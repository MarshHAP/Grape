const db = require('../config/database');
const { uploadFile, deleteFile, getUploadUrl } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

// Helper to extract hashtags and mentions from caption
const extractHashtags = (caption) => {
  if (!caption) return [];
  const matches = caption.match(/#[\w]+/g) || [];
  return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
};

const extractMentions = (caption) => {
  if (!caption) return [];
  const matches = caption.match(/@[\w]+/g) || [];
  return [...new Set(matches.map(mention => mention.substring(1).toLowerCase()))];
};

const createPost = async (req, res) => {
  try {
    const { caption, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    // Validate duration
    const videoDuration = parseFloat(duration);
    if (isNaN(videoDuration) || videoDuration > 6) {
      return res.status(400).json({ error: 'Video must be 6 seconds or less' });
    }

    // Upload video to S3
    const videoKey = `videos/${req.user.id}/${uuidv4()}.mp4`;
    const videoUrl = await uploadFile(videoKey, req.file.buffer, 'video/mp4');

    // Create post
    const { rows } = await db.query(
      `INSERT INTO posts (user_id, video_url, video_key, caption, duration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, videoUrl, videoKey, caption, videoDuration]
    );

    const post = rows[0];

    // Extract and save hashtags
    const hashtags = extractHashtags(caption);
    if (hashtags.length > 0) {
      const hashtagValues = hashtags.map((tag, i) =>
        `($1, $${i + 2})`
      ).join(', ');
      await db.query(
        `INSERT INTO hashtags (post_id, tag) VALUES ${hashtagValues}`,
        [post.id, ...hashtags]
      );
    }

    // Extract and save mentions
    const mentions = extractMentions(caption);
    if (mentions.length > 0) {
      // Find mentioned users
      const { rows: mentionedUsers } = await db.query(
        'SELECT id, username FROM users WHERE LOWER(username) = ANY($1)',
        [mentions]
      );

      for (const mentionedUser of mentionedUsers) {
        // Save mention
        await db.query(
          'INSERT INTO mentions (post_id, mentioned_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [post.id, mentionedUser.id]
        );

        // Create notification
        if (mentionedUser.id !== req.user.id) {
          await db.query(
            `INSERT INTO notifications (user_id, actor_id, type, post_id)
             VALUES ($1, $2, 'mention', $3)`,
            [mentionedUser.id, req.user.id, post.id]
          );
        }
      }
    }

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: post.id,
        videoUrl: post.video_url,
        caption: post.caption,
        duration: post.duration,
        createdAt: post.created_at,
        user: {
          id: req.user.id,
          username: req.user.username,
          profilePicUrl: req.user.profile_pic_url
        },
        likeCount: 0,
        commentCount: 0,
        isLiked: false
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

const getUploadUrlForVideo = async (req, res) => {
  try {
    const key = `videos/${req.user.id}/${uuidv4()}.mp4`;
    const uploadUrl = await getUploadUrl(key, 'video/mp4');

    res.json({
      uploadUrl,
      key
    });
  } catch (err) {
    console.error('Get upload URL error:', err);
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
};

const confirmUpload = async (req, res) => {
  try {
    const { key, caption, duration } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Video key is required' });
    }

    const videoDuration = parseFloat(duration);
    if (isNaN(videoDuration) || videoDuration > 6) {
      return res.status(400).json({ error: 'Video must be 6 seconds or less' });
    }

    // Construct video URL
    const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION}.amazonaws.com`;
    const bucket = process.env.S3_BUCKET || 'grape-videos';
    const videoUrl = `${endpoint}/${bucket}/${key}`;

    // Create post
    const { rows } = await db.query(
      `INSERT INTO posts (user_id, video_url, video_key, caption, duration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, videoUrl, key, caption, videoDuration]
    );

    const post = rows[0];

    // Process hashtags and mentions
    const hashtags = extractHashtags(caption);
    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        await db.query(
          'INSERT INTO hashtags (post_id, tag) VALUES ($1, $2)',
          [post.id, tag]
        );
      }
    }

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: post.id,
        videoUrl: post.video_url,
        caption: post.caption,
        duration: post.duration,
        createdAt: post.created_at,
        user: {
          id: req.user.id,
          username: req.user.username,
          profilePicUrl: req.user.profile_pic_url
        },
        likeCount: 0,
        commentCount: 0,
        isLiked: false
      }
    });
  } catch (err) {
    console.error('Confirm upload error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get posts from followed users (chronological)
    const { rows } = await db.query(
      `SELECT p.*, u.username, u.profile_pic_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
          OR p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
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

    // Get total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) FROM posts
       WHERE user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
          OR user_id = $1`,
      [req.user.id]
    );

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ error: 'Failed to get feed' });
  }
};

const getDiscover = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get trending/popular posts (sorted by recent likes + views)
    const { rows } = await db.query(
      `SELECT p.*, u.username, u.profile_pic_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND created_at > NOW() - INTERVAL '24 hours') as recent_likes,
        ${req.user ? 'EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1)' : 'false'} as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY recent_likes DESC, p.created_at DESC
       LIMIT $${req.user ? '2' : '1'} OFFSET $${req.user ? '3' : '2'}`,
      req.user ? [req.user.id, limit, offset] : [limit, offset]
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

    const countResult = await db.query('SELECT COUNT(*) FROM posts');

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get discover error:', err);
    res.status(500).json({ error: 'Failed to get discover feed' });
  }
};

const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT p.*, u.username, u.profile_pic_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        ${req.user ? 'EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2)' : 'false'} as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      req.user ? [id, req.user.id] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = rows[0];

    // Increment view count
    await db.query(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    res.json({
      post: {
        id: post.id,
        videoUrl: post.video_url,
        caption: post.caption,
        duration: parseFloat(post.duration),
        viewCount: post.view_count + 1,
        createdAt: post.created_at,
        user: {
          id: post.user_id,
          username: post.username,
          profilePicUrl: post.profile_pic_url
        },
        likeCount: parseInt(post.like_count),
        commentCount: parseInt(post.comment_count),
        isLiked: post.is_liked
      }
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Failed to get post' });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    // Get post to verify ownership and get video key
    const { rows } = await db.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = rows[0];

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete video from S3
    try {
      await deleteFile(post.video_key);
    } catch (s3Err) {
      console.error('S3 delete error:', s3Err);
      // Continue with DB deletion even if S3 fails
    }

    // Delete post (cascades to likes, comments, hashtags, mentions)
    await db.query('DELETE FROM posts WHERE id = $1', [id]);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT p.*, u.username, u.profile_pic_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        ${req.user ? 'EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2)' : 'false'} as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $${req.user ? '3' : '2'} OFFSET $${req.user ? '4' : '3'}`,
      req.user ? [id, req.user.id, limit, offset] : [id, limit, offset]
    );

    const posts = rows.map(post => ({
      id: post.id,
      videoUrl: post.video_url,
      thumbnailUrl: post.thumbnail_url,
      caption: post.caption,
      duration: parseFloat(post.duration),
      createdAt: post.created_at,
      likeCount: parseInt(post.like_count),
      commentCount: parseInt(post.comment_count),
      isLiked: post.is_liked
    }));

    const countResult = await db.query(
      'SELECT COUNT(*) FROM posts WHERE user_id = $1',
      [id]
    );

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get user posts error:', err);
    res.status(500).json({ error: 'Failed to get user posts' });
  }
};

const likePost = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const postCheck = await db.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const likeCheck = await db.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, id]
    );

    if (likeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked this post' });
    }

    // Create like
    await db.query(
      'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
      [req.user.id, id]
    );

    // Create notification if not own post
    if (postCheck.rows[0].user_id !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, actor_id, type, post_id)
         VALUES ($1, $2, 'like', $3)`,
        [postCheck.rows[0].user_id, req.user.id, id]
      );
    }

    // Get updated like count
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [id]
    );

    res.status(201).json({
      message: 'Post liked',
      likeCount: parseInt(rows[0].count)
    });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ error: 'Failed to like post' });
  }
};

const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING id',
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Not liked this post' });
    }

    // Get updated like count
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [id]
    );

    res.json({
      message: 'Post unliked',
      likeCount: parseInt(rows[0].count)
    });
  } catch (err) {
    console.error('Unlike post error:', err);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
};

const getLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.bio, u.profile_pic_url
       FROM likes l
       JOIN users u ON l.user_id = u.id
       WHERE l.post_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [id]
    );

    res.json({
      users: rows.map(u => ({
        id: u.id,
        username: u.username,
        bio: u.bio,
        profilePicUrl: u.profile_pic_url
      })),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get likes error:', err);
    res.status(500).json({ error: 'Failed to get likes' });
  }
};

const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1', [id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await db.query(
      `INSERT INTO reports (reporter_id, post_id, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, id, reason, description]
    );

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    console.error('Report post error:', err);
    res.status(500).json({ error: 'Failed to report post' });
  }
};

module.exports = {
  createPost,
  getUploadUrlForVideo,
  confirmUpload,
  getFeed,
  getDiscover,
  getPost,
  deletePost,
  getUserPosts,
  likePost,
  unlikePost,
  getLikes,
  reportPost
};
