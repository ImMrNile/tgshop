// pages/products/[id].tsx - ОБНОВЛЕНО
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/ProductDetail.module.css';
import { getBrandLogoUrl } from '../../lib/brandLogos';
import { useApp } from '../../contexts/AppContext';
import { generateProductShareLink, handleShare } from '../../lib/utils'; // Обновленный импорт

// Импорты иконок
import { 
  FaArrowLeft, 
  FaShoppingCart, 
  FaChevronLeft, 
  FaChevronRight, 
  FaInfoCircle, 
  FaHeart,
  FaShareAlt,
  FaCopy,
  FaCheck,
  FaShippingFast,
} from 'react-icons/fa';
import { MdOutlineLocalLaundryService, MdSecurity } from 'react-icons/md';

interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  color?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  composition?: string;
  careInstructions?: string;
  brand?: string;
  price: string;
  oldPrice?: string;
  currentPrice: string;
  images: string[];
  videos: string[];
  variants: ProductVariant[];
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { 
    addToCart, 
    isInFavorites, 
    toggleFavorite,
    state 
  } = useApp();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        throw new Error(`Ошибка: ${res.status}`);
      }
      const data = await res.json();
      setProduct(data);
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      if (data.images && data.images.length > 0) {
        setCurrentImageIndex(0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) {
      alert('Пожалуйста, выберите вариант товара.');
      return;
    }
    
    if (selectedVariant.stock === 0) {
      alert('Выбранный размер/цвет отсутствует на складе.');
      return;
    }
    
    setAddingToCart(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      addToCart(product, selectedVariant, 1);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch {
      alert('Ошибка при добавлении в корзину');
    } finally {
      setAddingToCart(false);
    }
  };

  const goToNextImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length);
  };

  const goToPrevImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + product.images.length) % product.images.length);
  };

  const handleProductShare = async () => {
    if (!product || !product.id) return;

    const productLink = generateProductShareLink(product.id);

    const success = await handleShare(
      `Elite Market: ${product.name}`,
      `Зацени этот товар в Elite Market: ${product.name}`,
      productLink
    );

    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleToggleFavorite = () => {
    if (product) {
      toggleFavorite(product);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка товара...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h2>Ошибка загрузки</h2>
          <p>{error}</p>
          <Link href="/" className={styles.backButton}>
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h2>Товар не найден</h2>
          <p>Возможно, товар был удален или ссылка неверная</p>
          <Link href="/" className={styles.backButton}>
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const brandLogoUrl = getBrandLogoUrl(product.brand);
  const currentImage = product.images?.[currentImageIndex];
  const discountPercent = product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.currentPrice) 
    ? Math.round((1 - parseFloat(product.currentPrice) / parseFloat(product.oldPrice)) * 100)
    : 0;
  
  const isLiked = isInFavorites(product.id);

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>{product.name} | Elite App</title>
        <meta name="description" content={product.description || product.name} />
      </Head>

      {/* Шапка с навигацией */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft size={24} />
        </button>
        <div className={styles.headerActions}>
          <button 
            onClick={handleToggleFavorite} 
            className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
          >
            <FaHeart size={24} />
          </button>
          <button onClick={handleProductShare} className={styles.actionButton}>
            {copySuccess ? <FaCopy size={24} /> : <FaShareAlt size={24} />}
          </button>
          <Link href="/cart" className={styles.actionButton} style={{ position: 'relative' }}>
            <FaShoppingCart size={24} />
            {state.cartCount > 0 && (
              <span className={styles.cartBadge}>
                {state.cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className={styles.productContainer}>
        {/* Галерея изображений */}
        <section className={styles.mediaSection}>
          {product.images && product.images.length > 0 ? (
            <div className={styles.imageGallery}>
              <div className={styles.mainImageContainer}>
                <Image 
                  src={currentImage} 
                  alt={product.name} 
                  className={styles.mainImage}
                  width={500}
                  height={500}
                />
                
                {discountPercent > 0 && (
                  <div className={styles.discountBadge}>
                    -{discountPercent}%
                  </div>
                )}
                
                {product.images.length > 1 && (
                  <>
                    <button onClick={goToPrevImage} className={`${styles.navButton} ${styles.prevButton}`}>
                      <FaChevronLeft size={24} />
                    </button>
                    <button onClick={goToNextImage} className={`${styles.navButton} ${styles.nextButton}`}>
                      <FaChevronRight size={24} />
                    </button>
                    <div className={styles.imageIndicators}>
                      {product.images.map((_, index) => (
                        <button
                          key={index}
                          className={`${styles.indicator} ${index === currentImageIndex ? styles.active : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {product.images.length > 1 && (
                <div className={styles.thumbnailGrid}>
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      className={`${styles.thumbnail} ${index === currentImageIndex ? styles.activeThumbnail : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <Image src={img} alt={`Фото ${index + 1}`} width={80} height={80} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.noImagePlaceholder}>
              <FaInfoCircle />
              <span>Изображение недоступно</span>
            </div>
          )}
        </section>

        {/* Информация о товаре */}
        <section className={styles.productInfo}>
          <div className={styles.productHeader}>
            {product.brand && (
              <div className={styles.brandInfo}>
                {brandLogoUrl && (
                  <Image src={brandLogoUrl} alt={`${product.brand} Logo`} className={styles.brandLogo} width={40} height={40} />
                )}
                <span className={styles.brandName}>{product.brand}</span>
              </div>
            )}
            
            <h1 className={styles.productName}>{product.name}</h1>
            
            {product.description && (
              <p className={styles.productDescription}>{product.description}</p>
            )}
          </div>

          <div className={styles.priceSection}>
            <div className={styles.priceContainer}>
              <span className={styles.currentPrice}>
                ₽{parseFloat(product.currentPrice).toLocaleString()}
              </span>
              {product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.currentPrice) && (
                <span className={styles.oldPrice}>
                  ₽{parseFloat(product.oldPrice).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Выбор варианта */}
          {product.variants && product.variants.length > 0 && (
            <div className={styles.variantSection}>
              <h3 className={styles.sectionTitle}>Выберите размер и цвет:</h3>
              <div className={styles.variantGrid}>
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`${styles.variantButton} ${
                      selectedVariant?.id === variant.id ? styles.selected : ''
                    } ${variant.stock === 0 ? styles.unavailable : ''}`}
                    disabled={variant.stock === 0}
                  >
                    <div className={styles.variantInfo}>
                      {variant.color && <span className={styles.variantColor}>{variant.color}</span>}
                      <span className={styles.variantSize}>{variant.size}</span>
                    </div>
                    <span className={styles.variantStock}>
                      {variant.stock > 0 ? `${variant.stock} шт.` : 'Нет в наличии'}
                    </span>
                  </button>
                ))}
              </div>
              
              {selectedVariant && selectedVariant.stock === 0 && (
                <div className={styles.warningMessage}>
                  <FaInfoCircle />
                  <span>Выбранный размер/цвет отсутствует на складе</span>
                </div>
              )}
            </div>
          )}

          {/* Кнопка добавления в корзину */}
          <div className={styles.actionSection}>
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock === 0 || addingToCart}
              className={`${styles.addToCartButton} ${showSuccess ? styles.success : ''}`}
            >
              {showSuccess ? (
                <>
                  <FaCheck /> Добавлено в корзину!
                </>
              ) : addingToCart ? (
                <>
                  <div className={styles.buttonSpinner}></div> Добавление...
                </>
              ) : (
                <>
                  <FaShoppingCart /> Добавить в корзину
                </>
              )}
            </button>
            
            <div className={styles.guarantees}>
              <div className={styles.guarantee}>
                <FaShippingFast className={styles.guaranteeIcon} />
                <span>Быстрая доставка</span>
              </div>
              <div className={styles.guarantee}>
                <MdSecurity className={styles.guaranteeIcon} />
                <span>Гарантия качества</span>
              </div>
            </div>
          </div>

          {/* Дополнительная информация */}
          {(product.composition || product.careInstructions) && (
            <div className={styles.additionalInfo}>
              {product.composition && (
                <div className={styles.infoItem}>
                  <h4 className={styles.infoTitle}>
                    <FaInfoCircle /> Состав
                  </h4>
                  <p className={styles.infoContent}>{product.composition}</p>
                </div>
              )}
              
              {product.careInstructions && (
                <div className={styles.infoItem}>
                  <h4 className={styles.infoTitle}>
                    <MdOutlineLocalLaundryService /> Уход за изделием
                  </h4>
                  <p className={styles.infoContent}>{product.careInstructions}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      
      {/* Уведомление об успешном добавлении */}
      {showSuccess && (
        <div className={styles.successNotification}>
          <FaCheck />
          <span>Товар добавлен в корзину!</span>
        </div>
      )}
    </div>
  );
};