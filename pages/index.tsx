// pages/index.tsx
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/HomePage.module.css';
import { useApp } from '../contexts/AppContext';
import { Order, OrderStatus } from '@prisma/client';
import { 
  FaArrowRight, FaSearch, FaFilter, FaRedo, FaHome, FaUser, FaShoppingCart, FaHeart, FaShippingFast 
} from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  brand?: string;
  currentPrice: string;
  oldPrice?: string;
  images: string[];
}

export default function HomePage() {
  const { state: appState } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [shippedOrders, setShippedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error(`Ошибка загрузки товаров: ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders'); // Запрашиваем заказы пользователя
      if (!res.ok) throw new Error('Не удалось загрузить заказы');
      const orders: Order[] = await res.json();
      // Фильтруем заказы, чтобы найти только отправленные
      const shipped = orders.filter(order => order.status === OrderStatus.SHIPPED);
      setShippedOrders(shipped);
    } catch (err: any) {
      console.error("Не удалось загрузить заказы для уведомления:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProducts(), fetchOrders()]).finally(() => setLoading(false));
  }, [fetchProducts, fetchOrders]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Главная | Elite App</title>
        <meta name="description" content="Каталог элитной одежды" />
      </Head>

      {/* --- БЛОК УВЕДОМЛЕНИЯ --- */}
      {shippedOrders.length > 0 && (
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

      <header className={styles.mobileHeader}>
        {/* ... остальная часть хедера без изменений ... */}
        <div className={styles.searchBarMobile}>
          <FaSearch className={styles.searchIcon} />
          <input type="text" placeholder="Поиск по товарам..." className={styles.searchInput} />
          <button className={styles.filterToggle}>
            <FaFilter />
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.collectionSection}>
          <div className={styles.collectionHeader}>
            <h2 className={styles.collectionTitle}>Наш Каталог</h2>
            <p className={styles.collectionSubtitle}>Ознакомьтесь с нашими лучшими предложениями</p>
          </div>

          {loading && <div className={styles.loadingState}><div className={styles.spinner}></div><p>Загрузка товаров...</p></div>}
          {error && <div className={styles.errorState}><h3>Ошибка</h3><p>{error}</p><button onClick={() => window.location.reload()} className={styles.retryButton}><FaRedo /> Попробовать снова</button></div>}

          {!loading && !error && (
            <div className={styles.productGrid}>
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`} className={styles.productCard}>
                  <div className={styles.productImageContainer}>
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className={styles.productImage} />
                    ) : (
                      <div className={styles.noImagePlaceholder}>Нет фото</div>
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
        </section>
      </main>

      <nav className={styles.bottomNav}>
        <Link href="/" className={styles.navItem}>
          <FaHome className={styles.navIcon} />
          <span className={styles.navLabel}>Главная</span>
        </Link>
        <Link href="/favorites" className={styles.navItem}>
          <FaHeart className={styles.navIcon} />
          {appState.favoritesCount > 0 && <span className={styles.navBadge}>{appState.favoritesCount}</span>}
          <span className={styles.navLabel}>Избранное</span>
        </Link>
        <Link href="/cart" className={styles.navItem}>
          <FaShoppingCart className={styles.navIcon} />
          {appState.cartCount > 0 && <span className={styles.navBadge}>{appState.cartCount}</span>}
          <span className={styles.navLabel}>Корзина</span>
        </Link>
        <Link href="/profile" className={styles.navItem}>
          <FaUser className={styles.navIcon} />
          <span className={styles.navLabel}>Профиль</span>
        </Link>
      </nav>
    </div>
  );
}