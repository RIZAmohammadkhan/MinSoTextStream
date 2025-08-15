# MinSoTextStream 🌊

*Building the future of social interaction, one stream at a time.*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Database Design](#-database-design)
- [API Documentation](#-api-documentation)
- [Real-time System](#-real-time-system)
- [Authentication & Security](#-authentication--security)
- [Installation & Setup](#-installation--setup)
- [Development Guide](#-development-guide)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [Performance](#-performance)
- [Security](#-security)
- [License](#-license)

## 🎯 Overview

MinSoTextStream is a cutting-edge, real-time social media platform that combines the best of modern web technologies to deliver a seamless user experience. Built with a focus on performance, scalability, and user engagement, it provides a complete social networking solution with advanced features like real-time messaging, intelligent mentions, content discovery, and comprehensive user management.

### 🎨 Design Philosophy

- **User-Centric**: Every feature is designed with user experience at the forefront
- **Performance First**: Optimized for speed and responsiveness across all devices
- **Accessibility**: WCAG 2.1 compliant with comprehensive screen reader support
- **Modularity**: Component-based architecture for maintainability and reusability
- **Scalability**: Built to handle growth from startup to enterprise scale

### 🌟 Key Differentiators

- **Real-time Everything**: Live updates across all interactions without page refreshes
- **Intelligent Mentions**: Smart @mention system with auto-completion and notifications
- **Advanced Analytics**: Built-in trending algorithms and engagement metrics
- **Progressive Enhancement**: Works seamlessly across all devices and connection speeds
- **Developer-Friendly**: Comprehensive API and webhook system for integrations

## 🏗️ Architecture

MinSoTextStream follows a modern, scalable architecture pattern:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Express Server │◄──►│   PostgreSQL    │
│                 │    │                 │    │    Database     │
│  • Components   │    │  • REST API     │    │                 │
│  • State Mgmt   │    │  • WebSockets   │    │  • Drizzle ORM  │
│  • Routing      │    │  • Auth         │    │  • Migrations   │
│  • Real-time    │    │  • Validation   │    │  • Indexing     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   WebSocket     │◄─────────────┘
                        │   Connection    │
                        │                 │
                        │  • Live Updates │
                        │  • Notifications│
                        │  • Presence     │
                        └─────────────────┘
```

### 🔧 System Components

#### Frontend Architecture
- **React 18** with Concurrent Features for optimal performance
- **React Query** for intelligent server state management and caching
- **Wouter** for lightweight, performant routing
- **Zustand** for local state management
- **Radix UI** for accessible, unstyled component primitives
- **Tailwind CSS** with custom design system
- **Framer Motion** for smooth, declarative animations

#### Backend Architecture
- **Express.js** with TypeScript for type-safe server development
- **Layered Architecture**: Routes → Services → Data Access → Database
- **Middleware Pipeline**: Auth → Validation → Rate Limiting → Logging
- **WebSocket Server** for real-time bidirectional communication
- **JWT + Session** hybrid authentication system
- **Drizzle ORM** for type-safe database operations

#### Database Design
- **PostgreSQL** with optimized indexes and constraints
- **Drizzle Kit** for version-controlled migrations
- **Connection Pooling** for optimal database performance
- **Query Optimization** with proper indexing strategies

## 🚀 Features

### 🔐 Authentication & User Management
- **Secure Registration/Login** with bcrypt password hashing (12 salt rounds)
- **JWT + Session Hybrid** authentication for optimal security and performance
- **Password Strength Validation** with comprehensive security requirements
- **Session Management** with automatic cleanup and renewal
- **User Profile Customization** with bio, avatar, and privacy settings
- **Account Security** with login attempt monitoring and lockout protection

### 📝 Content Management
- **Rich Post Creation** with character limits and validation
- **Real-time Character Counter** with visual feedback
- **Threaded Comments** with unlimited nesting depth
- **Content Moderation** with user reporting and admin controls
- **Post Scheduling** for planned content publication
- **Draft System** for saving work-in-progress posts
- **Content Versioning** with edit history tracking

### 🔔 Advanced Mention System
- **Smart Auto-completion** with fuzzy search and ranking
- **Real-time Mention Detection** during typing
- **Instant Notifications** for mentioned users
- **Mention Analytics** tracking engagement and reach
- **Privacy Controls** for mention preferences
- **Bulk Mention Handling** for community announcements

### ❤️ Engagement Features
- **Like System** with instant feedback and counters
- **Bookmark Management** with organized collections
- **Share Functionality** with external platform integration
- **Reaction System** supporting multiple emoji types
- **Engagement Analytics** for content creators
- **Trending Algorithms** based on engagement velocity

### 🔍 Discovery & Search
- **Full-text Search** across posts, comments, and users
- **Advanced Filtering** by date, author, engagement, and content type
- **Trending Topics** with algorithm-driven recommendations
- **Hashtag System** with auto-linking and trending tracking
- **User Discovery** with recommendation engine
- **Content Categorization** for improved organization

### 🔔 Notification System
- **Real-time Notifications** for all user interactions
- **Notification Preferences** with granular controls
- **Push Notifications** (when deployed with service worker)
- **Email Notifications** for important updates
- **Notification History** with read/unread tracking
- **Smart Batching** to prevent notification spam

### 👥 Social Features
- **Follow/Unfollow System** with mutual following detection
- **User Blocking** with comprehensive privacy protection
- **Privacy Settings** for post visibility and interaction controls
- **Direct Messaging** (roadmap feature)
- **User Lists** for content organization
- **Social Analytics** for relationship insights

### 📱 User Experience
- **Responsive Design** optimized for all screen sizes
- **Progressive Web App** capabilities
- **Offline Support** with intelligent caching
- **Dark/Light Theme** with system preference detection
- **Accessibility Features** including keyboard navigation and screen reader support
- **Performance Optimization** with lazy loading and code splitting

### 🔄 Real-time Features
- **Live Feed Updates** without page refresh
- **Real-time Like Counters** across all users
- **Instant Comment Threading** with live updates
- **Live User Presence** indicators
- **Real-time Typing Indicators** in comments
- **Live Notification Delivery** with sound and visual cues

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Query** - Server state management and caching
- **Wouter** - Lightweight routing
- **Framer Motion** - Smooth animations
- **React Hook Form** - Form validation and management

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **WebSockets (ws)** - Real-time bidirectional communication
- **Passport.js** - Authentication middleware
- **Express Session** - Session management

### Database & ORM
- **PostgreSQL** - Robust relational database
- **Drizzle ORM** - Type-safe database queries
- **Drizzle Kit** - Database migrations and schema management
- **Neon Database** - Serverless PostgreSQL (optional)

### Development Tools
- **ESBuild** - Fast JavaScript bundler
- **TSX** - TypeScript execution for development
- **Drizzle Studio** - Database GUI
- **Cross-env** - Cross-platform environment variables

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database (local or cloud)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MinSoTextStream
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/minso_db
SESSION_SECRET=your-session-secret-key
NODE_ENV=development
```

### 4. Database Setup
```bash
# Generate database migrations
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📝 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run dev:memory` - Start with in-memory database (SQLite)
- `npm run check` - Type check TypeScript files

### Production
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate migration files
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Platform-specific Scripts
- Windows: `scripts/start-dev.bat`, `scripts/start-prod.bat`
- Unix/Linux: `scripts/start-dev.sh`, `scripts/start-prod.sh`
- Health check: `scripts/health-check.bat` or `scripts/health-check.sh`

## 🏗️ Project Structure

```
MinSoTextStream/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── App.tsx         # Main app component
├── server/                 # Backend Express application
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── db.ts               # Database connection
│   └── storage.ts          # Data access layer
├── shared/                 # Shared code between client/server
│   ├── schema.ts           # Database schema
│   └── mention-utils.ts    # Mention parsing utilities
├── migrations/             # Database migration files
├── scripts/                # Build and deployment scripts
└── package.json            # Project dependencies
```

## 🔐 Authentication

The application uses session-based authentication with Passport.js:

- **Registration**: Create new user accounts with username/password
- **Login**: Secure authentication with session management
- **Session Persistence**: Automatic login on return visits
- **Logout**: Clean session termination

## 🔄 Real-time Features

WebSocket integration provides real-time updates for:

- **Live Posts**: New posts appear instantly
- **Real-time Comments**: Comments update without refresh
- **Instant Notifications**: Immediate mention and interaction alerts
- **Live Like Counts**: Like counters update in real-time
- **Online Status**: User presence indicators

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Posts
- `GET /api/posts` - Get posts feed
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `POST /api/posts/:id/like` - Like/unlike post

### Comments
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment
- `POST /api/comments/:id/like` - Like/unlike comment

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/block` - Block/unblock user

### Additional Features
- `GET /api/bookmarks` - Get user bookmarks
- `GET /api/notifications` - Get notifications
- `GET /api/trending` - Get trending content
- `GET /api/search` - Search functionality

## 🎨 UI Components

The application uses a comprehensive design system with:

- **Radix UI** primitives for accessibility
- **Custom components** for specific functionality
- **Tailwind CSS** for styling
- **Responsive design** for all screen sizes
- **Dark/light theme** support
- **Smooth animations** with Framer Motion

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables for Production
```env
DATABASE_URL=your-production-database-url
SESSION_SECRET=secure-random-string
NODE_ENV=production
PORT=5000
```

### Database Migration
Ensure your production database is migrated:
```bash
npm run db:migrate
```

## 🧪 Development Tips

### Database Development
- Use `npm run db:studio` to visualize your database
- Test migrations with `npm run dev:memory` for isolated testing
- Keep migration files in version control

### Real-time Testing
- Open multiple browser windows to test real-time features
- Use browser dev tools to monitor WebSocket connections
- Test with different user accounts for mentions and interactions

### Component Development
- Use Storybook-style component isolation
- Test responsive design at different breakpoints
- Verify accessibility with screen readers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Radix UI** for accessible component primitives
- **Tailwind CSS** for the utility-first CSS framework
- **Drizzle ORM** for type-safe database operations
- **React Query** for server state management
- **Neon Database** for serverless PostgreSQL hosting

## 📞 Support

For support, please:
1. Check the existing issues on GitHub
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs
4. Provide environment details

---

**MinSoTextStream** - Building the future of social interaction, one stream at a time. 🌊
