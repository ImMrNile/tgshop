// pages/index.tsx - ИСПРАВЛЕНО
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../components/AuthProvider';
import { Order, OrderStatus } from '@prisma/client'; // Импортируем Order и OrderStatus
import { 
  FaShoppingCart, FaUser, FaHome, FaHeart, 
  FaSearch, FaRedo, FaStore, FaArrowRight, FaShippingFast // Добавлены FaArrowRight, FaShippingFast
} from 'react-icons/fa'; // Импорт иконок
import styles from '../styles/HomePage.module.css'; // Убедитесь, что этот файл существует и содержит стили

// Интерфейс для продукта (из pages/products/[id].tsx)
interface Product {
  id: string;
  name: string;
  brand?: string;
  currentPrice: string;
  oldPrice?: string;
  images: string[];
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [shippedOrders, setShippedOrders] = useState<Order[]>([]); // Состояние для заказов в пути
  const [ordersLoading, setOrdersLoading] = useState(true); // Состояние загрузки заказов

  // Функция для загрузки товаров
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await fetch('/api/products'); // Запрос к API товаров
      if (!res.ok) {
        throw new Error(`Ошибка загрузки товаров: ${res.status}`);
      }
      const data: Product[] = await res.json();
      setProducts(data);
    } catch (err: unknown) {
      setProductsError(err instanceof Error ? err.message : 'Неизвестная ошибка при загрузке товаров');
      console.error('Failed to fetch products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Функция для загрузки заказов пользователя (для плашки)
  const fetchShippedOrders = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setShippedOrders([]); // Очищаем, если пользователь не авторизован
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/orders', { // Используем новый API для заказов пользователя
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Ошибка загрузки заказов для уведомления: ${res.status}`);
      }
      const ordersData: Order[] = await res.json();
      const shipped = ordersData.filter(order => order.status === OrderStatus.SHIPPED);
      setShippedOrders(shipped);
    } catch (err) {
      console.error("Не удалось загрузить заказы для уведомления:", err);
      setShippedOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [isAuthenticated, user]);

  // Загрузка продуктов и заказов при монтировании компонента или изменении состояния авторизации
  useEffect(() => {
    if (isAuthenticated && !isAdmin) { 
      fetchProducts();
      fetchShippedOrders();
    } else if (!isAuthenticated) {
      setProducts([]); // Очищаем продукты, если не авторизован
      setShippedOrders([]); // Очищаем заказы, если не авторизован
    }
  }, [isAuthenticated, isAdmin, fetchProducts, fetchShippedOrders]);

  // Логика перенаправления для админов и неавторизованных
  useEffect(() => {
    if (!isLoading) {
      console.log('HomePage: Auth status loaded:', { isAuthenticated, isAdmin, user: user?.telegramId });
      
      if (isAuthenticated && isAdmin) {
        console.log('HomePage: Redirecting admin to /admin');
        window.location.href = '/admin'; // Принудительное перенаправление
        return;
      }
      
      if (!isAuthenticated) {
        console.log('HomePage: User not authenticated, displaying welcome/login message.');
        // Для неавторизованных пользователей будет показан экран ниже
        return;
      }
      // Если пользователь авторизован, но не админ, он останется на этой странице с каталогом
    }
  }, [isLoading, isAuthenticated, isAdmin, user]);

  // Экран загрузки авторизации
  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner}>🛍️</div>
        <h1 className={styles.loadingTitle}>Hedonist</h1>
        <p className={styles.loadingMessage}>Проверка авторизации...</p>
        <div className={styles.loadingBar}></div>
      </div>
    );
  }

  // Экран для неавторизованных пользователей
  if (!isAuthenticated) {
    return (
      <div className={styles.unauthorizedContainer}>
        <h1 className={styles.unauthorizedTitle}>Hedonist</h1>
        <p className={styles.unauthorizedMessage}>
          Добро пожаловать в наш премиум магазин! Пожалуйста, откройте приложение через Telegram бота.
        </p>
        <Link 
          href="/debug-auth" 
          className={styles.unauthorizedButton}
        >
          Страница отладки
        </Link>
      </div>
    );
  }

  // ИСПРАВЛЕНИЕ: Перемещаем блок загрузки товаров сюда как ранний рендер
  if (productsLoading) {
    return (
      <div className={styles.catalogStatus}>
        <div className={styles.spinner}></div>
        <p>Загрузка товаров...</p>
      </div>
    );
  }

  // Основной вид главной страницы для авторизованных, но не админов пользователей
  return (
    <div className={styles.container}>
      <Head>
        <title>Hedonist - Каталог</title>
        <meta name="description" content="Каталог товаров Hedonist" />
      </Head>

      {/* Уведомление о заказах в пути */}
      {isAuthenticated && !ordersLoading && shippedOrders.length > 0 && (
        <Link href="/orders" className={styles.notificationBanner}>
          <FaShippingFast className={styles.notificationIcon} />
          <div>
            <p className={styles.notificationTitle}>Ваш заказ отправлен!</p>
            <p className={styles.notificationText}>
              {shippedOrders.length === 1
                ? 'Один ваш заказ уже в пути.'
                : `Заказов в пути: ${shippedOrders.length}.` 
              }
              Нажмите, чтобы отследить.
            </p>
          </div>
          <FaArrowRight />
        </Link>
      )}

      {/* Шапка */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.appTitle}>Hedonist</h1>
          <div className={styles.headerIcons}>
            <Link href="/cart" className={styles.iconButton}>
              <FaShoppingCart />
            </Link>
            <Link href="/profile" className={styles.iconButton}>
              <FaUser />
            </Link>
          </div>
        </div>
        
        {/* Поиск */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Поиск товаров..."
            className={styles.searchInput}
          />
          <FaSearch className={styles.searchIcon} />
        </div>
      </header>

      {/* Основной контент - Каталог товаров */}
      <main className={styles.mainContent}>
        <div className={styles.welcomeSection}>
          <h2 className={styles.welcomeTitle}>
            Добро пожаловать, {user?.firstName || 'пользователь'}!
          </h2>
        </div>

        {/* Отображение товаров (ошибки или пустой каталог) */}
        {productsError && (
          <div className={styles.catalogStatus}>
            <p className={styles.errorMessage}>Ошибка: {productsError}</p>
            <button onClick={fetchProducts} className={styles.retryButton}>
              <FaRedo /> Попробовать снова
            </button>
          </div>
        )}

        {!productsError && products.length === 0 && (
          <div className={styles.catalogStatus}>
            <FaStore className={styles.emptyIcon} />
            <p>К сожалению, товары пока отсутствуют.</p>
          </div>
        )}

        {/* Если товары загружены и есть, отображаем их */}
        {!productsLoading && !productsError && products.length > 0 && (
          <div className={styles.productGrid}>
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className={styles.productCard}>
                <div className={styles.productImageContainer}>
                  {product.images && product.images.length > 0 ? (
                    <Image 
                      src={product.images[0]} 
                      alt={product.name} 
                      className={styles.productImage}
                      width={300}
                      height={300}
                      objectFit="cover"
                    />
                  ) : (
                    <div className={styles.noImagePlaceholder}>
                      <FaStore /> Нет фото
                    </div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  {product.brand && <p className={styles.productBrand}>{product.brand}</p>}
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>
                    <span className={styles.currentPrice}>₽{parseFloat(product.currentPrice).toLocaleString()}</span>
                    {product.oldPrice && <span className={styles.oldPrice}>₽{parseFloat(product.oldPrice).toLocaleString()}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Нижняя навигация */}
      <nav className={styles.bottomNav}>
        <Link href="/" className={`${styles.navItem} ${styles.active}`}>
          <FaHome className={styles.navIcon} />
          <span>Каталог</span>
        </Link>
        <Link href="/favorites" className={styles.navItem}>
          <FaHeart className={styles.navIcon} />
          <span>Избранное</span>
        </Link>
        <Link href="/cart" className={styles.navItem}>
          <FaShoppingCart className={styles.navIcon} />
          <span>Корзина</span>
        </Link>
        <Link href="/profile" className={styles.navItem}>
          <FaUser className={styles.navIcon} />
          <span>Профиль</span>
        </Link>
      </nav>
    </div>
  );
}