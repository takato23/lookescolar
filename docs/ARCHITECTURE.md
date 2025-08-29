# System Architecture

This document provides an overview of the LookEscolar system architecture.

## High-Level Architecture

### Overview
LookEscolar is a web application for managing school photography, including uploads, tagging, publishing, family galleries, e-commerce (wizard-based purchases) and payments integration with Mercado Pago. It uses Next.js, Supabase, and Tailwind CSS.

### Architecture Diagram
```mermaid
graph TB
    subgraph "Frontend"
        FE[Next.js 14 + React 19] --> UI[UI Components + shadcn/ui]
        UI --> StoreFE[Unified Store & Wizard UI]
    end
    
    subgraph "Backend"
        API[API Routes]
        SUP[Supabase Services]
        MP[Mercado Pago Webhooks]
    end
    
    subgraph "Database"
        DB[(PostgreSQL)]
    end
    
    subgraph "Storage"
        STO[Supabase Storage]
        CDN[CDN]
    end
    
    FE --> API
    API --> SUP
    SUP --> DB
    SUP --> STO
    STO --> CDN
    API --> MP
    
    subgraph "Commerce"
        StoreAPI[/api/store/*, /app/f/[token]/store]
    end
    API --> StoreAPI
    StoreFE --> StoreAPI
``` 

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: React 19 + shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Zustand, TanStack Query
- **Forms**: React Hook Form + Zod

### Backend
- **Platform**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Security**: Row Level Security (RLS)

### Services
- **Payments**: Mercado Pago SDK (preferences, webhooks)
- **E-Commerce**: Unified Store Wizard (Zustand, react-hook-form)
- **Image Processing**: Sharp
- **Rate Limiting**: Upstash Redis
- **QR Codes**: zxing-wasm

### Development & Testing
- **Testing**: Vitest, Playwright
- **Linting**: ESLint, Prettier
- **Type Checking**: TypeScript
- **CI/CD**: GitHub Actions

## Core Components

### Admin Dashboard
- Event management
- Photo upload and processing
- Subject tagging
- Order management
- Analytics and reporting

### Family Portal
- Token-based access
- Photo gallery viewing
- Shopping cart & wizard flow
- Checkout process
- Order tracking

### Photo Management System
- Upload processing pipeline (watermark + dedupe)
- Subject tagging
- Approval workflow
- Storage management

### E-Commerce Store
- Unified Store Wizard (`components/store/UnifiedStore.tsx`)
- Preference creation: `/api/store/create-preference`
- Webhooks: `/api/webhooks/mercadopago/route.ts`
- Order lookup: `/api/store/orders/[orderId]`

### Payment System
- Mercado Pago integration
- Webhook handling
- Order status synchronization
- Receipt generation

## Data Flow
...
