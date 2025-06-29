// pages/orders/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/MyOrders.module.css';
import { FaArrowLeft, FaCopy, FaPaperPlane } from 'react-icons/fa';
import { Order, OrderStatus, Comment, Role, OrderItem, ProductVariant, DeliveryService } from '@prisma/client';
import BottomNav from '../../components/BottomNav';

// Карты для перевода на русский язык
const orderStatusRussianNames: Record<OrderStatus, string> = {
  PENDING: 'В ожидании',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменен',
  REFUNDED: 'Возвращен'
};

const deliveryServiceRussianNames: Record<DeliveryService, string> = {
  SDEK: 'СДЭК',
  BOXBERRY: 'Boxberry',
  POST_RF: 'Почта России',
  YANDEX_PVZ: 'Яндекс Доставка (ПВЗ)',
  FIVE_POST: '5Post',
  COURIER: 'Курьер',
  OTHER: 'Другая служба'
};

// Полные типы для данных
type CommentWithRole = Comment & { authorRole: Role };
type OrderDetail = Order & {
  items: (OrderItem & { productVariant: ProductVariant | null })[];
  comments: CommentWithRole[];
};

export default function OrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);

    const fetchOrderDetails = async () => {
        if (!id || typeof id !== 'string') return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/orders/${id}`);
            if (!res.ok) throw new Error('Ошибка загрузки заказа');
            const data = await res.json();
            setOrder(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const handleCopy = (text: string | null | undefined) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess('Скопировано!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleSendComment = async () => {
        if (newComment.trim() === '' || !id) return;
        setIsSending(true);
        try {
            const res = await fetch(`/api/orders/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newComment }),
            });
            if (!res.ok) throw new Error('Не удалось отправить комментарий');
            setNewComment('');
            await fetchOrderDetails(); // Обновляем чат
        } catch (error) {
            console.error(error);
            alert('Ошибка при отправке комментария');
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return <div className={styles.pageContainer}><p style={{textAlign: 'center', paddingTop: '2rem'}}>Загрузка...</p></div>;
    if (!order) return <div className={styles.pageContainer}><p style={{textAlign: 'center', paddingTop: '2rem'}}>Не удалось загрузить детали заказа.</p></div>;

    return (
        <>
            <div className={styles.pageContainerWithNav}>
                <Head>
                    <title>Заказ #{order.id.substring(0,8)}</title>
                </Head>
                <header className={styles.header}>
                    <button onClick={() => router.push('/orders')} className={styles.backButton}><FaArrowLeft /></button>
                    <h1>Заказ #{order.id.substring(0,8)}</h1>
                    <div></div>
                </header>
                
                <main className={styles.mainContent}>
                    <div className={styles.detailCard}>
                        <div className={styles.detailRow}>
                            <span>Статус:</span>
                            <strong>{orderStatusRussianNames[order.status] || order.status}</strong>
                        </div>
                        <div className={styles.detailRow}>
                            <span>Служба доставки:</span>
                            <strong>{deliveryServiceRussianNames[order.deliveryType] || order.deliveryType}</strong>
                        </div>
                        {order.trackingNumber && (
                            <div className={styles.detailRow}>
                                <span>Трек-номер:</span>
                                <div className={styles.trackNumberWrapper}>
                                    <strong>{order.trackingNumber}</strong>
                                    <button onClick={() => handleCopy(order.trackingNumber)} className={styles.copyButton}>
                                        {copySuccess ? copySuccess : <FaCopy />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {order.items && order.items.length > 0 && (
                        <div className={styles.detailCard}>
                            <h3>Состав заказа</h3>
                            {order.items.map(item => (
                                <div key={item.id} className={styles.itemDetail}>
                                    <p>{item.productName} ({item.productVariant?.size}, {item.productVariant?.color || 'N/A'})</p>
                                    <span>{item.quantity} шт.</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.detailCard}>
                        <h3>Диалог с менеджером</h3>
                        <div className={styles.chatContainer}>
                            {order.comments && order.comments.length > 0 ? (
                                order.comments.map(comment => (
                                    <div key={comment.id} className={`${styles.chatBubble} ${comment.authorRole === 'USER' ? styles.userBubble : styles.adminBubble}`}>
                                        {comment.text && <p className={styles.chatText}>{comment.text}</p>}
                                        {comment.imageUrls && comment.imageUrls.length > 0 && (
                                            <div className={styles.chatImages}>
                                                {comment.imageUrls.map((url, i) => <img key={i} src={url} alt={`Изображение ${i+1}`} className={styles.chatImage} />)}
                                            </div>
                                        )}
                                        <span className={styles.chatTimestamp}>{new Date(comment.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noComments}>У вас пока нет сообщений по этому заказу.</p>
                            )}
                        </div>
                        <div className={styles.chatInputContainer}>
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Напишите сообщение..."
                                className={styles.chatInput}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                                disabled={isSending}
                            />
                            <button onClick={handleSendComment} className={styles.sendButton} disabled={isSending}>
                                <FaPaperPlane />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            <BottomNav />
        </>
    );
}