/**
 * Regras gramaticais e de flexão por gênero para peças jurídicas.
 */

export type Genero = 'M' | 'F';

export type EstadoCivilValor =
  | 'solteiro'
  | 'casado'
  | 'divorciado'
  | 'viuvo'
  | 'uniao_estavel';

export function flexionar(
  chave: 'inscrito' | 'domiciliado' | 'brasileiro' | 'artigo',
  g: Genero
): string {
  const isFem = g === 'F';
  switch (chave) {
    case 'inscrito':
      return isFem ? 'inscrita' : 'inscrito';
    case 'domiciliado':
      return isFem ? 'domiciliada' : 'domiciliado';
    case 'brasileiro':
      return isFem ? 'brasileira' : 'brasileiro';
    case 'artigo':
      return isFem ? 'a' : 'o';
    default:
      return '';
  }
}

export function estadoCivil(v: EstadoCivilValor, g: Genero): string {
  const isFem = g === 'F';
  switch (v) {
    case 'solteiro':
      return isFem ? 'solteira' : 'solteiro';
    case 'casado':
      return isFem ? 'casada' : 'casado';
    case 'divorciado':
      return isFem ? 'divorciada' : 'divorciado';
    case 'viuvo':
      return isFem ? 'viúva' : 'viúvo';
    case 'uniao_estavel':
      return 'em união estável';
    default:
      return v;
  }
}
