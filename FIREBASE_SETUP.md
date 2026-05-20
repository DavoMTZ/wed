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

### 5. Actualizar tu Página

1. Abre el archivo `firebase-config.example.js` en tu carpeta del proyecto
2. Reemplaza los valores con los que copiaste:
   - `apiKey` → Tu API key
   - `projectId` → Tu project ID
   - `storageBucket` → Tu storage bucket
   - `messagingSenderId` → Tu messaging sender ID
   - `appId` → Tu app ID

3. Renombra el archivo de `firebase-config.example.js` a `firebase-config.js`

4. Abre `index.html` y agrega esta línea ANTES de `<script src="main.js"></script>`:

```html
<script src="firebase-config.js"></script>
```

### 6. ¡Listo!

Ahora los solteros podrán subir fotos directamente desde el formulario. Las fotos se guardarán en Firebase Storage y se mostrarán en la galería.

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
