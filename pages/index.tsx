// pages/index.tsx
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/HomePage.module.css';
import { FaArrowRight, FaSearch, FaFilter, FaRedo } from 'react-icons/fa'; // Добавлены иконки

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

const categories = ['CLOTHING', 'FOOTWEAR', 'ACCESSORIES'];
const seasons = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_SEASON'];
const genders = ['MALE', 'FEMALE', 'UNISEX'];

// Компонент ProductCard - остается без изменений (использует стили из HomePage.module.css)
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '/placeholder.jpg';
  const displayPrice = parseFloat(product.currentPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 });
  const oldPrice = product.oldPrice ? parseFloat(product.oldPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }) : null;

  return (
    <Link href={`/product/${product.id}`} className={styles.productCard}>
      <div className={styles.productImageContainer}>
        <img src={imageUrl} alt={product.name} className={styles.productImage} />
      </div>
      <h3 className={styles.productName}>{product.name}</h3>
       <p className={styles.productBrand}>{product.brand || 'Без бренда'}</p> {/* НОВАЯ СТРОКА */}
      <div className={styles.productPrice}>
        <span className={styles.currentPrice}>{displayPrice}</span>
{oldPrice && parseFloat(oldPrice) > parseFloat(product.currentPrice) && (
  <span className={styles.oldPrice}>{oldPrice}</span>
)}
      </div>
      <button className={styles.addToCartButton}>
        Подробнее <FaArrowRight className={styles.buttonIcon} />
      </button>
    </Link>
  );
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояния для фильтров и поиска
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  // Функция для получения товаров с учетом фильтров
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (selectedSeason) queryParams.append('season', selectedSeason);
      if (selectedGender) queryParams.append('gender', selectedGender);

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Ошибка: ${res.status}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedSeason, selectedGender]);

  // Запуск получения товаров при изменении фильтров
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSeason('');
    setSelectedGender('');
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Elite App - Каталог</title>
        <meta name="description" content="Бутик эксклюзивной одежды прямо в Telegram Mini App." />
      </Head>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Добро пожаловать!</h1>
          <p className={styles.heroSubtitle}>
            Ваш бутик элитной одежды и обуви.
          </p>
        </div>
      </section>

      <main className={styles.mainContent}>
        {/* Секция Поиска и Фильтров */}
        <section className={styles.filtersSection}>
          <div className={styles.searchBar}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filtersGrid}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все сезоны</option>
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Любой пол</option>
              {genders.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterButtonsContainer}>
            <button onClick={fetchProducts} className={styles.filterButton}>
              <FaFilter className={styles.filterButtonIcon} /> Применить фильтры
            </button>
            <button onClick={handleResetFilters} className={styles.resetButton}>
              <FaRedo className={styles.resetButtonIcon} /> Сбросить фильтры
            </button>
          </div>
        </section>

        {/* Product Collection Section */}
        <section id="collection" className={styles.collectionSection}>
          <h2 className={styles.collectionTitle}>Наши Товары</h2>
          {loading ? (
            <p className={styles.loadingText}>Загрузка товаров...</p>
          ) : error ? (
            <p className={styles.errorText}>Ошибка загрузки товаров: {error}</p>
          ) : products.length === 0 ? (
            <p className={styles.noProductsText}>В данный момент товаров не найдено по вашему запросу.</p>
          ) : (
            <div className={styles.productGrid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 Elite App</p>
        <div className={styles.footerLinks}>
          <Link href="/privacy" className={styles.footerLink}>Политика конфиденциальности</Link>
          <Link href="/terms" className={styles.footerLink}>Условия использования</Link>
        </div>
      </footer>
    </div>
  );
}