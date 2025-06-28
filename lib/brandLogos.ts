// lib/brandLogos.ts
// Эта карта связывает название бренда с URL-ом его логотипа.
// Загрузите логотипы в папку public/logos/ и укажите их пути.
export const brandLogos: Record<string, string> = {
  'GUCCI': '/logos/gucci.png',
  'VERSACE': '/logos/versace.png',
  'DIOR': '/logos/dior.png',
  'CHANEL': '/logos/chanel.png',
  // Добавьте сюда другие бренды и их логотипы
  // Убедитесь, что файлы .png/.svg существуют в public/logos/
};

// Функция для получения URL логотипа
export const getBrandLogoUrl = (brandName?: string | null): string | null => {
  if (!brandName) return null;
  const normalizedBrand = brandName.toUpperCase(); // Для сравнения без учета регистра
  return brandLogos[normalizedBrand] || null;
};