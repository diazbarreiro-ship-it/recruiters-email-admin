# 📧 Email Admin Panel

Panel de administración moderno para gestionar cuentas de correo electrónico en dominios alojados en Bluehost/cPanel.

![Email Admin Dashboard](./email-admin-preview.png)

## ✨ Características

- 🔐 **Gestión completa de correos**: Crear, eliminar, suspender y activar cuentas
- 🔑 **Cambio de contraseñas**: Generador de contraseñas seguras incluido
- 📊 **Dashboard visual**: Estadísticas de uso y almacenamiento
- 📈 **Tracking de actividad**: Registro de todas las operaciones en Supabase
- 🎨 **Interfaz moderna**: Diseño premium con tema oscuro y glassmorphism
- 📱 **Responsive**: Funciona en desktop y móvil
- 🔍 **Búsqueda en tiempo real**: Encuentra correos rápidamente
- 🌐 **Multi-dominio**: Soporte para múltiples dominios

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18 o superior
- Cuenta de cPanel con acceso API
- (Opcional) Cuenta de Supabase para tracking

### Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   
   Edita el archivo `.env` con tus credenciales:
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-anon-key

   # cPanel Configuration
   CPANEL_HOST=tu-dominio.com
   CPANEL_USERNAME=tu-usuario-cpanel
   CPANEL_API_TOKEN=tu-api-token
   CPANEL_PORT=2083

   # Server Configuration
   PORT=3000
   ```

3. **Configurar Supabase (opcional pero recomendado)**:
   
   Ejecuta el script SQL en tu dashboard de Supabase:
   - Ve a **SQL Editor** en tu proyecto de Supabase
   - Copia el contenido de `supabase-schema.sql`
   - Ejecuta el script

4. **Iniciar el servidor**:
   ```bash
   npm start
   ```

5. **Abrir en el navegador**:
   ```
   http://localhost:3000
   ```

## 🔧 Configuración de cPanel API

### Crear Token de API en cPanel

1. Inicia sesión en tu cPanel
2. Ve a **Security** → **Manage API Tokens**
3. Crea un nuevo token con un nombre descriptivo (ej: "Email_Admin")
4. Copia el token generado y pégalo en tu archivo `.env`

### Permisos Necesarios

El token de API necesita acceso a las siguientes funciones UAPI:
- `Email::list_pops`
- `Email::list_pops_with_disk`
- `Email::add_pop`
- `Email::delete_pop`
- `Email::passwd_pop`
- `Email::suspend_login`
- `Email::unsuspend_login`
- `DomainInfo::list_domains`

## 📁 Estructura del Proyecto

```
email-admin-panel/
├── server.js           # Servidor Express (proxy a cPanel API)
├── package.json        # Dependencias y scripts
├── .env               # Variables de entorno (no incluir en git)
├── supabase-schema.sql # Schema para tablas de tracking
├── public/
│   ├── index.html     # Estructura HTML principal
│   ├── styles.css     # Estilos CSS premium
│   ├── app.js         # Lógica principal de la aplicación
│   └── supabase.js    # Cliente de Supabase para tracking
└── README.md          # Este archivo
```

## 🎨 Funcionalidades de la Interfaz

### Dashboard
- Tarjetas de estadísticas (total, activos, suspendidos, almacenamiento)
- Tabla de correos con filtro por dominio
- Búsqueda en tiempo real

### Gestión de Correos
- **Crear**: Modal con validación y generador de contraseñas
- **Eliminar**: Confirmación antes de eliminar
- **Suspender/Activar**: Toggle rápido desde la tabla
- **Cambiar contraseña**: Con indicador de fortaleza

### Tracking
- Registro automático de todas las operaciones
- Historial visual con timeline
- Sincronización con Supabase

## 🔒 Seguridad

- Las credenciales de cPanel nunca se exponen al frontend
- El servidor actúa como proxy seguro
- Soporte para HTTPS (puerto 2083)
- Validación de datos en frontend y backend

## 🐛 Solución de Problemas

### "Failed to fetch domains"
- Verifica que el token de API sea correcto
- Asegúrate de que el host y puerto de cPanel estén bien configurados
- Revisa que el servidor de cPanel sea accesible

### "Connection refused"
- El servidor debe estar corriendo (`npm start`)
- Verifica el puerto en tu archivo `.env`

### Las actividades no se guardan
- Ejecuta el script `supabase-schema.sql` en tu Supabase
- Verifica las credenciales de Supabase en `.env`

## 📝 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/domains` | Lista de dominios |
| GET | `/api/emails` | Lista de correos |
| POST | `/api/emails` | Crear correo |
| DELETE | `/api/emails/:email` | Eliminar correo |
| PUT | `/api/emails/:email/password` | Cambiar contraseña |
| PUT | `/api/emails/:email/suspend` | Suspender/Activar |

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor abre un issue o pull request.

## 📄 Licencia

MIT License - Úsalo libremente para proyectos personales o comerciales.
