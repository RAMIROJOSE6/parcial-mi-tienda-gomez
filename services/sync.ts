import { supabase } from '../lib/supabase';
import { productsRepository } from '../db/repositories/products';

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  message: string;
}

export async function syncProducts(userId: string): Promise<SyncResult> {
  let downloadedCount = 0;
  let uploadedCount = 0;

  try {
    // PASO 1: BAJAR
    // Traer de Supabase los productos del usuario
    const { data: remoteProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(`Error al descargar de la nube: ${fetchError.message}`);
    }

    if (remoteProducts && remoteProducts.length > 0) {
      for (const remote of remoteProducts) {
        const local = await productsRepository.getByClientId(remote.client_id);
        if (!local) {
          // No existe localmente: se inserta marcado como sincronizado
          await productsRepository.insertFromCloud(remote);
          downloadedCount++;
        } else {
          // Si ya existe pero el remoto es más reciente, actualizar (regla de conflicto)
          const remoteTime = new Date(remote.updated_at).getTime();
          const localTime = new Date(local.updatedAt).getTime();
          if (remoteTime > localTime) {
            await productsRepository.insertFromCloud(remote);
            downloadedCount++;
          }
        }
      }
    }

    // PASO 2: SUBIR
    // Enviar los productos pendientes con upsert por client_id
    const pendingProducts = await productsRepository.getPending();

    for (const p of pendingProducts) {
      const updatedAtIso = new Date(p.updatedAt).toISOString();
      const { error: upsertError } = await supabase.from('products').upsert(
        {
          user_id: userId,
          client_id: p.clientId,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          updated_at: updatedAtIso,
        },
        { onConflict: 'client_id' }
      );

      if (upsertError) {
        throw new Error(`Error al subir ${p.name}: ${upsertError.message}`);
      }

      // Marcamos en SQLite como sincronizado con syncedAt igual al updatedAt que se subió
      await productsRepository.markAsSynced(p.clientId, new Date(p.updatedAt));
      uploadedCount++;
    }

    return {
      success: true,
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      message: `${uploadedCount} subidos, ${downloadedCount} bajados`,
    };
  } catch (error: any) {
    console.error('Error durante la sincronización:', error);
    return {
      success: false,
      uploaded: uploadedCount,
      downloaded: downloadedCount,
      message: error?.message || 'Error de conexión al sincronizar',
    };
  }
}

