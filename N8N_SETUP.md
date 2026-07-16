# Guía de Integración con n8n

Esta guía explica cómo conectar la invitación de boda con **n8n** para exportar automáticamente los confirmados (RSVPs) a un archivo de Google Sheets.

## 1. Crear el Workflow en n8n

1. Entra a tu instancia de n8n.
2. Crea un **nuevo Workflow**.
3. Añade el nodo **Webhook** (este será tu trigger/iniciador).
   - **Method:** POST
   - **Path:** El que desees (ejemplo: `rsvp-boda`)
   - **Respond:** "Immediately" o "When Last Node Finishes"
4. Copia la URL de producción (Production URL). Debe lucir similar a `https://tu-servidor-n8n.com/webhook/rsvp-boda`.

## 2. Configurar la página web

1. Abre el archivo `main.js` de este proyecto.
2. Ve a la línea `496` aproximadamente.
3. Busca la siguiente línea:
   ```javascript
   const webhookUrl = 'TU_URL_DE_N8N_AQUI'; 
   ```
4. Reemplaza `'TU_URL_DE_N8N_AQUI'` pegando la URL de producción que copiaste en el paso anterior.
5. Guarda los cambios.

## 3. Conectar a Google Sheets en n8n

1. Regresa a tu Workflow en n8n.
2. Da clic en "Execute Node" en tu Webhook (para ponerlo a escuchar).
3. Entra a tu invitación (`index.html`), ingresa un código válido y confirma asistencia. Esto enviará un dato de prueba a n8n.
4. Una vez que n8n reciba el webhook, verás que llega un JSON con esta estructura:
   ```json
   {
     "code": "QDX-2027",
     "guestName": "Test martinez",
     "attendees": 4,
     "expectedAttendees": 5
   }
   ```
5. Conecta la salida del Webhook a un nodo de **Google Sheets**.
6. Configura el nodo de Google Sheets en la acción **Append Row** (o "Append or Update Row").
7. Mapea las columnas de tu hoja de cálculo con las variables del JSON (`code`, `guestName`, `attendees`, `expectedAttendees`).
8. Activa tu Workflow (ponlo en estado **Active**).

¡Listo! A partir de ahora, cada vez que alguien confirme asistencia en tu página, se agregará una fila en tiempo real a tu Google Sheet a costo $0.
