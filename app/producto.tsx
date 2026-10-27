import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useProducts } from '../hooks/useProducts';

export default function ProductFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { getById, createProduct, updateProduct, deleteProduct } = useProducts();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadProduct(parseInt(id, 10));
    }
  }, [id]);

  const loadProduct = async (productId: number) => {
    try {
      const prod = await getById(productId);
      if (prod) {
        setName(prod.name);
        setQuantity(prod.quantity.toString());
        setPrice(prod.price.toString());
      } else {
        Alert.alert('Error', 'Producto no encontrado');
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cargar el producto');
      router.back();
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');

    // Validaciones
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      setErrorMessage('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('El precio debe ser un número entero mayor o igual a 0.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && id) {
        await updateProduct(parseInt(id, 10), trimmedName, parsedQuantity, parsedPrice);
      } else {
        await createProduct(trimmedName, parsedQuantity, parsedPrice);
      }
      router.back();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFromForm = () => {
    Alert.alert(
      'Eliminar producto',
      `¿Deseas eliminar "${name}"? Esta acción borrará el registro de la base local.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await deleteProduct(parseInt(id, 10));
                router.back();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el producto.');
            }
          },
        },
      ]
    );
  };

  if (isLoadingProduct) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando datos del producto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: isEditing ? 'Editar Producto' : 'Nuevo Producto',
          headerBackTitle: 'Volver',
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isEditing ? 'Modificar datos del producto' : 'Registrar nuevo producto'}
          </Text>
          <Text style={styles.cardSubtitle}>
            Los cambios se guardan localmente en SQLite y se sincronizan al tocar "Sincronizar".
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del producto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Arroz Diana 1kg"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad en existencia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 15"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precio en pesos (sin decimales) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 4500"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          {isEditing ? (
            <TouchableOpacity
              style={styles.deleteFormButton}
              onPress={handleDeleteFromForm}
              disabled={isSaving}
            >
              <Text style={styles.deleteFormButtonText}>🗑️ Eliminar este producto</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  deleteFormButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
  },
  deleteFormButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});

