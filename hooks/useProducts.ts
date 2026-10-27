import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../db';
import { products, Product } from '../db/schema';
import { productsRepository } from '../db/repositories/products';

export function useProducts() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // useLiveQuery para reactividad automática según Drizzle
  const live = useLiveQuery(db.select().from(products));

  // Función para recargar productos directamente desde SQLite
  const loadLocalProducts = useCallback(async () => {
    try {
      const all = await productsRepository.getAll();
      setProductList(all);
    } catch (e) {
      console.error('Error al cargar productos locales:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Si useLiveQuery entrega datos nuevos, actualizamos
  useEffect(() => {
    if (live.data && Array.isArray(live.data)) {
      setProductList(live.data as Product[]);
      setLoading(false);
    }
  }, [live.data]);

  // 2. Cada vez que la pantalla recibe foco (ej. al volver del formulario), recargamos de inmediato
  useFocusEffect(
    useCallback(() => {
      loadLocalProducts();
    }, [loadLocalProducts])
  );

  // Totales calculados sobre la lista actual
  const totalUnits = productList.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const totalValue = productList.reduce(
    (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.price) || 0),
    0
  );

  // Cantidad de productos pendientes de subir
  const pendingCount = productList.filter((p) => {
    if (!p.syncedAt) return true;
    return new Date(p.syncedAt).getTime() < new Date(p.updatedAt).getTime();
  }).length;

  const createProduct = async (name: string, quantity: number, price: number) => {
    const created = await productsRepository.create(name, quantity, price);
    await loadLocalProducts();
    return created;
  };

  const updateProduct = async (id: number, name: string, quantity: number, price: number) => {
    await productsRepository.update(id, name, quantity, price);
    await loadLocalProducts();
  };

  const deleteProduct = async (id: number) => {
    await productsRepository.delete(id);
    await loadLocalProducts();
  };

  return {
    products: productList,
    totalUnits,
    totalValue,
    pendingCount,
    loading,
    error: live.error,
    refreshProducts: loadLocalProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getById: productsRepository.getById.bind(productsRepository),
  };
}
