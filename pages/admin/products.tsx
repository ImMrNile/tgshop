// pages/admin/products.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout'; // Убедитесь, что путь верный
import styles from './ProductsAdmin.module.css';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  color?: string; // Добавили цвет
}

interface Product {
  id: string;
  name: string;
  price: string;
  brand: string;
  oldPrice?: string;
  costPrice: string;
  category: string;
  images: string[];
  variants: ProductVariant[];
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
      const data = await res.json();
      setProducts(data.map((p: Product) => ({
        ...p,
        price: parseFloat(p.price).toFixed(2),
        oldPrice: p.oldPrice ? parseFloat(p.oldPrice).toFixed(2) : undefined,
        costPrice: parseFloat(p.costPrice).toFixed(2),
      })));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар? Это действие необратимо.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
      setProducts(products.filter((product) => product.id !== id));
      alert('Товар успешно удален!');
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      alert(`Ошибка при удалении товара: ${err.message}`);
    }
  };

  if (loading) return <AdminLayout title="Товары"><div style={{textAlign: 'center', padding: '1rem'}}>Загрузка товаров...</div></AdminLayout>;
  if (error) return <AdminLayout title="Товары"><div style={{textAlign: 'center', padding: '1rem', color: 'red'}}>Ошибка: {error}</div></AdminLayout>;

  return (

    <AdminLayout title="Товары">
      <div className={styles.pageContainer}>
        <div className={styles.headerWrapper}>
          <h2 className={styles.pageTitle}>Управление Товарами</h2>
          <Link href="/admin/products/new" className={styles.addButton}>
            <FaPlus className={styles.buttonIcon} /> Добавить новый товар {/* Иконка */}
          </Link>
        </div>

        {products.length === 0 ? (
          <p className={styles.noProductsMessage}>Пока нет товаров.</p>
        ) : (
          <>
            {/* Таблица для десктопов */}
            <div className={styles.tableContainer}>
              <table className={styles.productTable}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeader}>Изображение</th>
                    <th className={styles.tableHeader}>Название</th>
                    <th className={styles.tableHeader}>Бренд</th>
                    <th className={styles.tableHeader}>Цена</th>
                    <th className={styles.tableHeader}>Себестоимость</th>
                    <th className={styles.tableHeader}>Категория</th>
                    <th className={styles.tableHeader}>Остатки</th>
                    <th className={styles.tableHeader}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className={styles.tableBodyRow}>
                      <td className={styles.tableCell}>
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className={styles.productImage} />
                        ) : (
                          <div className={styles.noImagePlaceholder}>Нет фото</div>
                        )}
                      </td>
                      <td className={styles.tableCell}>{product.name}</td>
                      <td className={styles.tableCell}>{product.brand || 'Не указан'}</td> {/* Ячейка для бренда */}
                      <td className={`${styles.tableCell} ${styles.textSecondary}`}>₽{product.price}</td>
                      <td className={`${styles.tableCell} ${styles.textSecondary}`}>₽{product.costPrice}</td>
                      <td className={`${styles.tableCell} ${styles.textSecondary}`}>{product.category}</td>
                      <td className={`${styles.tableCell} ${styles.textSecondary}`}>
                        {product.variants.map(v => `${v.color ? v.color + '/' : ''}${v.size}: ${v.stock}`).join(', ')}
                      </td>
                     <td className={styles.tableCell}>
          <Link href={`/admin/products/${product.id}`} className={`${styles.actionButton} ${styles.editButton}`}>
            <FaEdit className={styles.buttonIconSmall} /> Редактировать {/* Иконка */}
          </Link>
          <button
            onClick={() => handleDelete(product.id)}
            className={`${styles.actionButton} ${styles.deleteButton}`}
          >
            <FaTrashAlt className={styles.buttonIconSmall} /> Удалить {/* Иконка */}
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
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className={styles.cardImage} />
                    ) : (
                      <div className={`${styles.cardImage} ${styles.noImagePlaceholder}`}>Нет фото</div>
                    )}
                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardTitle}>{product.name}</h3>
                      <p className={styles.cardCategory}>Категория: {product.category}</p>
                       <p className={styles.cardCategory}>Бренд: {product.brand || 'Не указан'}</p> {/* НОВАЯ СТРОКА */}
                    </div>
                  </div>
                  <div className={styles.cardDetails}>
                    <p>Цена: <span className={styles.cardPrice}>₽{product.price}</span></p>
                    <p>Себестоимость: <span className={styles.cardPrice}>₽{product.costPrice}</span></p>
                    <p>Остатки:</p>
                    <ul className={styles.cardVariantsList}>
                      {product.variants.map((v, idx) => (
                        <li key={idx} className={styles.cardVariantItem}>
                          {v.color && `${v.color}/`}{v.size}: {v.stock} шт.
                        </li>
                      ))}
                    </ul>
                  </div>
             <div className={styles.cardActions}>
          <Link href={`/admin/products/${product.id}`} className={`${styles.cardActionButton} ${styles.cardEditButton}`}>
            <FaEdit className={styles.buttonIconSmall} /> Редактировать {/* Иконка */}
          </Link>
          <button
            onClick={() => handleDelete(product.id)}
            className={`${styles.cardActionButton} ${styles.cardDeleteButton}`}
          >
            <FaTrashAlt className={styles.buttonIconSmall} /> Удалить {/* Иконка */}
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