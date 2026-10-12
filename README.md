# 🏠 OTRO

> **"¿Necesitás un servicio en tu hogar? Buscá a otro que lo haga por vos"**

**OTRO** es una plataforma colaborativa y red de servicios para el hogar diseñada para conectar personas que necesitan resolver tareas, reparaciones y mantenimiento en sus casas con especialistas, técnicos y vecinos de oficio verificados ("Otros").

---

## 🚀 Funcionalidades Principales

1. **Publicación Rápida de Pedidos y Tareas**:
   - Formulario con rubro, descripción detallada, barrio o localidad, fecha/urgencia y presupuesto estimado.
   - Publicación en vivo al feed de oportunidades con almacenamiento persistente en `localStorage`.

2. **Directorio de "Otros" (Especialistas Verificados)**:
   - Perfiles de prestadores categorizados por oficio (Plomería & Gas, Electricidad, Pintura, Limpieza Profunda, Armado de Muebles, Cerrajería, Fletes, etc.).
   - Insignias de *Top Pro Verificado*, puntuación con estrellas, cantidad de trabajos completados, tarifa orientativa por visita/hora y reseñas reales.

3. **Sistema de Presupuestos & Postulaciones**:
   - Los prestadores pueden postularse enviando su presupuesto ($) y mensaje explicativo.
   - El cliente puede comparar las ofertas recibidas, consultar detalles y **Aceptar el Presupuesto** con un solo clic.

4. **Chat Interactivo y Enlace Directo a WhatsApp**:
   - Mensajería interna en tiempo real con respuestas simuladas inteligentes del profesional.
   - Botón directo para continuar la conversación en WhatsApp con mensaje pre-armado con el detalle de la tarea.

5. **Modo Dual (Switch de Rol)**:
   - **Modo Cliente (Necesito ayuda)**: Publicá pedidos, revisá ofertas y contratá.
   - **Modo Prestador (Soy un "Otro")**: Explorá necesidades abiertas en tu zona y postulate con tus presupuestos.

6. **Progressive Web App (PWA)**:
   - Soporte offline con `sw.js` (Service Worker) y `manifest.json`.
   - Banner de instalación para añadir la app a la pantalla de inicio en Android, iOS o Windows/Mac.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 Semántico**: Accesibilidad, modales nativos y estructura modular.
- **CSS Moderno (Vanilla)**: Design system con variables CSS, paleta oscura premium (`#070B14`), acentos en cian eléctrico (`#00D2FF`) y azul real (`#3A7BD5`), glassmorphism, micro-animaciones y diseño mobile-first responsivo.
- **JavaScript Modular**: Controladores de estado reactivo, motor de chat simulado y gestión de almacenamiento local.
- **Service Worker & Web Manifest**: Experiencia offline y capacidad instalable.

---

## 💻 Cómo Ejecutar Localmente

El servidor ya se encuentra disponible en:
```
http://localhost:3000
```

Si deseás iniciarlo manualmente en cualquier momento desde la terminal:
```bash
# Con Python:
python -m http.server 3000

# O con Node.js / npx:
npx serve . -l 3000
```
