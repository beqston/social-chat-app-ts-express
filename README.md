# Social App

A full-stack social media application with real-time messaging, posts, comments, and user interactions.

## Features

### Authentication
- User registration and login
- JWT-based authentication via cookies
- Protected routes

### Posts
- Create posts with text and/or images
- Edit and delete your own posts
- Image upload and management
- Like / unlike posts

### Comments
- Add comments to posts
- Edit and delete your own comments
- Real-time comment updates via Socket.io
- Typing indicator when someone is writing a comment

### Messaging
- Real-time private messaging between users
- Unread message count
- Last message preview in chat list
- Message seen/read indicators (✓ / ✓✓)
- Active/online status indicator
- Typing indicator in chat
- Delete conversations

### Real-time Features (Socket.io)
- Instant message delivery
- Live comment updates
- Typing indicators in both posts and messages
- Online/offline user status
- Unread message badge updates

## Tech Stack

### Backend
- **Node.js** + **Express.js** — REST API
- **TypeScript** — type safety
- **MongoDB** + **Mongoose** — database
- **Socket.io** — real-time communication
- **JWT** — authentication
- **Multer** — image upload handling
- **bcrypt** — password hashing

### Frontend
- **Vanilla JavaScript** — no framework
- **Socket.io Client** — real-time updates
- **HTML5** + **CSS3**

## Project Structure
```
├── backend/
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── postController.ts
│   │   ├── commentController.ts
│   │   ├── messageController.ts
│   │   └── chatController.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Post.ts
│   │   ├── Comment.ts
│   │   ├── Message.ts
│   │   └── Chat.ts
│   ├── routes/
│   ├── middleware/
│   └── server.ts
├── public/
│   ├── js/
│   │   ├── home.js
│   │   └── message.js
│   └── styles/
└── README.md
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |
| POST | `/logout` | Logout user |
| GET | `/api/v1/me` | Get current user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/posts` | Get all posts |
| GET | `/api/v1/post/:id` | Get single post |
| POST | `/add-post` | Create post |
| PATCH | `/post-edit/:id` | Edit post |
| DELETE | `/post-delete/:id` | Delete post |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/comments/:postId` | Get post comments |
| POST | `/add-comment` | Add comment |
| PUT | `/edit-comment/:id` | Edit comment |
| DELETE | `/delete-comment/:id` | Delete comment |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/chats` | Get all chats |
| GET | `/api/v1/message/:chatId` | Get chat messages |
| POST | `/message/:chatId` | Send message |
| PATCH | `/message/:messageId` | Edit message |
| DELETE | `/message/:messageId` | Delete message |
| POST | `/api/v1/message/seen/:chatId` | Mark messages as seen |

## Socket.io Events

### Emitted from client
| Event | Description |
|-------|-------------|
| `join_chat` | Join a chat room |
| `typing` | Typing indicator in messages |
| `typing_comment` | Typing indicator in comments |

### Received by client
| Event | Description |
|-------|-------------|
| `receive_message` | New message received |
| `update_count` | Unread count updated |
| `messages_seen` | Messages marked as read |
| `user_typing` | Someone is typing in chat |
| `new_comment` | New comment on a post |
| `comment_updated` | Comment was edited |
| `comment_deleted` | Comment was deleted |
| `message_updated` | Message was edited |
| `message_deleted` | Message was deleted |

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/social-app.git
cd social-app
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/social-app
JWT_SECRET=your_jwt_secret
```

4. Run the app
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

5. Open your browser at `http://localhost:3000`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |

## License
MIT
