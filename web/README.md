# XavLink Web App

React + Vite + Tailwind CSS frontend for the XavLink campus skill marketplace.

## Setup

```bash
cd web
npm install
npm run dev
```

Runs on `http://localhost:5173` by default.

## Architecture

### Routing (`src/App.jsx`)
- `/login` - Public login page
- `/register` - Public registration page
- `/home` - Protected home feed (posts from all users)
- `/profile` - Protected user profile view
- `/skills` - Protected skills marketplace (add/search skills)
- `/requests` - Protected skill requests dashboard (accept/reject incoming requests)

All protected routes redirect to `/login` if user is not authenticated (no token).

### State Management (`src/context/AuthContext.jsx`)
- React Context API for auth state (user, token, isAuthenticated)
- `login(userData, token)` - Save user and JWT token after auth
- `logout()` - Clear auth state and localStorage
- `useAuth()` hook - Access auth context in any component

### API Service (`src/services/api.js`)
- Single axios instance with baseURL pointing to backend API
- Auto-injects Bearer token from localStorage into all requests
- Handles 401 errors (TODO: auto-redirect to login)
- Exports: `authService`, `userService`, `skillService`, `postService`, `requestService`

### Components

#### `Navbar.jsx`
- Top navigation bar (hidden when not authenticated)
- Shows user profile menu and logout button
- Links to main pages

#### `Sidebar.jsx`
- Left sidebar navigation (visible when authenticated)
- Quick links: Home, Profile, Skills, Requests
- Logout button
- Campus-themed dark styling

#### `MainLayout.jsx`
- Wrapper layout that combines Navbar + Sidebar + content
- Responsive container structure

#### `ProtectedRoute.jsx`
- Wrapper component for protected routes
- Checks `isAuthenticated` and redirects to `/login` if needed
- Usage: `<ProtectedRoute><Page /></ProtectedRoute>`

### Pages

#### `Login.jsx`
- Email + password form
- Calls `POST /api/auth/login`
- On success: saves token + user, redirects to `/home`
- Shows error messages from backend

#### `Register.jsx`
- Name, email, password, course, year, bio form
- Calls `POST /api/auth/register`
- On success: auto-logs in user, redirects to `/home`
- Campus fields (course, year) are optional

#### `Home.jsx`
- Fetches all posts from `GET /api/posts/all`
- Displays posts in reverse chronological order
- PostCard component shows user info + content + image
- Real-time updates (TODO: Socket.io integration)

#### `Profile.jsx`
- Displays logged-in user's profile
- Shows name, email, course, year, bio, profile pic
- Edit button placeholder (TODO: implement edit form)

#### `Skills.jsx`
- Search bar to find skills by title/category
- Add new skill form (only visible to authenticated users)
  - Fields: title, description, category dropdown, price range
  - Calls `POST /api/skills/add`
- Grid of SkillCard components
- Each card shows user who offers the skill + request button
- Request button is placeholder (TODO: implement send request flow)

#### `Requests.jsx`
- Shows incoming skill requests for the logged-in user
- `GET /api/requests/received/:userId`
- RequestCard component with:
  - Requester info + skill details
  - Accept/Reject buttons (calls `PUT /api/requests/update/:id`)
  - Status badge (pending/accepted/rejected)

## Styling

- **Tailwind CSS** for all styling
- **Color scheme**: Primary blue (#3b82f6), secondary dark (#1e293b)
- Light theme with clean, minimal UI
- Campus aesthetic: warm, welcoming tone
- Responsive design (mobile-first)

## Key Features

✅ JWT-based authentication with token persistence
✅ Protected routes (redirect to login if not authenticated)
✅ Real-time form validation and error handling
✅ Responsive layout with sidebar + navbar
✅ Skills search and filtering
✅ Request accept/reject workflow
✅ Clean, modular component structure
✅ Production-ready code with comments

## Environment Variables

```env
VITE_API_URL=http://localhost:4000/api
```

Change to your deployed backend URL in production.

## Next Steps

1. **Socket.io integration** - Real-time chat in messages modal
2. **Edit profile** - Allow users to update their info
3. **Send skill request** - From skills page, request a skill
4. **File uploads** - Profile pics, skill images
5. **Search filters** - Advanced skill filtering (price range, rating)
6. **Notifications** - Toast/badge notifications for new requests
7. **Error handling** - Global error boundary + 401 redirect middleware
8. **Loading states** - Skeleton loaders for better UX

## Tech Stack

- **React 18** - UI framework
- **Vite** - Fast bundler
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Context API** - State management

## Scripts

```bash
npm run dev      # Start dev server (hot reload)
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint (if configured)
```


The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
