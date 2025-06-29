// pages/favorites.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Cart.module.css'; // Используем те же стили
import { useApp } from '../contexts/AppContext';
import { 
  FaArrowLeft, 
  FaHeart, 
  FaTrashAlt, 
  FaShoppingCart,
  FaShoppingBag,
  FaRegHeart,
  FaPlus
} from 'react-icons/fa';

export default function FavoritesPage() {
  const router = useRouter();
  const { 
    state, 
    removeFromFavorites, 
    addToCart,
    isInFavorites
  } = useApp();
  
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Функция для удаления из избранного
  const handleRemoveFromFavorites = (productId: string) => {
    if (confirm('Удалить товар из избранного?')) {
      removeFromFavorites(productId);
    }
  };

  // Функция для добавления в корзину (берем первый доступный вариант)
  const handleAddToCart = async (productId: string) => {
    const product = state.favorites.find(p => p.id === productId);
    if (!product) return;

    // Находим первый доступный вариант
    const availableVariant = product.variants.find(v => v.stock > 0);
    if (!availableVariant) {
      alert('Товар закончился на складе');
      return;
    }

    setAddingToCart(productId);
    
    // Имитируем добавление в корзину
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      addToCart(product, availableVariant, 1);
      
      // Показываем уведомление
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        Товар добавлен в корзину!
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      
    } catch (error) {
      alert('Ошибка при добавлении в корзину');
    } finally {
      setAddingToCart(null);
    }
  };

  const { favorites, favoritesCount } = state;

  // Если избранное пусто
  if (favorites.length === 0) {
    return (
      <div className={styles.pageContainer}>
        <Head>
          <title>Избранное | Elite App</title>
          <meta name="description" content="Избранные товары" />
        </Head>

        {/* Шапка */}
        <header className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <FaArrowLeft />
          </button>
          <h1 className={styles.headerTitle}>
            <FaHeart />
            Избранное
          </h1>
          <div className={styles.headerActions}>
            {/* Пустой div для выравнивания */}
            <div></div>
          </div>
        </header>

        {/* Пустое состояние */}
        <div className={styles.emptyState}>
          <FaRegHeart className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Избранное пусто</h2>
          <p className={styles.emptyDescription}>
            Добавляйте товары в избранное, чтобы не потерять их
          </p>
          <Link href="/" className={styles.shopButton}>
            <FaShoppingBag />
            Перейти к покупкам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Избранное ({favoritesCount}) | Elite App</title>
        <meta name="description" content="Избранные товары" />
      </Head>

      {/* Шапка */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.headerTitle}>
          <FaHeart />
          Избранное ({favoritesCount})
        </h1>
        <div className={styles.headerActions}>
          <Link href="/cart" className={styles.actionButton}>
            <FaShoppingCart />
            {state.cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {state.cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className={styles.mainContainer}>
        {/* Список избранных товаров */}
        <div className={styles.itemsList}>
          {favorites.map((product) => {
            const currentPrice = parseFloat(product.currentPrice);
            const oldPrice = product.oldPrice ? parseFloat(product.oldPrice) : null;
            const hasDiscount = oldPrice && oldPrice > currentPrice;
            const discountPercent = hasDiscount ? Math.round((1 - currentPrice / oldPrice) * 100) : 0;
            
            // Проверяем доступность товара
            const availableVariants = product.variants.filter(v => v.stock > 0);
            const isAvailable = availableVariants.length > 0;
            const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

            return (
              <div key={product.id} className={styles.itemCard}>
                <div className={styles.itemContent}>
                  {/* Изображение */}
                  <Link href={`/products/${product.id}`}>
                    <div style={{ position: 'relative' }}>
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className={styles.itemImage}
                        />
                      ) : (
                        <div className={styles.noImagePlaceholder}>
                          Нет фото
                        </div>
                      )}
                      
                      {/* Бейдж скидки */}
                      {hasDiscount && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          zIndex: 1
                        }}>
                          -{discountPercent}%
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Информация о товаре */}
                  <div className={styles.itemInfo}>
                    <Link href={`/products/${product.id}`}>
                      <h3 className={styles.itemName}>{product.name}</h3>
                    </Link>
                    {product.brand && (
                      <p className={styles.itemBrand}>{product.brand}</p>
                    )}
                    
                    {/* Доступные размеры */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Размеры: {product.variants.map(v => v.size).join(', ')}
                      </span>
                    </div>
                    
                    {/* Наличие */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        color: isAvailable ? '#059669' : '#ef4444',
                        fontWeight: '500'
                      }}>
                        {isAvailable ? `В наличии: ${totalStock} шт.` : 'Нет в наличии'}
                      </span>
                    </div>
                    
                    <div className={styles.itemPrice}>
                      <span className={styles.currentPrice}>
                        ₽{currentPrice.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className={styles.oldPrice}>
                          ₽{oldPrice!.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Кнопка добавления в корзину */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={!isAvailable || addingToCart === product.id}
                      style={{
                        background: isAvailable 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#e2e8f0',
                        color: isAvailable ? 'white' : '#94a3b8',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        minWidth: '120px'
                      }}
                    >
                      {addingToCart === product.id ? (
                        <>
                          <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                          Добавление...
                        </>
                      ) : isAvailable ? (
                        <>
                          <FaPlus />
                          В корзину
                        </>
                      ) : (
                        'Нет в наличии'
                      )}
                    </button>
                  </div>

                  {/* Кнопка удаления из избранного */}
                  <div className={styles.itemActions}>
                    <button
                      onClick={() => handleRemoveFromFavorites(product.id)}
                      className={styles.removeButton}
                      title="Удалить из избранного"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Кнопка "Продолжить покупки" */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '2rem' 
        }}>
          <Link href="/" className={styles.shopButton}>
            <FaShoppingBag />
            Продолжить покупки
          </Link>
        </div>
      </main>
    </div>
  );
}