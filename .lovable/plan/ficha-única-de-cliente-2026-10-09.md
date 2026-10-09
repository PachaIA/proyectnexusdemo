# Ficha única de cliente

## Resultado
- Añadir `/clientes/:id` como única ficha para consultar y editar cliente y oportunidad.
- Mantener un encabezado visible con cliente, margen total, etapa, teléfono y próxima acción.
- Organizar el contenido en tres pestañas: **Ficha**, **Informe** y **Actividad**.
- Mantener el briefing diario desplegado como panel por encima de los datos del cliente.

## Cambios
- Reutilizar la ficha, informe, cronología, editores de datos y cálculos existentes dentro de una página única; no duplicar datos ni reglas.
- Convertir “Próxima acción” en un bloque editable con tipo (Llamada, Visita, Propuesta, Seguimiento), fecha y nota, guardado en la oportunidad activa.
- Llevar las líneas y campos de oportunidad a la pestaña Ficha para que ya no dependan de ventanas emergentes.
- Sustituir en Hoy, Clientes, Pipeline, mapa, informes, archivo, búsqueda y demás listados las aperturas de detalle por enlaces a `/clientes/:id`.
- Conservar solo ventanas de acciones independientes que no sean una ficha de cliente u oportunidad, como confirmar archivo o generar un discurso.
- Mantener compatibilidad temporal redirigiendo `/clientes?company=id` a la nueva dirección.

## Verificación
- Comprobar enlaces desde Hoy, Clientes, Pipeline y mapa; recarga y atrás/adelante.
- Comprobar las tres pestañas, teléfono, margen, etapa, próxima acción y guardado.
- Confirmar que no quede ninguna ventana de detalle o edición de cliente/oportunidad y que la aplicación compile sin errores.
