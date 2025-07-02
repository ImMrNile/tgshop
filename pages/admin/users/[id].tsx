// pages/admin/users/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import styles from '../../../styles/AdminUsers.module.css';
import { User } from '@prisma/client';
import { useAuth } from '../../../components/AuthProvider'; // <-- Импортируем useAuth

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: authUser, isLoading, isAdmin } = useAuth(); // <-- Получаем user, isLoading и isAdmin (переименовал user в authUser, чтобы не конфликтовать с локальным состоянием user)

  const [user, setUser] = useState<User | null>(null);
  const [referralPercentage, setReferralPercentage] = useState('');
  const [personalDiscount, setPersonalDiscount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true); // <-- Новое состояние для отслеживания загрузки данных пользователя
  const [error, setError] = useState<string | null>(null); // <-- Новое состояние для ошибок

  // <-- Добавляем useEffect для проверки аутентификации и админ-статуса
  useEffect(() => {
    if (isLoading) {
      return; // Ждем завершения загрузки аутентификации
    }
    if (!authUser || !isAdmin) {
      router.push('/login'); // Перенаправляем, если не админ или не авторизован
    }
  }, [authUser, isLoading, isAdmin, router]);

  useEffect(() => {
    if (id && !isLoading && isAdmin) { // <-- Загружаем данные только если это админ и аутентификация завершена
      setLoadingUser(true);
      fetch(`/api/admin/users/${id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Не удалось загрузить данные пользователя');
          }
          return res.json();
        })
        .then(data => {
          setUser(data);
          setReferralPercentage(data.referralPercentage.toString());
          setPersonalDiscount(data.personalDiscount?.toString() || '');
        })
        .catch((err) => {
          console.error('Failed to fetch user:', err);
          setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке пользователя.');
        })
        .finally(() => {
          setLoadingUser(false);
        });
    }
  }, [id, isLoading, isAdmin]); // <-- Добавляем зависимости

  const handleSave = async () => {
    setIsSaving(true);
    setError(null); // Сброс ошибки при попытке сохранения
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralPercentage: parseFloat(referralPercentage), personalDiscount: personalDiscount ? parseFloat(personalDiscount) : null }), // Преобразуем в число
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка при сохранении данных');
      }

      alert('Данные сохранены!');
      router.push('/admin/users');
    } catch (err: unknown) {
      console.error('Ошибка при сохранении данных:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении данных');
    } finally {
      setIsSaving(false);
    }
  };

  // <-- Условный рендеринг для проверки доступа и загрузки
  if (isLoading || !authUser || !isAdmin) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          {isLoading ? 'Проверка доступа...' : 'У вас нет доступа к этой странице.'}
        </div>
      </AdminLayout>
    );
  }

  if (loadingUser) return <AdminLayout><p style={{textAlign: 'center', padding: '1rem'}}>Загрузка пользователя...</p></AdminLayout>;
  if (error) return <AdminLayout><p style={{textAlign: 'center', padding: '1rem', color: 'red'}}>Ошибка: {error}</p></AdminLayout>;
  if (!user) return <AdminLayout><p style={{textAlign: 'center', padding: '1rem'}}>Пользователь не найден.</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className={`${styles.container} ${styles.editContainer}`}>
        <button onClick={() => router.back()} className={styles.backButton}>&larr; Назад к пользователям</button>
        <h1>Редактирование пользователя</h1>
        <p className={styles.userInfo}>{user.firstName} {user.lastName} (@{user.username})</p>

        <div className={styles.card}>
          <div className={styles.formGroup}>
            <label>Реферальный процент (%)</label>
            <input
              type="number"
              value={referralPercentage}
              onChange={(e) => setReferralPercentage(e.target.value)}
              placeholder="Например, 3 или 5.5"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Персональная скидка (%)</label>
            <input
              type="number"
              value={personalDiscount}
              onChange={(e) => setPersonalDiscount(e.target.value)}
              placeholder="Оставьте пустым, если скидки нет"
            />
          </div>
          <button onClick={handleSave} className={styles.button} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}