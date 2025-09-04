// Enums for gallery categories and filter states
export enum CategoryType {
  ALL = 'todas',
  CATEGORY_1 = 'categoria-1',
  CATEGORY_2 = 'categoria-2', 
  CATEGORY_3 = 'categoria-3',
  CATEGORY_4 = 'categoria-4',
  CATEGORY_5 = 'categoria-5',
  CATEGORY_6 = 'categoria-6'
}

export enum FilterState {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export const formatPageInfo = (currentPage: number, totalPages: number): string => {
  return `Página ${currentPage} de ${totalPages}`;
};

export const formatCategoryLabel = (category: CategoryType): string => {
  const labels = {
    [CategoryType.ALL]: 'Todas',
    [CategoryType.CATEGORY_1]: 'Categoría 1',
    [CategoryType.CATEGORY_2]: 'Categoría 2',
    [CategoryType.CATEGORY_3]: 'Categoría 3',
    [CategoryType.CATEGORY_4]: 'Categoría 4',
    [CategoryType.CATEGORY_5]: 'Categoría 5',
    [CategoryType.CATEGORY_6]: 'Categoría 6'
  };
  return labels[category] || category;
};

// Props types for gallery components
export interface GalleryProps {
  currentPage: number;
  totalPages: number;
  categories: CategoryItem[];
  images: ImageItem[];
  onCategoryChange: (categoryId: string) => void;
  onPageChange: (page: number) => void;
}

// Store types for gallery state
export interface GalleryStoreState {
  selectedCategory: string;
  currentPage: number;
  totalPages: number;
  images: ImageItem[];
  categories: CategoryItem[];
  isLoading: boolean;
}

// API response types
export interface GalleryApiResponse {
  images: ImageItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  categories: CategoryItem[];
}

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface ImageItem {
  id: string;
  src: string;
  category: string;
  alt: string;
}

// Mock data for gallery interface
export const mockGalleryData = {
  currentPage: 2,
  totalPages: 425,
  categories: [
    { id: 'todas', name: 'Todas', color: '#000000', active: true },
    { id: 'categoria-1', name: 'Categoría 1', color: '#E879F9', active: false },
    { id: 'categoria-2', name: 'Categoría 2', color: '#FB7185', active: false },
    { id: 'categoria-3', name: 'Categoría 3', color: '#FBBF24', active: false },
    { id: 'categoria-4', name: 'Categoría 4', color: '#34D399', active: false },
    { id: 'categoria-5', name: 'Categoría 5', color: '#60A5FA', active: false },
    { id: 'categoria-6', name: 'Categoría 6', color: '#A78BFA', active: false }
  ],
  images: [
    {
      id: 'img-1',
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
      category: 'categoria-1',
      alt: 'Forest scene with moss-covered tree'
    },
    {
      id: 'img-2', 
      src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop',
      category: 'categoria-2',
      alt: 'Tree roots and forest floor'
    },
    {
      id: 'img-3',
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', 
      category: 'categoria-3',
      alt: 'Moss and lichen on tree bark'
    },
    {
      id: 'img-4',
      src: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop',
      category: 'categoria-4', 
      alt: 'Dense forest with tall trees'
    },
    {
      id: 'img-5',
      src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop',
      category: 'categoria-5',
      alt: 'Forest canopy and branches'
    },
    {
      id: 'img-6',
      src: 'https://images.unsplash.com/photo-1574263867128-b8a2b6c6e5b5?w=400&h=300&fit=crop',
      category: 'categoria-6',
      alt: 'Green fern leaves in forest'
    },
    {
      id: 'img-7',
      src: 'https://images.unsplash.com/photo-1516298773066-c48f8e9bd92b?w=400&h=300&fit=crop',
      category: 'categoria-1',
      alt: 'Sunlight through forest trees'
    },
    {
      id: 'img-8',
      src: 'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=400&h=300&fit=crop',
      category: 'categoria-2',
      alt: 'Dark forest with tall tree trunks'
    }
  ]
};