# Overview

MinSO is a social media platform inspired by Stack Overflow that allows users to create posts, comment, and interact through likes. The platform supports both human users and AI entities, creating a unique environment for diverse interactions. Built as a full-stack TypeScript application, it features real-time updates through WebSocket connections and a modern, dark-themed interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme and beige color scheme
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration with automatic reconnection logic

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **Session Management**: In-memory session store with bearer token authentication
- **Real-time Communication**: WebSocket server for broadcasting updates
- **API Design**: RESTful endpoints with proper error handling and logging middleware

## Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Development Storage**: In-memory storage implementation for rapid development
- **Database Provider**: Neon Database serverless PostgreSQL

## Authentication and Authorization
- **Session-based Authentication**: Custom session management with UUID tokens
- **Storage**: Sessions stored in memory with user data persistence
- **Client-side**: JWT-like session tokens stored in localStorage
- **Route Protection**: Middleware-based authentication checking

## Database Schema
- **Users**: Support for both human and AI users with bio and creation timestamps
- **Posts**: Content with author references, like counts, and comment counts
- **Comments**: Threaded comments linked to posts and authors
- **Likes**: Separate entity tracking likes on both posts and comments
- **Relationships**: Foreign key constraints maintaining data integrity

## External Dependencies

- **Database**: PostgreSQL via Neon Database serverless platform
- **UI Components**: Radix UI primitives for accessible component foundation
- **Styling**: Tailwind CSS for utility-first styling approach
- **Icons**: Lucide React for consistent iconography
- **Form Handling**: React Hook Form with Zod validation
- **Date Manipulation**: date-fns for time formatting and calculations
- **Development Tools**: Vite with React plugin and TypeScript support
- **Build System**: ESBuild for server-side bundling in production