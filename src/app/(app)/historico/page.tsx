'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppNavbar } from '@/components/layout/AppNavbar';
import {
  History,
  Download,
  AlertTriangle,
  FileArchive,
  Search,
  Shield,
  Clock,
  FileText,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

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
  status: string;
  dias_restantes: number;
  aviso_expiracao: boolean;
}

interface AuditLogItem {
  id: string;
  user_name: string;
  action: string;
  target_id: string;
  created_at: string;
}

export default function HistoricoPage() {
  const [usuario, setUsuario] = useState<{ id: string; name: string; role: 'user' | 'admin'; email?: string } | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoHistorico[]>([]);
  const [lotes, setLotes] = useState<LoteHistorico[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'lotes' | 'documentos' | 'auditoria'>('lotes');

  const recarregar = () => {
    setCarregando(true);
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/history').then((r) => r.json()),
    ])
      .then(([resSessao, resHist]) => {
        if (resSessao?.usuario) setUsuario(resSessao.usuario);
        if (resHist?.documentos) setDocumentos(resHist.documentos);
        if (resHist?.lotes) setLotes(resHist.lotes);
        if (resHist?.auditLogs) setAuditLogs(resHist.auditLogs);
      })
      .finally(() => {
        setCarregando(false);
      });
  };

  useEffect(() => {
    let ativo = true;
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()),
      fetch('/api/history').then((r) => r.json()),
    ])
      .then(([resSessao, resHist]) => {
        if (!ativo) return;
        if (resSessao?.usuario) setUsuario(resSessao.usuario);
        if (resHist?.documentos) setDocumentos(resHist.documentos);
        if (resHist?.lotes) setLotes(resHist.lotes);
        if (resHist?.auditLogs) setAuditLogs(resHist.auditLogs);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const totalComAviso = lotes.filter((l) => l.aviso_expiracao).length;

  const lotesFiltrados = lotes.filter((l) =>
    l.client_masked_name.toLowerCase().includes(busca.toLowerCase()) ||
    l.batch_id.toLowerCase().includes(busca.toLowerCase()) ||
    l.user_name.toLowerCase().includes(busca.toLowerCase())
  );

  const docsFiltrados = documentos.filter((d) =>
    d.document_name.toLowerCase().includes(busca.toLowerCase()) ||
    d.client_masked_name.toLowerCase().includes(busca.toLowerCase()) ||
    d.batch_id.toLowerCase().includes(busca.toLowerCase())
  );

  const formatarDataIso = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AppNavbar usuario={usuario} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Histórico de Kits Emitidos</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Registros imutáveis com retenção garantida por 1 ano e controle de expiração automatizado.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={recarregar}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/novo"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Novo Kit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Alerta de Retenção de 30 Dias (Tarefa 8) */}
        {totalComAviso > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Aviso de Expiração de Documentos ({totalComAviso} lote{totalComAviso > 1 ? 's' : ''} em atenção)
              </p>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                Existem kits que atingirão o prazo máximo de retenção de 1 ano nos próximos 30 dias. Conforme a política de privacidade (LGPD), após o término da retenção os arquivos serão purgados e os snapshots zerados.
              </p>
            </div>
          </div>
        )}

        {/* Controles de Busca e Abas */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Abas */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setAbaAtiva('lotes')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                abaAtiva === 'lotes'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lotes Emitidos ({lotes.length})
            </button>
            <button
              onClick={() => setAbaAtiva('documentos')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                abaAtiva === 'documentos'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Documentos Individuais ({documentos.length})
            </button>
            <button
              onClick={() => setAbaAtiva('auditoria')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                abaAtiva === 'auditoria'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Trilha de Auditoria ({auditLogs.length})
            </button>
          </div>

          {/* Busca */}
          {abaAtiva !== 'auditoria' && (
            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por cliente ou lote..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* Conteúdo da Aba Lotes */}
        {abaAtiva === 'lotes' && (
          <div className="mt-6 bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
            {lotesFiltrados.length === 0 ? (
              <div className="p-12 text-center">
                <History className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-300">Nenhum lote registrado</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Os kits previdenciários emitidos pela equipe ficarão disponíveis nesta lista com links temporários seguros e contagem regressiva de retenção.
                </p>
                <Link
                  href="/novo"
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 text-slate-950 font-medium text-xs rounded-lg hover:bg-amber-300 transition-colors"
                >
                  <span>Emitir Primeiro Kit</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Lote / ID</th>
                      <th className="py-3 px-4">Cliente (Mascarado)</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Data Emissão</th>
                      <th className="py-3 px-4">Retenção</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {lotesFiltrados.map((lote) => (
                      <tr key={lote.batch_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {lote.batch_id.slice(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          {lote.client_masked_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {lote.user_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono tabular-nums">
                          {formatarDataIso(lote.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          {lote.status === 'expirado' ? (
                            <span className="text-red-400">Expirado</span>
                          ) : lote.aviso_expiracao ? (
                            <span className="text-amber-400 font-medium">
                              Expira em {lote.dias_restantes} dias
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {lote.dias_restantes} dias restantes
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {lote.status === 'ativo' ? (
                            <a
                              href={`/api/download/batch/${lote.batch_id}`}
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 transition-colors"
                            >
                              <FileArchive className="w-3.5 h-3.5" />
                              <span>Baixar ZIP ({lote.total_documentos})</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[11px]">Arquivo purgado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Documentos Individuais */}
        {abaAtiva === 'documentos' && (
          <div className="mt-6 bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
            {docsFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum documento encontrado para a busca.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Autor</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Status / Expiração</th>
                      <th className="py-3 px-4 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {docsFiltrados.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-200 font-medium">
                          {doc.document_name}
                        </td>
                        <td className="py-3.5 px-4 text-white">
                          {doc.client_masked_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {doc.user_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono tabular-nums">
                          {formatarDataIso(doc.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">
                          {doc.status === 'expirado' ? (
                            <span className="text-red-400">Expirado</span>
                          ) : doc.aviso_expiracao ? (
                            <span className="text-amber-400 font-medium">
                              Expira em {doc.dias_restantes} dias
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {doc.dias_restantes} dias restantes
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {doc.status === 'ativo' ? (
                            <a
                              href={`/api/download/${doc.id}`}
                              download
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-400" />
                              <span>DOCX</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[11px]">Expurgado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Trilha de Auditoria */}
        {abaAtiva === 'auditoria' && (
          <div className="mt-6 bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>
                Trilha de auditoria imutável: registra downloads e gerações sem armazenar dados de clientes (LGPD).
              </span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum evento de auditoria registrado até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Usuário</th>
                      <th className="py-3 px-4">Ação</th>
                      <th className="py-3 px-4">Alvo (ID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400 tabular-nums">
                          {formatarDataIso(log.created_at)}
                        </td>
                        <td className="py-3 px-4 text-white font-sans font-medium">
                          {log.user_name}
                        </td>
                        <td className="py-3 px-4 text-amber-300">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                          {log.target_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
