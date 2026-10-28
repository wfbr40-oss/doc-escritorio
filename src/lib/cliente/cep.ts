/**
 * Utilitários de CEP para formatação e normalização.
 */

export function normalizeCep(cep: string): string {
  if (!cep) return '';
  return cep.replace(/\D/g, '');
}

export function formatCep(cep: string): string {
  const clean = normalizeCep(cep);
  if (clean.length !== 8) {
    return clean.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  }
  return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
}
