# Animación de entrada diaria

## Resultado
- Mostrar el logotipo completo de Nexus sobre un fondo de tema a pantalla completa solo una vez por día natural.
- Animarlo durante 1,2 segundos y retirar después la capa con un fundido breve.
- Permitir saltarlo al instante con clic, toque o cualquier tecla.
- Con movimiento reducido, mostrarlo estático durante 400 ms.
- Mantener la aplicación montada y cargando por debajo en todo momento.

## Implementación técnica
- Guardar la fecha local `YYYY-MM-DD` en `localStorage` y compararla al montar.
- Montar la capa como un componente hermano de las rutas, sin condicionar proveedores, consultas ni pantallas.
- Añadir estilos y animaciones con los tokens existentes, además de una prueba del control diario.
