/**
 * Generates a 3-step Sales Playbook at lead creation time.
 * This is generated ONCE and stored — never recalculated on render.
 */
export function generateSalesPlaybook(params: {
  opportunityScore: number;
  digitalizationLevel: string;
  sector: string;
  employees: number;
  detectedNeeds: string[];
  recommendedProducts: string[];
  companyName: string;
}): string {
  const { opportunityScore, digitalizationLevel, sector, employees, detectedNeeds, recommendedProducts, companyName } = params;

  const steps: string[] = [];
  let label = '';

  // Priority label
  if (opportunityScore > 80) {
    label = '🔥 Vodafone Priority';
  } else if (opportunityScore >= 60) {
    label = '⚡ Oportunidad Activa';
  } else {
    label = '📋 Seguimiento Estándar';
  }

  // Step 1: Opening approach based on context
  if (opportunityScore > 80) {
    steps.push(`PASO 1 - Apertura Priority: Contactar con propuesta directa de ${recommendedProducts[0] || 'solución integral'}. Enfoque en SLA Fibra, SD-WAN y Ciberseguridad. Empresa de ${employees} empleados con alto encaje telco.`);
  } else if (digitalizationLevel === 'bajo') {
    steps.push(`PASO 1 - Apertura Digitalización: Presentar caso de centralización y optimización de costes. ${companyName} tiene nivel digital bajo — oportunidad de modernización completa.`);
  } else if (['logistica', 'transporte'].includes(sector)) {
    steps.push(`PASO 1 - Apertura Movilidad: Liderar con Fleet Mobility y gestión multi-línea. Sector logística requiere conectividad en ruta y gestión de flotas.`);
  } else {
    steps.push(`PASO 1 - Apertura Consultiva: Contacto inicial para validar necesidades detectadas: ${detectedNeeds.slice(0, 2).join(', ')}. Posicionar como partner tecnológico.`);
  }

  // Step 2: Value proposition
  if (digitalizationLevel === 'bajo') {
    steps.push(`PASO 2 - Propuesta de Valor: Demostrar ROI de centralización. Comparar coste actual disperso vs. solución unificada Vodafone. Productos clave: ${recommendedProducts.slice(0, 2).join(', ')}.`);
  } else if (opportunityScore > 80) {
    steps.push(`PASO 2 - Propuesta Premium: Preparar propuesta formal con SLA garantizado. Incluir demo de SD-WAN/Ciberseguridad. ARPU objetivo alto — justificar con valor de negocio.`);
  } else {
    steps.push(`PASO 2 - Propuesta Adaptada: Presentar solución modular empezando por ${recommendedProducts[0] || 'conectividad básica'}. Escalar según adopción.`);
  }

  // Step 3: Close strategy
  if (opportunityScore > 80) {
    steps.push(`PASO 3 - Cierre Acelerado: Proponer piloto de 30 días. Decisor clave identificado. Objetivo: contrato multi-servicio con compromiso 24 meses.`);
  } else if (['logistica', 'industria'].includes(sector)) {
    steps.push(`PASO 3 - Cierre Sectorial: Usar referencias de sector ${sector}. Proponer visita técnica a instalaciones para dimensionar solución real.`);
  } else {
    steps.push(`PASO 3 - Cierre Progresivo: Empezar con servicio ancla (fibra/móvil), ampliar con cross-selling en 3 meses. Agendar revisión trimestral.`);
  }

  return `[${label}]\n\n${steps.join('\n\n')}`;
}
