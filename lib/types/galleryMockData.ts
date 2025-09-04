// Category types for image gallery filtering
export enum CategoryType {
  ALL = 'todas',
  CATEGORY_1 = 'categoria_1',
  CATEGORY_2 = 'categoria_2', 
  CATEGORY_3 = 'categoria_3',
  CATEGORY_4 = 'categoria_4',
  CATEGORY_5 = 'categoria_5',
  CATEGORY_6 = 'categoria_6'
}

// Property types for real estate listings
export enum PropertyType {
  HOUSE = 'house',
  APARTMENT = 'apartment',
  CONDO = 'condo'
}

// Image layout types
export enum ImageLayoutType {
  GRID = 'grid',
  CAROUSEL = 'carousel',
  MASONRY = 'masonry'
}

// Format category display names
export const formatCategoryName = (category: CategoryType): string => {
  const categoryMap = {
    [CategoryType.ALL]: 'Todas',
    [CategoryType.CATEGORY_1]: 'Categoría 1',
    [CategoryType.CATEGORY_2]: 'Categoría 2',
    [CategoryType.CATEGORY_3]: 'Categoría 3', 
    [CategoryType.CATEGORY_4]: 'Categoría 4',
    [CategoryType.CATEGORY_5]: 'Categoría 5',
    [CategoryType.CATEGORY_6]: 'Categoría 6'
  };
  return categoryMap[category] || category;
};

// Format pagination display
export const formatPaginationText = (currentPage: number, totalPages: number): string => {
  return `Página ${currentPage} de ${totalPages}`;
};

// Format property location
export const formatPropertyLocation = (city: string, state: string, country: string): string => {
  return `${city}, ${state}, ${country}`;
};

// Props types for gallery components
export interface GalleryProps {
  categories: CategoryData[];
  images: ImageData[];
  currentCategory: CategoryType;
  pagination: PaginationData;
  onCategoryChange: (category: CategoryType) => void;
  onPageChange: (page: number) => void;
}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface ImageData {
  id: string;
  src: string;
  alt: string;
  category: string;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Props types for mobile interface
export interface MobileInterfaceProps {
  user: UserData;
  galleries: GalleryCollection[];
}

export interface UserData {
  name: string;
  avatar: string;
}

export interface GalleryCollection {
  id: string;
  title: string;
  imageCount: number;
  coverImage: string;
}

// Props types for property listing
export interface PropertyListingProps {
  property: PropertyData;
  onImageClick: (imageId: string) => void;
  onViewAllImages: () => void;
}

export interface PropertyData {
  title: string;
  location: LocationData;
  images: PropertyImage[];
  totalImages: number;
}

export interface LocationData {
  city: string;
  state: string;
  country: string;
}

export interface PropertyImage {
  id: string;
  src: string;
  alt: string;
  type: string;
}

// Mock data for gallery categories and images
export const mockGalleryData = {
  categories: [
    { id: 'todas', name: 'Todas', color: '#000000', count: 425 },
    { id: 'categoria_1', name: 'Categoría 1', color: '#E879F9', count: 85 },
    { id: 'categoria_2', name: 'Categoría 2', color: '#F472B6', count: 92 },
    { id: 'categoria_3', name: 'Categoría 3', color: '#FB923C', count: 78 },
    { id: 'categoria_4', name: 'Categoría 4', color: '#FBBF24', count: 65 },
    { id: 'categoria_5', name: 'Categoría 5', color: '#22D3EE', count: 55 },
    { id: 'categoria_6', name: 'Categoría 6', color: '#34D399', count: 50 }
  ],
  images: [
    { id: '1', src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop', category: 'categoria_1', alt: 'Forest scene' },
    { id: '2', src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop', category: 'categoria_2', alt: 'Tree branches' },
    { id: '3', src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', category: 'categoria_3', alt: 'Mountain landscape' },
    { id: '4', src: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop', category: 'categoria_4', alt: 'Forest path' },
    { id: '5', src: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&h=300&fit=crop', category: 'categoria_5', alt: 'Green foliage' },
    { id: '6', src: 'https://images.unsplash.com/photo-1574263867128-a3d5c1b1deaa?w=400&h=300&fit=crop', category: 'categoria_6', alt: 'Fern leaves' },
    { id: '7', src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop', category: 'categoria_1', alt: 'Tall trees' },
    { id: '8', src: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop', category: 'categoria_2', alt: 'Forest sunlight' }
  ],
  pagination: {
    currentPage: 2,
    totalPages: 425,
    hasNext: true,
    hasPrev: true
  }
};

// Mock data for mobile app interface
export const mockMobileData = {
  user: {
    name: 'John',
    avatar: 'https://i.pravatar.cc/150?img=1'
  },
  galleries: [
    { id: '1', title: 'Nature Collection', imageCount: 24, coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop' },
    { id: '2', title: 'Urban Shots', imageCount: 18, coverImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300&h=300&fit=crop' }
  ]
};

// Mock data for real estate property
export const mockPropertyData = {
  title: 'Large Family House for Sale',
  location: {
    city: 'California City',
    state: 'CA', 
    country: 'USA'
  },
  images: [
    { id: '1', src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop', alt: 'Modern house exterior', type: 'exterior' },
    { id: '2', src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop', alt: 'Bedroom interior', type: 'bedroom' },
    { id: '3', src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop', alt: 'Modern kitchen', type: 'kitchen' },
    { id: '4', src: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop', alt: 'Bathroom', type: 'bathroom' },
    { id: '5', src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop', alt: 'Traditional house', type: 'exterior' },
    { id: '6', src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop', alt: 'Office space', type: 'office' },
    { id: '7', src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop', alt: 'Bedroom with blue accents', type: 'bedroom' },
    { id: '8', src: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&h=400&fit=crop', alt: 'Living room', type: 'living' },
    { id: '9', src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop', alt: 'Kitchen island', type: 'kitchen' }
  ],
  totalImages: 45
};