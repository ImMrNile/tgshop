// contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Типы для товаров
interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  color?: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: string;
  oldPrice?: string;
  currentPrice: string;
  images: string[];
  variants: ProductVariant[];
}

// Типы для корзины
interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

// Типы для состояния
interface AppState {
  cart: CartItem[];
  favorites: Product[];
  cartTotal: number;
  cartCount: number;
  favoritesCount: number;
}

// Типы для действий
type AppAction =
  | { type: 'ADD_TO_CART'; payload: { product: Product; variant: ProductVariant; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string } // ID корзины
  | { type: 'UPDATE_CART_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_TO_FAVORITES'; payload: Product }
  | { type: 'REMOVE_FROM_FAVORITES'; payload: string } // ID товара
  | { type: 'LOAD_STATE'; payload: AppState };

// Функция для создания ID элемента корзины
const createCartItemId = (productId: string, variantId: string): string => {
  return `${productId}-${variantId}`;
};

// Функция для расчета общей суммы корзины
const calculateCartTotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => {
    const price = parseFloat(item.product.currentPrice);
    return total + (price * item.quantity);
  }, 0);
};

// Редьюсер для управления состоянием
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const { product, variant, quantity } = action.payload;
      const itemId = createCartItemId(product.id, variant.id);
      
      // Проверяем, есть ли уже такой товар в корзине
      const existingItemIndex = state.cart.findIndex(item => 
        createCartItemId(item.product.id, item.variant.id) === itemId
      );
      
      let newCart: CartItem[];
      
      if (existingItemIndex >= 0) {
        // Обновляем количество существующего товара
        newCart = state.cart.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Добавляем новый товар
        newCart = [...state.cart, { product, variant, quantity }];
      }
      
      const newTotal = calculateCartTotal(newCart);
      const newCount = newCart.reduce((count, item) => count + item.quantity, 0);
      
      return {
        ...state,
        cart: newCart,
        cartTotal: newTotal,
        cartCount: newCount
      };
    }
    
    case 'REMOVE_FROM_CART': {
      const itemId = action.payload;
      const newCart = state.cart.filter(item => 
        createCartItemId(item.product.id, item.variant.id) !== itemId
      );
      
      const newTotal = calculateCartTotal(newCart);
      const newCount = newCart.reduce((count, item) => count + item.quantity, 0);
      
      return {
        ...state,
        cart: newCart,
        cartTotal: newTotal,
        cartCount: newCount
      };
    }
    
    case 'UPDATE_CART_QUANTITY': {
      const { itemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return appReducer(state, { type: 'REMOVE_FROM_CART', payload: itemId });
      }
      
      const newCart = state.cart.map(item => {
        const currentItemId = createCartItemId(item.product.id, item.variant.id);
        return currentItemId === itemId ? { ...item, quantity } : item;
      });
      
      const newTotal = calculateCartTotal(newCart);
      const newCount = newCart.reduce((count, item) => count + item.quantity, 0);
      
      return {
        ...state,
        cart: newCart,
        cartTotal: newTotal,
        cartCount: newCount
      };
    }
    
    case 'CLEAR_CART': {
      return {
        ...state,
        cart: [],
        cartTotal: 0,
        cartCount: 0
      };
    }
    
    case 'ADD_TO_FAVORITES': {
      const product = action.payload;
      const isAlreadyFavorite = state.favorites.some(fav => fav.id === product.id);
      
      if (isAlreadyFavorite) {
        return state;
      }
      
      const newFavorites = [...state.favorites, product];
      
      return {
        ...state,
        favorites: newFavorites,
        favoritesCount: newFavorites.length
      };
    }
    
    case 'REMOVE_FROM_FAVORITES': {
      const productId = action.payload;
      const newFavorites = state.favorites.filter(fav => fav.id !== productId);
      
      return {
        ...state,
        favorites: newFavorites,
        favoritesCount: newFavorites.length
      };
    }
    
    case 'LOAD_STATE': {
      return action.payload;
    }
    
    default:
      return state;
  }
};

// Начальное состояние
const initialState: AppState = {
  cart: [],
  favorites: [],
  cartTotal: 0,
  cartCount: 0,
  favoritesCount: 0
};

// Контекст
const AppContext = createContext<{
  state: AppState;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  updateCartQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  addToFavorites: (product: Product) => void;
  removeFromFavorites: (productId: string) => void;
  toggleFavorite: (product: Product) => void;
  isInFavorites: (productId: string) => boolean;
  getCartItemId: (productId: string, variantId: string) => string;
} | undefined>(undefined);

// Константы для localStorage
const STORAGE_KEYS = {
  CART: 'elite_app_cart',
  FAVORITES: 'elite_app_favorites'
};

// Провайдер контекста
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Загрузка состояния из localStorage при инициализации
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
      const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      
      const cart: CartItem[] = savedCart ? JSON.parse(savedCart) : [];
      const favorites: Product[] = savedFavorites ? JSON.parse(savedFavorites) : [];
      
      const cartTotal = calculateCartTotal(cart);
      const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
      const favoritesCount = favorites.length;
      
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          cart,
          favorites,
          cartTotal,
          cartCount,
          favoritesCount
        }
      });
    } catch (error) {
      console.error('Ошибка при загрузке данных из localStorage:', error);
    }
  }, []);
  
  // Сохранение корзины в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(state.cart));
    } catch (error) {
      console.error('Ошибка при сохранении корзины:', error);
    }
  }, [state.cart]);
  
  // Сохранение избранного в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites));
    } catch (error) {
      console.error('Ошибка при сохранении избранного:', error);
    }
  }, [state.favorites]);
  
  // Функции для работы с корзиной
  const addToCart = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: { product, variant, quantity }
    });
  };
  
  const removeFromCart = (productId: string, variantId: string) => {
    const itemId = createCartItemId(productId, variantId);
    dispatch({
      type: 'REMOVE_FROM_CART',
      payload: itemId
    });
  };
  
  const updateCartQuantity = (productId: string, variantId: string, quantity: number) => {
    const itemId = createCartItemId(productId, variantId);
    dispatch({
      type: 'UPDATE_CART_QUANTITY',
      payload: { itemId, quantity }
    });
  };
  
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  
  // Функции для работы с избранным
  const addToFavorites = (product: Product) => {
    dispatch({
      type: 'ADD_TO_FAVORITES',
      payload: product
    });
  };
  
  const removeFromFavorites = (productId: string) => {
    dispatch({
      type: 'REMOVE_FROM_FAVORITES',
      payload: productId
    });
  };
  
  const toggleFavorite = (product: Product) => {
    const isCurrentlyFavorite = state.favorites.some(fav => fav.id === product.id);
    
    if (isCurrentlyFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };
  
  const isInFavorites = (productId: string): boolean => {
    return state.favorites.some(fav => fav.id === productId);
  };
  
  const getCartItemId = (productId: string, variantId: string): string => {
    return createCartItemId(productId, variantId);
  };
  
  const value = {
    state,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isInFavorites,
    getCartItemId
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Хук для использования контекста
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp должен использоваться внутри AppProvider');
  }
  return context;
};