/**
 * Formatação de datas em formato jurídico por extenso com fuso horário de Brasília (America/Sao_Paulo).
 */

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function formatDataExtenso(d: Date): string {
  // Converte explicitamente para o fuso America/Sao_Paulo
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(d);

  let day = '';
  let monthIndex = 0;
  let year = '';

  for (const part of parts) {
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') monthIndex = parseInt(part.value, 10) - 1;
    if (part.type === 'year') year = part.value;
  }

  const mesNome = MESES[monthIndex] || '';
  return `${day} de ${mesNome} de ${year}`;
}
