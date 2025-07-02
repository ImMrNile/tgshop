// pages/admin/users.tsx
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import styles from '../../styles/AdminUsers.module.css';
import { User } from '@prisma/client';
import { useAuth } from '../../components/AuthProvider'; // Импортируем useAuth

// Определяем расширенный тип для пользователя с дополнительными данными
type UserWithData = User & {
    _count: { referredUsers: number };
    totalPayouts: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading, isAdmin } = useAuth(); // Получаем user, isLoading и isAdmin из контекста
  const [users, setUsers] = useState<UserWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Добавляем useEffect для проверки аутентификации и админ-статуса
  useEffect(() => {
    if (isLoading) {
      return; // Ждем завершения загрузки аутентификации
    }
    if (!user || !isAdmin) {
      router.push('/login'); // Или другая страница для неавторизованных/неадминов
    }
  }, [user, isLoading, isAdmin, router]);

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error('Не удалось загрузить пользователей');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Выполняем fetchUsers только если пользователь является админом и аутентификация завершена
    if (!isLoading && isAdmin) {
      const timer = setTimeout(() => {
        fetchUsers(searchTerm);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, fetchUsers, isLoading, isAdmin]);

  // Показывать сообщение о загрузке или доступе, пока идет проверка
  if (isLoading || !user || !isAdmin) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {isLoading ? 'Проверка доступа...' : 'У вас нет доступа к этой странице.'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <h1>Пользователи</h1>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Поиск по имени, username, telegram id..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading && <p>Загрузка пользователей...</p>}
        {error && <p className={styles.error}>{error}</p>}
        
        {!loading && !error && (
          <>
            {/* Таблица для десктопов */}
            <div className={styles.tableContainer}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Username</th>
                    <th>Приглашено</th>
                    <th>Выплаты (реф.)</th>
                    <th>Реф. %</th>
                    <th>Скидка %</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} onClick={() => router.push(`/admin/users/${user.id}`)}>
                      <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}</td>
                      <td>{user.username ? `@${user.username}` : 'N/A'}</td>
                      <td>{user._count.referredUsers}</td>
                      <td>{user.totalPayouts.toLocaleString('ru-RU')} ₽</td>
                      <td>{user.referralPercentage}%</td>
                      <td>{user.personalDiscount ? `${user.personalDiscount}%` : 'Нет'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Карточки для мобильных */}
            <div className={styles.cardsContainer}>
                {users.map((user) => (
                    <div key={user.id} className={styles.card} onClick={() => router.push(`/admin/users/${user.id}`)}>
                        <div className={styles.cardRow}>
                            <span>Имя:</span>
                            <strong>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}</strong>
                        </div>
                        <div className={styles.cardRow}>
                            <span>Username:</span>
                            <strong>{user.username ? `@${user.username}` : 'N/A'}</strong>
                        </div>
                           <div className={styles.cardRow}>
                            <span>Приглашено:</span>
                            <strong>{user._count.referredUsers} чел.</strong>
                        </div>
                        <div className={styles.cardRow}>
                            <span>Заработок с реф.:</span>
                            <strong>{user.totalPayouts.toLocaleString('ru-RU')} ₽</strong>
                        </div>
                        <div className={styles.cardRow}>
                            <span>Перс. скидка:</span>
                            <strong>{user.personalDiscount ? `${user.personalDiscount}%` : 'Нет'}</strong>
                        </div>
                    </div>
                ))}
            </div>

            {users.length === 0 && <p style={{textAlign: 'center', padding: '1rem'}}>Пользователи не найдены.</p>}
          </>
        )}
      </div>
    </AdminLayout>
  );
}