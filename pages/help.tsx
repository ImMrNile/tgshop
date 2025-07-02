// pages/help.tsx
import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaQuestionCircle, FaTelegram, FaEnvelope } from 'react-icons/fa'; // FaQuestionCircle теперь используется
import styles from '../styles/GenericPage.module.css'; // Предполагаем наличие общего файла стилей

export default function HelpPage() {
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Помощь | Hedonist</title>
        <meta name="description" content="Часто задаваемые вопросы и поддержка" />
      </Head>

      <header className={styles.header}>
        <Link href="/profile" className={styles.backButton}>
          <FaArrowLeft />
        </Link>
        <h1 className={styles.headerTitle}><FaQuestionCircle style={{ marginRight: '0.5rem' }} />Помощь</h1> {/* ИСПРАВЛЕНИЕ: Используем иконку */}
        <div></div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.section}>
          <h2>Часто задаваемые вопросы (FAQ)</h2>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>Как сделать заказ?</h3>
            <p className={styles.faqAnswer}>
              Для оформления заказа выберите товары в каталоге, добавьте их в корзину и перейдите на страницу оформления заказа. Заполните данные для доставки и выберите способ оплаты.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>Как отследить мой заказ?</h3>
            <p className={styles.faqAnswer}>
              Вы можете отследить статус вашего заказа в разделе &quot;Мои заказы&quot; в вашем профиле. Как только заказ будет отправлен, появится трек-номер.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>Что делать, если товар не подошел?</h3>
            <p className={styles.faqAnswer}>
              Согласно нашей политике, товары не подлежат возврату. Пожалуйста, внимательно ознакомьтесь с описанием и размерами перед покупкой.
            </p>
          </div>
          {/* Добавьте больше FAQ */}
        </section>

        <section className={styles.section}>
          <h2>Связь с нами</h2>
          <p className={styles.infoMessage}>
            Если у вас остались вопросы или вам нужна помощь, свяжитесь с нашей службой поддержки.
          </p>
          <div className={styles.contactOptions}>
            <Link href="https://t.me/hedonist_support" target="_blank" className={styles.contactButton}>
              <FaTelegram /> Написать в Telegram
            </Link>
            <a href="mailto:support@hedonist.com" className={styles.contactButton}>
              <FaEnvelope /> Написать на почту
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}