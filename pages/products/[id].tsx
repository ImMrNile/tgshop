// pages/products/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from './ProductDetail.module.css';
import { getBrandLogoUrl } from '../../lib/brandLogos';

// Импорты иконок
import { 
  FaArrowLeft, 
  FaShoppingCart, 
  FaChevronLeft, 
  FaChevronRight, 
  FaInfoCircle, 
  FaHeart,
  FaShare,
  FaCheck,
  FaStar,
  FaShippingFast
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
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      async function fetchProduct() {
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
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) {
      alert('Пожалуйста, выберите вариант товара.');
      return;
    }
    
    setAddingToCart(true);
    
    // Имитация добавления в корзину
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAddingToCart(false);
    setShowSuccess(true);
    
    setTimeout(() => setShowSuccess(false), 3000);
    
    console.log(`Добавлен в корзину: ${product.name}, Размер: ${selectedVariant.size}, Цвет: ${selectedVariant.color}`);
  };

  const goToNextImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length);
  };

  const goToPrevImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + product.images.length) % product.images.length);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Sharing failed:', err);
      }
    } else {
      // Fallback - копировать ссылку
      navigator.clipboard.writeText(window.location.href);
      alert('Ссылка скопирована в буфер обмена!');
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

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>{product.name} | Elite App</title>
        <meta name="description" content={product.description || product.name} />
      </Head>

      {/* Шапка с навигацией */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft />
        </button>
        <div className={styles.headerActions}>
          <button 
            onClick={() => setIsLiked(!isLiked)} 
            className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
          >
            <FaHeart />
          </button>
          <button onClick={handleShare} className={styles.actionButton}>
            <FaShare />
          </button>
        </div>
      </header>

      <main className={styles.productContainer}>
        {/* Галерея изображений */}
        <section className={styles.mediaSection}>
          {product.images && product.images.length > 0 ? (
            <div className={styles.imageGallery}>
              <div className={styles.mainImageContainer}>
                <img src={currentImage} alt={product.name} className={styles.mainImage} />
                
                {discountPercent > 0 && (
                  <div className={styles.discountBadge}>
                    -{discountPercent}%
                  </div>
                )}
                
                {product.images.length > 1 && (
                  <>
                    <button onClick={goToPrevImage} className={`${styles.navButton} ${styles.prevButton}`}>
                      <FaChevronLeft />
                    </button>
                    <button onClick={goToNextImage} className={`${styles.navButton} ${styles.nextButton}`}>
                      <FaChevronRight />
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
                      <img src={img} alt={`Фото ${index + 1}`} />
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
                  <img src={brandLogoUrl} alt={`${product.brand} Logo`} className={styles.brandLogo} />
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
            <div className={styles.rating}>
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className={i < 4 ? styles.starFilled : styles.starEmpty} />
              ))}
              <span className={styles.ratingText}>4.8 (127 отзывов)</span>
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
}