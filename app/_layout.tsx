import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';
import { db } from '../db';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentSegment = segments[0] as string | undefined;
    const isAuthRoute = currentSegment === 'login' || currentSegment === 'registro';

    if (!session && !isAuthRoute) {
      // Redirigir a login si no hay sesión iniciada
      router.replace('/login');
    } else if (session && isAuthRoute) {
      // Redirigir a pantalla principal si ya hay sesión iniciada
      router.replace('/');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E293B' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mi Tienda - Inventario', headerShown: false }} />
      <Stack.Screen name="producto" options={{ title: 'Producto', headerShown: true }} />
      <Stack.Screen name="login" options={{ title: 'Iniciar Sesión', headerShown: false }} />
      <Stack.Screen name="registro" options={{ title: 'Crear Cuenta', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error al inicializar la base de datos local:</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Preparando base de datos local...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: '#475569',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

