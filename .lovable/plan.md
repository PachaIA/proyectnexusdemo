# Corregir Trimestre y unificar el estado de oportunidades

## Resultado
- Mantener `/trimestre` dentro de la estructura principal, con la navegación superior visible también durante carga y errores.
- Mostrar en el simulador únicamente oportunidades en Propuesta, Negociación y Ganada; las ganadas aparecerán bloqueadas.
- Convertir “La cierro” en una actualización real de la oportunidad a etapa Ganada.
- Calcular los indicadores directamente desde los datos de oportunidades, sin selección local duplicada.
- Refrescar los datos compartidos tras cada cambio para que cualquier cierre realizado en Pipeline o en una ficha aparezca de inmediato en Trimestre.

## Implementación técnica
- Reutilizar `useLeads`, `refreshLeads` y la etapa canónica `ganada` de `src/lib/opportunity.ts`.
- Derivar las ventas simuladas de las oportunidades cuyo estado real sea `ganada`; Propuesta y Negociación serán las únicas accionables.
- Mantener las fórmulas de compensación y las estimaciones actuales sin cambios.
- Añadir una prueba pequeña para el filtrado y bloqueo por etapa, y verificar navegación, recarga y cierre desde la pantalla.
