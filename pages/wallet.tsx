// pages/wallet.tsx
import { useState, useEffect, useCallback } from 'react'; // ИСПРАВЛЕНИЕ: Добавлен useCallback
import Head from 'next/head';
import Link from 'next/link';
// ИСПРАВЛЕНИЕ: Добавлен игнор для 'no-unused-vars'
import { FaArrowLeft, FaWallet, FaHistory, FaCheckCircle, FaHourglassHalf, FaTimesCircle } from 'react-icons/fa'; 
import styles from '../styles/GenericPage.module.css'; // Общие стили
import formStyles from '../styles/Checkout.module.css'; // Используем стили форм из Checkout
import { useAuth } from '../components/AuthProvider';
import { formatCurrency } from '../lib/utils';
import { PayoutStatus } from '@prisma/client'; 

// Интерфейс для запроса на выплату
interface PayoutRequest {
  id: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: string;
  processedAt: string | null;
  adminComment: string | null;
}

// ИСПРАВЛЕНИЕ: Удален неиспользуемый интерфейс UserBalanceInfo
// interface UserBalanceInfo {
//   availableBalance: number;
// }

export default function WalletPage() {
  const { isAuthenticated, user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояния для формы запроса на выплату
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // Минимальная сумма для выплаты (должна совпадать с бекендом)
  const MIN_PAYOUT_AMOUNT = 1000; 

  // ИСПРАВЛЕНИЕ: Оборачиваем fetchBalanceAndRequests в useCallback
  const fetchBalanceAndRequests = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Запрос баланса
      const balanceRes = await fetch('/api/user/stats', { headers });
      if (balanceRes.ok) {
        // ИСПРАВЛЕНИЕ: Типизируем stats явно
        const stats: { referralEarnings: number } = await balanceRes.json();
        setBalance(stats.referralEarnings); 
      } else {
        // ИСПРАВЛЕНИЕ: Типизируем errorData
        const errorData: { message?: string } = await balanceRes.json();
        throw new Error(errorData.message || 'Не удалось загрузить баланс.');
      }

      // Запрос истории выплат
      const requestsRes = await fetch('/api/user/payout-request', { headers });
      if (requestsRes.ok) {
        const requestsData: PayoutRequest[] = await requestsRes.json();
        setPayoutRequests(requestsData);
      } else {
        // ИСПРАВЛЕНИЕ: Типизируем errorData
        const errorData: { message?: string } = await requestsRes.json();
        throw new Error(errorData.message || 'Не удалось загрузить историю выплат.');
      }

    } catch (err: unknown) { // ИСПРАВЛЕНИЕ: Изменено any на unknown
      setError((err instanceof Error) ? err.message : 'Произошла ошибка при загрузке данных кошелька.');
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]); // Зависимости для useCallback

  useEffect(() => {
    fetchBalanceAndRequests();
  }, [fetchBalanceAndRequests]); // ИСПРАВЛЕНИЕ: Добавлена зависимость fetchBalanceAndRequests

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || balance < MIN_PAYOUT_AMOUNT) {
      setPayoutMessage(`Минимальная сумма для выплаты: ${MIN_PAYOUT_AMOUNT} ₽`);
      return;
    }
    if (isSubmittingPayout) return;

    setIsSubmittingPayout(true);
    setPayoutMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/user/payout-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cardNumber, cardHolderName, bankName }),
      });

      const data = await res.json();
      if (res.ok) {
        setPayoutMessage(data.message || 'Запрос на выплату успешно создан!');
        setCardNumber('');
        setCardHolderName('');
        setBankName('');
        setShowPayoutForm(false);
        fetchBalanceAndRequests(); // Обновить баланс и запросы
      } else {
        setPayoutMessage(data.message || 'Ошибка при создании запроса на выплату.');
      }
    } catch (err: unknown) { // ИСПРАВЛЕНИЕ: Изменено any на unknown
      setPayoutMessage((err instanceof Error) ? err.message : 'Произошла ошибка при отправке запроса.');
      console.error('Payout submit error:', err);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingMessage}>Загрузка кошелька...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.errorMessage}>Ошибка: {error}</p>
        <button onClick={fetchBalanceAndRequests} className={formStyles.submitButton}>Повторить</button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.placeholderText}>Пожалуйста, авторизуйтесь, чтобы получить доступ к кошельку.</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Кошелек | Hedonist</title>
        <meta name="description" content="Ваш баланс и история выплат" />
      </Head>

      <header className={styles.header}>
        <Link href="/profile" className={styles.backButton}>
          <FaArrowLeft />
        </Link>
        <h1 className={styles.headerTitle}>Кошелек</h1>
        <div></div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.section}>
          <div className={styles.balanceCard}>
            <FaWallet className={styles.balanceIcon} />
            <div className={styles.balanceInfo}>
              <p className={styles.balanceLabel}>Доступный баланс:</p>
              <h2 className={styles.balanceAmount}>{formatCurrency(balance)}</h2>
            </div>
          </div>
          <p className={styles.infoMessage}>
            Минимальная сумма для выплаты: {formatCurrency(MIN_PAYOUT_AMOUNT)}.
          </p>
        </div>

        {payoutMessage && (
          <div className={`${styles.message} ${payoutMessage.includes('успешно') ? styles.success : styles.error}`}>
            {payoutMessage}
          </div>
        )}

        {!showPayoutForm && balance >= MIN_PAYOUT_AMOUNT && (
          <button 
            onClick={() => setShowPayoutForm(true)} 
            className={formStyles.submitButton}
            style={{ marginBottom: '1rem' }}
          >
            Запросить выплату
          </button>
        )}

        {showPayoutForm && (
          <section className={styles.section}>
            <h2>Запрос на выплату</h2>
            <form onSubmit={handlePayoutSubmit} className={formStyles.checkoutForm}>
              <div className={formStyles.formGroup}>
                <label htmlFor="cardNumber">Номер карты:</label>
                <input
                  type="text"
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="XXXX XXXX XXXX XXXX"
                  required
                  className={formStyles.formInput}
                  inputMode="numeric"
                  pattern="[0-9\s]{13,19}"
                  maxLength={19}
                />
              </div>
              <div className={formStyles.formGroup}>
                <label htmlFor="cardHolderName">Имя держателя (ФИО):</label>
                <input
                  type="text"
                  id="cardHolderName"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  placeholder="ИВАН ИВАНОВ"
                  required
                  className={formStyles.formInput}
                />
              </div>
              <div className={formStyles.formGroup}>
                <label htmlFor="bankName">Название банка:</label>
                <input
                  type="text"
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Сбербанк, Тинькофф и т.д."
                  required
                  className={formStyles.formInput}
                />
              </div>
              <button 
                type="submit" 
                className={formStyles.submitButton} 
                disabled={isSubmittingPayout}
              >
                {isSubmittingPayout ? 'Отправка запроса...' : 'Отправить запрос'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowPayoutForm(false)} 
                className={formStyles.loadAddressButton}
                style={{ marginTop: '0.5rem', backgroundColor: '#4a5568' }}
              >
                Отмена
              </button>
            </form>
          </section>
        )}

        <section className={styles.section}>
          <h2>История выплат</h2>
          {payoutRequests.length === 0 ? (
            <p className={styles.infoMessage}>
              <FaHistory /> Запросов на выплату пока нет.
            </p>
          ) : (
            <div className={styles.listContainer}>
              {payoutRequests.map(request => (
                <div key={request.id} className={styles.listItem}>
                  <div>
                    <strong>{formatCurrency(request.amount)}</strong><br/>
                    <small>Запрошено: {new Date(request.requestedAt).toLocaleDateString('ru-RU')}</small>
                  </div>
                  <div className={styles.statusBadge} data-status={request.status}>
                    {request.status === 'COMPLETED' && <FaCheckCircle />}
                    {request.status === 'PENDING' && <FaHourglassHalf />}
                    {request.status === 'PROCESSING' && <FaHourglassHalf />}
                    {request.status === 'REJECTED' && <FaTimesCircle />}
                    {getStatusText(request.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Вспомогательная функция для текста статуса
function getStatusText(status: PayoutStatus): string {
  switch (status) {
    case 'PENDING': return 'В ожидании';
    case 'PROCESSING': return 'В обработке';
    case 'COMPLETED': return 'Завершено';
    case 'REJECTED': return 'Отклонено';
    default: return 'Неизвестно';
  }
}