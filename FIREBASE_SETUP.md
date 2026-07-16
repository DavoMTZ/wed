# Configuración Firebase para Subida de Fotos

## ¿Por qué Firebase?
Firebase Storage te permite:
- ✅ Alojar fotos de los solteros de forma segura y gratuita
- ✅ Obtener URLs públicas para mostrarlas en la página
- ✅ Escalabilidad automática sin costo adicional
- ✅ No necesitas servidor backend

## Pasos para Configurar

### 1. Crear Proyecto Firebase

1. Ve a **https://console.firebase.google.com**
2. Haz clic en **"Crear un proyecto"**
3. Dale un nombre (ej: "wedding-singles-gallery")
4. Elige tu región (preferiblemente cercana a tus usuarios)
5. Haz clic en **"Crear proyecto"**

### 2. Activar Cloud Storage

1. En la consola de Firebase, ve a **"Build"** → **"Storage"**
2. Haz clic en **"Comenzar"**
3. Elige el plan **"Iniciarse en modo de prueba"** (es gratis)
4. Selecciona la ubicación del bucket (la misma región o cercana)
5. Haz clic en **"Listo"**

### 3. Configurar Reglas de Seguridad

1. En Storage, ve a la pestaña **"Reglas"**
2. Reemplaza las reglas con esto:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /singles/{allPaths=**} {
      allow read: if request.time < timestamp.date(2027, 1, 1);
      allow write: if request.time < timestamp.date(2026, 9, 1);
    }
  }
}
```

3. Haz clic en **"Publicar"**

### 4. Obtener tu Configuración

1. En la consola, ve a **"Project Settings"** (engranaje arriba a la izquierda)
2. En la pestaña **"General"**, busca la sección **"SDK setup and configuration"**
3. Elige **"Config"** en el tipo de aplicación
4. Copia el objeto `firebaseConfig`

### 4.1. Crear la estructura de Firestore para RSVP

En **Firestore Database**, crea dos colecciones:

#### `invitations`
Usa como ID de documento el código que le darás a cada invitado. Ejemplo:

```json
{
  "guestName": "Juan Pérez",
  "allowedAttendees": 2,
  "active": true
}
```

#### `rsvps`
No necesitas crear documentos manualmente. La página guardará aquí la confirmación final:

```json
{
  "code": "DA-2026",
  "guestName": "Juan Pérez",
  "attendees": 2,
  "expectedAttendees": 2,
  "confirmedAt": "server timestamp"
}
```

#### Reglas de Firestore

Para este flujo, puedes empezar con reglas simples:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /invitations/{code} {
      allow read: if true;
      allow write: if false;
    }

    match /rsvps/{code} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

Si más adelante quieres endurecer seguridad, el siguiente paso sería añadir autenticación o un backend que valide el código.

### 5. Crear tu Archivo de Configuración (PRIVADO)

⚠️ **IMPORTANTE**: Mantén tus credenciales seguras. El archivo `firebase-config.js` nunca será subido a Git.

### Modo local de prueba

Si solo quieres probar la invitación y el modal sin Firebase real, deja un `firebase-config.js` local con:

```js
const firebaseConfig = {
  useLocalRsvpDb: true
};
```

En ese modo, la confirmación se guarda en `localStorage` y la invitación de prueba `QDX-2027` queda disponible para validar el flujo.

1. En tu carpeta del proyecto, **copia** `firebase-config.example.js`
2. **Renómbralo** a `firebase-config.js`
3. Abre el nuevo archivo y **reemplaza los valores** con los que copiaste:
   - `YOUR_API_KEY` → Tu API key
   - `YOUR_PROJECT_ID` → Tu project ID
   - `YOUR_PROJECT_ID.appspot.com` → Tu storage bucket (en storageBucket)
   - `YOUR_MESSAGING_SENDER_ID` → Tu messaging sender ID
   - `YOUR_APP_ID` → Tu app ID

4. **Guarda el archivo**
5. Verifica que `index.html` incluya ANTES de `<script src="main.js"></script>`:
   ```html
   <script src="firebase-config.js"></script>
   ```

### 6. ¡Listo!

Ahora los solteros podrán subir fotos directamente desde el formulario. Las fotos se guardarán en Firebase Storage y se mostrarán en la galería.

Además, la confirmación de asistencia usará Firestore para:
- validar el código de invitación
- comprobar el número de asistentes
- guardar la confirmación
- mostrar el modal con la información de ceremonia y recepción

**Nota de Seguridad:**
- ✅ `firebase-config.js` está en `.gitignore` (nunca se sube a Git)
- ✅ Solo `firebase-config.example.js` está en el repositorio (sin valores reales)
- ✅ Cada persona que clonar el repo debe crear su propio `firebase-config.js`

## Límites y Pricing

**Plan Gratuito (suficiente para tu boda):**
- 1 GB almacenamiento
- 50,000 descargas/mes
- Perfectamente suficiente para ~100 fotos

**Si necesitas más:**
- El primer 1GB es gratis
- Después: $0.18/GB (muy barato)

## Solución de Problemas

### "Error al subir la foto"
- Verifica que hayas publicado las reglas de Storage
- Asegúrate de que `firebase-config.js` existe y tiene valores correctos

### Las fotos no se muestran
- Comprueba que la regla `allow read` esté activa
- Verifica que el archivo esté en la carpeta `/singles/`

### CORS Error
- Descarga el script de Firebase desde `https://www.gstatic.com` (ya configurado)

---

¿Preguntas? La documentación oficial está en: https://firebase.google.com/docs/storage
