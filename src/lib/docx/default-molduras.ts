import { createTemplateDocx } from './builder';

/**
 * Gera as molduras DOCX oficiais aprovadas pelo advogado para os 8 documentos do Kit Previdenciário.
 */
export async function obterMolduraPadrao(documentId: string): Promise<Uint8Array> {
  switch (documentId) {
    case 'doc_procuracao':
      return createTemplateDocx(
        'PROCURAÇÃO AD JUDICIA ET EXTRA',
        [
          'OUTORGANTE: {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}.',
          'OUTORGADOS: Pelo presente instrumento particular de procuração, o(a) Outorgante nomeia e constitui seus bastantes procuradores os advogados integrantes da sociedade profissional, conferindo-lhes amplos poderes para o foro em geral.',
          'PODERES ESPECÍFICOS: Especialmente para representar o(a) Outorgante perante o Instituto Nacional do Seguro Social (INSS), Juizados Especiais Federais e Varas Previdenciárias da Justiça Federal, podendo requerer, assinar requerimentos, interpor recursos administrativos e judiciais, renunciar a valores excedentes a 60 salários mínimos, firmar acordos, transigir, dar e receber quitação e praticar todos os atos necessários ao bom e fiel cumprimento deste mandato.',
          'FINALIDADE: Concessão, restabelecimento ou revisão de benefício previdenciário e averbação de períodos contributivos.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          'Assinatura do(a) Outorgante',
        ],
        { subtitulo: 'Mandato com Poderes Gerais e Específicos para Causas Previdenciárias' }
      );

    case 'doc_contrato_honorarios':
      return createTemplateDocx(
        'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS',
        [
          'CONTRATANTE: {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}.',
          'CONTRATADOS: Sociedade de Advogados, inscrita na OAB sob n° 0000, com endereço profissional na comarca.',
          'CLÁUSULA PRIMEIRA (DO OBJETO): O presente contrato tem por objeto a prestação de assessoria e representação jurídica em prol do CONTRATANTE perante a Previdência Social e/ou Justiça Federal.',
          'CLÁUSULA SEGUNDA (DAS OBRIGAÇÕES): Os CONTRATADOS comprometem-se a atuar com zelo, dedicação e técnica na condução dos atos processuais e administrativos.',
          'CLÁUSULA TERCEIRA (DA DOCUMENTAÇÃO): O CONTRATANTE se obriga a fornecer todos os documentos, laudos e comprovações verídicas de sua atividade laborativa ou estado de saúde.',
          'CLÁUSULA QUARTA (DAS DESPESAS): Custas judiciais e despesas com certidões correrão por conta do CONTRATANTE, ressalvado o benefício da justiça gratuita.',
          '{{CLAUSULA:honorarios}}',
          '{{CLAUSULA:desistencia}}',
          'CLÁUSULA SÉTIMA (DO FORO): Fica eleito o foro da comarca de domicílio do CONTRATANTE para dirimir quaisquer controvérsias decorrentes deste pacto.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '________________________________________        ________________________________________',
          '            CONTRATANTE                                   CONTRATADOS',
        ],
        { subtitulo: 'Contrato Especial de Honorários Advocatícios - Âmbito Previdenciário' }
      );

    case 'doc_hipossuficiencia':
      return createTemplateDocx(
        'DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA',
        [
          'Eu, {{CLIENTE_NOME}}, inscrito no CPF sob o nº {{CLIENTE_CPF}}, {{CLIENTE_QUALIFICACAO}}, venho por meio desta:',
          'DECLARAR, sob as penas da lei e em conformidade com o artigo 98 e seguintes do Código de Processo Civil (Lei nº 13.105/2015) e com o artigo 5º, inciso LXXIV, da Constituição Federal, que não possuo condições financeiras de arcar com as custas processuais, taxas e honorários advocatícios sem prejuízo do sustento próprio e de minha família.',
          'Por ser expressão da verdade, firmo a presente declaração para que surta seus jurídicos e legais efeitos perante a Justiça Federal.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          '{{CLIENTE_NOME}}',
        ],
        { subtitulo: 'Requerimento dos Benefícios da Justiça Gratuita' }
      );

    case 'doc_renuncia_jef':
      return createTemplateDocx(
        'TERMO DE RENÚNCIA PARA O JUIZADO ESPECIAL FEDERAL',
        [
          'O(A) segurado(a) {{CLIENTE_NOME}}, inscrito(a) no CPF sob o nº {{CLIENTE_CPF}}, residente e domiciliado(a) em {{CLIENTE_ENDERECO}}, nº {{CLIENTE_NUMERO}}, {{CLIENTE_BAIRRO}}, {{CLIENTE_CIDADE_UF}}, CEP {{CLIENTE_CEP}}:',
          'DECLARA expressamente, perante o Juizado Especial Federal, que RENUNCIA a todo e qualquer valor excedente ao teto de 60 (sessenta) salários mínimos na data do ajuizamento da ação, exclusivamente para fixação da competência do JEF, nos termos do artigo 3º, caput e § 3º, da Lei nº 10.259/2001.',
          'Declara estar plenamente ciente das consequências jurídicas desta renúncia no tocante ao montante condenatório.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          '{{CLIENTE_NOME}}',
        ],
        { subtitulo: 'Artigo 3º da Lei Federal nº 10.259/2001' }
      );

    case 'doc_requerimento_inss':
      return createTemplateDocx(
        'REQUERIMENTO ADMINISTRATIVO DE BENEFÍCIO PREVIDENCIÁRIO',
        [
          'ILUSTRÍSSIMO(A) SENHOR(A) GERENTE EXECUTIVO(A) DA AGÊNCIA DA PREVIDÊNCIA SOCIAL (INSS)',
          'REQUERENTE: {{CLIENTE_NOME}}, inscrito no CPF {{CLIENTE_CPF}}, {{CLIENTE_QUALIFICACAO}}.',
          'DOS FATOS E FUNDAMENTOS: O(A) Requerente reuniu todos os pressupostos legais exigidos pela legislação previdenciária (Lei 8.213/91 e Decreto 3.048/99) para a concessão da prestação requerida, conforme comprovam a carteira de trabalho, extrato CNIS e demais documentos anexos.',
          'DO PEDIDO: Diante do exposto, requer a imediata análise e implantação do benefício previdenciário devido, com a fixação da Data de Entrada do Requerimento (DER) no protocolo oficial deste pedido.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          'Assinatura do(a) Requerente / Procurador Habilitado',
        ],
        { subtitulo: 'Protocolo de Requerimento Administrativo' }
      );

    case 'doc_ciencia_tramitacao':
      return createTemplateDocx(
        'TERMO DE CIÊNCIA E NOTIFICAÇÃO DE TRAMITAÇÃO',
        [
          'Pelo presente instrumento, {{CLIENTE_NOME}}, portador(a) do CPF {{CLIENTE_CPF}}, declara expressamente ter sido orientado(a) e notificado(a) acerca dos seguintes pontos referentes ao seu processo previdenciário:',
          '1. As ações judiciais e procedimentos perante o INSS possuem prazos legais próprios de tramitação, dependendo da realização de perícias médicas e juntada de laudos técnicos.',
          '2. O(A) cliente compromete-se a manter seu endereço e número telefônico sempre atualizados perante o escritório de advocacia para recebimento de comunicações.',
          '3. O comparecimento à perícia médica judicial designada é obrigatório, sob pena de extinção do feito.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          '{{CLIENTE_NOME}}',
        ],
        { subtitulo: 'Comunicação e Orientações Processuais' }
      );

    case 'doc_declaracao_residencia':
      return createTemplateDocx(
        'DECLARAÇÃO DE RESIDÊNCIA E DOMICÍLIO',
        [
          'Eu, {{CLIENTE_NOME}}, inscrito(a) no CPF sob o nº {{CLIENTE_CPF}}, {{CLIENTE_QUALIFICACAO}}:',
          'DECLARO para os devidos fins de comprovação perante os órgãos públicos e o Poder Judiciário, sob as penas da Lei nº 7.115/1983 e do artigo 299 do Código Penal, que mantenho residência fixa e habitual no endereço indicado acima.',
          'Por ser verdade, firmo a presente declaração.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          '{{CLIENTE_NOME}}',
        ],
        { subtitulo: 'Declaração sob as Penas da Lei nº 7.115/1983' }
      );

    case 'doc_cadastro_estatico':
    default:
      return createTemplateDocx(
        'FICHA DE CADASTRO DE CLIENTE PREVIDENCIÁRIO',
        [
          'DADOS PESSOAIS DO CLIENTE (PREENCHIMENTO MANUAL NO ATENDIMENTO)',
          'Nome Completo: ____________________________________________________________________',
          'CPF: ________________________  RG: ________________________ Órgão Exp.: ____________',
          'Data de Nascimento: _____/_____/_________ Gênero: (  ) Masculino   (  ) Feminino',
          'Estado Civil: (  ) Solteiro(a)  (  ) Casado(a)  (  ) Divorciado(a)  (  ) Viúvo(a)  (  ) União Estável',
          'Nome da Mãe: ______________________________________________________________________',
          'Profissão / Ocupação Principal: ______________________________________________________',
          'Endereço: ________________________________________________ Nº: ____________________',
          'Bairro: ______________________________ Cidade/UF: ________________ CEP: ____________',
          'Ponto de Referência: _______________________________________________________________',
          'Telefone 1 (WhatsApp): _____________________ Telefone 2: ___________________________',
          'DADOS PREVIDENCIÁRIOS',
          'Número do Benefício (NB/NIT/PIS): ___________________________________________________',
          'Tipo de Ação / Pedido: (  ) Aposentadoria Idade/Tempo   (  ) Auxílio-Doença/Incapacidade   (  ) Auxílio-Acidente   (  ) BPC/LOAS   (  ) Pensão',
          'Atendimento Realizado em: _____/_____/202____ por: ___________________________________',
        ],
        { subtitulo: 'Ficha Cadastral em Branco - Modelo Estático Homologado' }
      );
  }
}
