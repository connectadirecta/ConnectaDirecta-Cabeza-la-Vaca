# Overview

This project is a senior care platform called "CuidadoSenior" designed to connect elderly users, family members, and municipal professionals. The platform provides accessible interfaces for elderly users to interact with an AI assistant, manage reminders, and communicate with their support network. Family members can monitor their elderly relatives' activities and manage care coordination, while professionals can oversee multiple users to ensure their wellbeing.

The application is built as a full-stack web application with a React frontend and Express.js backend, featuring role-based authentication and specialized user interfaces optimized for different user types.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side application is built with **React** and **TypeScript**, using **Vite** as the build tool. The architecture follows a component-based design with:

- **UI Components**: Utilizes shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React Context for authentication state, TanStack Query for server state management
- **Routing**: wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

The frontend is organized into role-specific pages (elderly, family, professional) with tailored interfaces for each user type. Elderly users get large buttons, simplified navigation, and accessibility features including Text-to-Speech (TTS) with automatic reading and manual controls, while family and professional users have more detailed dashboards with monitoring capabilities.

## Backend Architecture
The server-side is built with **Express.js** and **TypeScript**, following a RESTful API design:

- **Database Layer**: Drizzle ORM with PostgreSQL using Neon Database
- **Storage Pattern**: Interface-based storage layer with in-memory implementation for development
- **Authentication**: Session-based authentication with PIN-based login for elderly users
- **API Structure**: RESTful endpoints organized by resource type (auth, users, reminders, messages, activities)

## Database Design
The schema includes five main entities:
- **Users**: Stores user information with role-based access (elderly, family, professional)
- **Reminders**: Medicine, appointment, and activity reminders with scheduling
- **Messages**: Communication between users with read status tracking
- **Activities**: User activity logging for monitoring
- **Chat Sessions**: AI conversation history storage

## Authentication System
The application implements role-based authentication with three access levels:
- **Elderly Users**: PIN-based authentication (4-digit codes) for accessibility
- **Family Members**: Standard email/password authentication
- **Professionals**: Standard email/password authentication with administrative privileges

Each role has distinct UI flows and permissions, with elderly users getting simplified interfaces and professionals having oversight capabilities.

## AI Integration
The platform includes an AI virtual assistant powered by OpenAI API with advanced function calling capabilities for:
- Conversational interactions with elderly users tailored to cognitive levels
- Cognitive exercises and memory games with difficulty adaptation  
- Real-time database integration for reminders and medications
- Emergency detection and health alert monitoring
- Simple question answering and companionship
- Text-to-Speech integration with automatic reading of AI responses for accessibility

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **express**: Web server framework
- **react**: Frontend UI framework
- **@tanstack/react-query**: Server state management and caching

## UI and Design System
- **@radix-ui/react-***: Accessible UI primitives for components
- **tailwindcss**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

## Development and Build Tools
- **vite**: Frontend build tool and dev server
- **typescript**: Type safety and development experience
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

## Specialized Libraries
- **wouter**: Lightweight React router
- **react-hook-form**: Form handling and validation
- **date-fns**: Date manipulation and formatting
- **zod**: Schema validation
- **connect-pg-simple**: PostgreSQL session store for Express

The application is designed to run in both development and production environments, with special considerations for Replit deployment including runtime error overlays and development banners.