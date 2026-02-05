# SecureContract - Collaborative Contract Review Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.3.1-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.5-3178C6.svg)
![Node](https://img.shields.io/badge/node-18%2B-339933.svg)
![Prisma](https://img.shields.io/badge/prisma-5.17-2D3748.svg)

A real-time collaborative platform aimed at legal professionals to review, annotate, and manage contracts securely and efficiently.

## Key Features

### Modern UI/UX
- **System-Wide Dark Mode**: Fully supported dark theme that respects system preferences.
- **Responsive Design**: Optimized for desktop and tablets.
- **Glassmorphism**: Modern, clean aesthetic with backdrop blurs and smooth transitions.

### Contract Management
- **Drag & Drop Upload**: Simply drag PDF files onto the dashboard to upload.
- **Rename Contracts**: Easily rename documents directly from the dashboard.
- **Version Control**: Track changes and restore previous versions of contracts.
- **Search & Filter**: Quickly find contracts by title or status.

### Real-Time Collaboration
- **Live Cursors**: See where other users are looking in real-time.
- **Annotations**: Highlight text, add comments, and draw on contracts.
- **Threaded Comments**: Discuss specific clauses with threaded replies.
- **Role-Based Sharing**: Invite members as Viewers, Commenters, or Editors.

### Security & Performance
- **Secure Authentication**: JWT-based auth with encrypted passwords.
- **Granular Permissions**: Control exactly who can view, edit, or manage contracts.
- **Optimized PDF Rendering**: Fast loading PDF viewer with virtualization.

## Tech Stack

**Frontend:**
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Shadcn/ui
- **State**: Context API
- **PDF**: PDF.js for rendering
- **Real-time**: Socket.io + Yjs

**Backend:**
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Storage**: MinIO (S3 compatible)
- **Real-time**: Socket.io Server

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### 1. Installation

```bash
git clone <repository-url>
cd "Collaborative Contract Review Platform"

# Install dependencies
npm install --prefix client
npm install --prefix server
```

### 2. Infrastructure Setup

Start the required services (PostgreSQL, Redis, MinIO) using Docker:

```bash
docker-compose up -d
```

### 3. Configuration

**Server Environment (`server/.env`):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/ccrp_db"
JWT_SECRET="super-secret-key-change-me"
CLIENT_URL="http://localhost:5173"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin123"
S3_BUCKET="contracts"
```

**Client Environment (`client/.env`):**
```env
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
```

### 4. Database Setup

```bash
cd server
npx prisma generate
npx prisma db push
```

### 5. Running the App

**Start Backend:**
```bash
cd server
npm run dev
```

**Start Frontend:**
```bash
cd client
npm run dev
```

Access the application at **http://localhost:5173**

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/    # UI Components (Buttons, Dialogs, etc.)
│   │   ├── pages/         # Route Components (Dashboard, Editor, Auth)
│   │   ├── context/       # Global State (Auth, Theme, Toast)
│   │   └── services/      # API Integration
│   └── index.css          # Tailwind & Global Styles
│
├── server/
│   ├── src/
│   │   ├── routes/        # API Endpoints
│   │   ├── middleware/    # Auth & Validation
│   │   └── socket/        # Real-time Handlers
│   └── prisma/            # Database Schema
│
└── docker-compose.yml     # Service Orchestration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/contracts` | List user contracts |
| POST | `/api/contracts` | Upload PDF |
| PATCH | `/api/contracts/:id` | Rename contract |
| POST | `/api/permissions/:id` | Share contract |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
