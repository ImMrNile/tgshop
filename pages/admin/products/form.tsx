// pages/admin/products/form.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import styles from './ProductForm.module.css'; // Импортируем CSS Modules

// Импорты иконок
import { FaTrashAlt, FaPlus, FaSave, FaTimes } from 'react-icons/fa'; // Пример иконок
import { MdOutlineImage, MdOutlineVideocam } from 'react-icons/md'; // Иконки для файлов

interface ProductVariantForm {
  id?: string;
  color: string | null;
  size: string;
  stock: number;
}

interface ProductFormState {
  id?: string;
  name: string;
  brand: string; 
  description: string;
  composition: string;
  careInstructions: string;
  category: string;
  season: string;
  gender: string;
  price: number;
  oldPrice?: number;
  costPrice: number;
  images: string[]; // Сохраненные URL
  videos: string[]; // Сохраненные URL
  variants: ProductVariantForm[];
}

const categories = ['ОДЕЖДА', 'ОБУВЬ', 'АКСЕССУАРЫ'];
const seasons = ['ВЕСНА', 'ЛЕТО', 'ОСЕНЬ', 'ЗИМА', 'ВСЕСЕЗОННЫЙ'];
const genders = ['МУЖСКОЙ', 'ЖЕНСКИЙ', 'УНИСЕКС'];

export default function ProductFormPage() {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState<ProductFormState>({
    name: '',
    description: '',
    composition: '',
    careInstructions: '',
    brand: '',
    category: categories[0],
    season: seasons[0],
    gender: genders[0],
    price: 0,
    costPrice: 0,
    images: [],
    videos: [],
    variants: [{ color: null, size: '', stock: 0 }],
  });

  // ИЗМЕНЕНО: Теперь это массивы File[]
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/products/${id}`);
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Не удалось загрузить данные товара: ${res.status}`);
          }
          const data = await (res.json() as Promise<ProductFormState>);
          setFormData({
            ...data,
            price: parseFloat(String(data.price)),
            oldPrice: data.oldPrice ? parseFloat(String(data.oldPrice)) : undefined,
            costPrice: parseFloat(String(data.costPrice)),
            images: data.images || [],
            videos: data.videos || [],
            variants: data.variants || [],
          });
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  // ИЗМЕНЕНО: Обработка выбора файлов
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    if (fileType === 'image') {
      setNewImageFiles(prev => [...prev, ...filesArray]);
    } else {
      setNewVideoFiles(prev => [...prev, ...filesArray]);
    }
    e.target.value = ''; // Сбросить input, чтобы можно было выбрать те же файлы снова
  };

  // НОВОЕ: Удаление выбранного файла до загрузки
  const handleRemoveNewFile = (fileToRemove: File, fileType: 'image' | 'video') => {
    if (fileType === 'image') {
      setNewImageFiles(prev => prev.filter(file => file !== fileToRemove));
    } else {
      setNewVideoFiles(prev => prev.filter(file => file !== fileToRemove));
    }
  };

  // Для отображения уже загруженных изображений/видео и их удаления
  const handleRemoveExistingMedia = (url: string, field: 'images' | 'videos') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(mediaUrl => mediaUrl !== url)
    }));
  };

  const handleVariantChange = (index: number, field: keyof ProductVariantForm, value: string | number | null) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData((prev) => ({ ...prev, variants: newVariants }));
  };

  const addVariantField = () => {
    setFormData((prev) => ({ ...prev, variants: [...prev.variants, { color: null, size: '', stock: 0 }] }));
  };

  const removeVariantField = (index: number) => {
    setFormData((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name || !formData.price || !formData.costPrice || formData.variants.some(v => !v.size || v.stock < 0)) {
        setError('Пожалуйста, заполните все обязательные поля (Название, Цена, Себестоимость, Размеры и Остатки).');
        setLoading(false);
        return;
    }

    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form data:', formData);
    console.log('New image files:', newImageFiles);
    console.log('New video files:', newVideoFiles);

    const dataToSend = new FormData();

    // Добавляем все поля формы кроме массивов
    Object.keys(formData).forEach(key => {
      if (key !== 'images' && key !== 'videos' && key !== 'variants') {
        const value = (formData as any)[key];
        dataToSend.append(key, typeof value === 'number' ? String(value) : value || '');
      }
    });

    // Добавляем существующие URL-ы медиа как массивы
    formData.images.forEach(url => {
      dataToSend.append('existingImages[]', url);
    });
    formData.videos.forEach(url => {
      dataToSend.append('existingVideos[]', url);
    });

    // ИСПРАВЛЕНИЕ: Добавляем НОВЫЕ ФАЙЛЫ правильно
    newImageFiles.forEach(file => {
      console.log('Adding image file to FormData:', file.name, file.size, file.type);
      dataToSend.append('images', file);
    });
    
    newVideoFiles.forEach(file => {
      console.log('Adding video file to FormData:', file.name, file.size, file.type);
      dataToSend.append('videos', file);
    });

    // Добавляем варианты
    dataToSend.append('variants', JSON.stringify(formData.variants));

    // Логируем содержимое FormData
    console.log('=== FormData Contents ===');
    for (let [key, value] of dataToSend.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';

    try {
      console.log(`Making ${method} request to ${url}`);
      const res = await fetch(url, {
        method,
        body: dataToSend,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Ошибка: ${res.status}`);
      }

      alert(id ? 'Товар успешно обновлен!' : 'Товар успешно добавлен!');
      router.push('/admin/products');
    } catch (err: any) {
      console.error('Ошибка при сохранении товара:', err);
      setError(err.message || 'Произошла ошибка при сохранении товара.');
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = id ? 'Редактировать товар' : 'Добавить товар';

  if (loading && id) return <AdminLayout title={pageTitle}><div style={{textAlign: 'center', padding: '1rem'}}>Загрузка данных товара...</div></AdminLayout>;

  return (
    <AdminLayout title={pageTitle}>
      <div className={styles.formContainer}>
        <h2 className={styles.formTitle}>{pageTitle}</h2>
        {error && <div className={styles.errorMessage}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.mainFormGrid}>
            {/* Основные поля */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Название</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={styles.input} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="brand" className={styles.label}>Бренд</label>
              <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>Описание</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className={styles.textarea}></textarea>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="composition" className={styles.label}>Состав</label>
              <textarea id="composition" name="composition" value={formData.composition} onChange={handleChange} rows={2} className={styles.textarea}></textarea>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="careInstructions" className={styles.label}>Описание по уходу</label>
              <textarea id="careInstructions" name="careInstructions" value={formData.careInstructions} onChange={handleChange} rows={2} className={styles.textarea}></textarea>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.label}>Категория</label>
              <select id="category" name="category" value={formData.category} onChange={handleChange} className={styles.select}>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="season" className={styles.label}>Сезон</label>
              <select id="season" name="season" value={formData.season} onChange={handleChange} className={styles.select}>
                {seasons.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="gender" className={styles.label}>Пол</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={styles.select}>
                {genders.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="price" className={styles.label}>Цена продажи</label>
              <input type="number" id="price" name="price" value={formData.price} onChange={handleChange} className={styles.input} step="0.01" required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="oldPrice" className={styles.label}>Цена до скидки (опц.)</label>
              <input type="number" id="oldPrice" name="oldPrice" value={formData.oldPrice || ''} onChange={handleChange} className={styles.input} step="0.01" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="costPrice" className={styles.label}>Себестоимость</label>
              <input type="number" id="costPrice" name="costPrice" value={formData.costPrice} onChange={handleChange} className={styles.input} step="0.01" required />
            </div>
          </div>

          {/* Существующие изображения (URL-ы) */}
          {formData.images.length > 0 && (
            <div className={styles.mediaSection}>
              <h3 className={styles.sectionTitle}>Существующие изображения</h3>
              <div className={styles.existingMediaGrid}>
                {formData.images.map((imgUrl, index) => (
                  <div key={index} className={styles.existingMediaItem}>
                    <img src={imgUrl} alt={`Existing image ${index}`} className={styles.existingMediaThumbnail} />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingMedia(imgUrl, 'images')}
                      className={styles.removeMediaButton}
                      title="Удалить это изображение"
                    >
                      <FaTrashAlt className={styles.removeMediaButtonIcon} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Загрузка новых изображений */}
          <div className={styles.fileUploadGroup}>
            <h3 className={styles.sectionTitle}>Загрузить новые изображения</h3>
            <label htmlFor="image-upload" className={styles.fileInputLabel}>
              <MdOutlineImage className={styles.fileInputIcon} /> Выберите файлы изображений:
            </label>
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'image')}
              className={styles.fileInput}
            />
            {newImageFiles.length > 0 && (
              <ul className={styles.selectedFilesList}>
                {newImageFiles.map((file, index) => (
                  <li key={index} className={styles.selectedFileItem}>
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => handleRemoveNewFile(file, 'image')} className={styles.removeSelectedFileButton}>
                      <FaTimes className={styles.removeSelectedFileButtonIcon} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Существующие видео (URL-ы) */}
          {formData.videos.length > 0 && (
            <div className={styles.mediaSection}>
              <h3 className={styles.sectionTitle}>Существующие видео</h3>
              <div className={styles.existingMediaGrid}>
                {formData.videos.map((videoUrl, index) => (
                  <div key={index} className={styles.existingMediaItem}>
                    <video src={videoUrl} controls className={styles.existingMediaThumbnail}></video>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingMedia(videoUrl, 'videos')}
                      className={styles.removeMediaButton}
                      title="Удалить это видео"
                    >
                      <FaTrashAlt className={styles.removeMediaButtonIcon} />
                    </button>
                  </div>
                ))}
              </div>
            )
          </div>

            )}
    
            {/* Загрузка новых видео */}
          <div className={styles.fileUploadGroup}>
            <h3 className={styles.sectionTitle}>Загрузить новые видео</h3>
            <label htmlFor="video-upload" className={styles.fileInputLabel}>
              <MdOutlineVideocam className={styles.fileInputIcon} /> Выберите файлы видео:
            </label>
            <input
              type="file"
              id="video-upload"
              multiple
              accept="video/*"
              onChange={(e) => handleFileChange(e, 'video')}
              className={styles.fileInput}
            />
            {newVideoFiles.length > 0 && (
              <ul className={styles.selectedFilesList}>
                {newVideoFiles.map((file, index) => (
                  <li key={index} className={styles.selectedFileItem}>
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => handleRemoveNewFile(file, 'video')} className={styles.removeSelectedFileButton}>
                      <FaTimes className={styles.removeSelectedFileButtonIcon} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Размеры и Остатки */}
          <div className={styles.variantListContainer}>
            <h3 className={styles.sectionTitle}>Размеры, Цвета и Остатки</h3>
            {formData.variants.map((variant, index) => (
              <div key={`variant-${index}`} className={styles.variantItem}>
                <div className={`${styles.formGroup} ${styles.variantInputGroup} ${styles.variantInputGroupColor}`}>
                  <label htmlFor={`color-${index}`} className={styles.label}>Цвет (опц.)</label>
                  <input type="text" id={`color-${index}`} value={variant.color || ''} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} placeholder="Например, Красный" className={styles.input} />
                </div>
                <div className={`${styles.formGroup} ${styles.variantInputGroup} ${styles.variantInputGroupSize}`}>
                  <label htmlFor={`size-${index}`} className={styles.label}>Размер</label>
                  <input type="text" id={`size-${index}`} value={variant.size} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} placeholder="Например, S, M, 40" className={styles.input} required />
                </div>
                <div className={`${styles.formGroup} ${styles.variantInputGroup} ${styles.variantInputGroupStock}`}>
                  <label htmlFor={`stock-${index}`} className={styles.label}>Остаток</label>
                  <input type="number" id={`stock-${index}`} value={variant.stock} onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)} className={styles.input} min="0" required />
                </div>
                <button type="button" onClick={() => removeVariantField(index)} className={styles.removeVariantButton}>
                  <FaTrashAlt className={styles.removeVariantButtonIcon} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addVariantField} className={styles.addMediaButton}>
              <FaPlus className={styles.buttonIcon} /> Добавить размер/цвет
            </button>
          </div>

          <div className={styles.submitButtonContainer}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Сохранение...' : (id ? <><FaSave className={styles.buttonIcon} /> Обновить товар</> : <><FaPlus className={styles.buttonIcon} /> Создать товар</>)}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}