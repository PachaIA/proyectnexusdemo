# Acceso Nexus antes del CRM

## Objetivo
Convertir la actual entrada visual en la primera pantalla real de Nexus, con acceso y registro mediante correo y contraseña. El CRM solo será visible después de iniciar sesión.

## Cambios
- Rehacer la pantalla inicial con el lockup completo de Nexus, formulario de correo y contraseña, y cambio claro entre **Iniciar sesión** y **Registrarse**.
- Mantener la recuperación de contraseña y su pantalla para definir una nueva clave.
- Proteger todas las rutas del CRM; si no hay sesión, llevar a la pantalla de acceso y conservar el destino solicitado para volver tras entrar.
- Ocultar navegación, chat y controles internos mientras se está en acceso o recuperación.
- Retirar la animación diaria independiente: la marca pasa a formar parte de la pantalla de acceso, evitando dos entradas consecutivas.
- Activar el acceso por correo y contraseña con confirmación por email.
- Cerrar el acceso anónimo a los datos y retirar el usuario compartido temporal. Los usuarios autenticados compartirán los datos del CRM actual; no se borrarán ni reasignarán registros existentes.
- Al cerrar sesión, volver inmediatamente a la pantalla de acceso.

## Seguridad y comportamiento
- No se creará una tabla de perfiles, según lo indicado.
- Registro correcto: mostrar “Revisa tu correo para confirmar la cuenta”; no simular una sesión antes de confirmar.
- Recuperación: enviar el enlace a la pantalla pública de nueva contraseña.
- La sesión se comprobará con el servicio de acceso antes de mostrar rutas protegidas, con un estado de carga de marca para evitar que el CRM aparezca brevemente.
- El acceso anónimo quedará revocado en todas las tablas comerciales, manteniendo los permisos para usuarios autenticados.

## Verificación
- Registro, confirmación pendiente, inicio de sesión, cierre de sesión y recuperación.
- Acceso directo a `/clientes/:id` sin sesión y retorno al mismo destino después de entrar.
- Navegación y datos visibles tras iniciar sesión; datos inaccesibles sin sesión.
- Comprobación en escritorio y móvil, además de pruebas y estado de compilación.
