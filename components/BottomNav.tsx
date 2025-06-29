// components/BottomNav.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/BottomNav.module.css'; // Создадим эти стили
import { useApp } from '../contexts/AppContext';
import { FaHome, FaHeart, FaShoppingCart, FaUser } from 'react-icons/fa';

export default function BottomNav() {
  const router = useRouter();
  const { state } = useApp();

  const navItems = [
    { href: '/', icon: <FaHome />, label: 'Главная' },
    { href: '/favorites', icon: <FaHeart />, label: 'Избранное', badge: state.favoritesCount },
    { href: '/cart', icon: <FaShoppingCart />, label: 'Корзина', badge: state.cartCount },
    { href: '/profile', icon: <FaUser />, label: 'Профиль',badge: 0 }
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map(item => (
        <Link key={item.href} href={item.href} className={`${styles.navItem} ${router.pathname === item.href ? styles.active : ''}`}>
          {item.icon}
         {item.badge !== undefined && item.badge > 0 && <span className={styles.navBadge}>{item.badge}</span>}
          <span className={styles.navLabel}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}