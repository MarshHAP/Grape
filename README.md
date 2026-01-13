# 🍇 Grape

A Vine-style short video platform for recording and sharing 6-second looping videos. Built with React Native (Expo) and Node.js.

## Features

- **6-Second Videos Only**: Record videos directly from your camera - no uploads allowed
- **Auto-Looping Playback**: Videos loop seamlessly like the original Vine
- **Social Features**: Follow users, like posts, comment, and share
- **Discover Feed**: Find trending content and new creators
- **Hashtags & Mentions**: Use #hashtags and @mentions in captions
- **Notifications**: Get notified when people interact with your content
- **Profile Management**: Customize your profile with bio and photo

## Tech Stack

### Mobile App (React Native/Expo)
- React Native with Expo SDK 50
- React Navigation for routing
- expo-camera for video recording
- expo-av for video playback
- expo-secure-store for token storage

### Backend (Node.js/Express)
- Express.js REST API
- PostgreSQL database
- JWT authentication
- AWS S3/Cloudflare R2 for video storage
- bcrypt for password hashing

## Project Structure

```
Grape/
├── mobile/                 # React Native Expo app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # Screen components
│   │   ├── navigation/     # Navigation configuration
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── services/       # API service layer
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Helper functions & theme
│   ├── assets/             # App icons and images
│   ├── App.js              # App entry point
│   └── app.json            # Expo configuration
│
├── backend/                # Node.js Express API
│   ├── src/
│   │   ├── config/         # Database and S3 config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth and validation
│   │   ├── routes/         # API routes
│   │   └── index.js        # Server entry point
│   └── migrations/         # Database migrations
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)
- AWS S3 or Cloudflare R2 account for video storage
- iOS Simulator / Android Emulator or physical device

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:password@localhost:5432/grape
   JWT_SECRET=your-super-secret-jwt-key
   S3_BUCKET=grape-videos
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   ```

5. Create the PostgreSQL database:
   ```bash
   createdb grape
   ```

6. Run database migrations:
   ```bash
   npm run migrate
   ```

7. Start the server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`.

### Mobile App Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the API URL in `src/services/api.js`:
   ```javascript
   const API_URL = 'http://localhost:3000/api';
   // For physical device, use your computer's IP:
   // const API_URL = 'http://192.168.1.xxx:3000/api';
   ```

4. Start the Expo development server:
   ```bash
   npx expo start
   ```

5. Scan the QR code with Expo Go app or run on simulator:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login to existing account
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/profile-pic` - Upload profile picture
- `GET /api/users/:id/followers` - Get user's followers
- `GET /api/users/:id/following` - Get who user follows
- `POST /api/users/:id/follow` - Follow a user
- `DELETE /api/users/:id/unfollow` - Unfollow a user

### Posts
- `POST /api/posts` - Create new post with video
- `GET /api/posts/feed` - Get home feed (following)
- `GET /api/posts/discover` - Get discover/trending feed
- `GET /api/posts/:id` - Get single post
- `DELETE /api/posts/:id` - Delete a post
- `POST /api/posts/:id/like` - Like a post
- `DELETE /api/posts/:id/unlike` - Unlike a post

### Comments
- `POST /api/posts/:id/comments` - Add comment
- `GET /api/posts/:id/comments` - Get post comments
- `DELETE /api/comments/:id` - Delete comment

### Search
- `GET /api/search/users?q=query` - Search users
- `GET /api/search/hashtags?q=query` - Search hashtags
- `GET /api/search/hashtags/:tag` - Get posts by hashtag

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/read-all` - Mark all as read

## Design System

### Colors
- Primary (Grape Purple): `#6B46C1`
- Background: `#000000`
- Surface: `#1A1A1A`
- Text: `#FFFFFF`
- Text Secondary: `#A0A0A0`

### Typography
- Headers: Bold, white
- Body: Regular, white/gray
- Captions: Small, muted

## Important Constraints

1. **No Video Uploads**: Videos must be recorded in-app using the camera
2. **6-Second Maximum**: Videos are limited to 6 seconds
3. **Auto-Loop**: All videos loop continuously during playback
4. **No AI Features**: Keeping it simple like the original Vine

## Security Considerations

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with configurable expiration
- Rate limiting on authentication endpoints
- Input validation on all endpoints
- Signed URLs for video uploads

## Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | Token expiration (default: 7d) |
| `S3_BUCKET` | S3/R2 bucket name |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY_ID` | S3 access key |
| `S3_SECRET_ACCESS_KEY` | S3 secret key |
| `S3_ENDPOINT` | S3 endpoint (for R2) |

## License

MIT License - See LICENSE file for details.

---

Built with 🍇 by the Grape Team
