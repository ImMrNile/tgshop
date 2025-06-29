// pages/checkout.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useApp } from '../contexts/AppContext';
import styles from '../styles/Checkout.module.css';
import { FaArrowLeft, FaPaperPlane, FaRegUserCircle, FaShippingFast, FaCreditCard } from 'react-icons/fa';
import type { User, DeliveryDetail } from '@prisma/client';

// Карты для перевода enum'ов на русский язык
const deliveryServiceRussianNames: Record<string, string> = {
  SDEK: 'СДЭК',
  BOXBERRY: 'Boxberry',
  POST_RF: 'Почта России',
  YANDEX_PVZ: 'Яндекс Доставка (ПВЗ)',
  FIVE_POST: '5Post',
  COURIER: 'Курьер',
  OTHER: 'Другая служба',
};
const paymentMethodRussianNames: Record<string, string> = {
  CARD: 'Банковская карта',
  SBP: 'СБП (Система быстрых платежей)',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { state, clearCart } = useApp();
  const { cart, cartTotal } = state;

  const TELEGRAM_MANAGER_USERNAME = 'mrnile';

  // Состояния
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<DeliveryDetail[]>([]);
  const [deliveryDetails, setDeliveryDetails] = useState({
    fullName: '',
    phoneNumber: '',
    country: 'Россия',
    city: '',
    postalCode: '',
    address: '',
    type: 'POST_RF',
    saveAddress: true,
  });
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных пользователя и его адресов
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [profileRes, addressesRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/delivery-details'),
        ]);

        if (profileRes.ok) {
          setUserProfile(await profileRes.json());
        } else {
          console.error('Не удалось загрузить профиль пользователя');
        }

        if (addressesRes.ok) {
          setSavedAddresses(await addressesRes.json());
        } else {
          console.error('Не удалось загрузить сохраненные адреса');
        }
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Обработчик изменения полей ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'paymentMethod') {
      setPaymentMethod(value);
    } else {
      setDeliveryDetails(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // Обработчик выбора сохраненного адреса
  const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const addressId = e.target.value;
    if (!addressId) {
      // Сброс полей при выборе "Новый адрес"
      setDeliveryDetails({
        fullName: '', phoneNumber: '', country: 'Россия', city: '', postalCode: '', address: '',
        type: 'POST_RF', saveAddress: true,
      });
      return;
    }
    const selected = savedAddresses.find(addr => addr.id === addressId);
    if (selected) {
      setDeliveryDetails({
        fullName: selected.fullName,
        phoneNumber: selected.phoneNumber,
        country: selected.country,
        city: selected.city,
        postalCode: selected.postalCode,
        address: selected.address,
        type: selected.type,
        saveAddress: false, // Адрес уже сохранен
      });
    }
  };

  // Расчет скидки и итоговой суммы
  const personalDiscountPercent = userProfile?.personalDiscount ? parseFloat(userProfile.personalDiscount.toString()) : 0;
  const discountAmount = (cartTotal * personalDiscountPercent) / 100;
  const finalTotal = cartTotal - discountAmount;

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreedToPolicy) {
      setError('Вы должны согласиться с политикой невозвратности товара.');
      return;
    }
    if (cart.length === 0) {
      setError('Ваша корзина пуста.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, deliveryDetails, paymentMethod, agreedToPolicy }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Не удалось создать заказ.');
      }
      
      const { order } = data;

      // Формируем сообщение для менеджера
      let message = `Здравствуйте! Новый заказ №${order.id.substring(0,8)}\n\n`;
      message += `Сумма к оплате: ${parseFloat(order.totalAmount).toLocaleString('ru-RU')} ₽ (с учетом скидки ${personalDiscountPercent}%)\n`;
      message += `Способ оплаты: ${paymentMethodRussianNames[paymentMethod] || paymentMethod}\n\n`;
      message += `Состав заказа:\n`;
      cart.forEach(item => {
        message += `- ${item.product.name} (${item.variant.size}) - ${item.quantity} шт.\n`;
      });
      message += `\nДоставка:\n`;
      message += `ФИО: ${deliveryDetails.fullName}\n`;
      message += `Телефон: ${deliveryDetails.phoneNumber}\n`;
      message += `Адрес: ${deliveryDetails.country}, ${deliveryDetails.city}, ${deliveryDetails.address}, ${deliveryDetails.postalCode}\n`;
      message += `Служба: ${deliveryServiceRussianNames[deliveryDetails.type]}`;

      const telegramUrl = `https://t.me/${TELEGRAM_MANAGER_USERNAME}?text=${encodeURIComponent(message)}`;
      clearCart();
      window.location.href = telegramUrl;

    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Произошла неизвестная ошибка');
      setLoading(false);
    }
  };

  // Отображение загрузки или пустой корзины
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Head><title>Загрузка...</title></Head>
        <p style={{ textAlign: 'center', padding: '2rem' }}>Загрузка данных...</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className={styles.pageContainer}>
        <Head><title>Корзина пуста</title></Head>
        <div className={styles.emptyState}>
          <h3>Ваша корзина пуста</h3>
          <p>Добавьте товары в корзину, чтобы оформить заказ.</p>
          <Link href="/" className={styles.shopButton}><FaShippingFast/> Перейти к покупкам</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Head><title>Оформление заказа</title></Head>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}><FaArrowLeft /></button>
        <h1 className={styles.headerTitle}>Оформление заказа</h1>
        <div></div>
      </header>
      <main className={styles.mainContainer}>
        <form onSubmit={handleSubmit} className={styles.checkoutForm}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}><FaRegUserCircle/> Адрес и получатель</h2>
            {savedAddresses.length > 0 && (
              <div className={styles.formGroup}>
                <label htmlFor="savedAddress">Выбрать сохраненный адрес</label>
                <select id="savedAddress" onChange={handleAddressSelect} className={styles.select}>
                  <option value="">-- Ввести новый адрес --</option>
                  {savedAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {`${addr.city}, ${addr.address}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="fullName">ФИО получателя</label>
                <input type="text" name="fullName" value={deliveryDetails.fullName} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phoneNumber">Номер телефона</label>
                <input type="tel" name="phoneNumber" value={deliveryDetails.phoneNumber} required onChange={handleInputChange} />
              </div>
            </div>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="country">Страна</label>
                    <input type="text" name="country" value={deliveryDetails.country} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="city">Город</label>
                    <input type="text" name="city" value={deliveryDetails.city} onChange={handleInputChange} required />
                </div>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="address">Улица, дом, квартира</label>
                <input type="text" name="address" value={deliveryDetails.address} onChange={handleInputChange} placeholder="Например, ул. Пушкина, д. 10, кв. 5" required />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="postalCode">Почтовый индекс</label>
                <input type="text" name="postalCode" value={deliveryDetails.postalCode} onChange={handleInputChange} required />
            </div>
            <div className={styles.checkboxGroup}>
                <input type="checkbox" name="saveAddress" id="saveAddress" checked={deliveryDetails.saveAddress} onChange={handleInputChange} />
                <label htmlFor="saveAddress">Сохранить этот адрес для будущих заказов</label>
            </div>
          </section>
          
          <section className={styles.formSection}>
             <h2 className={styles.sectionTitle}><FaShippingFast /> Способ доставки</h2>
             <div className={styles.formGroup}>
                 <label htmlFor="type">Служба доставки</label>
                 <select name="type" id="type" value={deliveryDetails.type} onChange={handleInputChange} className={styles.select}>
                     {Object.keys(deliveryServiceRussianNames).map((key) => (
                         <option key={key} value={key}>
                             {deliveryServiceRussianNames[key]}
                         </option>
                     ))}
                 </select>
             </div>
          </section>

          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}><FaCreditCard/> Способ оплаты</h2>
            <div className={styles.formGroup}>
              <label htmlFor="paymentMethod">Предпочтительный способ</label>
              <select name="paymentMethod" id="paymentMethod" value={paymentMethod} onChange={handleInputChange} className={styles.select}>
                  {Object.keys(paymentMethodRussianNames).map((key) => (
                      <option key={key} value={key}>
                          {paymentMethodRussianNames[key]}
                      </option>
                  ))}
              </select>
            </div>
          </section>

          <section className={styles.formSection}>
             <h2 className={styles.sectionTitle}>Ваш заказ</h2>
             <div className={styles.orderSummary}>
                 {cart.map(item => (
                     <div key={item.product.id + item.variant.id} className={styles.summaryItem}>
                         <span>{item.product.name} ({item.variant.size}) x{item.quantity}</span>
                         <strong>₽{(parseFloat(item.product.currentPrice) * item.quantity).toLocaleString('ru-RU')}</strong>
                     </div>
                 ))}
                 <div className={`${styles.summaryItem} ${styles.summarySubtotal}`}>
                     <span>Подытог</span>
                     <strong>₽{cartTotal.toLocaleString('ru-RU')}</strong>
                 </div>
                 {personalDiscountPercent > 0 && (
                     <div className={`${styles.summaryItem} ${styles.summaryDiscount}`}>
                         <span>Персональная скидка ({personalDiscountPercent}%)</span>
                         <strong>- ₽{discountAmount.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                     </div>
                 )}
                 <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
                     <span>Итого к оплате</span>
                     <strong>₽{finalTotal.toLocaleString('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                 </div>
             </div>
          </section>

          <section className={styles.formSection}>
            <div className={`${styles.checkboxGroup} ${styles.policy}`}>
               <input type="checkbox" id="agreedToPolicy" checked={agreedToPolicy} onChange={(e) => setAgreedToPolicy(e.target.checked)} />
               <label htmlFor="agreedToPolicy">Я согласен с тем, что товар не подлежит возврату и обмену.</label>
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  <span>Создаем заказ...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane/>
                  <span>Отправить менеджеру</span>
                </>
              )}
            </button>
            <p className={styles.secureNote}>Вы будете перенаправлены в Telegram для завершения оплаты.</p>
          </section>
        </form>
      </main>
    </div>
  );
}