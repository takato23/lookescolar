# Asset Management Guidelines

This document provides guidelines for managing images and other assets in the LookEscolar system.

## Image Structure
- `icons/` - Navigation icons (24x24, 32x32, 48x48px)
- `logos/` - Project logos (multiple sizes)
- `decorative/` - Decorative elements (stars, effects)
- `mockups/` - Images for mockups and demos

## Naming Convention
- Use kebab-case: `dashboard-icon.png`
- Include size if relevant: `logo-128.png`
- Preferred format: PNG with transparency

## Recommended Sizes
- Small icons: 24x24, 32x32px
- Medium icons: 48x48, 64x64px  
- Logos: 128x128, 256x256px
- Decorative: as needed

## Optimization
- Maximum weight: 10KB per icon
- Use TinyPNG.com for compression
- Maintain transparency when needed

## Photo Management

### Upload Guidelines
- Maximum file size: 10MB
- Supported formats: JPEG, PNG, WebP
- Recommended resolution: 1600px on longest side
- Color profile: sRGB

### Processing
- Automatic watermarking applied
- Conversion to WebP for web delivery
- Thumbnail generation for gallery views
- Storage in separate buckets for security

### Storage
- Original photos: Private storage bucket
- Processed photos: Public CDN-ready bucket
- Backup: Automated storage redundancy

## Brand Assets

### Logo Usage
- Primary logo: Full color version
- Secondary logo: Monochrome version for dark backgrounds
- Favicon: 32x32px version

### Color Palette
- Primary: #3B82F6 (Blue)
- Secondary: #10B981 (Green)
- Accent: #8B5CF6 (Purple)
- Background: #F9FAFB (Light Gray)
- Text: #1F2937 (Dark Gray)

### Typography
- Primary: Inter (system font stack)
- Headings: Bold weight
- Body: Regular weight
- Monospace: For code examples

## Third-Party Assets

### Icon Libraries
- Lucide Icons for interface icons
- Custom icons should match style of existing icons

### Illustrations
- Consistent style and color palette
- Optimized for web use
- Accessible with appropriate alt text

## CDN and Delivery

### Content Delivery
- Images served through CDN for performance
- Proper caching headers set
- Compression enabled (gzip, Brotli)

### Responsive Images
- Multiple sizes provided for different devices
- Appropriate image sizing for display context
- Lazy loading implemented for galleries

## Accessibility

### Image Alt Text
- Descriptive alt text for all content images
- Empty alt text for decorative images
- Functional images describe their purpose

### Color Contrast
- Ensure sufficient contrast for text overlays
- Test color combinations for accessibility
- Provide alternatives for color-dependent information

## Version Control

### Asset Versioning
- Version major asset updates
- Maintain backward compatibility when possible
- Document breaking changes in asset structure

### Asset Updates
- Review and update assets quarterly
- Replace outdated images and illustrations
- Optimize existing assets for better performance