// pages/admin/products.tsx
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import AdminLayout from '../../components/AdminLayout';
import styles from '../../styles/AdminProducts.module.css';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../components/AuthProvider'; // <-- Импортируем useAuth

interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  color?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  price: string;
  oldPrice?: string;
  costPrice: string;
  category: string;
  images: string[];
  variants: ProductVariant[];
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, isLoading, isAdmin } = useAuth(); // <-- Получаем user, isLoading и isAdmin
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true); // Переименовано, чтобы избежать конфликта
  const [error, setError] = useState<string | null>(null);

  // <-- Добавляем useEffect для проверки аутентификации и админ-статуса
  useEffect(() => {
    if (isLoading) {
      return; // Ждем завершения загрузки аутентификации
    }
    if (!user || !isAdmin) {
      router.push('/login'); // Перенаправляем, если не админ или не авторизован
    }
  }, [user, isLoading, isAdmin, router]);

  const fetchProducts = useCallback(async () => {
    // <-- Выполняем запрос только если пользователь является админом
    if (!isLoading && isAdmin) {
      setLoadingProducts(true);
      try {
        const res = await fetch('/api/admin/products');
        if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
        const data = await res.json();
        setProducts(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить товары.');
      } finally {
        setLoadingProducts(false);
      }
    }
  }, [isLoading, isAdmin]); // <-- Добавляем зависимости

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар? Это действие необратимо.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
      setProducts(products.filter((product) => product.id !== id));
      alert('Товар успешно удален!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      console.error('Failed to delete product:', err);
      alert(`Ошибка при удалении товара: ${message}`);
    }
  };

  // <-- Условный рендеринг для проверки доступа
  if (isLoading || !user || !isAdmin) {
    return (
      <AdminLayout title="Товары">
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          {isLoading ? 'Проверка доступа...' : 'У вас нет доступа к этой странице.'}
        </div>
      </AdminLayout>
    );
  }

  // Остальная логика загрузки и ошибок
  if (loadingProducts) return <AdminLayout title="Товары"><div style={{textAlign: 'center', padding: '1rem'}}>Загрузка товаров...</div></AdminLayout>;
  if (error) return <AdminLayout title="Товары"><div style={{textAlign: 'center', padding: '1rem', color: 'red'}}>Ошибка: {error}</div></AdminLayout>;

  return (
    <AdminLayout title="Товары">
      <div className={styles.pageContainer}>
        <div className={styles.headerWrapper}>
          <h2 className={styles.pageTitle}>Управление Товарами</h2>
          <Link href="/admin/products/form" className={styles.addButton}>
            <FaPlus /> Добавить товар
          </Link>
        </div>

        {products.length === 0 ? (
          <p>Пока нет товаров.</p>
        ) : (
          <>
            {/* Таблица для десктопов */}
            <div className={styles.tableContainer}>
              <table className={styles.productTable}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>Фото</th>
                    <th className={styles.tableHeader}>Название</th>
                    <th className={styles.tableHeader}>Бренд</th>
                    <th className={styles.tableHeader}>Цена</th>
                    <th className={styles.tableHeader}>Остатки</th>
                    <th className={styles.tableHeader}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className={styles.tableCell}>
                        <Image 
                          src={product.images?.[0] || 'https://via.placeholder.com/50'} 
                          alt={product.name} 
                          className={styles.productImage}
                          width={50}
                          height={50}
                        />
                      </td>
                      <td className={styles.tableCell}>{product.name}</td>
                      <td className={styles.tableCell}>{product.brand || 'Не указан'}</td>
                      <td className={styles.tableCell}>₽{parseFloat(product.price).toLocaleString('ru-RU')}</td>
                      <td className={styles.tableCell}>
                        {product.variants.map(v => `${v.color ? v.color + '/' : ''}${v.size}: ${v.stock}`).join('; ')}
                      </td>
                      <td className={styles.tableCell}>
                        <button onClick={() => router.push(`/admin/products/${product.id}/edit`)} className={`${styles.actionButton} ${styles.editButton}`}>
                           <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                           <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Карточки для мобильных устройств */}
            <div className={styles.cardsContainer}>
              {products.map((product) => (
                <div key={product.id} className={styles.productCard}>
                  <div className={styles.cardHeader}>
                    <Image 
                      src={product.images?.[0] || 'https://via.placeholder.com/60'} 
                      alt={product.name} 
                      className={styles.cardImage}
                      width={60}
                      height={60}
                    />
                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardTitle}>{product.name}</h3>
                      <p className={styles.cardInfo}>Бренд: {product.brand || 'Не указан'}</p>
                    </div>
                  </div>
                  <div className={styles.cardDetails}>
                    <p>Цена: <span>₽{parseFloat(product.price).toLocaleString('ru-RU')}</span></p>
                    <p>Остатки:</p>
                    <ul className={styles.cardVariantsList}>
                      {product.variants.map((v, idx) => (
                        <li key={idx}>
                          {v.color && `${v.color}/`}{v.size}: {v.stock} шт.
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.cardActions}>
                    <button onClick={() => router.push(`/admin/products/${product.id}/edit`)} className={`${styles.cardActionButton} ${styles.editButton}`}>
                      <FaEdit /> Редактировать
                    </button>
                    <button onClick={() => handleDelete(product.id)} className={`${styles.cardActionButton} ${styles.deleteButton}`}>
                      <FaTrashAlt /> Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}