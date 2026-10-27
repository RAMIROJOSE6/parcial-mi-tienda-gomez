import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { syncProducts } from '../services/sync';
import { Product } from '../db/schema';

export default function IndexScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { products, totalUnits, totalValue, pendingCount, deleteProduct, refreshProducts } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncIsError, setSyncIsError] = useState(false);

  // Filtrado por búsqueda (Punto extra)
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncStatus(null);
    setSyncIsError(false);

    const result = await syncProducts(user.id);
    await refreshProducts();
    setIsSyncing(false);
    setSyncStatus(result.message);
    setSyncIsError(!result.success);

    // Ocultar mensaje tras unos segundos si fue exitoso
    if (result.success) {
      setTimeout(() => {
        setSyncStatus(null);
      }, 5000);
    }
  };

  const handleLongPressDelete = (product: Product) => {
    Alert.alert(
      'Eliminar producto',
      `¿Deseas eliminar "${product.name}"? Esta acción borrará el registro de la base local.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el producto.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  // Determinar si un producto está en la nube o pendiente
  const isProductPending = (product: Product) => {
    if (!product.syncedAt) return true;
    return new Date(product.syncedAt).getTime() < new Date(product.updatedAt).getTime();
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const pending = isProductPending(item);

    return (
      <View style={styles.productCard}>
        <View style={styles.productHeaderRow}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.productStatusBadge}>
            {pending ? (
              <View style={[styles.badge, styles.badgePending]}>
                <Text style={styles.badgeTextPending}>⏳ Pendiente</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeSynced]}>
                <Text style={styles.badgeTextSynced}>✓ En la nube</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.productDetailsRow}>
          <Text style={styles.productDetail}>
            Existencias: <Text style={styles.detailHighlight}>{item.quantity} und</Text>
          </Text>
          <Text style={styles.productDetail}>
            Precio:{' '}
            <Text style={styles.detailHighlight}>
              ${Number(item.price).toLocaleString('es-CO')}
            </Text>
          </Text>
        </View>

        {/* Botones visibles para Editar y Eliminar */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push({ pathname: '/producto', params: { id: item.id.toString() } })}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>✏️ Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleLongPressDelete(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Barra superior con título y botón de cerrar sesión */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>Mi Tienda</Text>
          <Text style={styles.userEmail}>{user?.email || 'Tendero'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de métricas y totales */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total unidades</Text>
            <Text style={styles.summaryValue}>{totalUnits}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Valor total</Text>
            <Text style={styles.summaryValue}>
              ${totalValue.toLocaleString('es-CO')}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pendientes</Text>
            <Text
              style={[
                styles.summaryValue,
                pendingCount > 0 ? styles.pendingHighlight : styles.syncedHighlight,
              ]}
            >
              {pendingCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Banner de resultado de sincronización */}
      {syncStatus ? (
        <View style={[styles.syncResultBanner, syncIsError ? styles.syncErrorBanner : styles.syncSuccessBanner]}>
          <Text style={[styles.syncResultText, syncIsError ? styles.syncErrorText : styles.syncSuccessText]}>
            {syncStatus}
          </Text>
        </View>
      ) : null}

      {/* Barra de acción: Búsqueda, Sincronizar y Agregar */}
      <View style={styles.actionSection}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/producto')}
          >
            <Text style={styles.addButtonText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de productos */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={handleSync} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No hay productos en inventario</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Ningún producto coincide con la búsqueda.'
                : 'Presiona "+ Agregar" para registrar tu primer producto.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  pendingHighlight: {
    color: '#D97706',
  },
  syncedHighlight: {
    color: '#16A34A',
  },
  syncResultBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  syncSuccessBanner: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
  },
  syncErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  syncResultText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  syncSuccessText: {
    color: '#166534',
  },
  syncErrorText: {
    color: '#991B1B',
  },
  actionSection: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  productDetailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  productDetail: {
    fontSize: 14,
    color: '#64748B',
  },
  detailHighlight: {
    fontWeight: '700',
    color: '#1E293B',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  productStatusBadge: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPending: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSynced: {
    backgroundColor: '#DCFCE7',
  },
  badgeTextSynced: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

