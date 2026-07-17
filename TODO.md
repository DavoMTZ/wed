# Hoja de Ruta - Proyecto "El Heraldo del Amor"

*Última actualización: 17 de Julio de 2026*

---

## 🛠️ FASE 1: Base de Datos y Backend (Firebase)
- [x] **Reglas de Firestore:** Seguridad configurada para evitar sobre-escritura de boletos.
- [x] **Conexión a Firebase:** Script `firebase-config.js` y web funcionando.
- [ ] **Importación Masiva de Invitados (Excel a Firestore):**
  - [ ] *Paso 1:* Guardar Excel con columnas (`code`, `guestName`, `allowedAttendees`) como `invitados.csv`.
  - [ ] *Paso 2:* Descargar "Llave Privada" (`service-account.json`) desde Configuración de Firebase.
  - [ ] *Paso 3:* Ejecutar script local de Node.js (`importar.js`) provisto por la IA para crear todos los registros masivamente.
- [ ] **Seguridad de Archivos (Storage):** Publicar reglas de Firebase Storage para la subida segura de fotos de los solteros.

---

## 🎨 FASE 2: Frontend y Multimedia
- [x] **Lógica de Confirmación:** Validación de número de asistentes y candados de seguridad.
- [x] **Ocultar textos hardcodeados:** Códigos de prueba eliminados de la vista del usuario.
- [x] **Diseño Responsivo:** Ajustes aplicados para móviles.
- [ ] **Assets faltantes:** Agregar `intro.mp4` real y fotos de los novios en las secciones correspondientes.
- [ ] **Galería de Solteros:** Validar el flujo completo de "subir foto -> guardar URL en Firestore -> mostrar en pantalla".

---

## 🤖 FASE 3: Automatización y Recepción (n8n + Códigos QR)
- [x] **Webhook n8n:** Webhook activado en `main.js` para enviar datos de los confirmados.
- [ ] **Google Sheets:** Crear flujo en n8n que reciba el Webhook y agregue filas al Excel automáticamente.
- [ ] **Envío de WhatsApp:** Configurar n8n para enviar un WhatsApp a los confirmados días antes del evento con su acceso.
- [ ] **Boleto Digital (QR):** Mostrar un código QR generado dinámicamente en la web (usando la librería `qrcode.js`) con el ID del invitado.
- [ ] **App web para la Host:** Crear una página oculta (`host.html`) que use la cámara del celular para escanear el QR, valide en Firebase y muestre la **Mesa Asignada** y número de asistentes.

---

## 🚀 FASE 4: Despliegue en Producción (Servidor Ubuntu)
- [ ] **Preparación del Servidor:** Instalar servidor web (Nginx o Apache) en el servidor Ubuntu.
- [ ] **Migración de Archivos:** Copiar los archivos estáticos (HTML, CSS, JS, assets) desde GitHub a la ruta pública del servidor (ej. `/var/www/html`).
- [ ] **Configuración del Túnel (Cloudflare Tunnel / Ngrok):**
  - [ ] Instalar el cliente del túnel en el servidor Ubuntu (ej. `cloudflared`).
  - [ ] Crear el túnel apuntando al puerto local de Nginx (usualmente el puerto `80`).
  - [ ] Asignar un dominio público seguro (con HTTPS automático) al túnel. *Nota: HTTPS es obligatorio para que la cámara del escáner QR funcione en celulares.*
- [ ] **Prueba de Fuego:** Probar la URL final pública con un dispositivo móvil ajeno a la red local.
