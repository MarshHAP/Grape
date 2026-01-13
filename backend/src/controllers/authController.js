const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username already exists
    const usernameCheck = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, bio, profile_pic_url, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash]
    );

    const user = rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicUrl: user.profile_pic_url,
        createdAt: user.created_at
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const { rows } = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicUrl: user.profile_pic_url,
        createdAt: user.created_at
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getMe = async (req, res) => {
  try {
    // Get follower and following counts
    const [followerCount, followingCount, postCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [req.user.id]),
      db.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [req.user.id]),
      db.query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [req.user.id])
    ]);

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        bio: req.user.bio,
        profilePicUrl: req.user.profile_pic_url,
        createdAt: req.user.created_at,
        followerCount: parseInt(followerCount.rows[0].count),
        followingCount: parseInt(followingCount.rows[0].count),
        postCount: parseInt(postCount.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

module.exports = {
  signup,
  login,
  getMe
};
