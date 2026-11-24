import { ClienteRender } from '../../src/lib/cliente/qualificacao';

/**
 * Dados exclusivamente fictícios para testes do motor DOCX e fidelidade.
 * Nunca utilizar dados de clientes reais.
 */
export const CLIENTE_FICTICIO_M: ClienteRender = {
  nome: 'João Carlos Fictício',
  genero: 'M',
  nacionalidade: 'brasileiro',
  estadoCivil: 'casado',
  profissao: 'Trabalhador Rural',
  cpf: '52998224725',
  endereco: 'Rua das Palmeiras Fictícias',
  numero: '100',
  bairro: 'Centro',
  cidadeUf: 'Macapá/AP',
  cep: '68925000',
  referencia: 'Próximo à Praça Central',
};

export const CLIENTE_FICTICIO_F: ClienteRender = {
  nome: 'Maria Helena Exemplo',
  genero: 'F',
  nacionalidade: 'brasileira',
  estadoCivil: 'solteiro',
  profissao: 'Pescadora Artesanal',
  cpf: '52998224725',
  endereco: 'Avenida dos Ipês',
  numero: '250',
  bairro: 'Alvorada',
  cidadeUf: 'Santana/AP',
  cep: '68925000',
};
