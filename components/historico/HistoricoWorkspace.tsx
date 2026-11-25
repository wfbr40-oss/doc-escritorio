'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Archive,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  Plus,
} from 'lucide-react';
import { showToast } from '@/components/ui/ToastViewport';

interface DocumentoHistorico {
  id: string;
  batch_id: string;
  document_id: string;
  document_name: string;
  user_name: string;
  client_masked_name: string;
  status: 'ativo' | 'expirado';
  expires_at: string;
  created_at: string;
  dias_restantes: number;
  aviso_expiracao: boolean;
}

interface LoteHistorico {
  batch_id: string;
  client_masked_name: string;
  user_name: string;
  created_at: string;
  expires_at: string;
  total_documentos: number;
  status: 'ativo' | 'expirado';
  dias_restantes: number;
  aviso_expiracao: boolean;
}

export function HistoricoWorkspace() {
  const [aba, setAba] = useState<'lotes' | 'documentos'>('lotes');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [lotes, setLotes] = useState<LoteHistorico[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoHistorico[]>([]);

  const carregarHistorico = async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/history', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível carregar o histórico.');
        setCarregando(false);
        return;
      }
      setLotes(data.lotes || []);
      setDocumentos(data.documentos || []);
      setCarregando(false);
    } catch {
      showToast.error('Erro de conexão ao consultar histórico.');
      setCarregando(false);
    }
  };

  useEffect(() => {
    let ativo = true;
    fetch('/api/history', { credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json();
        if (!ativo) return;
        if (!res.ok) {
          showToast.error(data.erro || 'Não foi possível carregar o histórico.');
          setCarregando(false);
          return;
        }
        setLotes(data.lotes || []);
        setDocumentos(data.documentos || []);
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        showToast.error('Erro de conexão ao consultar histórico.');
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const termo = busca.trim().toLowerCase();

  const lotesFiltrados = useMemo(
    () =>
      lotes.filter(
        (l) =>
          !termo ||
          l.client_masked_name.toLowerCase().includes(termo) ||
          l.batch_id.toLowerCase().includes(termo)
      ),
    [lotes, termo]
  );

  const docsFiltrados = useMemo(
    () =>
      documentos.filter(
        (d) =>
          !termo ||
          d.client_masked_name.toLowerCase().includes(termo) ||
          d.document_name.toLowerCase().includes(termo)
      ),
    [documentos, termo]
  );

  const lotesPertoVencimento = lotes.filter((l) => l.aviso_expiracao).length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white text-balance">
            Histórico & Lotes Gerados
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Documentos congelados na emissão com retenção automática de 1 ano.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={carregarHistorico}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <Link
            href="/novo"
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Kit</span>
          </Link>
        </div>
      </div>

      {lotesPertoVencimento > 0 && (
        <div className="mt-6 p-3.5 rounded-lg bg-amber-950/40 border border-amber-700/60 flex items-start gap-2.5 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            Atenção: {lotesPertoVencimento}{' '}
            {lotesPertoVencimento === 1 ? 'lote atingirá' : 'lotes atingirão'} o prazo máximo de 1
            ano nos próximos 30 dias e serão removidos automaticamente.
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAba('lotes')}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap text-center ${
              aba === 'lotes'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Lotes ({lotes.length})
          </button>
          <button
            type="button"
            onClick={() => setAba('documentos')}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap text-center ${
              aba === 'documentos'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Documentos ({documentos.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por cliente ou documento..."
            className="w-full min-h-[40px] pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {carregando ? (
        <div className="mt-6 space-y-3">
          <div className="h-14 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
          <div className="h-14 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
          <div className="h-14 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
        </div>
      ) : aba === 'lotes' ? (
        lotesFiltrados.length === 0 ? (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-white">Nenhum lote encontrado</h2>
            <p className="text-xs text-slate-400 mt-1">
              Os kits previdenciários gerados aparecerão aqui com download disponível por 1 ano.
            </p>
            <Link
              href="/novo"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerar Primeiro Kit</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Cartões Mobile (< md) */}
            <div className="mt-6 md:hidden space-y-3">
              {lotesFiltrados.map((lote) => (
                <div
                  key={lote.batch_id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {lote.client_masked_name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        Lote {lote.batch_id.slice(0, 8)} · {lote.user_name}
                      </p>
                    </div>
                    <span className="text-xs text-slate-300 font-mono tabular-nums shrink-0">
                      {lote.total_documentos} itens
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="space-y-0.5 tabular-nums">
                      <p className="text-slate-400">
                        Emissão: {new Date(lote.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <p>
                        {lote.status === 'expirado' ? (
                          <span className="text-red-400">Expirado</span>
                        ) : lote.aviso_expiracao ? (
                          <span className="text-amber-400">
                            Expira em {lote.dias_restantes} dias
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Até {new Date(lote.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>

                    {lote.status === 'expirado' ? (
                      <span className="text-[11px] text-slate-500">Indisponível</span>
                    ) : (
                      <a
                        href={`/api/download/batch/${lote.batch_id}`}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Baixar ZIP</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela Tablet & Desktop (>= md) */}
            <div className="mt-6 hidden md:block overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
              <table className="min-w-full divide-y divide-slate-800 text-left">
                <thead>
                  <tr className="text-[11px] font-medium text-slate-400">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Emissão</th>
                    <th className="py-3 px-4">Retenção</th>
                    <th className="py-3 px-4 text-right">Itens</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {lotesFiltrados.map((lote) => (
                    <tr key={lote.batch_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{lote.client_masked_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          Lote {lote.batch_id.slice(0, 8)} · {lote.user_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                        {new Date(lote.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums whitespace-nowrap">
                        {lote.status === 'expirado' ? (
                          <span className="text-red-400">Expirado</span>
                        ) : lote.aviso_expiracao ? (
                          <span className="text-amber-400">
                            Expira em {lote.dias_restantes} dias
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Até {new Date(lote.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                        {lote.total_documentos}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {lote.status === 'expirado' ? (
                          <span className="text-[11px] text-slate-500">Indisponível</span>
                        ) : (
                          <a
                            href={`/api/download/batch/${lote.batch_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Baixar ZIP</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : docsFiltrados.length === 0 ? (
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white">Nenhum documento encontrado</h2>
          <p className="text-xs text-slate-400 mt-1">
            Ajuste o filtro de busca ou gere um novo kit previdenciário.
          </p>
        </div>
      ) : (
        <>
          {/* Cartões Mobile (< md) */}
          <div className="mt-6 md:hidden space-y-3">
            {docsFiltrados.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-white leading-snug">{doc.document_name}</p>
                  <p className="text-xs text-slate-300 truncate">{doc.client_masked_name}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="space-y-0.5 tabular-nums">
                    <p className="text-slate-400">
                      Emissão: {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p>
                      {doc.status === 'expirado' ? (
                        <span className="text-red-400">Expirado</span>
                      ) : doc.aviso_expiracao ? (
                        <span className="text-amber-400">Expira em {doc.dias_restantes} dias</span>
                      ) : (
                        <span className="text-slate-400">
                          Validade: {new Date(doc.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </p>
                  </div>

                  {doc.status === 'expirado' ? (
                    <span className="text-[11px] text-slate-500">Expirado</span>
                  ) : (
                    <a
                      href={`/api/download/${doc.id}`}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar DOCX</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tabela Tablet & Desktop (>= md) */}
          <div className="mt-6 hidden md:block overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="min-w-full divide-y divide-slate-800 text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-400">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Emissão</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {docsFiltrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">{doc.document_name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{doc.client_masked_name}</td>
                    <td className="py-3.5 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums whitespace-nowrap">
                      {doc.status === 'expirado' ? (
                        <span className="text-red-400">Expirado</span>
                      ) : doc.aviso_expiracao ? (
                        <span className="text-amber-400">Expira em {doc.dias_restantes} dias</span>
                      ) : (
                        <span className="text-slate-400">
                          {new Date(doc.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {doc.status === 'expirado' ? (
                        <span className="text-[11px] text-slate-500">Expirado</span>
                      ) : (
                        <a
                          href={`/api/download/${doc.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>DOCX</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
