
# LocalPOS Pro - Production Suite

LocalPOS Pro is a multi-surface point-of-sale system designed for modern cafes and restaurants. This template provides a clean, modular foundation for scaling from a single kiosk to a multi-location enterprise.

## Features
- **Self-Service Kiosk**: Optimized for touch inputs; supports Dine-In vs Takeout.
- **Mobile Ordering (PWA)**: Tailored for customer devices; supports Pickup vs Delivery.
- **KDS (Kitchen Display System)**: Real-time kitchen management with status-bumping flow.
- **Admin Hub**: Analytics, real-time settings, and visual theme selection.

## Getting Started

### Prerequisites
- Node.js v18.0.0 or higher
- npm or yarn

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

### Scripts
- `npm run dev`: Launch the development server.
- `npm run build`: Build production-ready assets.
- `npm run start`: Preview the production build.

## Project Structure
- `config/`: Global constants, mock data, and theme definitions.
- `features/`: Core business logic and screens grouped by domain (Kiosk, KDS, Admin).
- `lib/`: Utility libraries for formatting and currency math.
- `store/`: Application state management via React Context.
- `types/`: Type definitions for shared data models.

## Deployment Notes
LocalPOS Pro is designed to be deployed as a Single Page Application (SPA). For mobile ordering, we recommend serving the `/mobile` route as a Progressive Web App (PWA).

### White Labeling
To customize the branding, edit `config/constants.ts`. You can add new themes to the `THEMES` object to enable instant rebranding via the Admin settings.
