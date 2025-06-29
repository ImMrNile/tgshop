// components/AdminLayout.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import styles from './AdminLayout.module.css';
import { FaHome, FaBoxOpen, FaShoppingCart, FaUsers, FaChartLine, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Админ-панель' }: AdminLayoutProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Закрываем меню при переходе по ссылке
  useEffect(() => {
    setIsMenuOpen(false);
  }, [router.asPath]);
  
  const navItems = [
    { href: '/admin', label: 'Дашборд', icon: <FaHome /> },
    { href: '/admin/stats', label: 'Статистика', icon: <FaChartLine /> },
    { href: '/admin/orders', label: 'Заказы', icon: <FaShoppingCart /> },
    { href: '/admin/products', label: 'Товары', icon: <FaBoxOpen /> },
    { href: '/admin/users', label: 'Пользователи', icon: <FaUsers /> },
  ];

  const handleLogout = () => { /* Ваша логика выхода */ alert("Выход"); };

  return (
    <div className={styles.container}>
      <Head>
        <title>{title} | Elite App Admin</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/admin" className={styles.headerTitle}>Админ-панель</Link>
          <nav className={styles.nav}>
            <ul className={styles.navList}>
              {navItems.map(item => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.navLink}>
                    {item.icon && <span className={styles.navIcon}>{item.icon}</span>} {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <FaSignOutAlt />
          </button>
          <button className={styles.mobileMenuButton} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </header>

      <div className={`${styles.mobileNav} ${isMenuOpen ? styles.open : ''}`}>
        <ul className={styles.mobileNavList}>
            {navItems.map(item => (
              <li key={item.href}>
                <Link href={item.href} className={styles.mobileNavLink}>{item.icon} {item.label}</Link>
              </li>
            ))}
             <li>
                <button onClick={handleLogout} className={styles.mobileNavLink} style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                    <FaSignOutAlt /> Выйти
                </button>
             </li>
        </ul>
      </div>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}