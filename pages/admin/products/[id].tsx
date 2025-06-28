import ProductFormPage from './form';

export default function EditProduct() {
  // ProductFormPage сам загрузит данные по ID из router.query
  return <ProductFormPage />;
}