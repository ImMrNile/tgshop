// pages/product/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from './ProductDetail.module.css';
import { getBrandLogoUrl } from '../../lib/brandLogos'; // Убедитесь, что lib/brandLogos.ts создан

// Импорты иконок
import { FaArrowLeft, FaShoppingCart, FaChevronLeft, FaChevronRight, FaInfoCircle, FaWeightHanging } from 'react-icons/fa';
import { MdOutlineLocalLaundryService } from 'react-icons/md';

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
  brand?: string; // Добавлено поле brand
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Для карусели

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
            setCurrentImageIndex(0); // Устанавливаем текущий индекс в 0 при загрузке продукта
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

  const handleAddToCart = () => {
    if (!product || !selectedVariant) {
      alert('Пожалуйста, выберите вариант товара.');
      return;
    }
    // Здесь будет логика добавления товара в корзину
    console.log(`Добавлен в корзину: ${product.name}, Размер: ${selectedVariant.size}, Цвет: ${selectedVariant.color}`);
    alert(`"${product.name} ${selectedVariant.color ? '(' + selectedVariant.color + ')' : ''} ${selectedVariant.size}" добавлен в корзину!`);
  };

  const goToNextImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length);
  };

  const goToPrevImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + product.images.length) % product.images.length);
  };

  // Отображение состояния загрузки/ошибки/нет товара
  if (loading) return <div style={{textAlign: 'center', padding: '2rem', fontSize: '1.5rem', color: '#4b5563'}}>Загрузка информации о товаре...</div>;
  if (error) return <div style={{textAlign: 'center', padding: '2rem', fontSize: '1.5rem', color: 'red'}}>Ошибка: {error}</div>;
  if (!product) return <div style={{textAlign: 'center', padding: '2rem', fontSize: '1.5rem', color: '#4b5563'}}>Товар не найден.</div>;

  // Теперь product точно не null, можно безопасно получить brandLogoUrl
  const brandLogoUrl = getBrandLogoUrl(product.brand);
  const currentImage = product.images?.[currentImageIndex];

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>{product.name} | Elite App</title>
        <meta name="description" content={product.description || product.name} />
      </Head>

      <main className={styles.mainContent}> {/* Убраны ${styles.container} ${styles.ptLarge} */}
        <Link href="/" className={styles.backLink}>
          <FaArrowLeft className={styles.backLinkIcon} />
          Вернуться в каталог
        </Link>

        <div className={styles.productWrapper}>
          {/* Галерея изображений и видео */}
          <div className={styles.mediaGallery}>
            {product.images && product.images.length > 0 ? (
              <div className={styles.mainImageContainer}>
                <img src={currentImage} alt={product.name} className={styles.mainImage} />
                {product.images.length > 1 && ( // Показываем навигацию только если больше 1 изображения
                  <>
                    <button onClick={goToPrevImage} className={`${styles.carouselNavButton} ${styles.prev}`}>
                      <FaChevronLeft />
                    </button>
                    <button onClick={goToNextImage} className={`${styles.carouselNavButton} ${styles.next}`}>
                      <FaChevronRight />
                    </button>
                    <div className={styles.carouselDots}>
                      {product.images.map((_, index) => (
                        <span
                          key={index}
                          className={`${styles.carouselDot} ${index === currentImageIndex ? styles.active : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                        ></span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.noMediaPlaceholder}>Нет изображений</div>
            )}

            {/* Миниатюры изображений */}
            {product.images && product.images.length > 0 && (
              <div className={styles.imageGrid}>
                {product.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Миниатюра ${index + 1}`}
                    className={`${styles.imageThumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}

            {/* Видео */}
            {product.videos && product.videos.length > 0 && (
              <div className={styles.videoGrid}>
                {product.videos.map((vid, index) => (
                  <video key={index} src={vid} controls className={styles.videoPlayer}></video>
                ))}
              </div>
            )}
            {!product.images.length && !product.videos.length && (
                <div className={styles.noMediaPlaceholder}>Нет медиа-файлов</div>
            )}
          </div>

          {/* Информация о товаре и действия */}
          <div className={styles.productInfo}>
            <h1 className={styles.productName}>{product.name}</h1>
            {product.brand && (
              <div className={styles.productBrandInfo}> {/* Используем div для логотипа и названия */}
                {brandLogoUrl && (
                  <img src={brandLogoUrl} alt={`${product.brand} Logo`} className={styles.brandLogo} />
                )}
                <p className={styles.productBrand}>{product.brand}</p>
              </div>
            )}
            <p className={styles.productDescription}>{product.description}</p>

            <div className={styles.priceWrapper}>
              <span className={styles.currentPrice}>₽{parseFloat(product.currentPrice).toLocaleString()}</span>
              {product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.currentPrice) && (
                <span className={styles.oldPrice}>₽{parseFloat(product.oldPrice).toLocaleString()}</span>
              )}
            </div>

            {/* Выбор варианта */}
            {product.variants && product.variants.length > 0 && (
              <div className={styles.variantSelection}>
                <label className={styles.variantLabel}>Выберите вариант:</label>
                <div className={styles.variantGrid}>
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`${styles.variantButton} ${selectedVariant?.id === variant.id ? styles.variantButtonSelected : ''} ${variant.stock === 0 ? styles.variantButtonDisabled : ''}`}
                      disabled={variant.stock === 0}
                    >
                      {variant.color && `${variant.color} / `}{variant.size} ({variant.stock} в наличии)
                    </button>
                  ))}
                </div>
                {selectedVariant && selectedVariant.stock === 0 && (
                  <p className={styles.variantWarning}>Выбранный вариант отсутствует на складе.</p>
                )}
                {!selectedVariant && (
                   <p className={styles.variantWarning}>Пожалуйста, выберите размер/цвет.</p>
                )}
              </div>
            )}

            <button
              onClick={handleAddToCart}
              className={styles.addToCartButton}
              disabled={!selectedVariant || selectedVariant.stock === 0}
            >
              <FaShoppingCart /> Добавить в корзину
            </button>

            {/* Дополнительная информация */}
            {(product.composition || product.careInstructions) && (
                <div className={styles.additionalInfo}>
                    {product.composition && (
                        <div className={styles.additionalInfoItem}>
                            <h3 className={styles.additionalInfoTitle}><FaInfoCircle /> Состав:</h3>
                            <p className={styles.additionalInfoText}>{product.composition}</p>
                        </div>
                    )}
                    {product.careInstructions && (
                        <div className={styles.additionalInfoItem}>
                            <h3 className={styles.additionalInfoTitle}><MdOutlineLocalLaundryService /> Уход:</h3>
                            <p className={styles.additionalInfoText}>{product.careInstructions}</p>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 Elite App. Все права защищены.</p>
      </footer>
    </div>
  );
}