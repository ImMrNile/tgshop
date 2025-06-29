// pages/admin/orders/[id].tsx
import { useEffect, useState, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import styles from '../../../styles/AdminOrders.module.css';
import { Order, OrderStatus, Comment as CommentType, Role, DeliveryService, User, OrderItem, ProductVariant } from '@prisma/client';

const orderStatusRussianNames: Record<OrderStatus, string> = { PENDING: 'В ожидании', PAID: 'Оплачен', PROCESSING: 'В обработке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменен', REFUNDED: 'Возвращен' };
const deliveryServiceRussianNames: Record<DeliveryService, string> = { SDEK: 'СДЭК', BOXBERRY: 'Boxberry', POST_RF: 'Почта России', YANDEX_PVZ: 'Яндекс Доставка (ПВЗ)', FIVE_POST: '5Post', COURIER: 'Курьер', OTHER: 'Другая служба' };

type FullOrderItem = OrderItem & { product: { images: string[] } | null; productVariant: { color: string | null; size: string } | null; };
type FullOrder = Order & { user: User | null; items: FullOrderItem[]; comments: (CommentType & {authorRole: Role})[] };

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<OrderStatus>(OrderStatus.PENDING);
  const [deliveryCost, setDeliveryCost] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) throw new Error('Не удалось загрузить заказ');
      const data = await res.json();
      setOrder(data);
      setStatus(data.status);
      setDeliveryCost(data.deliveryCostPaidByAdmin?.toString() || '');
      setTrackingNumber(data.trackingNumber || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, deliveryCostPaidByAdmin: deliveryCost, trackingNumber }),
      });
      if (!res.ok) throw new Error('Ошибка при обновлении заказа');
      alert('Заказ обновлен!');
      await fetchOrder();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (newCommentText.trim() === '') return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newCommentText }),
      });
      if (!res.ok) throw new Error('Ошибка при добавлении комментария');
      setNewCommentText('');
      await fetchOrder();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <AdminLayout><div className={styles.container}><p>Загрузка заказа...</p></div></AdminLayout>;
  if (error) return <AdminLayout><div className={styles.container}><p className={styles.error}>{error}</p></div></AdminLayout>;
  if (!order) return <AdminLayout><div className={styles.container}><p>Заказ не найден.</p></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className={`${styles.container} ${styles.detailContainer}`}>
        <button onClick={() => router.back()} className={styles.backButton}>&larr; Назад к заказам</button>
        <h1>Заказ #{order.id.substring(0, 8)}</h1>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Управление заказом</h3>
            <div className={styles.formGroup}>
              <label>Статус заказа</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} disabled={isSubmitting}>
                {Object.values(OrderStatus).map(s => <option key={s} value={s}>{orderStatusRussianNames[s]}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Стоимость доставки (для вас)</label>
              <input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(e.target.value)} placeholder="Например, 350.50" disabled={isSubmitting}/>
            </div>
            <div className={styles.formGroup}>
              <label>Трек-номер</label>
              <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Например, 80085123456789" disabled={isSubmitting}/>
            </div>
            <button onClick={handleUpdateOrder} className={styles.button} disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Обновить заказ'}
            </button>
          </div>
          <div className={styles.card}>
            <h3>Диалог с клиентом</h3>
            <div className={styles.chatContainer}>
              {order.comments.map(comment => (
                <div key={comment.id} className={`${styles.chatBubble} ${comment.authorRole === 'USER' ? styles.userBubble : styles.adminBubble}`}>
                  {comment.text && <p>{comment.text}</p>}
                  {comment.imageUrls && comment.imageUrls.length > 0 && (
                      <div className={styles.commentImages}>
                          {comment.imageUrls.map((imgUrl, i) => <img key={i} src={imgUrl} alt={`Изображение ${i+1}`} className={styles.commentImage} />)}
                      </div>
                  )}
                  <span className={styles.chatTimestamp}>{new Date(comment.createdAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
            <div className={styles.formGroup}>
              <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Напишите комментарий..." disabled={isSubmitting}></textarea>
            </div>
            <button onClick={handleAddComment} className={styles.button} disabled={isSubmitting}>
              {isSubmitting ? 'Отправка...' : 'Добавить комментарий'}
            </button>
          </div>
          <div className={`${styles.card} ${styles.fullWidth}`}>
            {/* ... Блок "Детали заказа" остается без изменений ... */}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}