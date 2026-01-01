/**
 * Placeholder Images Configuration
 *
 * High-quality SVG placeholder images styled like Pixieset galleries.
 * Use these as fallbacks when real images are not available.
 */

export const PLACEHOLDER_IMAGES = {
  // Hero Banners
  heroes: {
    groupPrimary: '/placeholders/heroes/hero-banner-group-primary.svg',
    studentPortrait: '/placeholders/heroes/hero-banner-student-portrait.svg',
  },

  // Product Mockups
  mockups: {
    printPackage: '/placeholders/mockups/print-package.svg',
    framedPhoto: '/placeholders/mockups/framed-photo.svg',
    schoolFolderOpen: '/placeholders/mockups/school-folder-open.svg',
    galleryOnMobile: '/placeholders/mockups/gallery-on-mobile.svg',
  },

  // Gallery Placeholders
  gallery: {
    portraitGirl: '/placeholders/gallery/portrait-girl.svg',
    portraitBoy: '/placeholders/gallery/portrait-boy.svg',
    candidActivity: '/placeholders/gallery/candid-activity.svg',
    classPhoto: '/placeholders/gallery/class-photo.svg',
  },

  // Textures
  textures: {
    paperLight: '/placeholders/textures/paper-light.svg',
  },

  // Icons - Products
  icons: {
    downloadDigital: '/placeholders/icons/download-digital.svg',
    printPhotos: '/placeholders/icons/print-photos.svg',
    packageGift: '/placeholders/icons/package-gift.svg',
    // How It Works steps
    stepView: '/placeholders/icons/step-view.svg',
    stepSelect: '/placeholders/icons/step-select.svg',
    stepReceive: '/placeholders/icons/step-receive.svg',
  },

  // Decorations
  decorations: {
    brushUnderline: '/placeholders/decorations/brush-underline.svg',
    brushUnderlineGold: '/placeholders/decorations/brush-underline-gold.svg',
  },

  // Illustrations
  illustrations: {
    emptyGallery: '/placeholders/illustrations/empty-gallery.svg',
  },

  // Avatars for testimonials
  avatars: {
    warm: '/placeholders/avatars/avatar-warm.svg',
    cool: '/placeholders/avatars/avatar-cool.svg',
    sage: '/placeholders/avatars/avatar-sage.svg',
    rose: '/placeholders/avatars/avatar-rose.svg',
  },

  // Frame overlays
  frames: {
    passepartoutWhite: '/placeholders/frames/passepartout-white.svg',
    passepartoutCream: '/placeholders/frames/passepartout-cream.svg',
  },

  // Legacy placeholders
  legacy: {
    school1: '/placeholders/school-1.png',
    placeholder: '/placeholder-image.svg',
  },
} as const;

/**
 * Get a random gallery placeholder image
 */
export function getRandomGalleryPlaceholder(): string {
  const galleryImages = Object.values(PLACEHOLDER_IMAGES.gallery);
  return galleryImages[Math.floor(Math.random() * galleryImages.length)];
}

/**
 * Get placeholder based on photo type
 */
export function getPlaceholderByType(type: 'portrait' | 'group' | 'candid' | 'class'): string {
  switch (type) {
    case 'portrait':
      return Math.random() > 0.5
        ? PLACEHOLDER_IMAGES.gallery.portraitGirl
        : PLACEHOLDER_IMAGES.gallery.portraitBoy;
    case 'group':
      return PLACEHOLDER_IMAGES.gallery.classPhoto;
    case 'candid':
      return PLACEHOLDER_IMAGES.gallery.candidActivity;
    case 'class':
      return PLACEHOLDER_IMAGES.gallery.classPhoto;
    default:
      return getRandomGalleryPlaceholder();
  }
}

/**
 * Get hero banner for template
 */
export function getHeroBanner(style: 'warm' | 'minimal' = 'warm'): string {
  return style === 'minimal'
    ? PLACEHOLDER_IMAGES.heroes.studentPortrait
    : PLACEHOLDER_IMAGES.heroes.groupPrimary;
}

/**
 * Get product mockup image
 */
export function getProductMockup(product: 'package' | 'frame' | 'folder' | 'mobile'): string {
  switch (product) {
    case 'package':
      return PLACEHOLDER_IMAGES.mockups.printPackage;
    case 'frame':
      return PLACEHOLDER_IMAGES.mockups.framedPhoto;
    case 'folder':
      return PLACEHOLDER_IMAGES.mockups.schoolFolderOpen;
    case 'mobile':
      return PLACEHOLDER_IMAGES.mockups.galleryOnMobile;
    default:
      return PLACEHOLDER_IMAGES.mockups.printPackage;
  }
}

/**
 * Get icon for product type
 */
export function getProductIcon(type: 'digital' | 'print' | 'package'): string {
  switch (type) {
    case 'digital':
      return PLACEHOLDER_IMAGES.icons.downloadDigital;
    case 'print':
      return PLACEHOLDER_IMAGES.icons.printPhotos;
    case 'package':
      return PLACEHOLDER_IMAGES.icons.packageGift;
    default:
      return PLACEHOLDER_IMAGES.icons.downloadDigital;
  }
}

/**
 * Get step icon for "How It Works" section
 */
export function getStepIcon(step: 1 | 2 | 3 | number): string {
  switch (step) {
    case 1:
      return PLACEHOLDER_IMAGES.icons.stepView;
    case 2:
      return PLACEHOLDER_IMAGES.icons.stepSelect;
    case 3:
      return PLACEHOLDER_IMAGES.icons.stepReceive;
    default:
      return PLACEHOLDER_IMAGES.icons.stepView;
  }
}

/**
 * Get random avatar for testimonials
 */
export function getRandomAvatar(): string {
  const avatars = Object.values(PLACEHOLDER_IMAGES.avatars);
  return avatars[Math.floor(Math.random() * avatars.length)];
}

/**
 * Get avatar by index (for consistent ordering)
 */
export function getAvatarByIndex(index: number): string {
  const avatars = Object.values(PLACEHOLDER_IMAGES.avatars);
  return avatars[index % avatars.length];
}

export type PlaceholderImageKey = keyof typeof PLACEHOLDER_IMAGES;
