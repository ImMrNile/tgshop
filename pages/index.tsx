// pages/index.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/HomePage.module.css';
import { FaArrowRight, FaSearch, FaFilter, FaRedo, FaHome, FaUser, FaShoppingCart, FaHeart, FaTimes } from 'react-icons/fa';

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

// Русские названия для фильтров
const categoryTranslations = {
  'CLOTHING': 'Одежда',
  'FOOTWEAR': 'Обувь', 
  'ACCESSORIES': 'Аксессуары'
};

const seasonTranslations = {
  'SPRING': 'Весна',
  'SUMMER': 'Лето',
  'AUTUMN': 'Осень',
  'WINTER': 'Зима',
  'ALL_SEASON': 'Всесезонная'
};

const genderTranslations = {
  'MALE': 'Мужская',
  'FEMALE': 'Женская',
  'UNISEX': 'Унисекс'
};

const categories = Object.keys(categoryTranslations);
const seasons = Object.keys(seasonTranslations);
const genders = Object.keys(genderTranslations);

// Компонент ProductCard
const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '/placeholder.jpg';
  const displayPrice = parseFloat(product.currentPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 });
  const oldPrice = product.oldPrice ? parseFloat(product.oldPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }) : null;

  return (
    <Link href={`/products/${product.id}`} className={styles.productCard}>
      <div className={styles.productImageContainer}>
        <img src={imageUrl} alt={product.name} className={styles.productImage} />
        <div className={styles.productBadge}>
          {oldPrice && parseFloat(product.oldPrice!) > parseFloat(product.currentPrice) && (
            <span className={styles.discountBadge}>
              -{Math.round((1 - parseFloat(product.currentPrice) / parseFloat(product.oldPrice!)) * 100)}%
            </span>
          )}
        </div>
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.productBrand}>{product.brand || 'Без бренда'}</p>
        <div className={styles.productPrice}>
          <span className={styles.currentPrice}>{displayPrice}</span>
          {oldPrice && parseFloat(product.oldPrice!) > parseFloat(product.currentPrice) && (
            <span className={styles.oldPrice}>{oldPrice}</span>
          )}
        </div>
        <button className={styles.addToCartButton}>
          Подробнее <FaArrowRight className={styles.buttonIcon} />
        </button>
      </div>
    </Link>
  );
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Состояния для фильтров и поиска
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

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
      
      // Фильтр по бренду на фронтенде (если бэкенд не поддерживает)
      let filteredData = data;
      if (selectedBrand) {
        filteredData = data.filter((p: Product) => 
          p.brand && p.brand.toLowerCase().includes(selectedBrand.toLowerCase())
        );
      }
      
      setProducts(filteredData);
      
      // Извлекаем уникальные бренды для фильтра
      const brands = [...new Set(data.map((p: Product) => p.brand).filter(Boolean))].sort();
      setAllBrands(brands);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedSeason, selectedGender, selectedBrand]);

  // Запуск получения товаров при изменении фильтров
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSeason('');
    setSelectedGender('');
    setSelectedBrand('');
    setFiltersOpen(false);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Elite App - Люкс копии</title>
        <meta name="description" content="Премиум люкс копии брендовой одежды. Высокое качество по доступным ценам." />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      </Head>

      {/* Hero Section с честной информацией */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Elite Fashion</h1>
          <p className={styles.heroSubtitle}>
            Премиум люкс копии • Высокое качество • Доступные цены
          </p>
          <div className={styles.heroFeatures}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⭐</span>
              <span className={styles.featureText}>Люкс качество</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>💰</span>
              <span className={styles.featureText}>Лучшие цены</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🛡️</span>
              <span className={styles.featureText}>Проверка качества</span>
            </div>
          </div>
        </div>
      </section>

      <main className={styles.mainContent}>
        {/* Мобильная шапка с поиском */}
        <div className={styles.mobileHeader}>
          <div className={styles.searchBarMobile}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button 
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`${styles.filterToggle} ${filtersOpen ? styles.filterToggleActive : ''}`}
            >
              {filtersOpen ? <FaTimes /> : <FaFilter />}
            </button>
          </div>
        </div>

        {/* Секция фильтров БЕЗ overlay */}
        <div className={`${styles.filtersSection} ${filtersOpen ? styles.filtersOpen : ''}`}>
          <div className={styles.filtersGrid}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryTranslations[cat as keyof typeof categoryTranslations]}
                </option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все бренды</option>
              {allBrands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все сезоны</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {seasonTranslations[s as keyof typeof seasonTranslations]}
                </option>
              ))}
            </select>

            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Все коллекции</option>
              {genders.map((g) => (
                <option key={g} value={g}>
                  {genderTranslations[g as keyof typeof genderTranslations]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterActions}>
            <button onClick={fetchProducts} className={styles.applyButton}>
              <FaFilter className={styles.buttonIcon} /> Применить
            </button>
            <button onClick={handleResetFilters} className={styles.resetButton}>
              <FaRedo className={styles.buttonIcon} /> Сбросить
            </button>
          </div>
        </div>

        {/* Product Collection Section */}
        <section className={styles.collectionSection}>
          <div className={styles.collectionHeader}>
            <div className={styles.collectionTitleWrapper}>
              <h2 className={styles.collectionTitle}>Наша коллекция</h2>
              <span className={styles.collectionSubtitle}>
                {loading ? 'Загрузка...' : 
                 products.length === 0 ? 'Нет результатов' :
                 `${products.length} ${products.length === 1 ? 'товар' : products.length < 5 ? 'товара' : 'товаров'} найдено`}
              </span>
            </div>
          </div>
          
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Загрузка товаров...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>Ошибка загрузки: {error}</p>
              <button onClick={fetchProducts} className={styles.retryButton}>
                Попробовать снова
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyState}>
              <FaSearch className={styles.emptyIcon} />
              <h3>Товары не найдены</h3>
              <p>Попробуйте изменить параметры поиска</p>
              <button onClick={handleResetFilters} className={styles.resetButton}>
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Нижняя панель навигации - ИСПРАВЛЕННАЯ */}
      <nav className={styles.bottomNav}>
        <Link href="/" className={styles.navItem}>
          <FaHome className={styles.navIcon} />
          <span className={styles.navLabel}>Главная</span>
          <div className={styles.navIndicator}></div>
        </Link>
        <Link href="/favorites" className={styles.navItem}>
          <FaHeart className={styles.navIcon} />
          <span className={styles.navLabel}>Избранное</span>
          <div className={styles.navBadge}>3</div>
        </Link>
        <Link href="/cart" className={styles.navItem}>
          <FaShoppingCart className={styles.navIcon} />
          <span className={styles.navLabel}>Корзина</span>
          <div className={styles.navBadge}>2</div>
        </Link>
        <Link href="/profile" className={styles.navItem}>
          <FaUser className={styles.navIcon} />
          <span className={styles.navLabel}>Профиль</span>
        </Link>
      </nav>
    </div>
  );
}