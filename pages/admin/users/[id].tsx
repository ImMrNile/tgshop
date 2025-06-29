// pages/admin/users/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import styles from '../../../styles/AdminUsers.module.css';
import { User } from '@prisma/client';

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User | null>(null);
  const [referralPercentage, setReferralPercentage] = useState('');
  const [personalDiscount, setPersonalDiscount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/admin/users/${id}`)
        .then(res => res.json())
        .then(data => {
          setUser(data);
          setReferralPercentage(data.referralPercentage.toString());
          setPersonalDiscount(data.personalDiscount?.toString() || '');
        });
    }
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralPercentage, personalDiscount }),
      });
      alert('Данные сохранены!');
      router.push('/admin/users');
    } catch (error) {
      alert('Ошибка при сохранении данных');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <AdminLayout><p>Загрузка...</p></AdminLayout>;

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