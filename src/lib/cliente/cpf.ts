/**
 * Utilitários de CPF para validação e formatação.
 */

export function normalizeCpf(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

export function isValidCpf(cpf: string): boolean {
  const clean = normalizeCpf(cpf);
  if (clean.length !== 11) return false;

  // Rejeita sequências de números repetidos como 111.111.111-11
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(9), 10)) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function formatCpf(cpf: string): string {
  const clean = normalizeCpf(cpf);
  if (clean.length !== 11) {
    // Formatação parcial se estiver digitando
    return clean
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
      .slice(0, 14);
  }
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
