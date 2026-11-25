'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  FolderPlus,
  Users,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Search,
  RefreshCw,
  X,
  UserPlus,
} from 'lucide-react';
import { showToast } from '@/components/ui/ToastViewport';

interface KitItem {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface TemplateContent {
  titulo: string;
  subtitulo?: string;
  paragrafos: string[];
}

interface DocumentModel {
  id: string;
  kit_id: string;
  name: string;
  kind: 'template' | 'static';
  template_file_path: string;
  template_content?: TemplateContent | null;
  order_index: number;
  hasCustomFile?: boolean;
  created_at: string;
}

interface UserProfileItem {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  ativo?: boolean;
  allowed_kit_ids?: string[] | null;
  created_at: string;
}

interface AdminWorkspaceProps {
  adminAtualId: string;
}

type AbaAdmin = 'modelos' | 'kits' | 'usuarios';

const MARCADORES_RAPIDOS = [
  '{{CLIENTE_NOME}}',
  '{{CLIENTE_QUALIFICACAO}}',
  '{{CLIENTE_CPF}}',
  '{{CLIENTE_ENDERECO}}',
  '{{ASSINATURA_LOCAL_DATA}}',
];

export function AdminWorkspace({ adminAtualId }: AdminWorkspaceProps) {
  const [aba, setAba] = useState<AbaAdmin>('modelos');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [kits, setKits] = useState<KitItem[]>([]);
  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [users, setUsers] = useState<UserProfileItem[]>([]);

  // Filtros
  const [filtroKitId, setFiltroKitId] = useState<string>('todos');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [buscaUsuario, setBuscaUsuario] = useState('');

  // Formulário de Modelo (Adicionar / Modificar)
  const [modeloFormAberto, setModeloFormAberto] = useState(false);
  const [modeloEditandoId, setModeloEditandoId] = useState<string | null>(null);
  const [modeloNome, setModeloNome] = useState('');
  const [modeloKitId, setModeloKitId] = useState('kit_previdenciario');
  const [modeloKind, setModeloKind] = useState<'template' | 'static'>('template');
  const [modeloOrder, setModeloOrder] = useState<number>(1);
  const [modeloTitulo, setModeloTitulo] = useState('');
  const [modeloSubtitulo, setModeloSubtitulo] = useState('');
  const [modeloParagrafos, setModeloParagrafos] = useState('');
  const [modeloArquivo, setModeloArquivo] = useState<File | null>(null);
  const [confirmarExcluirModeloId, setConfirmarExcluirModeloId] = useState<string | null>(null);

  // Formulário de Kit (Criar / Modificar)
  const [kitFormAberto, setKitFormAberto] = useState(false);
  const [kitEditandoId, setKitEditandoId] = useState<string | null>(null);
  const [kitNome, setKitNome] = useState('');
  const [kitDescricao, setKitDescricao] = useState('');
  const [kitCopiarDe, setKitCopiarDe] = useState('');
  const [confirmarExcluirKitId, setConfirmarExcluirKitId] = useState<string | null>(null);

  // Formulário de Novo Usuário
  const [usuarioFormAberto, setUsuarioFormAberto] = useState(false);
  const [novoUsuarioNome, setNovoUsuarioNome] = useState('');
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [novoUsuarioRole, setNovoUsuarioRole] = useState<'user' | 'admin'>('user');
  const [novoUsuarioAtivo, setNovoUsuarioAtivo] = useState(true);
  const [novoUsuarioKits, setNovoUsuarioKits] = useState<string[] | null>(null);
  const [usuarioEditandoKitsId, setUsuarioEditandoKitsId] = useState<string | null>(null);

  const carregarOverview = async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/admin/overview', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível carregar os dados administrativos.');
        setCarregando(false);
        return;
      }
      setKits(data.kits || []);
      setDocuments(data.documents || []);
      setUsers(data.users || []);
      if (data.kits?.length > 0 && !data.kits.some((k: KitItem) => k.id === modeloKitId)) {
        setModeloKitId(data.kits[0].id);
      }
      setCarregando(false);
    } catch {
      showToast.error('Erro de conexão ao carregar o painel administrativo.');
      setCarregando(false);
    }
  };

  useEffect(() => {
    let ativo = true;
    fetch('/api/admin/overview', { credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json();
        if (!ativo) return;
        if (!res.ok) {
          showToast.error(data.erro || 'Não foi possível carregar os dados administrativos.');
          setCarregando(false);
          return;
        }
        setKits(data.kits || []);
        setDocuments(data.documents || []);
        setUsers(data.users || []);
        if (data.kits?.length > 0) {
          setModeloKitId(data.kits[0].id);
        }
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        showToast.error('Erro de conexão ao carregar o painel administrativo.');
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // --- Handlers de Modelos ---
  const abrirNovoModelo = () => {
    const kitPadrao = filtroKitId !== 'todos' ? filtroKitId : kits[0]?.id || 'kit_previdenciario';
    const docsDoKit = documents.filter((d) => d.kit_id === kitPadrao);
    setModeloEditandoId(null);
    setModeloNome('');
    setModeloKitId(kitPadrao);
    setModeloKind('template');
    setModeloOrder(docsDoKit.length + 1);
    setModeloTitulo('');
    setModeloSubtitulo('');
    setModeloParagrafos(
      'OUTORGANTE: {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}.\n' +
        'OBJETO: Declaração e requerimento administrativo/judicial.\n' +
        '{{ASSINATURA_LOCAL_DATA}}\n' +
        '______________________________________________________\n' +
        '{{CLIENTE_NOME}}'
    );
    setModeloArquivo(null);
    setModeloFormAberto(true);
  };

  const abrirEditarModelo = (doc: DocumentModel) => {
    setModeloEditandoId(doc.id);
    setModeloNome(doc.name);
    setModeloKitId(doc.kit_id);
    setModeloKind(doc.kind);
    setModeloOrder(doc.order_index);
    setModeloTitulo(doc.template_content?.titulo || doc.name.toUpperCase());
    setModeloSubtitulo(doc.template_content?.subtitulo || '');
    setModeloParagrafos(
      doc.template_content?.paragrafos?.join('\n') || ''
    );
    setModeloArquivo(null);
    setModeloFormAberto(true);
  };

  const inserirMarcador = (marcador: string) => {
    setModeloParagrafos((prev) => (prev ? `${prev} ${marcador}` : marcador));
  };

  const handleSalvarModelo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modeloArquivo && !modeloArquivo.name.trim().toLowerCase().endsWith('.docx')) {
      showToast.error(
        'Formato de arquivo inválido. O arquivo anexado deve ser em formato .docx.'
      );
      return;
    }
    setSalvando(true);

    try {
      const formData = new FormData();
      formData.append('name', modeloNome.trim());
      formData.append('kit_id', modeloKitId);
      formData.append('kind', modeloKind);
      formData.append('order_index', String(modeloOrder));
      if (modeloTitulo.trim()) formData.append('titulo', modeloTitulo.trim());
      if (modeloSubtitulo.trim()) formData.append('subtitulo', modeloSubtitulo.trim());
      if (modeloParagrafos.trim()) formData.append('paragrafos', modeloParagrafos.trim());
      if (modeloArquivo) formData.append('file', modeloArquivo);

      const url = modeloEditandoId
        ? `/api/admin/models/${modeloEditandoId}`
        : '/api/admin/models';
      const method = modeloEditandoId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível salvar o modelo.');
        setSalvando(false);
        return;
      }

      setModeloFormAberto(false);
      showToast.success(
        modeloEditandoId
          ? 'Modelo atualizado com sucesso.'
          : 'Novo modelo adicionado ao kit.'
      );
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao salvar o modelo.');
      setSalvando(false);
    }
  };

  const handleExcluirModelo = async (id: string) => {
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/models/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível excluir o modelo.');
        setSalvando(false);
        return;
      }
      setConfirmarExcluirModeloId(null);
      showToast.success('Modelo removido com sucesso.');
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao excluir o modelo.');
      setSalvando(false);
    }
  };

  // --- Handlers de Kits ---
  const abrirNovoKit = () => {
    setKitEditandoId(null);
    setKitNome('');
    setKitDescricao('');
    setKitCopiarDe('');
    setKitFormAberto(true);
  };

  const abrirEditarKit = (kit: KitItem) => {
    setKitEditandoId(kit.id);
    setKitNome(kit.name);
    setKitDescricao(kit.description || '');
    setKitCopiarDe('');
    setKitFormAberto(true);
  };

  const handleSalvarKit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const url = kitEditandoId ? `/api/admin/kits/${kitEditandoId}` : '/api/admin/kits';
      const method = kitEditandoId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: kitNome.trim(),
          description: kitDescricao.trim(),
          ...(kitCopiarDe ? { copyFromKitId: kitCopiarDe } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível salvar o kit.');
        setSalvando(false);
        return;
      }

      setKitFormAberto(false);
      showToast.success(
        kitEditandoId ? 'Kit atualizado com sucesso.' : 'Novo kit criado com sucesso.'
      );
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao salvar o kit.');
      setSalvando(false);
    }
  };

  const handleExcluirKit = async (id: string) => {
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/kits/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível excluir o kit.');
        setSalvando(false);
        return;
      }
      setConfirmarExcluirKitId(null);
      showToast.success('Kit excluído com sucesso.');
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao excluir o kit.');
      setSalvando(false);
    }
  };

  // --- Handlers de Usuários ---
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: novoUsuarioNome.trim(),
          email: novoUsuarioEmail.trim(),
          password: novoUsuarioSenha,
          role: novoUsuarioRole,
          ativo: novoUsuarioAtivo,
          allowed_kit_ids: novoUsuarioKits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível cadastrar o usuário.');
        setSalvando(false);
        return;
      }

      setUsuarioFormAberto(false);
      setNovoUsuarioNome('');
      setNovoUsuarioEmail('');
      setNovoUsuarioSenha('');
      setNovoUsuarioRole('user');
      setNovoUsuarioAtivo(true);
      setNovoUsuarioKits(null);
      showToast.success('Usuário criado e configurado com sucesso.');
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao criar usuário.');
      setSalvando(false);
    }
  };

  const handleAtualizarUsuario = async (
    userId: string,
    patch: Partial<{ role: 'user' | 'admin'; ativo: boolean; allowed_kit_ids: string[] | null }>
  ) => {
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível atualizar o usuário.');
        setSalvando(false);
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u)));
      showToast.success('Permissões de acesso atualizadas.');
      setSalvando(false);
    } catch {
      showToast.error('Erro de conexão ao atualizar usuário.');
      setSalvando(false);
    }
  };

  const kitsById = useMemo(
    () => new Map(kits.map((k) => [k.id, k])),
    [kits]
  );

  const modelosFiltrados = useMemo(() => {
    const termo = buscaModelo.trim().toLowerCase();
    return documents
      .filter((d) => filtroKitId === 'todos' || d.kit_id === filtroKitId)
      .filter(
        (d) =>
          !termo ||
          d.name.toLowerCase().includes(termo) ||
          (kitsById.get(d.kit_id)?.name || '').toLowerCase().includes(termo)
      )
      .sort((a, b) => a.order_index - b.order_index);
  }, [documents, filtroKitId, buscaModelo, kitsById]);

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase();
    return users.filter(
      (u) =>
        !termo ||
        u.name.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo)
    );
  }, [users, buscaUsuario]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabeçalho Administrativo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white text-balance">
            Administração do Escritório
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gerencie modelos DOCX, crie novos kits de documentos e configure o acesso dos usuários.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarOverview}
          className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Navegação por Abas Internas (sempre todas visíveis e responsivas) */}
      <div className="mt-6">
        <div
          role="tablist"
          aria-label="Seções administrativas"
          className="grid grid-cols-1 sm:inline-flex sm:flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'modelos'}
            onClick={() => setAba('modelos')}
            className={`inline-flex items-center justify-between sm:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              aba === 'modelos'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Modelos DOCX</span>
            </span>
            <span className="text-slate-400 font-mono tabular-nums">{documents.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={aba === 'kits'}
            onClick={() => setAba('kits')}
            className={`inline-flex items-center justify-between sm:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              aba === 'kits'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Kits</span>
            </span>
            <span className="text-slate-400 font-mono tabular-nums">{kits.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={aba === 'usuarios'}
            onClick={() => setAba('usuarios')}
            className={`inline-flex items-center justify-between sm:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              aba === 'usuarios'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Usuários & Acessos</span>
            </span>
            <span className="text-slate-400 font-mono tabular-nums">{users.length}</span>
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="mt-6 space-y-3">
          <div className="h-14 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
          <div className="h-14 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
          <div className="h-14 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
        </div>
      ) : (
        <motion.div
          key={aba}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="mt-6"
        >
          {/* ABA 1: MODELOS DOCX */}
          {aba === 'modelos' && (
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaModelo}
                      onChange={(e) => setBuscaModelo(e.target.value)}
                      placeholder="Buscar modelo pelo nome..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <select
                    value={filtroKitId}
                    onChange={(e) => setFiltroKitId(e.target.value)}
                    className="w-full sm:w-auto sm:max-w-xs px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="todos">Todos os kits</option>
                    {kits.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={abrirNovoModelo}
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Modelo</span>
                </button>
              </div>

              {modeloFormAberto && (
                <form
                  onSubmit={handleSalvarModelo}
                  className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-6 space-y-5"
                >
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        {modeloEditandoId ? 'Modificar Modelo DOCX' : 'Novo Modelo DOCX'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Envie uma moldura .docx ou edite o conteúdo estruturado diretamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModeloFormAberto(false)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                    <div className="sm:col-span-2 lg:col-span-5">
                      <label className="block text-xs font-medium text-slate-300">
                        Nome do modelo *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={modeloNome}
                        onChange={(e) => setModeloNome(e.target.value)}
                        placeholder="Ex.: Requerimento de Revisão da Vida Toda"
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="block text-xs font-medium text-slate-300">
                        Kit vinculado *
                      </label>
                      <select
                        value={modeloKitId}
                        onChange={(e) => setModeloKitId(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {kits.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-300">Tipo *</label>
                      <select
                        value={modeloKind}
                        onChange={(e) =>
                          setModeloKind(e.target.value as 'template' | 'static')
                        }
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="template">Dinâmico</option>
                        <option value="static">Estático</option>
                      </select>
                    </div>

                    <div className="lg:col-span-1">
                      <label className="block text-xs font-medium text-slate-300">Ordem</label>
                      <input
                        type="number"
                        min={1}
                        value={modeloOrder}
                        onChange={(e) => setModeloOrder(Number(e.target.value) || 1)}
                        className="mt-1.5 block w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-800">
                    <div className="lg:col-span-8 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300">
                            Título interno do documento
                          </label>
                          <input
                            type="text"
                            value={modeloTitulo}
                            onChange={(e) => setModeloTitulo(e.target.value)}
                            placeholder="Ex.: PROCURAÇÃO AD JUDICIA"
                            className="mt-1 block w-full px-3 py-1.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300">
                            Subtítulo (opcional)
                          </label>
                          <input
                            type="text"
                            value={modeloSubtitulo}
                            onChange={(e) => setModeloSubtitulo(e.target.value)}
                            placeholder="Ex.: Poderes Gerais e Específicos"
                            className="mt-1 block w-full px-3 py-1.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-medium text-slate-300">
                            Parágrafos do modelo (um por linha)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {MARCADORES_RAPIDOS.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => inserirMarcador(m)}
                                className="px-2 py-0.5 text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded transition-colors"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          rows={6}
                          value={modeloParagrafos}
                          onChange={(e) => setModeloParagrafos(e.target.value)}
                          placeholder="Escreva os parágrafos com marcadores {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}, {{ASSINATURA_LOCAL_DATA}}..."
                          className="block w-full px-3 py-2 text-xs font-mono leading-relaxed bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-3">
                      <label className="block text-xs font-medium text-slate-300">
                        Ou enviar arquivo .DOCX pronto
                      </label>
                      <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 hover:border-amber-500/60 cursor-pointer transition-colors text-center">
                        <Upload className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-medium text-slate-200">
                          {modeloArquivo
                            ? modeloArquivo.name
                            : 'Selecionar arquivo .docx do computador'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Apenas arquivos .docx são aceitos (substitui o texto estruturado).
                        </span>
                        <input
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (!file) {
                              setModeloArquivo(null);
                              return;
                            }
                            if (!file.name.trim().toLowerCase().endsWith('.docx')) {
                              e.target.value = '';
                              setModeloArquivo(null);
                              showToast.error(
                                'Formato de arquivo inválido. O arquivo anexado deve ser em formato .docx.'
                              );
                              return;
                            }
                            setModeloArquivo(file);
                          }}
                        />
                      </label>
                      {modeloArquivo && (
                        <button
                          type="button"
                          onClick={() => setModeloArquivo(null)}
                          className="text-xs text-slate-400 hover:text-red-300"
                        >
                          Remover arquivo selecionado
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setModeloFormAberto(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvando}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50"
                    >
                      {salvando
                        ? 'Salvando...'
                        : modeloEditandoId
                          ? 'Salvar Alterações'
                          : 'Adicionar Modelo'}
                    </button>
                  </div>
                </form>
              )}

              {modelosFiltrados.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-200">
                    Nenhum modelo encontrado neste filtro
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adicione um novo documento DOCX ou ajuste a busca acima.
                  </p>
                </div>
              ) : (
                <>
                  {/* Visão em cartões para Mobile e Tablet Vertical (< lg) */}
                  <div className="lg:hidden space-y-3">
                    {modelosFiltrados.map((doc) => {
                      const kit = kitsById.get(doc.kit_id);
                      const confirmando = confirmarExcluirModeloId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-mono tabular-nums text-amber-400">
                                  #{String(doc.order_index).padStart(2, '0')}
                                </span>
                                <span>·</span>
                                <span>{doc.kind === 'static' ? 'Estático' : 'Dinâmico DOCX'}</span>
                              </div>
                              <p className="font-medium text-white text-sm leading-snug">
                                {doc.name}
                              </p>
                              <p className="text-xs text-slate-300 truncate">
                                {kit?.name || doc.kit_id}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                {doc.template_file_path}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                            <a
                              href={`/api/admin/models/${doc.id}/download`}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Moldura</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => abrirEditarModelo(doc)}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Modificar</span>
                            </button>

                            {confirmando ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={salvando}
                                  onClick={() => handleExcluirModelo(doc.id)}
                                  className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors whitespace-nowrap"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarExcluirModeloId(null)}
                                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmarExcluirModeloId(doc.id)}
                                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 bg-slate-950 hover:bg-red-950/40 border border-slate-800 transition-colors whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabela completa para Desktop / Tablet Horizontal (>= lg) */}
                  <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
                            <th className="py-3 px-4 w-16">Ordem</th>
                            <th className="py-3 px-4">Modelo de Documento</th>
                            <th className="py-3 px-4">Kit</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-sm">
                          {modelosFiltrados.map((doc) => {
                            const kit = kitsById.get(doc.kit_id);
                            const confirmando = confirmarExcluirModeloId === doc.id;
                            return (
                              <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-400">
                                  {String(doc.order_index).padStart(2, '0')}
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-medium text-white text-sm">{doc.name}</p>
                                  <p className="text-[11px] text-slate-500 font-mono">
                                    {doc.template_file_path}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-300">
                                  {kit?.name || doc.kit_id}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-300">
                                  {doc.kind === 'static' ? 'Estático' : 'Dinâmico DOCX'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <a
                                      href={`/api/admin/models/${doc.id}/download`}
                                      title="Baixar moldura DOCX atual"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Moldura</span>
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => abrirEditarModelo(doc)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-amber-300 hover:text-amber-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      <span>Modificar</span>
                                    </button>

                                    {confirmando ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={salvando}
                                          onClick={() => handleExcluirModelo(doc.id)}
                                          className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors whitespace-nowrap"
                                        >
                                          Confirmar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmarExcluirModeloId(null)}
                                          className="px-2 py-1.5 rounded-md text-xs text-slate-400 hover:text-white"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmarExcluirModeloId(doc.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:text-red-300 bg-slate-950 hover:bg-red-950/40 border border-slate-800 transition-colors whitespace-nowrap"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Excluir</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ABA 2: KITS DE DOCUMENTOS */}
          {aba === 'kits' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm text-slate-400">
                  Organize conjuntos de modelos para diferentes tipos de atendimento previdenciário.
                </p>
                <button
                  type="button"
                  onClick={abrirNovoKit}
                  className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Novo Kit</span>
                </button>
              </div>

              {kitFormAberto && (
                <form
                  onSubmit={handleSalvarKit}
                  className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h2 className="text-base font-semibold text-white">
                      {kitEditandoId ? 'Modificar Kit' : 'Criar Novo Kit'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setKitFormAberto(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Nome do kit *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={kitNome}
                        onChange={(e) => setKitNome(e.target.value)}
                        placeholder="Ex.: Kit Auxílio-Acidente e BPC/LOAS"
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {!kitEditandoId && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Copiar modelos iniciais de (opcional)
                        </label>
                        <select
                          value={kitCopiarDe}
                          onChange={(e) => setKitCopiarDe(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">Iniciar kit vazio</option>
                          {kits.map((k) => (
                            <option key={k.id} value={k.id}>
                              Copiar modelos de: {k.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Descrição do kit
                    </label>
                    <input
                      type="text"
                      value={kitDescricao}
                      onChange={(e) => setKitDescricao(e.target.value)}
                      placeholder="Finalidade e documentos cobertos por este kit"
                      className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setKitFormAberto(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvando}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50"
                    >
                      {salvando ? 'Salvando...' : kitEditandoId ? 'Salvar Kit' : 'Criar Kit'}
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                {kits.map((kit) => {
                  const qtdDocs = documents.filter((d) => d.kit_id === kit.id).length;
                  const confirmando = confirmarExcluirKitId === kit.id;
                  return (
                    <div
                      key={kit.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">{kit.name}</h3>
                        <p className="text-xs text-slate-400">
                          {kit.description || 'Sem descrição cadastrada.'}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {qtdDocs} {qtdDocs === 1 ? 'modelo vinculado' : 'modelos vinculados'} ·{' '}
                          <span className="font-mono">{kit.id}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setFiltroKitId(kit.id);
                            setAba('modelos');
                          }}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap"
                        >
                          Ver Modelos
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirEditarKit(kit)}
                          className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {kits.length > 1 &&
                          (confirmando ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={salvando}
                                onClick={() => handleExcluirKit(kit.id)}
                                className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 whitespace-nowrap"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmarExcluirKitId(null)}
                                className="min-h-[38px] px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmarExcluirKitId(kit.id)}
                              className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 bg-slate-950 hover:bg-red-950/40 border border-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ABA 3: USUÁRIOS E ACESSOS */}
          {aba === 'usuarios' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaUsuario}
                    onChange={(e) => setBuscaUsuario(e.target.value)}
                    placeholder="Buscar usuário por nome ou e-mail..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setUsuarioFormAberto((v) => !v)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Adicionar Usuário</span>
                </button>
              </div>

              {usuarioFormAberto && (
                <form
                  onSubmit={handleCriarUsuario}
                  className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h2 className="text-base font-semibold text-white">
                      Cadastrar e Liberar Novo Usuário
                    </h2>
                    <button
                      type="button"
                      onClick={() => setUsuarioFormAberto(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300">Nome *</label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={novoUsuarioNome}
                        onChange={(e) => setNovoUsuarioNome(e.target.value)}
                        placeholder="Nome completo"
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300">E-mail *</label>
                      <input
                        type="email"
                        required
                        value={novoUsuarioEmail}
                        onChange={(e) => setNovoUsuarioEmail(e.target.value)}
                        placeholder="advogado@escritorio.adv.br"
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Senha inicial *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={novoUsuarioSenha}
                        onChange={(e) => setNovoUsuarioSenha(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300">Cargo *</label>
                      <select
                        value={novoUsuarioRole}
                        onChange={(e) =>
                          setNovoUsuarioRole(e.target.value as 'user' | 'admin')
                        }
                        className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="user">Usuário padrão</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novoUsuarioAtivo}
                        onChange={(e) => setNovoUsuarioAtivo(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-500"
                      />
                      <span>Acesso liberado imediatamente</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setUsuarioFormAberto(false)}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={salvando}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50"
                      >
                        {salvando ? 'Criando...' : 'Criar Usuário'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Visão em cartões para Mobile e Tablet Vertical (< lg) */}
              <div className="lg:hidden space-y-3">
                {usuariosFiltrados.map((u) => {
                  const ehProprioAdmin = u.id === adminAtualId;
                  const ativo = u.ativo !== false;
                  const todosKits = !u.allowed_kit_ids || u.allowed_kit_ids.length === 0;
                  const editandoKits = usuarioEditandoKitsId === u.id;

                  return (
                    <div
                      key={u.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm">
                          {u.name}
                          {ehProprioAdmin && (
                            <span className="ml-2 text-[11px] text-amber-400">(Você)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <span className="block text-[11px] text-slate-400 mb-1">Cargo</span>
                          <select
                            disabled={ehProprioAdmin || salvando}
                            value={u.role}
                            onChange={(e) =>
                              handleAtualizarUsuario(u.id, {
                                role: e.target.value as 'user' | 'admin',
                              })
                            }
                            className="w-full min-h-[38px] px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="user">Usuário</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-400 mb-1">
                            Status de Acesso
                          </span>
                          <button
                            type="button"
                            disabled={ehProprioAdmin || salvando}
                            onClick={() => handleAtualizarUsuario(u.id, { ativo: !ativo })}
                            className={`w-full min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap disabled:opacity-50 ${
                              ativo
                                ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/50'
                                : 'bg-red-950/50 border-red-800/70 text-red-300 hover:bg-red-900/50'
                            }`}
                          >
                            {ativo ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="block text-[11px] text-slate-400 mb-1">
                          Kits Liberados
                        </span>
                        {u.role === 'admin' ? (
                          <span className="text-xs text-slate-300">
                            Todos os kits (administrador)
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-300 tabular-nums">
                                {todosKits
                                  ? 'Todos os kits'
                                  : `${u.allowed_kit_ids?.length || 0} kit(s) selecionado(s)`}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setUsuarioEditandoKitsId(editandoKits ? null : u.id)
                                }
                                className="text-xs font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap py-1"
                              >
                                {editandoKits ? 'Fechar' : 'Configurar'}
                              </button>
                            </div>

                            {editandoKits && (
                              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={todosKits}
                                    onChange={(e) =>
                                      handleAtualizarUsuario(u.id, {
                                        allowed_kit_ids: e.target.checked
                                          ? null
                                          : kits.slice(0, 1).map((k) => k.id),
                                      })
                                    }
                                  />
                                  <span>Liberar todos os kits</span>
                                </label>
                                {kits.map((k) => {
                                  const marcado =
                                    todosKits || Boolean(u.allowed_kit_ids?.includes(k.id));
                                  return (
                                    <label
                                      key={k.id}
                                      className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={marcado}
                                        onChange={(e) => {
                                          const base = todosKits
                                            ? kits.map((item) => item.id)
                                            : [...(u.allowed_kit_ids || [])];
                                          const next = e.target.checked
                                            ? Array.from(new Set([...base, k.id]))
                                            : base.filter((item) => item !== k.id);
                                          handleAtualizarUsuario(u.id, {
                                            allowed_kit_ids:
                                              next.length === kits.length ? null : next,
                                          });
                                        }}
                                      />
                                      <span className="truncate">{k.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabela completa para Desktop / Tablet Horizontal (>= lg) */}
              <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
                        <th className="py-3 px-4">Usuário</th>
                        <th className="py-3 px-4">Cargo</th>
                        <th className="py-3 px-4">Status de Acesso</th>
                        <th className="py-3 px-4">Kits Liberados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm">
                      {usuariosFiltrados.map((u) => {
                        const ehProprioAdmin = u.id === adminAtualId;
                        const ativo = u.ativo !== false;
                        const todosKits = !u.allowed_kit_ids || u.allowed_kit_ids.length === 0;
                        const editandoKits = usuarioEditandoKitsId === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-white text-sm">
                                {u.name}
                                {ehProprioAdmin && (
                                  <span className="ml-2 text-[11px] text-amber-400">(Você)</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                disabled={ehProprioAdmin || salvando}
                                value={u.role}
                                onChange={(e) =>
                                  handleAtualizarUsuario(u.id, {
                                    role: e.target.value as 'user' | 'admin',
                                  })
                                }
                                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="user">Usuário</option>
                                <option value="admin">Administrador</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                disabled={ehProprioAdmin || salvando}
                                onClick={() =>
                                  handleAtualizarUsuario(u.id, { ativo: !ativo })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap disabled:opacity-50 ${
                                  ativo
                                    ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/50'
                                    : 'bg-red-950/50 border-red-800/70 text-red-300 hover:bg-red-900/50'
                                }`}
                              >
                                {ativo ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                              </button>
                            </td>

                            <td className="py-3.5 px-4">
                              {u.role === 'admin' ? (
                                <span className="text-xs text-slate-400">
                                  Todos os kits (administrador)
                                </span>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-300 tabular-nums">
                                      {todosKits
                                        ? 'Todos os kits'
                                        : `${u.allowed_kit_ids?.length || 0} kit(s) selecionado(s)`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setUsuarioEditandoKitsId(editandoKits ? null : u.id)
                                      }
                                      className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap"
                                    >
                                      {editandoKits ? 'Fechar' : 'Configurar'}
                                    </button>
                                  </div>

                                  {editandoKits && (
                                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={todosKits}
                                          onChange={(e) =>
                                            handleAtualizarUsuario(u.id, {
                                              allowed_kit_ids: e.target.checked
                                                ? null
                                                : kits.slice(0, 1).map((k) => k.id),
                                            })
                                          }
                                        />
                                        <span>Liberar todos os kits</span>
                                      </label>
                                      {kits.map((k) => {
                                        const marcado =
                                          todosKits ||
                                          Boolean(u.allowed_kit_ids?.includes(k.id));
                                        return (
                                          <label
                                            key={k.id}
                                            className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={marcado}
                                              onChange={(e) => {
                                                const base = todosKits
                                                  ? kits.map((item) => item.id)
                                                  : [...(u.allowed_kit_ids || [])];
                                                const next = e.target.checked
                                                  ? Array.from(new Set([...base, k.id]))
                                                  : base.filter((item) => item !== k.id);
                                                handleAtualizarUsuario(u.id, {
                                                  allowed_kit_ids:
                                                    next.length === kits.length ? null : next,
                                                });
                                              }}
                                            />
                                            <span className="truncate">{k.name}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      )}
    </main>
  );
}
