// pages/admin/products.tsx
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import styles from '../../styles/AdminProducts.module.css'; // Используем новые стили
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить товары.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (loading) return <AdminLayout title="Товары"><div style={{textAlign: 'center', padding: '1rem'}}>Загрузка товаров...</div></AdminLayout>;
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
                        <img src={product.images?.[0] || 'https://via.placeholder.com/50'} alt={product.name} className={styles.productImage} />
                      </td>
                      <td className={styles.tableCell}>{product.name}</td>
                      <td className={styles.tableCell}>{product.brand || 'Не указан'}</td>
                      <td className={styles.tableCell}>₽{parseFloat(product.price).toLocaleString('ru-RU')}</td>
                      <td className={styles.tableCell}>
                        {product.variants.map(v => `${v.color ? v.color + '/' : ''}${v.size}: ${v.stock}`).join('; ')}
                      </td>
                      <td className={styles.tableCell}>
                        <button onClick={() => router.push(`/admin/products/edit/${product.id}`)} className={`${styles.actionButton} ${styles.editButton}`}>
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
                    <img src={product.images?.[0] || 'https://via.placeholder.com/60'} alt={product.name} className={styles.cardImage} />
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
                    <button onClick={() => router.push(`/admin/products/edit/${product.id}`)} className={`${styles.cardActionButton} ${styles.editButton}`}>
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