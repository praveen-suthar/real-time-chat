# Real-Time Chat Application

A production-grade, full-stack real-time messaging application built with **Next.js (App Router)**, **Node.js/Express**, **Socket.io**, and **PostgreSQL with Prisma ORM**.

Designed with clean architecture, zero-trust media privacy, optimistic UI updates, resilient WebSocket sync, and memoized state derivation.

---

## 1. Architecture Overview

The repository follows a clean, pragmatic 2-folder structure:

```
chatapp/
├── frontend/             # Next.js 14+ (App Router), Redux Toolkit, Tailwind CSS, Lucide
│   ├── src/app/          # App Router pages (chat dashboard, login, register, 404)
│   ├── src/components/   # Modular UI components (Sidebar, ChatWindow, Composer, MessageBubble)
│   ├── src/store/        # Redux Toolkit slices with memoized createSelector selectors
│   ├── src/services/     # Typed API & Upload services
│   ├── src/lib/          # Socket client instance, Axios client with interceptors
│   └── src/types/        # Shared TypeScript interfaces & socket payloads
└── backend/              # Node.js, Express, Socket.io, Prisma, PostgreSQL
    ├── src/controllers/  # REST controllers (auth, conversations, media proxy, upload)
    ├── src/middlewares/  # Cookie-based auth verification & centralized logger
    ├── src/sockets/      # Authenticated Socket.io room handlers & real-time events
    ├── src/lib/          # Prisma client & color-coded terminal logger
    ├── src/types/        # Typed WebSocket payload interfaces
    └── prisma/           # PostgreSQL schema, migrations, and seed script
```

---

## 2. Quick Start & Setup

### Prerequisites
- **Node.js** 18+ and **npm**
- **PostgreSQL** running locally on port 5432 (or a remote PostgreSQL connection string)
- *(Optional)* Cloudinary credentials for cloud media storage (falls back gracefully to local uploads if omitted)

### Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env # or verify DATABASE_URL, JWT_SECRET, PORT=5000

# Run Prisma migrations & database seed
npx prisma db push
npx prisma db seed

# Start backend dev server (port 5000)
npm run dev
```

Default seeded test accounts (password for all: `password123`):
- `praveen`
- `priya`
- `rohit`
- `ananya`

### Frontend Setup
```bash
cd frontend
npm install

# Start frontend dev server (port 3000)
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to login and chat.

---

## 3. Engineering Decisions & Design Details

### A. Rendering Strategy: Server vs. Client Components
In Next.js App Router:
- **Root Layout (`src/app/layout.tsx`) & Meta (`not-found.tsx`):** Rendered as pure **Server Components** for fast initial HTML paint, meta tagging, and static asset streaming.
- **Route Guard Middleware (`src/proxy.ts`):** Edge-level route protection that inspects the `httpOnly` `token` cookie before requests hit the rendering pipeline, immediately redirecting unauthenticated users to `/login`.
- **Chat Dashboard (`src/app/page.tsx`):** Implemented as a **Client Component** wrapped in Redux and Socket providers. Because real-time chat is fundamentally stateful, interactive, and event-driven (WebSockets, local draft persistence, presence subscriptions, drag-and-drop), keeping the dashboard dynamic on the client avoids complex hydration mismatches while maintaining maximum responsiveness.

### B. Memoized Derived State with `createSelector`
To eliminate unnecessary component re-renders when other slices change, all filtered and derived state in `chatSlice.ts` uses **`createSelector`** (reselect):
- `selectActiveConversation`: Memoizes the lookup of the currently selected conversation.
- `selectActiveMessages`: Derives the message array for the active thread from the normalized `messages` dictionary.
- `selectActiveTypingUsers`: Derives active typing indicators scoped to the current conversation.
- `selectConversations` & `selectOnlineUsers`: Stable selectors preventing rerender cycles.

### C. Zero-Trust WhatsApp-Style Media Security
1. **Private Storage:** Media uploaded via Cloudinary is uploaded with `type: 'authenticated'` so raw CDN URLs (`https://res.cloudinary.com/...`) return `401/404 Access Denied` if accessed directly.
2. **Backend Streaming Proxy (`GET /api/media/:messageId`):**
   - The browser only ever sees internal paths: `/api/media/:messageId`.
   - The backend validates the `httpOnly` session token and queries PostgreSQL to ensure the requesting user is an active participant in that message's conversation.
   - If verified, the server directly pipes the image bytes with `HTTP 200 OK`.
3. **Anti-Enumeration Hardening:** If an unauthorized user or outsider attempts to access an image, the endpoint returns standard `404 Not found` (identical to a non-existent message), preventing attackers from enumerating valid message IDs or conversation members.

### D. Race Conditions & Socket Reconnect Resilience
- **Rapid Conversation Switching:** `ChatWindow.tsx` instantiates an `AbortController` in its message fetch hook. If a user quickly switches from Conversation A to B, the in-flight HTTP request for Conversation A is immediately aborted, preventing stale responses from overwriting the newer conversation.
- **Socket Disconnection & Reconnection Gap:** If network connectivity drops mid-session and Socket.io reconnects, a dedicated `connect` listener automatically re-fetches the latest messages for the active conversation, ensuring messages sent during the offline window are recovered.
- **Deduplication:** Every client send generates a unique `clientId`. The PostgreSQL schema enforces a unique composite index (`@@unique([conversationId, senderId, clientId])`), and Redux reconciles the optimistic temporary bubble with the database-confirmed record upon server acknowledgement.
- **Concurrent Forwarding & Deletion:** Forwarded messages snapshot the underlying root media asset pointer (`cloudinary://...` or file path) directly into the new message record. If the original message is later modified or deleted, the forwarded message retains its verified asset snapshot.

### E. Drag-and-Drop & Accessibility
- **Drag-to-Forward:** Messages in `MessageBubble.tsx` are native HTML5 draggables (`draggable={true}`). Users can physically drag any message bubble and drop it onto any contact card in the sidebar to forward it instantly.
- **Keyboard Alternative:** Because raw HTML5 drag-and-drop lacks a native keyboard equivalent, each bubble includes an accessible Forward button that opens a searchable contact picker modal (`ForwardModal.tsx`), ensuring full WCAG keyboard navigation.
- **Drag-and-Drop Media Upload:** Users can drag images directly from their desktop onto `Composer.tsx` to preview and attach files.
- **Accessible Inputs & Alt Text:** Composer inputs include associated screen-reader labels (`aria-label`, `<label>`), and media tags render contextual `alt` attributes.

---

## 4. Test Suite

The frontend includes automated unit and component tests built with **Vitest**, **React Testing Library**, and **jsdom**:

```bash
cd frontend
npm test
```

### Coverage:
1. **`chatSlice.test.ts` (Unit Tests):**
   - Message addition and sorting by `updatedAt`.
   - Optimistic update reconciliation and duplicate suppression via `clientId`.
   - Conversation typing state tracking and cleanup.
   - Derived memoized selectors (`selectActiveConversation`, `selectActiveMessages`, `selectActiveTypingUsers`).
2. **`Composer.test.tsx` (Component Tests):**
   - Empty input state & send button disable validation.
   - `localStorage` draft persistence and auto-restoration across sessions.
   - Typing indicator triggers.
   - File validation (rejects unsupported formats and files > 10MB).
3. **`MessageBubble.test.tsx` (Component Tests):**
   - Correct text and timestamp rendering.
   - Forwarded badge rendering on forwarded messages.
   - Accessible forward button click callback.
   - Draggable attribute verification for drag-and-forward.
   - Media attachment rendering with valid source and alt tags.
