import { describe, it, expect } from 'vitest';
import { normalizeCpf, isValidCpf, formatCpf } from '../../src/lib/cliente/cpf';
import { formatCep } from '../../src/lib/cliente/cep';
import { flexionar, estadoCivil } from '../../src/lib/cliente/genero';
import { formatDataExtenso } from '../../src/lib/cliente/data';
import { buildQualificacao, ClienteRender } from '../../src/lib/cliente/qualificacao';

describe('Regras de dados do cliente (Tarefa 3)', () => {
  it('normaliza e formata CPF colado em formatos diferentes', () => {
    expect(normalizeCpf('529 982 247-25')).toBe('52998224725');
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf(' 529 982 247 25 ')).toBe('529.982.247-25');
  });

  it('valida CPF corretamente', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529 982 247 25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('000.000.000-00')).toBe(false);
    expect(isValidCpf('12345')).toBe(false);
  });

  it('formata CEP em diferentes formatos de entrada', () => {
    expect(formatCep('68925000')).toBe('68925-000');
    expect(formatCep('68.925-000')).toBe('68925-000');
    expect(formatCep(' 68 925 000 ')).toBe('68925-000');
  });

  it('flexiona palavras por gênero', () => {
    expect(flexionar('inscrito', 'F')).toBe('inscrita');
    expect(flexionar('inscrito', 'M')).toBe('inscrito');
    expect(flexionar('domiciliado', 'M')).toBe('domiciliado');
    expect(flexionar('domiciliado', 'F')).toBe('domiciliada');
    expect(flexionar('artigo', 'F')).toBe('a');
    expect(flexionar('artigo', 'M')).toBe('o');
    expect(flexionar('brasileiro', 'F')).toBe('brasileira');
    expect(flexionar('brasileiro', 'M')).toBe('brasileiro');
  });

  it('flexiona estado civil por gênero', () => {
    expect(estadoCivil('solteiro', 'F')).toBe('solteira');
    expect(estadoCivil('solteiro', 'M')).toBe('solteiro');
    expect(estadoCivil('casado', 'F')).toBe('casada');
    expect(estadoCivil('divorciado', 'F')).toBe('divorciada');
    expect(estadoCivil('viuvo', 'F')).toBe('viúva');
    expect(estadoCivil('viuvo', 'M')).toBe('viúvo');
    expect(estadoCivil('uniao_estavel', 'F')).toBe('em união estável');
    expect(estadoCivil('uniao_estavel', 'M')).toBe('em união estável');
  });

  it('formata data por extenso no fuso de Brasília', () => {
    expect(formatDataExtenso(new Date('2026-10-27T15:00:00Z'))).toBe('27 de outubro de 2026');
    // Teste da meia-noite (02:30 UTC = 23:30 no dia anterior em Brasília)
    expect(formatDataExtenso(new Date('2026-10-28T02:30:00Z'))).toBe('27 de outubro de 2026');
    // 03:05 UTC = 00:05 do dia 28 em Brasília
    expect(formatDataExtenso(new Date('2026-10-28T03:05:00Z'))).toBe('28 de outubro de 2026');
  });

  it('buildQualificacao no formato contrato para cliente F', () => {
    const clienteF: ClienteRender = {
      nome: 'Maria da Silva',
      genero: 'F',
      nacionalidade: 'brasileira',
      estadoCivil: 'solteiro',
      profissao: 'Lavradora',
      cpf: '52998224725',
      endereco: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidadeUf: 'Macapá/AP',
      cep: '68925000',
    };

    const res = buildQualificacao(clienteF, 'contrato');
    expect(res).toContain('inscrita no CPF sob o n°');
    expect(res).toContain('domiciliada em');
    // Não deve conter artigo antes do logradouro ("em Rua", nunca "na Rua" ou "em a Rua")
    expect(res).not.toContain('na Rua');
    expect(res).not.toContain('no Rua');
    expect(res).not.toContain('em a Rua');
    expect(res).not.toContain('em o Rua');
    expect(res).toContain('domiciliada em Rua das Flores');
  });

  it('formato rotulos com profissão vazia não contém "profissão" nem vírgulas duplicadas', () => {
    const clienteSemProf: ClienteRender = {
      nome: 'José Santos',
      genero: 'M',
      nacionalidade: 'brasileiro',
      estadoCivil: 'casado',
      profissao: '',
      cpf: '52998224725',
      endereco: 'Avenida Principal',
      numero: '456',
      bairro: 'Jardins',
      cidadeUf: 'Macapá/AP',
      cep: '68925000',
    };

    const res = buildQualificacao(clienteSemProf, 'rotulos');
    expect(res.toLowerCase()).not.toContain('profissão');
    expect(res).not.toContain(', ,');
    expect(res).not.toContain(',,');

    const resContrato = buildQualificacao(clienteSemProf, 'contrato');
    expect(resContrato.toLowerCase()).not.toContain('profissão');
    expect(resContrato).not.toContain(', ,');
    expect(resContrato).not.toContain(',,');
  });
});
