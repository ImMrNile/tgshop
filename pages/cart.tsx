// pages/cart.tsx
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Cart.module.css';
import { useApp } from '../contexts/AppContext';
import {
  FaArrowLeft,
  FaShoppingCart,
  FaTrashAlt,
  FaHeart,
  FaPlus,
  FaMinus,
  FaShoppingBag,
  FaCreditCard,
  FaRegHeart
} from 'react-icons/fa';

export default function CartPage() {
  const router = useRouter();
  const {
    state,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    toggleFavorite,
    isInFavorites,
    getCartItemId
  } = useApp();

  // Функция для обновления количества товара
  const handleQuantityChange = (productId: string, variantId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId, variantId);
      return;
    }
    updateCartQuantity(productId, variantId, newQuantity);
  };

  // Функция для удаления товара из корзины
  const handleRemoveItem = (productId: string, variantId: string) => {
    if (confirm('Удалить товар из корзины?')) {
      removeFromCart(productId, variantId);
    }
  };

  // Функция для очистки всей корзины
  const handleClearCart = () => {
    if (confirm('Очистить всю корзину? Это действие нельзя отменить.')) {
      clearCart();
    }
  };

  // --- ИЗМЕНЕНО: Функция для перехода к оформлению заказа ---
  const handleCheckout = () => {
    router.push('/checkout');
  };

  const { cart, cartTotal, cartCount } = state;

  // Если корзина пуста
  if (cart.length === 0) {
    return (
      <div className={styles.pageContainer}>
        <Head>
          <title>Корзина | Elite App</title>
          <meta name="description" content="Корзина покупок" />
        </Head>
        <header className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <FaArrowLeft />
          </button>
          <h1 className={styles.headerTitle}>
            <FaShoppingCart />
            Корзина
          </h1>
          <div className={styles.headerActions}>
            <div></div>
          </div>
        </header>
        <div className={styles.emptyState}>
          <FaShoppingCart className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Корзина пуста</h2>
          <p className={styles.emptyDescription}>
            Добавьте товары в корзину, чтобы оформить заказ
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
        <title>Корзина ({cartCount}) | Elite App</title>
        <meta name="description" content="Корзина покупок" />
      </Head>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.headerTitle}>
          <FaShoppingCart />
          Корзина ({cartCount})
        </h1>
        <div className={styles.headerActions}>
          <button
            onClick={handleClearCart}
            className={styles.actionButton}
            title="Очистить корзину"
          >
            <FaTrashAlt />
          </button>
        </div>
      </header>

      <main className={styles.mainContainer}>
        <div className={styles.itemsList}>
          {cart.map((item) => {
            const itemId = getCartItemId(item.product.id, item.variant.id);
            const isInFavorite = isInFavorites(item.product.id);
            const currentPrice = parseFloat(item.product.currentPrice);
            const oldPrice = item.product.oldPrice ? parseFloat(item.product.oldPrice) : null;
            const itemTotal = currentPrice * item.quantity;

            return (
              <div key={itemId} className={styles.itemCard}>
                <div className={styles.itemContent}>
                  <Link href={`/products/${item.product.id}`}>
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className={styles.itemImage}
                      />
                    ) : (
                      <div className={styles.noImagePlaceholder}>
                        Нет фото
                      </div>
                    )}
                  </Link>

                  <div className={styles.itemInfo}>
                    <Link href={`/products/${item.product.id}`}>
                      <h3 className={styles.itemName}>{item.product.name}</h3>
                    </Link>
                    {item.product.brand && (
                      <p className={styles.itemBrand}>{item.product.brand}</p>
                    )}
                    <p className={styles.itemVariant}>
                      {item.variant.color && `${item.variant.color}, `}
                      Размер: {item.variant.size}
                    </p>
                    <div className={styles.itemPrice}>
                      <span className={styles.currentPrice}>
                        ₽{currentPrice.toLocaleString()}
                      </span>
                      {oldPrice && oldPrice > currentPrice && (
                        <span className={styles.oldPrice}>
                          ₽{oldPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.variant.id, item.quantity - 1)}
                      className={styles.quantityButton}
                      disabled={item.quantity <= 1}
                    >
                      <FaMinus />
                    </button>
                    <span className={styles.quantityValue}>{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.variant.id, item.quantity + 1)}
                      className={styles.quantityButton}
                      disabled={item.quantity >= item.variant.stock}
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      onClick={() => toggleFavorite(item.product)}
                      className={`${styles.favoriteButton} ${isInFavorite ? styles.favorited : ''}`}
                      title={isInFavorite ? "Удалить из избранного" : "Добавить в избранное"}
                    >
                      {isInFavorite ? <FaHeart /> : <FaRegHeart />}
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.product.id, item.variant.id)}
                      className={styles.removeButton}
                      title="Удалить из корзины"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Итого: ₽{itemTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.summarySection}>
          <h2 className={styles.summaryTitle}>Итого к оплате</h2>
          
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Товары ({cartCount} шт.)</span>
            <span className={styles.summaryValue}>₽{cartTotal.toLocaleString()}</span>
          </div>
          
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Доставка</span>
            <span className={styles.summaryValue}>Рассчитывается при оформлении</span>
          </div>
          
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span className={styles.summaryLabel}>К оплате</span>
            <span className={styles.summaryValue}>₽{cartTotal.toLocaleString()}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cartTotal === 0}
            className={styles.checkoutButton}
          >
            <FaCreditCard />
            Оформить заказ
          </button>
        </div>
      </main>
    </div>
  );
}