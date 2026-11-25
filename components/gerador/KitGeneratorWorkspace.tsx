'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  FileText,
  Download,
  Package,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Check,
  Archive,
  History,
} from 'lucide-react';
import { buildQualificacao, EstadoCivilValor, Genero } from '@/src/lib/cliente/qualificacao';
import { formatCpf, isValidCpf } from '@/src/lib/cliente/cpf';
import { formatCep } from '@/src/lib/cliente/cep';
import { formatDataExtenso } from '@/src/lib/cliente/data';

interface KitCatalogo {
  id: string;
  name: string;
  description?: string;
}

interface DocumentoCatalogo {
  id: string;
  kit_id?: string;
  name: string;
  kind: 'template' | 'static';
  order_index: number;
}

const DOCUMENTOS_KIT: DocumentoCatalogo[] = [
  { id: 'doc_procuracao', name: 'Procuração Ad Judicia et Extra', kind: 'template', order_index: 1 },
  {
    id: 'doc_contrato_honorarios',
    name: 'Contrato de Honorários Advocatícios Previdenciários',
    kind: 'template',
    order_index: 2,
  },
  {
    id: 'doc_hipossuficiencia',
    name: 'Declaração de Hipossuficiência Econômica',
    kind: 'template',
    order_index: 3,
  },
  {
    id: 'doc_renuncia_jef',
    name: 'Termo de Renúncia aos Excedentes a 60 SM (JEF)',
    kind: 'template',
    order_index: 4,
  },
  {
    id: 'doc_requerimento_inss',
    name: 'Requerimento Administrativo de Benefício (INSS)',
    kind: 'template',
    order_index: 5,
  },
  {
    id: 'doc_ciencia_tramitacao',
    name: 'Termo de Ciência e Notificação de Tramitação',
    kind: 'template',
    order_index: 6,
  },
  {
    id: 'doc_declaracao_residencia',
    name: 'Declaração de Residência e Domicílio',
    kind: 'template',
    order_index: 7,
  },
  {
    id: 'doc_cadastro_estatico',
    name: 'Cadastro de Cliente (Ficha em Branco)',
    kind: 'static',
    order_index: 8,
  },
];

interface ResultadoGeracao {
  batchId: string;
  expiresAt: string;
  total: number;
  zipDownloadUrl: string;
  itens: Array<{
    id: string;
    documentId: string;
    nome: string;
    filePath: string;
  }>;
}

export function KitGeneratorWorkspace() {
  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState<Genero>('F');
  const [nacionalidade, setNacionalidade] = useState('brasileira');
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivilValor>('solteiro');
  const [profissao, setProfissao] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidadeUf, setCidadeUf] = useState('Macapá/AP');
  const [cep, setCep] = useState('');
  const [referencia, setReferencia] = useState('');

  const [varianteContrato, setVarianteContrato] = useState<
    'padrao' | 'auxilio_acidente_trafego_pago'
  >('padrao');
  const [minimoHonorarios, setMinimoHonorarios] = useState('14.000,00');
  const [minimoAuxilioAcidente, setMinimoAuxilioAcidente] = useState('8.000,00');
  const [minimoReconhecimentoPeriodo, setMinimoReconhecimentoPeriodo] = useState('6.000,00');
  const [assinaturaCidadeUf, setAssinaturaCidadeUf] = useState('');
  const [assinaturaDataExtenso, setAssinaturaDataExtenso] = useState(() =>
    formatDataExtenso(new Date())
  );

  const [kitsCatalogo, setKitsCatalogo] = useState<KitCatalogo[]>([
    {
      id: 'kit_previdenciario',
      name: 'Kit Previdenciário Completo (Ação Judicial & Administrativa)',
    },
  ]);
  const [kitSelecionadoId, setKitSelecionadoId] = useState<string>('kit_previdenciario');
  const [todosDocumentos, setTodosDocumentos] = useState<DocumentoCatalogo[]>(
    DOCUMENTOS_KIT.map((d) => ({ ...d, kit_id: 'kit_previdenciario' }))
  );

  const [selecionados, setSelecionados] = useState<string[]>(
    DOCUMENTOS_KIT.map((d) => d.id)
  );

  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoGeracao | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch('/api/catalog', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!ativo) return;
        if (Array.isArray(data.kits) && data.kits.length > 0) {
          setKitsCatalogo(data.kits);
          const kitInicial = data.kits[0].id;
          setKitSelecionadoId(kitInicial);
          if (Array.isArray(data.documents)) {
            setTodosDocumentos(data.documents);
            setSelecionados(
              data.documents
                .filter((d: DocumentoCatalogo) => d.kit_id === kitInicial)
                .map((d: DocumentoCatalogo) => d.id)
            );
          }
        }
      })
      .catch(() => {
        // Mantém catálogo padrão caso falhe a atualização em segundo plano
      });
    return () => {
      ativo = false;
    };
  }, []);

  const documentosDoKitAtivo = useMemo(
    () =>
      todosDocumentos
        .filter((d) => !d.kit_id || d.kit_id === kitSelecionadoId)
        .sort((a, b) => a.order_index - b.order_index),
    [todosDocumentos, kitSelecionadoId]
  );

  const handleTrocarKit = (novoKitId: string) => {
    setKitSelecionadoId(novoKitId);
    const docsNovoKit = todosDocumentos
      .filter((d) => d.kit_id === novoKitId)
      .map((d) => d.id);
    setSelecionados(docsNovoKit);
  };

  const handleGeneroChange = (novoGenero: Genero) => {
    setGenero(novoGenero);
    if (nacionalidade.toLowerCase() === 'brasileiro' || nacionalidade.toLowerCase() === 'brasileira') {
      setNacionalidade(novoGenero === 'F' ? 'brasileira' : 'brasileiro');
    }
  };

  const toggleDocumento = (docId: string) => {
    setSelecionados((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const preencherDadosFicticios = () => {
    setNome('Maria Francisca da Silva');
    setGenero('F');
    setNacionalidade('brasileira');
    setEstadoCivil('solteiro');
    setProfissao('Agricultora');
    setCpf('529.982.247-25');
    setEndereco('Rua das Flores');
    setNumero('120');
    setBairro('Centro');
    setCidadeUf('Macapá/AP');
    setCep('68900-010');
    setReferencia('Próximo à Praça Central');
    setErro(null);
  };

  const cpfValido = cpf.trim().length > 0 ? isValidCpf(cpf) : null;

  const previewQualificacao = useMemo(() => {
    if (!nome.trim() && !endereco.trim() && !cpf.trim()) {
      return null;
    }
    try {
      return buildQualificacao(
        {
          nome: nome || 'Nome do(a) Cliente',
          genero,
          nacionalidade: nacionalidade || 'brasileiro',
          estadoCivil,
          profissao,
          cpf: cpf || '00000000000',
          endereco: endereco || 'Rua Exemplo',
          numero,
          bairro,
          cidadeUf: cidadeUf || 'Macapá/AP',
          cep: cep || '68900000',
          referencia,
        },
        'contrato'
      );
    } catch {
      return null;
    }
  }, [
    nome,
    genero,
    nacionalidade,
    estadoCivil,
    profissao,
    cpf,
    endereco,
    numero,
    bairro,
    cidadeUf,
    cep,
    referencia,
  ]);

  const handleGerar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResultado(null);

    if (selecionados.length === 0) {
      setErro('Selecione ao menos um documento do kit para gerar.');
      return;
    }

    if (!isValidCpf(cpf)) {
      setErro('O CPF informado é inválido. Confira os dígitos antes de gerar os documentos.');
      return;
    }

    setGerando(true);
    try {
      const documentosPayload = documentosDoKitAtivo
        .filter((d) => selecionados.includes(d.id))
        .map((d) => ({
          documentId: d.id,
          ...(d.id === 'doc_contrato_honorarios'
            ? {
                varianteId: varianteContrato,
                valores: {
                  minimo_honorarios: minimoHonorarios,
                  minimo_auxilio_acidente: minimoAuxilioAcidente,
                  minimo_reconhecimento_periodo: minimoReconhecimentoPeriodo,
                },
              }
            : {}),
        }));

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kitId: kitSelecionadoId,
          cliente: {
            nome: nome.trim(),
            genero,
            nacionalidade: nacionalidade.trim() || (genero === 'F' ? 'brasileira' : 'brasileiro'),
            estadoCivil,
            profissao: profissao.trim(),
            cpf: formatCpf(cpf),
            endereco: endereco.trim(),
            numero: numero.trim(),
            bairro: bairro.trim(),
            cidadeUf: cidadeUf.trim(),
            cep: formatCep(cep),
            referencia: referencia.trim(),
          },
          documentos: documentosPayload,
          assinatura: {
            cidadeUf: assinaturaCidadeUf.trim() || cidadeUf.trim(),
            dataExtenso: assinaturaDataExtenso.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro || 'Não foi possível gerar os documentos.');
        setGerando(false);
        return;
      }

      setResultado(data);
      setGerando(false);
    } catch {
      setErro('Erro de conexão ao gerar os documentos. Tente novamente.');
      setGerando(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white text-balance">
            Gerar Kit Previdenciário
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Preencha a qualificação do cliente para gerar os documentos oficiais em DOCX.
          </p>
        </div>

        <button
          type="button"
          onClick={preencherDadosFicticios}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Preencher Exemplo Fictício</span>
        </button>
      </div>

      {erro && (
        <div className="mt-6 p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 flex items-start gap-2.5 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {resultado && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6 bg-slate-900 border border-emerald-700/50 rounded-xl p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Kit gerado com sucesso ({resultado.total}{' '}
                  {resultado.total === 1 ? 'documento' : 'documentos'})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  Lote {resultado.batchId.slice(0, 8)} · Retenção até{' '}
                  {new Date(resultado.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/historico"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap"
              >
                <History className="w-3.5 h-3.5" />
                <span>Ver Histórico</span>
              </Link>

              <a
                href={resultado.zipDownloadUrl}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Baixar Kit Completo (.ZIP)</span>
              </a>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {resultado.itens.map((item) => (
              <a
                key={item.id}
                href={`/api/download/${item.id}`}
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate group-hover:text-amber-300">
                    {item.nome}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Documento DOCX</p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-400 shrink-0" />
              </a>
            ))}
          </div>
        </motion.section>
      )}

      <form onSubmit={handleGerar} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Dados do Cliente */}
        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">01. Dados do Cliente</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Qualificação civil, CPF e endereço para preenchimento automático.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label htmlFor="nome" className="block text-xs font-medium text-slate-300">
                Nome completo *
              </label>
              <input
                id="nome"
                type="text"
                required
                minLength={3}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Maria Francisca da Silva"
                className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-4">
              <span className="block text-xs font-medium text-slate-300">Gênero *</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleGeneroChange('F')}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    genero === 'F'
                      ? 'bg-slate-800 text-white border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Feminino
                </button>
                <button
                  type="button"
                  onClick={() => handleGeneroChange('M')}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    genero === 'M'
                      ? 'bg-slate-800 text-white border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Masculino
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cpf" className="block text-xs font-medium text-slate-300">
                CPF *
              </label>
              <input
                id="cpf"
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                onBlur={() => {
                  if (cpf.replace(/\D/g, '').length === 11) {
                    setCpf(formatCpf(cpf));
                  }
                }}
                placeholder="000.000.000-00"
                className="mt-1.5 block w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
              {cpfValido === false && (
                <p className="mt-1 text-[11px] text-red-400">CPF inválido</p>
              )}
            </div>

            <div>
              <label htmlFor="estadoCivil" className="block text-xs font-medium text-slate-300">
                Estado civil *
              </label>
              <select
                id="estadoCivil"
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value as EstadoCivilValor)}
                className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="solteiro">{genero === 'F' ? 'Solteira' : 'Solteiro'}</option>
                <option value="casado">{genero === 'F' ? 'Casada' : 'Casado'}</option>
                <option value="divorciado">{genero === 'F' ? 'Divorciada' : 'Divorciado'}</option>
                <option value="viuvo">{genero === 'F' ? 'Viúva' : 'Viúvo'}</option>
                <option value="uniao_estavel">Em união estável</option>
              </select>
            </div>

            <div>
              <label htmlFor="nacionalidade" className="block text-xs font-medium text-slate-300">
                Nacionalidade *
              </label>
              <input
                id="nacionalidade"
                type="text"
                required
                value={nacionalidade}
                onChange={(e) => setNacionalidade(e.target.value)}
                placeholder="brasileira"
                className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profissao" className="block text-xs font-medium text-slate-300">
              Profissão
            </label>
            <input
              id="profissao"
              type="text"
              value={profissao}
              onChange={(e) => setProfissao(e.target.value)}
              placeholder="Opcional (ex.: Agricultora, Pedreiro)"
              className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-9">
                <label htmlFor="endereco" className="block text-xs font-medium text-slate-300">
                  Logradouro *
                </label>
                <input
                  id="endereco"
                  type="text"
                  required
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex.: Rua das Flores (sem 'na' ou 'no')"
                  className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="numero" className="block text-xs font-medium text-slate-300">
                  Número
                </label>
                <input
                  id="numero"
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="S/N ou 120"
                  className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="bairro" className="block text-xs font-medium text-slate-300">
                  Bairro
                </label>
                <input
                  id="bairro"
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Centro"
                  className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="cidadeUf" className="block text-xs font-medium text-slate-300">
                  Cidade/UF *
                </label>
                <input
                  id="cidadeUf"
                  type="text"
                  required
                  value={cidadeUf}
                  onChange={(e) => setCidadeUf(e.target.value)}
                  placeholder="Macapá/AP"
                  className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="cep" className="block text-xs font-medium text-slate-300">
                  CEP *
                </label>
                <input
                  id="cep"
                  type="text"
                  required
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={() => {
                    if (cep.replace(/\D/g, '').length === 8) {
                      setCep(formatCep(cep));
                    }
                  }}
                  placeholder="68900-010"
                  className="mt-1.5 block w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="referencia" className="block text-xs font-medium text-slate-300">
                Ponto de referência
              </label>
              <input
                id="referencia"
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Opcional"
                className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {previewQualificacao && (
            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400">
                Prévia da qualificação jurídica
              </p>
              <p className="mt-1.5 text-xs text-slate-200 leading-relaxed bg-slate-950 border border-slate-800 rounded-lg p-3">
                {previewQualificacao}
              </p>
            </div>
          )}
        </section>

        {/* Coluna Direita: Variantes, Parâmetros e Documentos */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">
                02. Contrato & Composição do Kit
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Escolha o kit, a variante contratual e os documentos incluídos no lote.
              </p>
            </div>

            {kitsCatalogo.length > 0 && (
              <div>
                <label htmlFor="kitSelect" className="block text-xs font-medium text-slate-300">
                  Kit de Documentos
                </label>
                <select
                  id="kitSelect"
                  value={kitSelecionadoId}
                  onChange={(e) => handleTrocarKit(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                >
                  {kitsCatalogo.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="variante" className="block text-xs font-medium text-slate-300">
                Variante de Honorários e Desistência
              </label>
              <select
                id="variante"
                value={varianteContrato}
                onChange={(e) =>
                  setVarianteContrato(
                    e.target.value as 'padrao' | 'auxilio_acidente_trafego_pago'
                  )
                }
                className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="padrao">Padrão (30% + Pisos Mínimos)</option>
                <option value="auxilio_acidente_trafego_pago">
                  Auxílio-Acidente Tráfego Pago (30% vencidas + 12 vincendas)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="minHon" className="block text-[11px] font-medium text-slate-400">
                  Mín. Honorários (R$)
                </label>
                <input
                  id="minHon"
                  type="text"
                  value={minimoHonorarios}
                  onChange={(e) => setMinimoHonorarios(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="minAux" className="block text-[11px] font-medium text-slate-400">
                  Mín. Auxílio-Acidente
                </label>
                <input
                  id="minAux"
                  type="text"
                  value={minimoAuxilioAcidente}
                  onChange={(e) => setMinimoAuxilioAcidente(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="minPer" className="block text-[11px] font-medium text-slate-400">
                  Mín. Período Rural
                </label>
                <input
                  id="minPer"
                  type="text"
                  value={minimoReconhecimentoPeriodo}
                  onChange={(e) => setMinimoReconhecimentoPeriodo(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label htmlFor="assCidade" className="block text-[11px] font-medium text-slate-400">
                  Cidade/UF da assinatura
                </label>
                <input
                  id="assCidade"
                  type="text"
                  value={assinaturaCidadeUf}
                  onChange={(e) => setAssinaturaCidadeUf(e.target.value)}
                  placeholder={cidadeUf || 'Macapá/AP'}
                  className="mt-1 block w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="assData" className="block text-[11px] font-medium text-slate-400">
                  Data por extenso
                </label>
                <input
                  id="assData"
                  type="text"
                  value={assinaturaDataExtenso}
                  onChange={(e) => setAssinaturaDataExtenso(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-slate-300 tabular-nums">
                  Documentos do Kit ({selecionados.length}/{documentosDoKitAtivo.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelecionados(
                      selecionados.length === documentosDoKitAtivo.length
                        ? []
                        : documentosDoKitAtivo.map((d) => d.id)
                    )
                  }
                  className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap"
                >
                  {selecionados.length === documentosDoKitAtivo.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </button>
              </div>

              {documentosDoKitAtivo.length === 0 ? (
                <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-400 text-center">
                  Nenhum modelo vinculado a este kit ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-slate-950/60">
                  {documentosDoKitAtivo.map((doc) => {
                    const ativo = selecionados.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleDocumento(doc.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-900/80 transition-colors"
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                            ativo
                              ? 'bg-amber-400 border-amber-400 text-slate-950'
                              : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {ativo && <Check className="w-3 h-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-200 truncate">{doc.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {doc.kind === 'static'
                              ? 'Documento estático · Em branco'
                              : 'Modelo DOCX preenchido'}
                          </p>
                        </div>
                        <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={gerando}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Package className="w-4 h-4" />
              <span>{gerando ? 'Gerando documentos DOCX...' : 'Gerar Kit Previdenciário'}</span>
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
