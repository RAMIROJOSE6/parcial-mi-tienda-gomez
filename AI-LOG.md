# Registro de Uso de Inteligencia Artificial (AI-LOG)

- **Estudiante:** Ramiro Jose Gomez Agamez
- **Herramienta utilizada:** Antigravity (Google DeepMind)
- **Modelo:** Gemini 3.8 Flash

---

## 1. Prompt inicial suministrado
```text
HOLA, TENGO UNA BASE DE DATOS EN MI CUENTA DE SUPA BASES FREE, DESE QUE ESE PROYECTO LO MODIFIQUES, QUIERO CAMBIARLE EL NOMBRE Y ADEMAS QUE LAS TABLAS SEAN ELIMINADAS PARA CREAR OTRAS NUEVAS Y LUEGO ESA BASE DE DATOS ENLAZARLAS CON OTRA APP... ANTES DE ESO DESEO DESARROLLAR EL APP Y LUEGO ENLAZARLA CON LA BASE DE DATOS DE SUPA BASE Y TAMBN CON LA BASE DE DATOS LOCAL
```

---

## 2. Decisiones de diseño y correcciones realizadas sobre el código generado

1. **Aislamiento de `Crypto.randomUUID()` para Drizzle Kit:**
   - *Corrección:* Inicialmente las bibliotecas de TypeScript sugieren importar generadores de UUID directamente en el esquema. Sin embargo, para evitar el error de Node.js `Unexpected "typeof"` al ejecutar `npx drizzle-kit generate`, la generación de UUID se mantuvo estrictamente en la capa del repositorio (`db/repositories/products.ts`) utilizando `expo-crypto`, dejando `db/schema.ts` libre de dependencias del runtime de Expo.

2. **Resolución de conflictos de dependencias en React 19:**
   - *Corrección:* Durante la instalación de dependencias, las versiones más recientes de los paquetes de interfaz generaron conflictos de peer dependencies entre `react@19.3.0` y paquetes dependientes. Se solucionó configurando la instalación con el flag `--legacy-peer-deps`.

3. **Manejo de fragmentación en SecureStore:**
   - *Ajuste:* Las sesiones de Supabase Auth pueden exceder los 2048 bytes en Android. Se implementó un adaptador por fragmentos (`LargeSecureStoreAdapter` en `lib/secureStorage.ts`) que divide cadenas largas en fragmentos de 1800 bytes antes de guardarlas.

---

## 3. Alucinaciones o inconsistencias detectadas
- **Alucinación/Comportamiento no soportado:** Intentar modificar el nombre del proyecto o ejecutar comandos administrativos en Supabase remotamente usando sólo la Publishable Key / URL. La clave pública no tiene privilegios DDL de administración; por ende, se delimitó correctamente el proceso guiando la ejecución del DDL SQL en el SQL Editor de Supabase y el cambio de nombre desde la consola web.

