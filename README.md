# Mail Catcher

A professional SMTP mail catching application with a full-stack Next.js management interface, role-based access control, and automated email rotation.

## 🚀 Overview

This project provides a robust solution for developers to catch and inspect outgoing emails during development and testing. It consists of a dedicated SMTP listener and a modern web dashboard to manage multiple inboxes and user permissions.

## 🏗️ Architecture & Tech Stack

The application is built using a microservices-inspired architecture, fully containerized with Docker.

### Core Services
- **SMTP Service (`/smtp-service`)**: A Node.js application using `smtp-server` to catch emails. It utilizes **Prisma ORM** to store data in MariaDB.
- **Web UI (`/web`)**: A full-stack **Next.js** application (App Router) providing the dashboard and administrative tools.
- **Database**: **MariaDB** for persistent storage of emails, users, and credentials.

### Key Technologies
- **Backend**: Next.js Server Actions, Auth.js (NextAuth), Prisma ORM.
- **Frontend**: React, **Tailwind CSS v4** (with native PostCSS), **Atomic Design**.
- **Icons**: Lucide React.
- **Storage**: MariaDB (Production), shared Docker volumes for attachments.

## 📂 Project Structure

```text
.
├── smtp-service/           # Node.js SMTP Listener
│   ├── prisma/             # Local copy of the shared schema
│   ├── index.js            # Main SMTP logic & auth
│   └── Dockerfile          # Optimized slim production image
├── web/                    # Next.js Full-stack Web App
│   ├── app/                # Next.js App Router (Pages & API)
│   ├── components/         # Atomic Design Structure
│   │   ├── atoms/          # Base UI (Button, Input, Badge, etc.)
│   │   ├── molecules/      # Composite units (ThemeToggle, NavItem)
│   │   ├── organisms/      # Complex UI blocks (Sidebar, Tables)
│   │   └── templates/      # Page layouts (ManagementLayout)
│   ├── lib/                # Shared utilities & Prisma client
│   ├── prisma/             # Schema & Seed scripts
│   └── Dockerfile          # Multi-stage production build
├── prisma/                 # Source of truth for database schema
└── docker-compose.yml      # Orchestration for DB, SMTP, and Web
```

## ✨ Key Features

- **Multi-Inbox Management**: Create multiple SMTP credentials, each acting as a separate inbox.
- **Role-Based Access (RBAC)**:
    - `ADMIN`: Full system access (manage users, inboxes, and view all mail).
    - `MAILBOX`: Restricted access (only see assigned inboxes).
- **Inbox Limits**: Configure maximum email count and storage size (MB) per inbox. The SMTP service automatically rotates/prunes old emails when limits are reached.
- **Real-time Theming**: Native Dark/Light mode support with persistent user preference.
- **Atomic UI**: A clean, consistent interface built with reusable atomic components.
- **Security**: Password hashing via `bcryptjs` and session management via `Auth.js`.

## 🛠️ Getting Started

### Prerequisites
- Docker & Docker Compose

### Run with Docker (Recommended)
1. Clone the repository.
2. Run the stack:
   ```bash
   docker compose up --build -d
   ```
3. Access the dashboard: `http://localhost:3000`
4. Default Credentials:
    - **Username**: `admin`
    - **Password**: `admin`

### Local Development
If you prefer running without Docker:
1. Ensure MariaDB is running locally and update `web/.env` with your `DATABASE_URL`.
2. Initialize the database:
   ```bash
   cd web
   npx prisma db push
   node prisma/seed.js
   ```
3. Start the web app:
   ```bash
   npm run dev
   ```
4. Start the SMTP service:
   ```bash
   cd ../smtp-service
   npm install
   node index.js
   ```

## 🔒 Security Note
The default `admin`/`admin` credentials and the `AUTH_SECRET` in `docker-compose.yml` should be changed immediately before deploying to any non-local environment.
