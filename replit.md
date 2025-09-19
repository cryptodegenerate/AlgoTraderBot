# Replit Configuration

## Overview

This is a full-stack trading bot application called "Goose Alpha" - a momentum breakout bot for centralized exchanges. The application consists of a React frontend dashboard for monitoring and controlling the bot, an Express.js backend API for data management, and Python trading bot components for executing trades via CCXT. The system is designed to identify breakout signals in cryptocurrency markets and manage risk through automated position sizing and stop-loss mechanisms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **Styling**: TailwindCSS with shadcn/ui component library for consistent UI design
- **State Management**: Zustand for global state management and TanStack Query for server state
- **Real-time Updates**: WebSocket integration for live trading data and bot status updates
- **Build System**: Vite with path aliases and optimized build configuration for production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Storage Interface**: Abstract storage layer with in-memory implementation for development
- **WebSocket Support**: Built-in WebSocket server for real-time client updates
- **Development Tools**: Hot reload with Vite integration and comprehensive error handling

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for schema management
- **Schema Design**: Separate tables for trades, equity history, bot status, bot settings, positions, and OHLCV data
- **Connection**: Neon Database serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for database schema migrations and updates
- **Session Management**: PostgreSQL-based session store for user authentication

### Trading Bot Integration
- **Trading Engine**: Python-based bot using CCXT library for exchange connectivity
- **Strategy**: Momentum breakout strategy with volume confirmation and ATR-based stops
- **Risk Management**: Position sizing based on equity percentage and daily drawdown limits
- **Exchange Support**: Bybit and OKX exchanges with unified API interface
- **Execution Modes**: Live trading and dry-run simulation modes

### API Architecture
- **REST Endpoints**: Comprehensive API for bot control, settings, trades, positions, and equity data
- **Real-time Data**: WebSocket endpoints for live price feeds and trading updates
- **Data Validation**: Zod schemas for request/response validation and type safety
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **CORS Support**: Cross-origin resource sharing for frontend-backend communication

## External Dependencies

### Trading Infrastructure
- **CCXT Library**: Multi-exchange cryptocurrency trading library for order execution
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Exchange APIs**: Direct integration with Bybit and OKX for market data and trading

### Communication Services
- **Telegram Bot API**: Real-time trade alerts and notifications
- **WebSocket Protocol**: Bidirectional real-time communication between frontend and backend

### Development Tools
- **Replit Integration**: Development environment plugins for runtime error overlay and debugging
- **Vite Plugins**: Development banner and cartographer for enhanced development experience
- **Railway Deployment**: Production hosting platform with Docker support

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography throughout the application

### Utility Libraries
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Dynamic class name generation for component variants
- **Zustand**: Lightweight state management without boilerplate
- **TanStack Query**: Server state management with caching and synchronization