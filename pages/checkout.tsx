// pages/checkout.tsx - ИСПРАВЛЕНО
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/Checkout.module.css';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../components/AuthProvider';
import { DeliveryService, PaymentMethod } from '@prisma/client';
import { FaArrowLeft, FaCreditCard, FaTelegram, FaSave, FaTrashAlt } from 'react-icons/fa';

// Интерфейс для сохраненных адресов доставки
interface SavedDeliveryDetail {
  id: string;
  type: DeliveryService;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { state, clearCart } = useApp();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Форма доставки - используем точные поля из вашей схемы
  const [deliveryDetails, setDeliveryDetails] = useState({
    type: 'SDEK' as DeliveryService,
    fullName: '',
    phoneNumber: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'Россия',
    saveAddress: false
  });
  
  // Состояние для сохраненных адресов
  const [savedAddresses, setSavedAddresses] = useState<SavedDeliveryDetail[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  // Способ оплаты - используем существующие значения из БД
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TELEGRAM_STARS' as PaymentMethod);
  
  // Согласие с политикой
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  // Проверяем авторизацию и наличие товаров
  useEffect(() => {
    console.log('=== CHECKOUT AUTH CHECK ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user ? 'exists' : 'null');
    console.log('cart length:', state.cart.length);
    console.log('==========================');

    if (!isAuthenticated) {
      console.log('CheckoutPage: User not authenticated, redirecting to profile.');
      router.push('/profile');
      return;
    }
    
    if (state.cart.length === 0) {
      console.log('CheckoutPage: Cart is empty, redirecting to cart page.');
      router.push('/cart');
    }
  }, [state.cart, isAuthenticated, router]);

  // Эффект для загрузки сохраненных адресов
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      // ИСПРАВЛЕНИЕ: Добавлена проверка на user.id перед запросом
      if (!isAuthenticated || !user || !user.id) { 
        console.log('CheckoutPage: Skipping fetchSavedAddresses - not authenticated or user not fully loaded.');
        return;
      }

      console.log('CheckoutPage: Attempting to fetch saved addresses for user:', user.id);
      try {
        // ИСПРАВЛЕНИЕ: Используем user.id в запросе
        const res = await fetch(`/api/user/delivery-details?userId=${user.id}`); 
        
        console.log('Fetch saved addresses response status:', res.status);
        
        if (res.ok) {
          const data: SavedDeliveryDetail[] = await res.json();
          console.log(`CheckoutPage: Successfully fetched ${data.length} saved addresses.`);
          setSavedAddresses(data);
          
          // Автоматически заполнить форму первым сохраненным адресом, если он есть
          if (data.length > 0) {
            const defaultAddress = data.find(addr => addr.isDefault) || data[0];
            setDeliveryDetails({
              type: defaultAddress.type,
              fullName: defaultAddress.fullName,
              phoneNumber: defaultAddress.phoneNumber,
              address: defaultAddress.address,
              city: defaultAddress.city,
              region: defaultAddress.region || '',
              postalCode: defaultAddress.postalCode || '',
              country: defaultAddress.country,
              saveAddress: false
            });
            console.log('CheckoutPage: Auto-filled form with saved address.');
          }
        } else {
          const errorData = await res.json();
          console.error('CheckoutPage: Failed to fetch saved addresses:', res.status, errorData);
        }
      } catch (error) {
        console.error('CheckoutPage: Error fetching saved addresses:', error);
      }
    };

    fetchSavedAddresses();
  }, [isAuthenticated, router, user]); // ИСПРАВЛЕНИЕ: user в зависимостях

  // ... (остальной код handleSubmit и т.д. без изменений) ...

  const applySavedAddress = (address: SavedDeliveryDetail) => {
    setDeliveryDetails({
      type: address.type,
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      address: address.address,
      city: address.city,
      region: address.region || '',
      postalCode: address.postalCode || '',
      country: address.country,
      saveAddress: false
    });
    setShowSavedAddresses(false);
    console.log('CheckoutPage: Applied saved address:', address.id);
  };

  // Функция для удаления сохраненного адреса
  const deleteSavedAddress = async (addressId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот адрес?')) return;
    if (!user) return;

    console.log('CheckoutPage: Attempting to delete address ID:', addressId);
    try {
      const res = await fetch(`/api/user/delivery-details/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        setSavedAddresses(prev => prev.filter(addr => addr.id !== addressId));
        alert('Адрес успешно удален!');
        console.log('CheckoutPage: Address successfully deleted.');
      } else {
        const errorData = await res.json();
        alert(`Ошибка при удалении адреса: ${errorData.message || res.status}`);
        console.error('CheckoutPage: Failed to delete address:', res.status, errorData);
      }
    } catch (error) {
      console.error('CheckoutPage: Error deleting address:', error);
      alert('Произошла ошибка при удалении адреса.');
    }
  };

  // Функция для формирования сообщения менеджеру
  const formatOrderMessage = (orderId: string) => {
    const deliveryServiceNames: Record<DeliveryService, string> = {
      POST_RF: 'Почта России',
      SDEK: 'СДЭК',
      BOXBERRY: 'Boxberry',
      FIVE_POST: '5Post',
      YANDEX_PVZ: 'Яндекс ПВЗ',
      COURIER: 'Курьер',
      OTHER: 'Другая служба'
    };

    const paymentMethodNames: Record<PaymentMethod, string> = {
      TELEGRAM_STARS: 'Наличные при получении',
      CARD: 'Банковский перевод',
      SBP: 'СБП (Система быстрых платежей)'
    };

    const itemsList = state.cart.map(item => 
      `- ${item.product.name} (${item.variant.size}${item.variant.color ? `, ${item.variant.color}` : ''}) - ${item.quantity} шт.`
    ).join('\n');

    return `Здравствуйте! Новый заказ №${orderId.substring(0, 8).toUpperCase()}

Клиент: ${user?.firstName} ${user?.lastName} (@${user?.username || user?.telegramId})
Сумма: ${state.cartTotal} ₽
Способ оплаты: ${paymentMethodNames[paymentMethod]}

Состав заказа:
${itemsList}

Доставка:
ФИО: ${deliveryDetails.fullName}
Телефон: ${deliveryDetails.phoneNumber}
Адрес: ${deliveryDetails.address}, ${deliveryDetails.city}${deliveryDetails.postalCode ? `, ${deliveryDetails.postalCode}` : ''}${deliveryDetails.region ? `, ${deliveryDetails.region}` : ''}
Страна: ${deliveryDetails.country}
Служба: ${deliveryServiceNames[deliveryDetails.type]}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      alert('Необходимо авторизоваться для оформления заказа.');
      return;
    }
    
    if (!agreedToPolicy) {
      alert('Необходимо согласиться с политикой невозвратности товара.');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Creating order...');
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart: state.cart,
          deliveryDetails: {
            type: deliveryDetails.type,
            fullName: deliveryDetails.fullName,
            phoneNumber: deliveryDetails.phoneNumber,
            address: deliveryDetails.address,
            city: deliveryDetails.city,
            region: deliveryDetails.region || null,
            postalCode: deliveryDetails.postalCode,
            country: deliveryDetails.country,
            saveAddress: deliveryDetails.saveAddress
          },
          paymentMethod,
          userId: user.id,
          agreedToPolicy
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const orderId = data.order.id;
        const message = formatOrderMessage(orderId);
        
        clearCart();
        
        const managerUsername = process.env.NEXT_PUBLIC_MANAGER_USERNAME || 'manager_username_not_set';
        const telegramUrl = `https://t.me/${managerUsername}?text=${encodeURIComponent(message)}`;
        
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const webApp = window.Telegram.WebApp;
          
          if (webApp.openTelegramLink) {
            webApp.openTelegramLink(telegramUrl);
          } else if (webApp.openLink) {
            webApp.openLink(telegramUrl);
          } else {
            window.open(telegramUrl, '_blank');
          }
        } else {
          window.open(telegramUrl, '_blank');
        }
        
        alert(`Заказ №${orderId.substring(0, 8).toUpperCase()} успешно создан! Сообщение отправлено менеджеру.`);
        router.push('/orders');
        
      } else {
        alert(`Ошибка при создании заказа: ${data.message || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка при отправке заказа:', error);
      alert('Произошла ошибка при создании заказа.');
    } finally {
      setLoading(false);
    }
  };

  // Отображение загрузки или редиректа
  if (!isAuthenticated) {
    return <div className={styles.loading}>Необходима авторизация...</div>;
  }

  if (state.cart.length === 0) {
    return <div className={styles.loading}>Загрузка корзины...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Оформление заказа | Hedonist</title> {/* ИСПРАВЛЕНО */}
        <meta name="description" content="Оформление заказа" />
      </Head>

      {/* Шапка */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft />
        </button>
        <h1 className={styles.headerTitle}>Оформление заказа</h1>
        <div></div>
      </header>
      
      <form onSubmit={handleSubmit} className={styles.checkoutForm}>
        {/* Товары в заказе */}
        <section className={styles.section}>
          <h2>Ваш заказ</h2>
          <div className={styles.orderSummary}>
            {state.cart.map((item, index) => (
              <div key={index} className={styles.orderItem}>
                <div className={styles.itemInfo}>
                  <h4>{item.product.name}</h4>
                  <p>{item.variant.size} {item.variant.color && `• ${item.variant.color}`}</p>
                  <span>Количество: {item.quantity}</span>
                </div>
                <div className={styles.itemPrice}>
                  ₽{(parseFloat(item.product.currentPrice) * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
            <div className={styles.totalRow}>
              <strong>Итого: ₽{state.cartTotal.toLocaleString()}</strong>
            </div>
          </div>
        </section>
        
        {/* Данные доставки */}
        <section className={styles.section}>
          <h2>Данные для доставки</h2>
          
          {/* Кнопка "Загрузить сохраненные адреса" */}
          {savedAddresses.length > 0 && (
            <div className={styles.formGroup}>
              <button 
                type="button" 
                onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                className={styles.loadAddressButton}
              >
                <FaSave /> {showSavedAddresses ? 'Скрыть сохраненные адреса' : `Загрузить сохраненные адреса (${savedAddresses.length})`}
              </button>
            </div>
          )}

          {/* Список сохраненных адресов */}
          {showSavedAddresses && savedAddresses.length > 0 && (
            <div className={styles.savedAddressesList}>
              {savedAddresses.map(addr => (
                <div key={addr.id} className={styles.savedAddressItem}>
                  <div className={styles.addressInfo}>
                    <strong>{addr.fullName}</strong> ({addr.type})<br/>
                    {addr.address}, {addr.city}{addr.postalCode ? `, ${addr.postalCode}` : ''}<br/>
                    {addr.phoneNumber}
                  </div>
                  <div className={styles.addressActions}>
                    <button 
                      type="button" 
                      onClick={() => applySavedAddress(addr)}
                      className={styles.applyAddressButton}
                    >
                      Выбрать
                    </button>
                    <button 
                      type="button" 
                      onClick={() => deleteSavedAddress(addr.id)}
                      className={styles.deleteAddressButton}
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="deliveryType">Способ доставки:</label>
            <select
              id="deliveryType"
              value={deliveryDetails.type}
              onChange={(e) => setDeliveryDetails({...deliveryDetails, type: e.target.value as DeliveryService})}
              required
              className={styles.formInput}
            >
              <option value="SDEK">СДЭК</option>
              <option value="BOXBERRY">Boxberry</option>
              <option value="POST_RF">Почта России</option>
              <option value="FIVE_POST">5Post</option>
              <option value="YANDEX_PVZ">Яндекс ПВЗ</option>
              <option value="COURIER">Курьер</option>
              <option value="OTHER">Другая служба</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="fullName">ФИО получателя:</label>
            <input
              type="text"
              id="fullName"
              value={deliveryDetails.fullName}
              onChange={(e) => setDeliveryDetails({...deliveryDetails, fullName: e.target.value})}
              required
              className={styles.formInput}
              placeholder="Введите ваше полное имя"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="phoneNumber">Телефон:</label>
            <input
              type="tel"
              id="phoneNumber"
              value={deliveryDetails.phoneNumber}
              onChange={(e) => setDeliveryDetails({...deliveryDetails, phoneNumber: e.target.value})}
              required
              className={styles.formInput}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="address">Адрес доставки:</label>
            <textarea
              id="address"
              value={deliveryDetails.address}
              onChange={(e) => setDeliveryDetails({...deliveryDetails, address: e.target.value})}
              required
              className={styles.formTextarea}
              placeholder="Укажите полный адрес доставки"
              rows={3}
            />
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="city">Город:</label>
              <input
                type="text"
                id="city"
                value={deliveryDetails.city}
                onChange={(e) => setDeliveryDetails({...deliveryDetails, city: e.target.value})}
                required
                className={styles.formInput}
                placeholder="Москва"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="postalCode">Почтовый индекс:</label>
              <input
                type="text"
                id="postalCode"
                value={deliveryDetails.postalCode}
                onChange={(e) => setDeliveryDetails({...deliveryDetails, postalCode: e.target.value})}
                className={styles.formInput}
                placeholder="123456"
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="region">Регион/область (необязательно):</label>
            <input
              type="text"
              id="region"
              value={deliveryDetails.region}
              onChange={(e) => setDeliveryDetails({...deliveryDetails, region: e.target.value})}
              className={styles.formInput}
              placeholder="Московская область"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="country">Страна:</label>
            <input
              type="text"
              id="country"
              value={deliveryDetails.country}
              onChange={(e) => setDeliveryDetails({...deliveryDetails, country: e.target.value})}
              required
              className={styles.formInput}
              placeholder="Россия"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={deliveryDetails.saveAddress}
                onChange={(e) => setDeliveryDetails({...deliveryDetails, saveAddress: e.target.checked})}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Сохранить адрес для будущих заказов</span>
            </label>
          </div>
        </section>
        
        {/* Способ оплаты */}
        <section className={styles.section}>
          <h2>Способ оплаты</h2>
          
          <div className={styles.paymentOptions}>
            <label className={styles.paymentOption}>
              <input
                type="radio"
                name="paymentMethod"
                value="TELEGRAM_STARS"
                checked={paymentMethod === 'TELEGRAM_STARS'}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className={styles.paymentRadio}
              />
              <div className={styles.paymentMethod}>
                <FaCreditCard className={styles.paymentIcon} />
                <div className={styles.paymentDetails}>
                  <h3>Наличные при получении</h3>
                  <p>Оплата наличными курьеру</p>
                </div>
              </div>
            </label>

            <label className={styles.paymentOption}>
              <input
                type="radio"
                name="paymentMethod"
                value="CARD"
                checked={paymentMethod === 'CARD'}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className={styles.paymentRadio}
              />
              <div className={styles.paymentMethod}>
                <FaCreditCard className={styles.paymentIcon} />
                <div className={styles.paymentDetails}>
                  <h3>Банковский перевод</h3>
                  <p>Оплата по реквизитам</p>
                </div>
              </div>
            </label>
          </div>

          <div className={styles.paymentNote}>
            <p>После оформления заказа менеджер свяжется с вами для уточнения деталей оплаты и доставки</p>
          </div>
        </section>
        
        {/* Итого */}
        <section className={styles.section}>
          <h2>Итого к оплате</h2>
          <div className={styles.totalSection}>
            <div className={styles.totalRow}>
              <span>Товары ({state.cartCount} шт.):</span>
              <span>₽{state.cartTotal.toLocaleString()}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Доставка:</span>
              <span>Уточняется менеджером</span>
            </div>
            <div className={`${styles.totalRow} ${styles.finalTotal}`}>
              <strong>К оплате: ₽{state.cartTotal.toLocaleString()}</strong>
            </div>
          </div>
        </section>
        
        {/* Согласие с политикой */}
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={(e) => setAgreedToPolicy(e.target.checked)}
              required
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              Я согласен с <a href="/policy" target="_blank">политикой невозвратности товара</a>
            </span>
          </label>
        </div>
        
        <button
          type="submit"
          disabled={loading || !agreedToPolicy}
          className={styles.submitButton}
        >
          {loading ? (
            <>
              <div className={styles.spinner}></div>
              Создание заказа...
            </>
          ) : (
            <>
              <FaTelegram />
              Оформить заказ
            </>
          )}
        </button>

        <div className={styles.note}>
          <p>После нажатия на кнопку автоматически откроется чат с менеджером с готовым сообщением о вашем заказе.</p>
        </div>
      </form>
    </div>
  );
}