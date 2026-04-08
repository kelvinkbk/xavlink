# XavLink - Full Stack Application

A comprehensive full-stack application with Backend (Node.js), Mobile App (React Native/Expo), and Web App (React/Vite).

## 📋 Table of Contents

- [Project Overview],(#project-overview)
- [Technology Stack],(#technology-stack)
- [Project Structure],(#project-structure)
- [Prerequisites],(#prerequisites)
- [Installation & Setup],(#installation--setup)
- [Running the Application],(#running-the-application)
- [Database Setup],(#database-setup)
- [Environment Configuration],(#environment-configuration)
- [Key Features],(#key-features)

## 🎯 Project Overview

XavLink is a full-stack application consisting of three main components:

- **Backend**: REST API server with database integration
- **Web**: React-based web application
- **Mobile**: React Native mobile application using Expo

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: Custom middleware

### Web

- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React Context

### Mobile

- **Framework**: React Native
- **Platform**: Expo
- **Build**: EAS (Expo Application Services)
- **Target**: Android/iOS

## 📁 Project Structure

```text
xavlink/
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── app.js          # Express app setup
│   │   ├── server.js       # Server entry point
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   ├── migrations/     # Database migrations
│   │   ├── seed.js         # Database seeding
│   │   └── seed-admin.js   # Admin user seed
│   ├── uploads/            # User uploads (chats, profiles)
│   └── package.json
│
├── web/                     # React web application
│   ├── src/
│   │   ├── App.jsx         # Main App component
│   │   ├── main.jsx        # Entry point
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React Context
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   ├── assets/         # Static assets
│   │   ├── App.css         # Global styles
│   │   └── index.css       # Base styles
│   ├── public/             # Static files
│   ├── vite.config.js      # Vite configuration
│   ├── tailwind.config.js  # Tailwind CSS config
│   ├── postcss.config.js   # PostCSS config
│   ├── eslint.config.js    # ESLint rules
│   └── package.json
│
├── mobile/                  # React Native mobile app
│   ├── src/
│   │   ├── components/     # App components
│   │   ├── screens/        # Screen components
│   │   ├── navigation/     # Navigation setup
│   │   ├── context/        # React Context
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Images & resources
│   ├── android/            # Android build files
│   ├── App.js              # App entry
│   ├── app.json            # Expo configuration
│   ├── eas.json            # EAS build config
│   ├── google-services.json # Firebase config
│   └── package.json
│
├── postgres_json_export/    # PostgreSQL data export (JSON format)
│   ├── User.json
│   ├── Post.json
│   ├── Comment.json
│   ├── Like.json
│   ├── Follow.json
│   ├── Chat.json
│   ├── Message.json
│   ├── Notification.json
│   └── ... (other tables)
│
├── scripts/                 # Utility scripts
│   └── update-tunnel-url.js # Update tunnel configuration
│
└── Root Files
    ├── App.js              # Root component
    ├── app.json            # App configuration
    ├── Discover.jsx        # Discovery component
    ├── eas.json            # EAS configuration
    ├── package.json        # Root dependencies
    └── EMAIL_VERIFICATION_COMPLETE_SETUP.md
```

## 📦 Prerequisites

- **Node.js**: v14+ (v16+ recommended)
- **npm** or **yarn**: Package manager
- **PostgreSQL**: v12+ or compatible database
- **Git**: Version control
- **Expo CLI**: For mobile development (`npm install -g expo-cli`)
- **Android Studio** or **Xcode**: For mobile building

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd xavlink
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
# Create a .env file with the following variables:
# DATABASE_URL=postgresql://user:password@localhost:5432/xavlink
# JWT_SECRET=your_jwt_secret_key
# NODE_ENV=development

# Run database migrations
npx prisma migrate deploy

# Seed the database (optional)
npm run seed

# Start the backend server
npm start
```

### 3. Web Setup

```bash
cd ../web

# Install dependencies
npm install

# Setup environment variables
# Create a .env.local file with:
# VITE_API_URL=http://localhost:YOUR_BACKEND_PORT
# VITE_APP_NAME=XavLink

# Start development server
npm run dev
```

### 4. Mobile Setup

```bash
cd ../mobile

# Install dependencies
npm install

# Setup environment variables
# Create a .env file with:
# EXPO_PUBLIC_API_URL=your_api_url

# Start Expo developer server
npm start

# For Android:
# Press 'a' in the terminal or run: npm run android

# For iOS (macOS only):
# Press 'i' in the terminal or run: npm run ios
```

## 🚀 Running the Application

### Backend

```bash
cd backend
npm start
# Server runs on http://localhost:5000 (or configured port)
```

### Web

```bash
cd web
npm run dev
# Web app runs on http://localhost:5173 (default Vite port)
```

### Mobile

```bash
cd mobile
npm start
# Expo development server starts
# Scan QR code with Expo Go app or use Android/iOS emulator
```

### Production Build

**Web:**

```bash
cd web
npm run build      # Creates optimized build in dist/
npm run preview    # Preview production build locally
```

**Mobile:**

```bash
cd mobile
eas build         # Build using EAS (requires Expo account)
```

## 🗄️ Database Setup

### Initial Setup

```bash
cd backend

# Install Prisma
npm install @prisma/client prisma

# Create .env with DATABASE_URL pointing to PostgreSQL

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Database Schema

The database includes tables for:

- **Users**: User accounts and profiles
- **Posts**: User-generated content
- **Comments**: Post comments
- **Likes**: Post and comment likes
- **Follow**: User follow relationships
- **Chat**: Direct messaging
- **Messages**: Chat messages
- **Notifications**: User notifications
- **And more...** (See Prisma schema in `backend/prisma/schema.prisma`)

### Database Migrations

Migrations are stored in `backend/prisma/migrations/`. Key migrations:

- `20251210174627_init`: Initial schema
- `20251212044743_init`: Additional tables
- `20251212115632_add_follow_system`: Follow functionality
- `20251213051022_add_likes_comments`: Likes and comments
- `20251213053645_add_user_relations_to_likes_comments`: Relationship fixes
- `20251213060230_add_post_commented_notification`: Notifications

### Backup & Export

PostgreSQL data can be exported to JSON format (stored in `postgres_json_export/`):

```bash
cd backend
npm run export-data  # If script exists
# Or manually export using pg_dump and convert to JSON
```

## 🔧 Environment Configuration

### Backend Environment Variables (Examples)

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/xavlink
JWT_SECRET=your_secret_key
PORT=5000
CORS_ORIGIN=http://localhost:5173,exp://localhost:8081
```

### Web Environment Variables (Examples)

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=XavLink
VITE_APP_VERSION=1.0.0
```

### Mobile Environment Variables (Examples)

```env
EXPO_PUBLIC_API_URL=http://your-api-url
EXPO_PUBLIC_APP_NAME=XavLink
```

## ✨ Key Features

- **User Authentication**: Secure login and registration
- **User Profiles**: User information and settings
- **Posts & Comments**: Create, read, update, delete posts and comments
- **Social Features**: Follow users, like posts, bookmark content
- **Messaging**: Direct chat between users
- **Notifications**: Real-time user notifications
- **Image Uploads**: Profile pictures and post images
- **Device Sessions**: Multiple device session management
- **Reports & Moderation**: Content and user reporting
- **Skills & Endorsements**: User skills and endorsement system
- **Achievements**: User achievements and badges

## 📱 Mobile App Features

- **Expo-based**: Cross-platform iOS and Android support
- **EAS Build**: Cloud-based app building
- **Firebase Integration**: Push notifications and services
- **Local Storage**: Offline capability

## 🌐 Web App Features

- **Responsive Design**: Tailwind CSS for modern UI
- **Vite Build Tool**: Fast development and production builds
- **React Router**: Client-side routing
- **Context API**: State management

## 🧪 Testing

```bash
# Backend tests (if configured)
cd backend
npm run test

# Web tests (if configured)
cd web
npm run test

# Mobile tests (if configured)
cd mobile
npm run test
```

## 📝 Available Scripts

### Backend Scripts

- `npm start`: Start development server
- `npm run seed`: Seed database with sample data
- `npm run migrate`: Run database migrations

### Web Scripts

- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm run preview`: Preview production build

### Mobile Scripts

- `npm start`: Start Expo development server
- `npm run android`: Build and run on Android
- `npm run ios`: Build and run on iOS

## 🐛 Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Verify DATABASE_URL in .env file
- Check database credentials

### CORS Errors

- Add your frontend URL to CORS_ORIGIN in backend .env
- Ensure backend is running on correct port

### Mobile Build Failures

- Clear cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules && npm install`
- Update Expo CLI: `npm install -g expo-cli@latest`

### Port Already in Use

- Backend: Change PORT in .env or use different port
- Web: Vite uses 5173 by default, configure in vite.config.js
- Mobile: Change port in Expo configuration

## 📚 Documentation

- [Email Verification Setup](./EMAIL_VERIFICATION_COMPLETE_SETUP.md)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Expo Documentation](https://docs.expo.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🔐 Security Notes

- Never commit .env files or sensitive credentials
- Use environment variables for secrets
- Enable HTTPS in production
- Implement rate limiting on API endpoints
- Validate all user inputs
- Use CORS appropriately
- Keep dependencies updated

## 📞 Support

For issues and questions, please refer to:

1. Project documentation
2. Technology documentation (Prisma, Express, React, Expo)
3. GitHub Issues (if available)

## 📄 License

[Add your license information here]

## 👥 Contributors

[Add contributor information here]

---

**Last Updated**: April 2026

For questions or issues, please open an issue or contact the development team.
