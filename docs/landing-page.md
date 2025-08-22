# Landing Page Documentation

## Overview

The landing page is the main entry point for the LookEscolar platform, providing two distinct access paths:

1. **Admin Dashboard Access** - For photographers and administrators to manage school events, photos, and orders
2. **Customer Access** - For families to access their private photo galleries using a token or QR code

## Structure

The landing page is composed of several key sections:

### 1. Header Navigation
- Logo and brand name
- Navigation links for features, how it works, and testimonials
- Admin access button

### 2. Hero Section
- Compelling headline and subheading
- Primary CTA button for admin dashboard access
- Secondary CTA for viewing a demo
- Token access form for customer access

### 3. Features Section
Highlights the platform's key benefits:
- Security (100% secure photo sharing)
- Simplicity (easy workflow for photographers)
- Premium Experience (beautiful gallery interface for families)

### 4. How It Works Section
Visual explanation of the 3-step process:
1. Photographer creates event and uploads photos
2. System generates unique QR codes for each student
3. Families access galleries and make purchases securely

### 5. Testimonials Section
Real feedback from photographers using the platform:
- Customer quotes with star ratings
- Photographer names and locations

### 6. Final CTA Section
Reinforcement of the value proposition with a prominent admin dashboard access button.

### 7. Footer
Standard footer with logo, quick links, and copyright information.

## Components

### TokenAccessForm
The main component for customer access, allowing families to enter their token or scan a QR code.

Props: None

Features:
- Token validation with real-time feedback
- QR code scanning (coming soon)
- Redirect to gallery on successful validation
- Error handling for invalid tokens

### ScrollHeader
Navigation header with scroll effects using the existing component.

### Card
Glass card components with variants for features and testimonials using the existing component.

### Button
Apple-grade buttons with multiple variants using the existing component.

## Routes

- `/landing` - Main landing page
- `/` - Redirects to `/landing`

## API Integration

The landing page integrates with the following API endpoints:

- `GET /api/family/validate-token/[token]` - Validates family tokens and returns event information for redirection

## Styling

The landing page uses the existing design system with:

- Apple-grade UI with liquid glass effects
- Sophisticated backdrop blur and smooth animations
- Responsive design that works beautifully on mobile and desktop
- WCAG AAA compliant color scheme and typography

## Accessibility

The landing page follows accessibility best practices:

- Semantic HTML structure
- Proper ARIA attributes for interactive elements
- Keyboard navigation support
- Sufficient color contrast ratios (AAA compliance)
- Screen reader-friendly content

## Performance

The landing page is optimized for performance:

- Optimized assets with multiple resolutions
- Code splitting for JavaScript bundles
- Server-side rendering for initial content
- Lazy loading for non-critical components

## Security

The landing page implements security measures:

- Token validation on the server side
- Rate limiting for token entry attempts
- Secure redirect implementation
- Integration with existing middleware security measures