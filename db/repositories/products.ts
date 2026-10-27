import * as Crypto from 'expo-crypto';
import { eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '../index';
import { products, Product } from '../schema';

export const productsRepository = {
  async getAll(): Promise<Product[]> {
    return await db.select().from(products).all();
  },

  async getById(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).all();
    return result[0];
  },

  async getByClientId(clientId: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.clientId, clientId)).all();
    return result[0];
  },

  async create(name: string, quantity: number, price: number): Promise<Product> {
    const clientId = Crypto.randomUUID();
    const now = new Date();
    const [inserted] = await db.insert(products).values({
      clientId,
      name,
      quantity,
      price,
      updatedAt: now,
      syncedAt: null, // Pendiente de sincronizar
    }).returning();
    return inserted;
  },

  async update(id: number, name: string, quantity: number, price: number): Promise<void> {
    const now = new Date();
    await db.update(products).set({
      name,
      quantity,
      price,
      updatedAt: now,
      syncedAt: null, // Pasa a estar pendiente
    }).where(eq(products.id, id));
  },

  async delete(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  },

  async getPending(): Promise<Product[]> {
    // Un producto está pendiente si syncedAt es null o es anterior a updatedAt
    const all = await db.select().from(products).all();
    return all.filter((p) => !p.syncedAt || new Date(p.syncedAt).getTime() < new Date(p.updatedAt).getTime());
  },

  async markAsSynced(clientId: string, syncedAt: Date): Promise<void> {
    await db.update(products).set({
      syncedAt,
    }).where(eq(products.clientId, clientId));
  },

  async insertFromCloud(cloudItem: {
    client_id: string;
    name: string;
    quantity: number;
    price: number;
    updated_at: string;
  }): Promise<void> {
    const existing = await this.getByClientId(cloudItem.client_id);
    const cloudUpdatedAt = new Date(cloudItem.updated_at);

    if (!existing) {
      // No existe en local, lo insertamos marcado como sincronizado
      await db.insert(products).values({
        clientId: cloudItem.client_id,
        name: cloudItem.name,
        quantity: cloudItem.quantity,
        price: cloudItem.price,
        updatedAt: cloudUpdatedAt,
        syncedAt: cloudUpdatedAt,
      });
    } else {
      // Si ya existe pero en la nube es más reciente o igual, actualizamos
      if (cloudUpdatedAt.getTime() >= new Date(existing.updatedAt).getTime()) {
        await db.update(products).set({
          name: cloudItem.name,
          quantity: cloudItem.quantity,
          price: cloudItem.price,
          updatedAt: cloudUpdatedAt,
          syncedAt: cloudUpdatedAt,
        }).where(eq(products.clientId, cloudItem.client_id));
      }
    }
  },
};

