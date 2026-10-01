/**
 * Pre-filled email templates for commercial outreach.
 * Opens the user's default mail client via mailto: links.
 */

const SIGNATURE = `\n\n--\nAlejandro González\nSenior Strategic Consultant\nGrupo Enertel · Partner Vodafone Business\n`;

export function getEmailMailtoUrl(params: {
  companyName: string;
  sector: string;
  email?: string;
  status?: string; // 'first_contact' | 'follow_up' | 'proposal'
}): string {
  const { companyName, sector, email, status } = params;

  const subject = `Propuesta de conectividad para ${companyName}`;

  let body = '';

  if (status === 'proposal' || status === 'negotiation') {
    body = `Estimado/a equipo de ${companyName},

Siguiendo nuestra conversación, adjunto la propuesta de servicios de telecomunicaciones adaptada a las necesidades de ${companyName} en el sector ${sector}.

Quedo a su disposición para resolver cualquier duda y agendar una reunión de revisión.${SIGNATURE}`;
  } else if (status === 'follow_up' || status === 'opportunity' || status === 'contactado') {
    body = `Estimado/a equipo de ${companyName},

Me pongo en contacto de nuevo para dar seguimiento a nuestra conversación anterior sobre las soluciones de conectividad y telecomunicaciones para ${companyName}.

¿Sería posible agendar una breve llamada esta semana para avanzar?${SIGNATURE}`;
  } else {
    // First contact (default)
    body = `Estimado/a equipo de ${companyName},

Me presento: soy Alejandro González, Senior Strategic Consultant en Grupo Enertel, partner de Vodafone Business.

Nos especializamos en soluciones de telecomunicaciones para empresas del sector ${sector} y me gustaría explorar cómo podemos ayudar a ${companyName} a optimizar su conectividad y comunicaciones.

¿Podríamos agendar una breve llamada de 15 minutos para conocer sus necesidades?${SIGNATURE}`;
  }

  const to = email || '';
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
