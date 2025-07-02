// pages/admin/products/form.tsx - ПОЛНОСТЬЮ ИСПРАВЛЕНО
// ===================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import AdminLayout from '../../../components/AdminLayout';
import styles from './ProductForm.module.css';
import { FaTrashAlt, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import { MdOutlineImage, MdOutlineVideocam } from 'react-icons/md';
import { useAuth } from '../../../components/AuthProvider';

import { Category, Season, Gender } from '@prisma/client';

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
  images: string[];
  videos: string[];
  variants: ProductVariantForm[];
}

interface ProductApiResponse {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  composition: string | null;
  careInstructions: string | null;
  category: Category;
  season: Season;
  gender: Gender;
  price: string | number; // Изменено - может прийти как строка или число
  oldPrice?: string | number | null; // Изменено - может прийти как строка или число
  costPrice: string | number; // Изменено - может прийти как строка или число
  images: string[];
  videos: string[];
  variants: ProductVariantForm[]; 
}

const categories = ['ОДЕЖДА', 'ОБУВЬ', 'АКСЕССУАРЫ'];
const seasons = ['ВЕСНА', 'ЛЕТО', 'ОСЕНЬ', 'ЗИМА', 'ВСЕСЕЗОННЫЙ'];
const genders = ['МУЖСКОЙ', 'ЖЕНСКИЙ', 'УНИСЕКС'];

export default function ProductFormPage() {
  const router = useRouter();
  const { id } = router.query;

  const { user, isLoading, isAdmin } = useAuth();

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

  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== PRODUCT FORM AUTH CHECK ===');
    console.log('isLoading:', isLoading);
    console.log('user:', user ? 'exists' : 'null');
    console.log('isAdmin:', isAdmin);
    console.log('==============================');

    if (isLoading) {
      console.log('ProductFormPage: Auth is loading...');
      return;
    }
    if (!user || !isAdmin) {
      console.log('ProductFormPage: User not authorized or not admin. Redirecting to login.');
      router.push('/login');
    } else {
      console.log('ProductFormPage: User is authorized and admin.');
    }
  }, [user, isLoading, isAdmin, router]);

  const fetchProductData = useCallback(async () => {
    console.log('=== FETCH PRODUCT DATA ===');
    console.log('ID:', id);
    console.log('Type of ID:', typeof id);
    console.log('isLoading:', isLoading);
    console.log('isAdmin:', isAdmin);
    console.log('=========================');

    if (!id || typeof id !== 'string') {
      console.log('ProductFormPage: No product ID or invalid ID for fetching.');
      return;
    }

    if (!isLoading && isAdmin) { 
      setLoadingData(true);
      setError(null);
      try {
        console.log(`ProductFormPage: Fetching product data for ID: ${id}`);
        const url = `/api/admin/products/${id}`;
        console.log('Fetch URL:', url);
        
        const res = await fetch(url); 
        
        console.log('Response status:', res.status);
        console.log('Response ok:', res.ok);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error('ProductFormPage: Failed to fetch product data from API:', res.status, errorData);
          throw new Error(errorData.message || `Не удалось загрузить данные товара: ${res.status}`);
        }
        
        const data: ProductApiResponse = await res.json();
        console.log('ProductFormPage: Received product data from API:', data);

        // Исправленная обработка Decimal полей
        setFormData({
          id: data.id,
          name: data.name,
          brand: data.brand || '', 
          description: data.description || '',
          composition: data.composition || '',
          careInstructions: data.careInstructions || '',
          category: data.category,
          season: data.season,
          gender: data.gender,
          price: Number(data.price), // Используем Number() вместо .toNumber()
          oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
          costPrice: Number(data.costPrice),
          images: data.images || [],
          videos: data.videos || [],
          variants: data.variants || [], 
        });
        console.log('ProductFormPage: Form data set successfully from fetched product.');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при загрузке данных товара.';
        setError(errorMessage);
        console.error('ProductFormPage: Error during data fetch:', err);
      } finally {
        setLoadingData(false);
        console.log('ProductFormPage: Data fetching finished.');
      }
    } else {
        console.log('ProductFormPage: Skipping product data fetch (not loading, not admin, or no ID).');
    }
  }, [id, isLoading, isAdmin]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    if (fileType === 'image') {
      setNewImageFiles(prev => [...prev, ...filesArray]);
    } else {
      setNewVideoFiles(prev => [...prev, ...filesArray]);
    }
    e.target.value = '';
  };

  const handleRemoveNewFile = (fileToRemove: File, fileType: 'image' | 'video') => {
    if (fileType === 'image') {
      setNewImageFiles(prev => prev.filter(file => file !== fileToRemove));
    } else {
      setNewVideoFiles(prev => prev.filter(file => file !== fileToRemove));
    }
  };

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

  // Функция для логирования FormData без итерации
  const logFormDataEntries = (formData: FormData) => {
    console.log('FormData содержит следующие поля:');
    
    // Проверяем основные поля
    const fieldsToCheck = [
      'name', 'brand', 'description', 'composition', 'careInstructions',
      'category', 'season', 'gender', 'price', 'costPrice', 'oldPrice', 'variants'
    ];
    
    fieldsToCheck.forEach(field => {
      const value = formData.get(field);
      if (value !== null) {
        console.log(`${field}:`, value);
      }
    });

    // Проверяем массивы
    const existingImages = formData.getAll('existingImages[]');
    if (existingImages.length > 0) {
      console.log('existingImages[]:', existingImages);
    }

    const existingVideos = formData.getAll('existingVideos[]');
    if (existingVideos.length > 0) {
      console.log('existingVideos[]:', existingVideos);
    }

    // Проверяем файлы
    const images = formData.getAll('images');
    if (images.length > 0) {
      console.log('images files:', images.map((file: File | string) => 
        file instanceof File ? `${file.name} (${file.size} bytes)` : file
      ));
    }

    const videos = formData.getAll('videos');
    if (videos.length > 0) {
      console.log('videos files:', videos.map((file: File | string) => 
        file instanceof File ? `${file.name} (${file.size} bytes)` : file
      ));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setError(null);

    console.log('=== FORM SUBMIT DEBUG ===');
    console.log('Form ID:', id);
    console.log('FormData name:', formData.name);
    console.log('FormData price:', formData.price);
    console.log('FormData costPrice:', formData.costPrice);
    console.log('FormData variants:', formData.variants);
    console.log('========================');

    // Валидация
    if (!formData.name || isNaN(formData.price) || isNaN(formData.costPrice) || formData.variants.some(v => !v.size || v.stock < 0 || isNaN(v.stock))) {
        setError('Пожалуйста, заполните все обязательные поля (Название, Цена, Себестоимость, Размеры и Остатки) корректными значениями.');
        setSubmittingForm(false);
        return;
    }

    const dataToSend = new FormData();

    dataToSend.append('name', formData.name);
    dataToSend.append('brand', formData.brand);
    dataToSend.append('description', formData.description);
    dataToSend.append('composition', formData.composition);
    dataToSend.append('careInstructions', formData.careInstructions);
    dataToSend.append('category', formData.category);
    dataToSend.append('season', formData.season);
    dataToSend.append('gender', formData.gender);
    dataToSend.append('price', String(formData.price));
    dataToSend.append('costPrice', String(formData.costPrice));
    
    if (formData.oldPrice !== undefined && formData.oldPrice !== null) {
      dataToSend.append('oldPrice', String(formData.oldPrice));
    }

    formData.images.forEach(url => {
      dataToSend.append('existingImages[]', url);
    });
    formData.videos.forEach(url => {
      dataToSend.append('existingVideos[]', url);
    });

    newImageFiles.forEach(file => {
      dataToSend.append('images', file);
    });
    
    newVideoFiles.forEach(file => {
      dataToSend.append('videos', file);
    });

    dataToSend.append('variants', JSON.stringify(formData.variants));

    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';

    console.log('=== REQUEST DEBUG ===');
    console.log('URL:', url);
    console.log('Method:', method);
    
    // Используем нашу функцию вместо итерации FormData
    logFormDataEntries(dataToSend);
    
    console.log('====================');

    try {
      console.log(`ProductFormPage: Submitting form with method ${method} to ${url}`);
      const res = await fetch(url, {
        method,
        body: dataToSend,
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      // Безопасное логирование заголовков
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('ProductFormPage: Form submission failed:', errorData);
        throw new Error(errorData.message || `Ошибка: ${res.status}`);
      }

      const responseData = await res.json();
      console.log('Success response:', responseData);

      alert(id ? 'Товар успешно обновлен!' : 'Товар успешно добавлен!');
      router.push('/admin/products');
    } catch (err: unknown) {
      console.error('ProductFormPage: Error during form submission:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении товара.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const pageTitle = id ? 'Редактировать товар' : 'Добавить товар';

  if (isLoading || !user || !isAdmin) {
    return (
      <AdminLayout title={pageTitle}>
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          {isLoading ? 'Проверка доступа...' : 'У вас нет доступа к этой странице.'}
        </div>
      </AdminLayout>
    );
  }

  if (id && loadingData) {
    return (
      <AdminLayout title={pageTitle}>
        <div style={{textAlign: 'center', padding: '1rem'}}>
          Загрузка данных товара...
        </div>
      </AdminLayout>
    );
  }
  
  if (id && !loadingData && !formData.name) {
    return (
      <AdminLayout title={pageTitle}>
        <div style={{textAlign: 'center', padding: '1rem', color: 'red'}}>
          Товар не найден или произошла ошибка загрузки.
          {error && <div>{error}</div>}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={pageTitle}>
      <div className={styles.formContainer}>
        <h2 className={styles.formTitle}>{pageTitle}</h2>
        {error && <div className={styles.errorMessage}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.mainFormGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Название</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className={styles.input} 
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="brand" className={styles.label}>Бренд</label>
              <input 
                type="text" 
                id="brand" 
                name="brand" 
                value={formData.brand} 
                onChange={handleChange} 
                className={styles.input} 
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>Описание</label>
              <textarea 
                id="description" 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows={3} 
                className={styles.textarea}
              ></textarea>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="composition" className={styles.label}>Состав</label>
              <textarea 
                id="composition" 
                name="composition" 
                value={formData.composition} 
                onChange={handleChange} 
                rows={2} 
                className={styles.textarea}
              ></textarea>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="careInstructions" className={styles.label}>Описание по уходу</label>
              <textarea 
                id="careInstructions" 
                name="careInstructions" 
                value={formData.careInstructions} 
                onChange={handleChange} 
                rows={2} 
                className={styles.textarea}
              ></textarea>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.label}>Категория</label>
              <select 
                id="category" 
                name="category" 
                value={formData.category} 
                onChange={handleChange} 
                className={styles.select}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="season" className={styles.label}>Сезон</label>
              <select 
                id="season" 
                name="season" 
                value={formData.season} 
                onChange={handleChange} 
                className={styles.select}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="gender" className={styles.label}>Пол</label>
              <select 
                id="gender" 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange} 
                className={styles.select}
              >
                {genders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="price" className={styles.label}>Цена продажи</label>
              <input 
                type="number" 
                id="price" 
                name="price" 
                value={formData.price} 
                onChange={handleChange} 
                className={styles.input} 
                step="0.01" 
                required 
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="oldPrice" className={styles.label}>Цена до скидки (опц.)</label>
              <input 
                type="number" 
                id="oldPrice" 
                name="oldPrice" 
                value={formData.oldPrice || ''} 
                onChange={handleChange} 
                className={styles.input} 
                step="0.01" 
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="costPrice" className={styles.label}>Себестоимость</label>
              <input 
                type="number" 
                id="costPrice" 
                name="costPrice" 
                value={formData.costPrice} 
                onChange={handleChange} 
                className={styles.input} 
                step="0.01" 
                required 
              />
            </div>
          </div>

          {formData.images.length > 0 && (
            <div className={styles.mediaSection}>
              <h3 className={styles.sectionTitle}>Существующие изображения</h3>
              <div className={styles.existingMediaGrid}>
                {formData.images.map((imgUrl, index) => (
                  <div key={index} className={styles.existingMediaItem}>
                    <Image
                      src={imgUrl}
                      alt={`Existing image ${index}`}
                      width={150}
                      height={150}
                      className={styles.existingMediaThumbnail}
                      style={{ objectFit: 'cover' }}
                    />
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
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNewFile(file, 'image')} 
                      className={styles.removeSelectedFileButton}
                    >
                      <FaTimes className={styles.removeSelectedFileButtonIcon} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {formData.videos.length > 0 && (
            <div className={styles.mediaSection}>
              <h3 className={styles.sectionTitle}>Существующие видео</h3>
              <div className={styles.existingMediaGrid}>
                {formData.videos.map((videoUrl, index) => (
                  <div key={index} className={styles.existingMediaItem}>
                    <video 
                      src={videoUrl} 
                      controls 
                      className={styles.existingMediaThumbnail}
                    ></video>
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
            </div>
          )}

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
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNewFile(file, 'video')} 
                      className={styles.removeSelectedFileButton}
                    >
                      <FaTimes className={styles.removeSelectedFileButtonIcon} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.variantListContainer}>
            <h3 className={styles.sectionTitle}>Размеры, Цвета и Остатки</h3>
            {formData.variants.map((variant, index) => (
              <div key={`variant-${index}`} className={styles.variantItem}>
                <div className={`${styles.formGroup} ${styles.variantInputGroup} ${styles.variantInputGroupColor}`}>
                  <label htmlFor={`color-${index}`} className={styles.label}>Цвет (опц.)</label>
                  <input 
                    type="text" 
                    id={`color-${index}`} 
                    value={variant.color || ''} 
                    onChange={(e) => handleVariantChange(index, 'color', e.target.value)} 
                    placeholder="Например, Красный" 
                    className={styles.input} 
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.variantInputGroup} ${styles.variantInputGroupSize}`}>
                  <label htmlFor={`size-${index}`} className={styles.label}>Размер</label>
                  <input 
                    type="text" 
                    id={`size-${index}`} 
                    value={variant.size} 
                    onChange={(e) => handleVariantChange(index, 'size', e.target.value)} 
                    placeholder="Например, S, M, 40" 
                    className={styles.input} 
                    required 
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.variantInputGroup} ${styles.variantInputGroupStock}`}>
                  <label htmlFor={`stock-${index}`} className={styles.label}>Остаток</label>
                  <input 
                    type="number" 
                    id={`stock-${index}`} 
                    value={variant.stock} 
                    onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)} 
                    className={styles.input} 
                    min="0" 
                    required 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeVariantField(index)} 
                  className={styles.removeVariantButton}
                >
                  <FaTrashAlt className={styles.removeVariantButtonIcon} />
                </button>
              </div>
            ))}
            <button 
              type="button" 
              onClick={addVariantField} 
              className={styles.addMediaButton}
            >
              <FaPlus className={styles.buttonIcon} /> Добавить размер/цвет
            </button>
          </div>

          <div className={styles.submitButtonContainer}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submittingForm}
            >
              {submittingForm ? 'Сохранение...' : (
                id ? (
                  <>
                    <FaSave className={styles.buttonIcon} /> Обновить товар
                  </>
                ) : (
                  <>
                    <FaPlus className={styles.buttonIcon} /> Создать товар
                  </>
                )
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}