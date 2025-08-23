# LookEscolar - School Photography Management System

## Overview
LookEscolar is a web application for managing school photography, including uploads, tagging, publishing, and payments integration with Mercado Pago. It uses Next.js, Supabase, and Tailwind CSS.

## Features
- Admin dashboard for photo management
- QR code generation for family access
- Gallery viewing and selection for families
- Payment processing
- Performance monitoring and security features

## Tech Stack
- Frontend: Next.js 14, React 19
- Backend: Supabase (Database, Auth, Storage)
- Styling: Tailwind CSS
- Testing: Vitest, Playwright
- Payments: Mercado Pago

## Documentation
For comprehensive documentation, see the [docs/](docs/) directory:
- [Architecture Reference](docs/ARCHITECTURE.md)
- [API Reference](docs/api-reference.md)
- [Development Guidelines](docs/development/)
- [Operations Guides](docs/operations/)
- [Resources](docs/resources/)

## Setup
1. Clone the repository: `git clone <repo-url>`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in values
4. Start development server: `npm run dev`

## Environment Variables
See `.env.example` for required variables:
- Supabase URLs and keys
- Mercado Pago credentials
- Storage bucket name

## Running Tests
- Unit tests: `npm test`
- Comprehensive tests: `npm run test:comprehensive`
- Security tests: `npm run test:security`

## Deployment
- Build: `npm run build`
- Start: `npm start`
- Docker: `npm run docker:build && npm run docker:run`

## Contribution
1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

For issues, check the docs/ folder or open a new issue.