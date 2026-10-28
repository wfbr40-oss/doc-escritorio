'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';
import {
  formatCpf,
  isValidCpf,
  normalizeCpf,
} from '@/src/lib/cliente/cpf';
import { formatCep } from '@/src/lib/cliente/cep';
import { formatDataExtenso } from '@/src/lib/cliente/data';
import { buildQualificacao, ClienteRender } from '@/src/lib/cliente/qualificacao';
import {
  FileText,
  CheckCircle2,
  Download,
  AlertCircle,
  FileArchive,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
  Info,
} from 'lucide-react';

interface DocumentoKitState {
  id: string;
  nome: string;
  kind: 'template' | 'static';
  selecionado: boolean;
  varianteId?: string;
  valores?: Record<string, string>;
}

const DOCUMENTOS_KIT_INICIAIS: DocumentoKitState[] = [
  { id: 'doc_procuracao', nome: '1. Procuração Ad Judicia et Extra', kind: 'template', selecionado: true },
  {
    id: 'doc_contrato_honorarios',
    nome: '2. Contrato de Honorários Advocatícios Previdenciários',
    kind: 'template',
    selecionado: true,
    varianteId: 'padrao',
    valores: {
      minimo_honorarios: '14.000,00',
      minimo_auxilio_acidente: '8.000,00',
      minimo_reconhecimento_periodo: '6.000,00',
    },
  },
  { id: 'doc_hipossuficiencia', nome: '3. Declaração de Hipossuficiência Econômica', kind: 'template', selecionado: true },
  { id: 'doc_renuncia_jef', nome: '4. Termo de Renúncia aos Excedentes a 60 SM (JEF)', kind: 'template', selecionado: true },
  { id: 'doc_requerimento_inss', nome: '5. Requerimento Administrativo de Benefício (INSS)', kind: 'template', selecionado: true },
  { id: 'doc_ciencia_tramitacao', nome: '6. Termo de Ciência e Notificação de Tramitação', kind: 'template', selecionado: true },
  { id: 'doc_declaracao_residencia', nome: '7. Declaração de Residência e Domicílio', kind: 'template', selecionado: true },
  { id: 'doc_cadastro_estatico', nome: '8. Ficha de Cadastro de Cliente (Modelo Estático em Branco)', kind: 'static', selecionado: true },
];

export default function NovoKitPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ id: string; name: string; role: 'user' | 'admin'; email?: string } | null>(null);

  // Dados do Cliente
  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState<'M' | 'F'>('F');
  const [nacionalidade, setNacionalidade] = useState('brasileira');
  const [estadoCivil, setEstadoCivil] = useState<'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel'>('solteiro');
  const [profissao, setProfissao] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidadeUf, setCidadeUf] = useState('Macapá/AP');
  const [cep, setCep] = useState('');
  const [referencia, setReferencia] = useState('');

  // Assinatura
  const [cidadeAssinatura, setCidadeAssinatura] = useState('Macapá/AP');
  const [dataExtenso, setDataExtenso] = useState(() => formatDataExtenso(new Date()));

  // Documentos e Variantes
  const [documentos, setDocumentos] = useState<DocumentoKitState[]>(DOCUMENTOS_KIT_INICIAIS);
  const [varianteContrato, setVarianteContrato] = useState<'padrao' | 'auxilio_acidente_trafego_pago'>('padrao');
  const [minimoHonorarios, setMinimoHonorarios] = useState('14.000,00');
  const [minimoAuxilio, setMinimoAuxilio] = useState('8.000,00');
  const [minimoPeriodo, setMinimoPeriodo] = useState('6.000,00');

  // Estado da requisição
  const [gerando, setGerando] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [resultadoLote, setResultadoLote] = useState<{
    batchId: string;
    total: number;
    itens: Array<{ id: string; nome: string; documentId: string }>;
    zipDownloadUrl: string;
  } | null>(null);

  // Carrega usuário da sessão
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => {
        if (d?.usuario) setUsuario(d.usuario);
      })
      .catch(() => {});
  }, []);

  // Atualiza valores quando a variante do contrato muda
  const handleTrocaVariante = (novaVariante: 'padrao' | 'auxilio_acidente_trafego_pago') => {
    setVarianteContrato(novaVariante);
    if (novaVariante === 'auxilio_acidente_trafego_pago') {
      setMinimoHonorarios('5.000,00');
    } else {
      setMinimoHonorarios('14.000,00');
      setMinimoAuxilio('8.000,00');
      setMinimoPeriodo('6.000,00');
    }
  };

  // Preenchimento com dados fictícios homologados
  const preencherFicticio = () => {
    setNome('Maria Francisca dos Santos D\'Ávila');
    setGenero('F');
    setNacionalidade('brasileira');
    setEstadoCivil('solteiro');
    setProfissao('Agricultora Familiar');
    setCpf('529.982.247-25');
    setEndereco('Rodovia JK, Km 7');
    setNumero('1450');
    setBairro('Universitário');
    setCidadeUf('Macapá/AP');
    setCep('68925-000');
    setReferencia('Próximo à Unifap');
    setCidadeAssinatura('Macapá/AP');
    setDataExtenso(formatDataExtenso(new Date()));
    setErroValidacao(null);
  };

  // Preview dinâmico da qualificação
  const clientePreview: ClienteRender = {
    nome: nome || 'NOME DO(A) CLIENTE',
    genero,
    nacionalidade,
    estadoCivil,
    profissao,
    cpf: normalizeCpf(cpf) || '00000000000',
    endereco: endereco || 'Logradouro',
    numero: numero || 'S/N',
    bairro: bairro || 'Bairro',
    cidadeUf: cidadeUf || 'Cidade/UF',
    cep: normalizeCpf(cep) || '00000000',
    referencia,
  };

  const qualificacaoContratoPreview = buildQualificacao(clientePreview, 'contrato');

  const toggleDocumento = (id: string) => {
    setDocumentos((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, selecionado: !doc.selecionado } : doc))
    );
  };

  const handleGerar = async () => {
    setErroValidacao(null);

    // Validação local imediata
    if (!nome.trim() || nome.trim().length < 3) {
      setErroValidacao('Informe o nome completo do cliente.');
      return;
    }

    if (!isValidCpf(cpf)) {
      setErroValidacao('CPF inválido. Verifique os dígitos informados antes de prosseguir.');
      return;
    }

    if (!endereco.trim() || !cidadeUf.trim() || !cep.trim()) {
      setErroValidacao('Endereço, Cidade/UF e CEP são de preenchimento obrigatório.');
      return;
    }

    const selecionados = documentos.filter((d) => d.selecionado);
    if (selecionados.length === 0) {
      setErroValidacao('Selecione ao menos 1 documento para emissão do kit.');
      return;
    }

    setGerando(true);

    try {
      const payloadDocs = selecionados.map((d) => {
        if (d.id === 'doc_contrato_honorarios') {
          return {
            documentId: d.id,
            varianteId: varianteContrato,
            valores: {
              minimo_honorarios: minimoHonorarios,
              minimo_auxilio_acidente: minimoAuxilio,
              minimo_reconhecimento_periodo: minimoPeriodo,
            },
          };
        }
        return {
          documentId: d.id,
          varianteId: 'padrao',
        };
      });

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            nome: nome.trim(),
            genero,
            nacionalidade: nacionalidade.trim(),
            estadoCivil,
            profissao: profissao.trim() || undefined,
            cpf: normalizeCpf(cpf),
            endereco: endereco.trim(),
            numero: numero.trim() || 'S/N',
            bairro: bairro.trim(),
            cidadeUf: cidadeUf.trim(),
            cep: normalizeCpf(cep),
            referencia: referencia.trim() || undefined,
          },
          documentos: payloadDocs,
          assinatura: {
            cidadeUf: cidadeAssinatura.trim(),
            dataExtenso: dataExtenso.trim(),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErroValidacao(data.erro || 'Falha ao processar geração dos documentos.');
        setGerando(false);
        return;
      }

      setResultadoLote(data);
      setGerando(false);
    } catch {
      setErroValidacao('Erro de comunicação com o servidor. Tente novamente.');
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AppNavbar usuario={usuario} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho da Seção de Geração */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Emissão do Kit Previdenciário</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Geração de documentos em formato DOCX nativo a partir das molduras validadas pelo advogado.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={preencherFicticio}
              className="px-3.5 py-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preencher Dados Fictícios</span>
            </button>
          </div>
        </div>

        {erroValidacao && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-sm text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Pendência de validação</p>
              <p className="text-xs text-red-300 mt-0.5">{erroValidacao}</p>
            </div>
          </div>
        )}

        {/* Modal/Banner de Sucesso da Geração */}
        {resultadoLote && (
          <div className="mt-6 p-6 rounded-xl bg-emerald-950/30 border border-emerald-600/40 text-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Kit Previdenciário Gerado com Sucesso!
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                    <span>Lote: {resultadoLote.batchId.slice(0, 8)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{resultadoLote.total} arquivos DOCX</span>
                    <span aria-hidden="true">·</span>
                    <span>Retenção de 1 ano ativa</span>
                  </div>
                </div>
              </div>

              <a
                href={resultadoLote.zipDownloadUrl}
                download
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-950"
              >
                <FileArchive className="w-4 h-4" />
                <span>Baixar Kit Completo (.ZIP)</span>
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-900/40">
              <p className="text-xs font-medium text-slate-300 mb-3">
                Baixar documentos individuais deste lote:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {resultadoLote.itens.map((item) => (
                  <a
                    key={item.id}
                    href={`/api/download/${item.id}`}
                    download
                    className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 hover:border-amber-400/50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-xs text-slate-200 group-hover:text-amber-300 truncate pr-2">
                      {item.nome}
                    </span>
                    <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grid de Configuração: Dados à esquerda, Documentos e Parâmetros à direita */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna 1: Dados do Cliente e Assinatura (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Bloco 1: Dados Pessoais */}
            <div className="bg-slate-900/90 p-6 rounded-xl border border-slate-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>1. Dados Civis do Segurado(a)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João da Silva Santos"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gênero Gramatical <span className="text-amber-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGenero('F');
                        if (nacionalidade === 'brasileiro') setNacionalidade('brasileira');
                      }}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                        genero === 'F'
                          ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Feminino (F)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGenero('M');
                        if (nacionalidade === 'brasileira') setNacionalidade('brasileiro');
                      }}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                        genero === 'M'
                          ? 'bg-amber-400/10 border-amber-400/40 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Masculino (M)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CPF <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  {cpf && !isValidCpf(cpf) && (
                    <span className="text-[11px] text-red-400 mt-1 block">CPF com formato ou dígito inválido.</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Estado Civil
                  </label>
                  <select
                    value={estadoCivil}
                    onChange={(e) => setEstadoCivil(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="solteiro">{genero === 'F' ? 'Solteira' : 'Solteiro'}</option>
                    <option value="casado">{genero === 'F' ? 'Casada' : 'Casado'}</option>
                    <option value="uniao_estavel">Em União Estável</option>
                    <option value="divorciado">{genero === 'F' ? 'Divorciada' : 'Divorciado'}</option>
                    <option value="viuvo">{genero === 'F' ? 'Viúva' : 'Viúvo'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nacionalidade
                  </label>
                  <input
                    type="text"
                    value={nacionalidade}
                    onChange={(e) => setNacionalidade(e.target.value)}
                    placeholder="brasileiro(a)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Profissão / Ocupação Habitual (Opcional)
                  </label>
                  <input
                    type="text"
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    placeholder="Ex: Lavrador(a), Trabalhador(a) Rural, Pedreiro, etc."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se deixado em branco, a qualificação é gerada sem a palavra &quot;profissão&quot; e sem vírgulas duplicadas.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Endereço do Cliente */}
            <div className="bg-slate-900/90 p-6 rounded-xl border border-slate-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                <span>2. Domicílio e Endereço</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Logradouro (Rua, Avenida, Linha) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Rua das Flores ou Linha 3"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123 ou S/N"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bairro / Comunidade
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Centro ou Zona Rural"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cidade / UF <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={cidadeUf}
                    onChange={(e) => setCidadeUf(e.target.value)}
                    placeholder="Macapá/AP"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CEP <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(formatCep(e.target.value))}
                    maxLength={9}
                    placeholder="68925-000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ponto de Referência (Opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ex: Próximo ao posto de saúde da comunidade"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Assinatura */}
            <div className="bg-slate-900/90 p-6 rounded-xl border border-slate-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                <span>3. Local e Data da Assinatura</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Comarca / Cidade de Assinatura
                  </label>
                  <input
                    type="text"
                    value={cidadeAssinatura}
                    onChange={(e) => setCidadeAssinatura(e.target.value)}
                    placeholder="Macapá/AP"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data por Extenso (Fuso de Brasília)
                  </label>
                  <input
                    type="text"
                    value={dataExtenso}
                    onChange={(e) => setDataExtenso(e.target.value)}
                    placeholder="27 de outubro de 2026"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Prévia da Qualificação Gerada */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-2">
                <Eye className="w-4 h-4" />
                <span>Prévia do Bloco de Qualificação Civil:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono">
                {qualificacaoContratoPreview}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Regra estrita: endereço sempre gerado com &quot;em&quot;, sem artigo antes do logradouro.</span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Documentos do Kit e Variantes (5 colunas) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Bloco de Variantes do Contrato */}
            <div className="bg-slate-900/90 p-6 rounded-xl border border-slate-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                <span>Variante do Contrato de Honorários</span>
              </h2>

              <div className="space-y-3">
                <label className="block p-3.5 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer bg-slate-950 transition-colors">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="variante_contrato"
                      checked={varianteContrato === 'padrao'}
                      onChange={() => handleTrocaVariante('padrao')}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Padrão (30% + Pisos Mínimos)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Cláusula padrão com 30% e pisos de R$ 14.000 (geral), R$ 8.000 (auxílio-acidente) e R$ 6.000 (período rural/especial).
                      </p>
                    </div>
                  </div>
                </label>

                <label className="block p-3.5 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer bg-slate-950 transition-colors">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="variante_contrato"
                      checked={varianteContrato === 'auxilio_acidente_trafego_pago'}
                      onChange={() => handleTrocaVariante('auxilio_acidente_trafego_pago')}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Auxílio-Acidente Tráfego Pago
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Cláusula com 30% sobre parcelas vencidas e 12 vincendas, com piso mínimo ajustado para R$ 5.000,00.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Parâmetros Editáveis do Contrato */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <div className="text-xs font-medium text-slate-300">
                  Parâmetros Financeiros da Variante:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Mínimo de Honorários (R$)
                    </label>
                    <input
                      type="text"
                      value={minimoHonorarios}
                      onChange={(e) => setMinimoHonorarios(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>

                  {varianteContrato === 'padrao' && (
                    <>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Mínimo Auxílio-Acidente (R$)
                        </label>
                        <input
                          type="text"
                          value={minimoAuxilio}
                          onChange={(e) => setMinimoAuxilio(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Mínimo Reconhecimento Período (R$)
                        </label>
                        <input
                          type="text"
                          value={minimoPeriodo}
                          onChange={(e) => setMinimoPeriodo(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lista dos 8 Documentos do Kit */}
            <div className="bg-slate-900/90 p-6 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  <span>Documentos do Kit (8 Itens)</span>
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {documentos.filter((d) => d.selecionado).length} de 8 selecionados
                </span>
              </div>

              <div className="space-y-2">
                {documentos.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocumento(doc.id)}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      doc.selecionado
                        ? 'bg-slate-950 border-amber-500/40 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          doc.selecionado
                            ? 'bg-amber-400 border-amber-400 text-slate-950'
                            : 'border-slate-700'
                        }`}
                      >
                        {doc.selecionado && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className="truncate">{doc.nome}</span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {doc.kind === 'static' ? 'Estático' : 'Template'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão de Ação Primária */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={handleGerar}
                disabled={gerando}
                className="w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2"
              >
                {gerando ? (
                  <span>Processando molduras e gerando arquivos...</span>
                ) : (
                  <>
                    <span>Emitir Kit Previdenciário Oficial</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Histórico congelado com retenção garantida por 1 ano</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
