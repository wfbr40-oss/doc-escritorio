'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  Tags,
  Copy,
  Check,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { showToast } from '@/components/ui/ToastViewport';
import {
  DEFAULT_QUALIFICACAO_CONTRATO,
  DEFAULT_QUALIFICACAO_ROTULOS,
  renderQualificacaoTemplate,
} from '@/src/lib/cliente/qualificacao';

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

interface ClauseItem {
  id: string;
  document_id: string;
  name: string;
  key: string;
  created_at: string;
}

interface ParameterItem {
  id: string;
  document_id: string;
  key: string;
  label: string;
  default_value: string;
  created_at: string;
}

interface CustomMarkerItem {
  id: string;
  key: string;
  label: string;
  value: string;
  created_at: string;
}

interface StandardMarkerInfo {
  key: string;
  token: string;
  label: string;
  descricao: string;
  categoria: 'cliente' | 'qualificacao' | 'assinatura';
}

interface QualificacaoConfig {
  contrato: string;
  rotulos: string;
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

type AbaAdmin = 'modelos' | 'kits' | 'usuarios' | 'marcadores';

const MARCADORES_QUALIFICACAO_TOKENS = [
  '{{CLIENTE_NOME}}',
  '{{CLIENTE_NACIONALIDADE}}',
  '{{CLIENTE_ESTADO_CIVIL}}',
  '{{CLIENTE_PROFISSAO}}',
  '{{INSCRITO_FLEX}}',
  '{{CLIENTE_CPF}}',
  '{{DOMICILIADO_FLEX}}',
  '{{CLIENTE_ENDERECO}}',
  '{{CLIENTE_NUMERO}}',
  '{{CLIENTE_BAIRRO}}',
  '{{CLIENTE_CIDADE_UF}}',
  '{{CLIENTE_CEP}}',
  '{{CLIENTE_REFERENCIA}}',
];

export function AdminWorkspace({ adminAtualId }: AdminWorkspaceProps) {
  const [aba, setAba] = useState<AbaAdmin>('modelos');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [kits, setKits] = useState<KitItem[]>([]);
  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [clauses, setClauses] = useState<ClauseItem[]>([]);
  const [parameters, setParameters] = useState<ParameterItem[]>([]);
  const [customMarkers, setCustomMarkers] = useState<CustomMarkerItem[]>([]);
  const [standardMarkers, setStandardMarkers] = useState<StandardMarkerInfo[]>([]);
  const [qualificacaoConfig, setQualificacaoConfig] = useState<QualificacaoConfig>({
    contrato: DEFAULT_QUALIFICACAO_CONTRATO,
    rotulos: DEFAULT_QUALIFICACAO_ROTULOS,
  });
  const [users, setUsers] = useState<UserProfileItem[]>([]);

  // Modal de listagem rápida de marcadores disponíveis
  const [listaMarcadoresAberta, setListaMarcadoresAberta] = useState(false);
  const [buscaMarcadorModal, setBuscaMarcadorModal] = useState('');
  const [tokenCopiado, setTokenCopiado] = useState<string | null>(null);

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
  const [confirmarPurge, setConfirmarPurge] = useState(false);

  // Formulário de Novo Usuário
  const [usuarioFormAberto, setUsuarioFormAberto] = useState(false);
  const [novoUsuarioNome, setNovoUsuarioNome] = useState('');
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [novoUsuarioRole, setNovoUsuarioRole] = useState<'user' | 'admin'>('user');
  const [novoUsuarioAtivo, setNovoUsuarioAtivo] = useState(true);
  const [novoUsuarioKits, setNovoUsuarioKits] = useState<string[] | null>(null);
  const [usuarioEditandoKitsId, setUsuarioEditandoKitsId] = useState<string | null>(null);

  // Estados da aba Marcadores & Qualificação
  const [qualificacaoContratoDraft, setQualificacaoContratoDraft] = useState(
    DEFAULT_QUALIFICACAO_CONTRATO
  );
  const [qualificacaoRotulosDraft, setQualificacaoRotulosDraft] = useState(
    DEFAULT_QUALIFICACAO_ROTULOS
  );
  const [campoQualificacaoAtivo, setCampoQualificacaoAtivo] = useState<'contrato' | 'rotulos'>(
    'contrato'
  );

  const [valorFormAberto, setValorFormAberto] = useState(false);
  const [valorEditandoId, setValorEditandoId] = useState<string | null>(null);
  const [valorKey, setValorKey] = useState('');
  const [valorLabel, setValorLabel] = useState('');
  const [valorDefault, setValorDefault] = useState('');
  const [valorDocumentId, setValorDocumentId] = useState('doc_contrato_honorarios');
  const [confirmarExcluirMarcadorId, setConfirmarExcluirMarcadorId] = useState<string | null>(null);

  const [customFormAberto, setCustomFormAberto] = useState(false);
  const [customEditandoId, setCustomEditandoId] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');

  const aplicarOverviewData = (data: {
    kits?: KitItem[];
    documents?: DocumentModel[];
    clauses?: ClauseItem[];
    parameters?: ParameterItem[];
    customMarkers?: CustomMarkerItem[];
    standardMarkers?: StandardMarkerInfo[];
    qualificacaoConfig?: QualificacaoConfig;
    users?: UserProfileItem[];
  }) => {
    setKits(data.kits || []);
    setDocuments(data.documents || []);
    setClauses(data.clauses || []);
    setParameters(data.parameters || []);
    setCustomMarkers(data.customMarkers || []);
    setStandardMarkers(data.standardMarkers || []);
    if (data.qualificacaoConfig) {
      setQualificacaoConfig(data.qualificacaoConfig);
      setQualificacaoContratoDraft(data.qualificacaoConfig.contrato);
      setQualificacaoRotulosDraft(data.qualificacaoConfig.rotulos);
    }
    setUsers(data.users || []);
  };

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
      aplicarOverviewData(data);
      if (data.kits?.length > 0 && !data.kits.some((k: KitItem) => k.id === modeloKitId)) {
        setModeloKitId(data.kits[0].id);
      }
      if (
        data.documents?.length > 0 &&
        !data.documents.some((d: DocumentModel) => d.id === valorDocumentId)
      ) {
        setValorDocumentId(data.documents[0].id);
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
        aplicarOverviewData(data);
        if (data.kits?.length > 0) {
          setModeloKitId(data.kits[0].id);
        }
        if (data.documents?.length > 0) {
          const contratoDoc = data.documents.find(
            (d: DocumentModel) => d.id === 'doc_contrato_honorarios'
          );
          setValorDocumentId(contratoDoc ? contratoDoc.id : data.documents[0].id);
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

  const handlePurgeCatalog = async () => {
    setSalvando(true);
    try {
      const res = await fetch('/api/admin/purge-catalog', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Erro ao excluir modelos e kits do Supabase.');
        setSalvando(false);
        return;
      }
      setConfirmarPurge(false);
      showToast.success(data.mensagem || 'Modelos e kits excluídos com sucesso.');
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao excluir modelos e kits.');
      setSalvando(false);
    }
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

  // --- Handlers de Marcadores & Qualificação ---
  const copiarToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopiado(token);
      showToast.success(`Marcador ${token} copiado.`);
      window.setTimeout(() => {
        setTokenCopiado((atual) => (atual === token ? null : atual));
      }, 2000);
    } catch {
      showToast.error('Não foi possível copiar o marcador para a área de transferência.');
    }
  };

  const inserirTokenQualificacao = (token: string) => {
    if (campoQualificacaoAtivo === 'rotulos') {
      setQualificacaoRotulosDraft((prev) => (prev ? `${prev} ${token}` : token));
    } else {
      setQualificacaoContratoDraft((prev) => (prev ? `${prev} ${token}` : token));
    }
  };

  const handleSalvarQualificacao = async (reset = false) => {
    setSalvando(true);
    try {
      const res = await fetch('/api/admin/qualification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(
          reset
            ? { reset: true }
            : {
                contrato: qualificacaoContratoDraft.trim(),
                rotulos: qualificacaoRotulosDraft.trim(),
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível salvar o texto de qualificação.');
        setSalvando(false);
        return;
      }
      if (data.qualificacaoConfig) {
        setQualificacaoConfig(data.qualificacaoConfig);
        setQualificacaoContratoDraft(data.qualificacaoConfig.contrato);
        setQualificacaoRotulosDraft(data.qualificacaoConfig.rotulos);
      }
      showToast.success(
        reset
          ? 'Textos de qualificação restaurados para o padrão.'
          : 'Textos de qualificação atualizados com sucesso.'
      );
      setSalvando(false);
    } catch {
      showToast.error('Erro de conexão ao salvar o texto de qualificação.');
      setSalvando(false);
    }
  };

  const abrirNovoValorMarcador = () => {
    const nextNum =
      parameters.filter(
        (p) => p.key.startsWith('minimo_') || p.label.startsWith('Mín. Honorários')
      ).length + 1;
    setValorEditandoId(null);
    setValorKey('');
    setValorLabel(`Mín. Honorários ${nextNum}`);
    setValorDefault('');
    const docDefault =
      documents.find((d) => d.id === 'doc_contrato_honorarios')?.id || documents[0]?.id || '';
    setValorDocumentId(docDefault);
    setValorFormAberto(true);
  };

  const abrirEditarValorMarcador = (param: ParameterItem) => {
    setValorEditandoId(param.id);
    setValorKey(param.key);
    setValorLabel(param.label);
    setValorDefault(param.default_value);
    setValorDocumentId(param.document_id);
    setValorFormAberto(true);
  };

  const handleSalvarValorMarcador = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const url = valorEditandoId ? `/api/admin/markers/${valorEditandoId}` : '/api/admin/markers';
      const method = valorEditandoId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'valor',
          key: valorKey.trim(),
          label: valorLabel.trim(),
          default_value: valorDefault.trim(),
          document_id: valorDocumentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível salvar o marcador de valor.');
        setSalvando(false);
        return;
      }
      setValorFormAberto(false);
      showToast.success(
        valorEditandoId ? 'Marcador de valor atualizado.' : 'Marcador de valor cadastrado.'
      );
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao salvar marcador de valor.');
      setSalvando(false);
    }
  };

  const abrirNovoCustomMarcador = () => {
    setCustomEditandoId(null);
    setCustomKey('');
    setCustomLabel('');
    setCustomValue('');
    setCustomFormAberto(true);
  };

  const abrirEditarCustomMarcador = (m: CustomMarkerItem) => {
    setCustomEditandoId(m.id);
    setCustomKey(m.key);
    setCustomLabel(m.label);
    setCustomValue(m.value);
    setCustomFormAberto(true);
  };

  const handleSalvarCustomMarcador = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const url = customEditandoId ? `/api/admin/markers/${customEditandoId}` : '/api/admin/markers';
      const method = customEditandoId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'custom',
          key: customKey.trim(),
          label: customLabel.trim(),
          value: customValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível salvar o marcador personalizado.');
        setSalvando(false);
        return;
      }
      setCustomFormAberto(false);
      showToast.success(
        customEditandoId
          ? 'Marcador personalizado atualizado.'
          : 'Marcador personalizado cadastrado.'
      );
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao salvar marcador personalizado.');
      setSalvando(false);
    }
  };

  const handleExcluirMarcador = async (id: string) => {
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/markers/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast.error(data.erro || 'Não foi possível excluir o marcador.');
        setSalvando(false);
        return;
      }
      setConfirmarExcluirMarcadorId(null);
      showToast.success('Marcador removido com sucesso.');
      setSalvando(false);
      await carregarOverview();
    } catch {
      showToast.error('Erro de conexão ao excluir o marcador.');
      setSalvando(false);
    }
  };

  const kitsById = useMemo(
    () => new Map(kits.map((k) => [k.id, k])),
    [kits]
  );

  const docsById = useMemo(
    () => new Map(documents.map((d) => [d.id, d])),
    [documents]
  );

  const marcadoresRapidos = useMemo(() => {
    const base = [
      '{{CLIENTE_NOME}}',
      '{{CLIENTE_QUALIFICACAO}}',
      '{{CLIENTE_CPF}}',
      '{{CLIENTE_ENDERECO}}',
      '{{ASSINATURA_LOCAL_DATA}}',
    ];
    const extras = [
      ...parameters.map((p) => `{{VALOR:${p.key}}}`),
      ...customMarkers.map((m) => `{{${m.key}}}`),
    ];
    return Array.from(new Set([...base, ...extras]));
  }, [parameters, customMarkers]);

  const todosMarcadoresListagem = useMemo(() => {
    const lista: Array<{
      token: string;
      label: string;
      descricao: string;
      grupo: string;
    }> = [
      ...standardMarkers.map((m) => ({
        token: m.token,
        label: m.label,
        descricao: m.descricao,
        grupo:
          m.categoria === 'qualificacao'
            ? 'Qualificação Jurídica'
            : m.categoria === 'assinatura'
              ? 'Assinatura & Data'
              : 'Dados do Cliente',
      })),
      ...parameters.map((p) => ({
        token: `{{VALOR:${p.key}}}`,
        label: p.label,
        descricao: `Valor padrão: R$ ${p.default_value || '—'} · Modelo: ${
          docsById.get(p.document_id)?.name || p.document_id
        }`,
        grupo: 'Valores Dinâmicos ({{VALOR:...}})',
      })),
      ...customMarkers.map((m) => ({
        token: `{{${m.key}}}`,
        label: m.label,
        descricao: `Texto fixo: ${m.value || '(vazio)'}`,
        grupo: 'Marcadores Personalizados',
      })),
      ...clauses.map((c) => ({
        token: `{{CLAUSULA:${c.key}}}`,
        label: c.name,
        descricao: `Cláusula dinâmica do modelo ${
          docsById.get(c.document_id)?.name || c.document_id
        }`,
        grupo: 'Cláusulas Dinâmicas',
      })),
    ];

    const termo = buscaMarcadorModal.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter(
      (item) =>
        item.token.toLowerCase().includes(termo) ||
        item.label.toLowerCase().includes(termo) ||
        item.descricao.toLowerCase().includes(termo) ||
        item.grupo.toLowerCase().includes(termo)
    );
  }, [standardMarkers, parameters, customMarkers, clauses, docsById, buscaMarcadorModal]);

  const previewQualificacaoContrato = useMemo(() => {
    try {
      return renderQualificacaoTemplate(qualificacaoContratoDraft, {
        nome: 'Maria Francisca da Silva',
        genero: 'F',
        nacionalidade: 'brasileira',
        estadoCivil: 'solteiro',
        profissao: 'Agricultora',
        cpf: '529.982.247-25',
        endereco: 'Rua das Flores',
        numero: '120',
        bairro: 'Centro',
        cidadeUf: 'Macapá/AP',
        cep: '68900-010',
        referencia: 'Próximo à Praça Central',
      });
    } catch {
      return '';
    }
  }, [qualificacaoContratoDraft]);

  const previewQualificacaoRotulos = useMemo(() => {
    try {
      return renderQualificacaoTemplate(qualificacaoRotulosDraft, {
        nome: 'Maria Francisca da Silva',
        genero: 'F',
        nacionalidade: 'brasileira',
        estadoCivil: 'solteiro',
        profissao: 'Agricultora',
        cpf: '529.982.247-25',
        endereco: 'Rua das Flores',
        numero: '120',
        bairro: 'Centro',
        cidadeUf: 'Macapá/AP',
        cep: '68900-010',
        referencia: 'Próximo à Praça Central',
      });
    } catch {
      return '';
    }
  }, [qualificacaoRotulosDraft]);

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

  const totalMarcadores = standardMarkers.length + parameters.length + customMarkers.length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabeçalho Administrativo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white text-balance">
            Administração do Escritório
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gerencie modelos DOCX, kits de documentos, marcadores, texto da qualificação e acesso dos usuários.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setListaMarcadoresAberta(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors whitespace-nowrap"
          >
            <Tags className="w-3.5 h-3.5 text-amber-400" />
            <span>Marcadores Disponíveis</span>
          </button>

          <button
            type="button"
            onClick={carregarOverview}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Navegação por Abas Internas (sempre todas visíveis e responsivas) */}
      <div className="mt-6">
        <div
          role="tablist"
          aria-label="Seções administrativas"
          className="grid grid-cols-1 sm:grid-cols-2 lg:inline-flex lg:flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl w-full lg:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'modelos'}
            onClick={() => setAba('modelos')}
            className={`inline-flex items-center justify-between lg:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
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
            className={`inline-flex items-center justify-between lg:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
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
            aria-selected={aba === 'marcadores'}
            onClick={() => setAba('marcadores')}
            className={`inline-flex items-center justify-between lg:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              aba === 'marcadores'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Tags className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Marcadores</span>
            </span>
            <span className="text-slate-400 font-mono tabular-nums">{totalMarcadores}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={aba === 'usuarios'}
            onClick={() => setAba('usuarios')}
            className={`inline-flex items-center justify-between lg:justify-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
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
                            {marcadoresRapidos.map((m) => (
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
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmarPurge(true)}
                    className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Todos os Modelos e Kits do Supabase</span>
                  </button>
                  <button
                    type="button"
                    onClick={abrirNovoKit}
                    className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Novo Kit</span>
                  </button>
                </div>
              </div>

              {confirmarPurge && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full space-y-4">
                    <div className="flex items-center gap-3 text-red-400">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        Confirmar Exclusão Total
                      </h2>
                    </div>
                    <p className="text-sm text-slate-300">
                      Tem certeza absoluta que deseja excluir <strong className="text-white">todos os kits, modelos e cláusulas</strong> do Supabase? Esta ação é irreversível.
                    </p>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmarPurge(false)}
                        disabled={salvando}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handlePurgeCatalog}
                        disabled={salvando}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
                      >
                        {salvando ? 'Excluindo...' : 'Sim, Excluir Tudo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

          {/* ABA 4: GERENCIAMENTO DE MARCADORES E QUALIFICAÇÃO */}
          {aba === 'marcadores' && (
            <section className="space-y-8">
              {/* 1. Edição do Texto da Qualificação (Somente Administradores) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <h2 className="text-base font-semibold text-white">
                        Texto da Qualificação Jurídica
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Edição exclusiva para administradores. Personalize o texto inserido pelos marcadores{' '}
                      <code className="font-mono text-amber-300">{'{{CLIENTE_QUALIFICACAO}}'}</code> e{' '}
                      <code className="font-mono text-amber-300">{'{{CLIENTE_QUALIFICACAO_ROTULOS}}'}</code>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => handleSalvarQualificacao(true)}
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-700 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar Padrão</span>
                    </button>
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => handleSalvarQualificacao(false)}
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{salvando ? 'Salvando...' : 'Salvar Qualificação'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 mb-2">
                    Inserir variável no campo selecionado (
                    {campoQualificacaoAtivo === 'contrato'
                      ? '{{CLIENTE_QUALIFICACAO}}'
                      : '{{CLIENTE_QUALIFICACAO_ROTULOS}}'}
                    ):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {MARCADORES_QUALIFICACAO_TOKENS.map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => inserirTokenQualificacao(tok)}
                        className="px-2 py-1 text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded transition-colors"
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="qualificacaoContrato"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Qualificação Completa ({'{{CLIENTE_QUALIFICACAO}}'})
                    </label>
                    <textarea
                      id="qualificacaoContrato"
                      rows={4}
                      value={qualificacaoContratoDraft}
                      onFocus={() => setCampoQualificacaoAtivo('contrato')}
                      onChange={(e) => setQualificacaoContratoDraft(e.target.value)}
                      className="block w-full px-3 py-2 text-xs font-mono leading-relaxed bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="block text-[11px] text-slate-400 mb-1">
                        Prévia automática:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {previewQualificacaoContrato || qualificacaoConfig.contrato}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="qualificacaoRotulos"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Qualificação em Rótulos ({'{{CLIENTE_QUALIFICACAO_ROTULOS}}'})
                    </label>
                    <textarea
                      id="qualificacaoRotulos"
                      rows={4}
                      value={qualificacaoRotulosDraft}
                      onFocus={() => setCampoQualificacaoAtivo('rotulos')}
                      onChange={(e) => setQualificacaoRotulosDraft(e.target.value)}
                      className="block w-full px-3 py-2 text-xs font-mono leading-relaxed bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="block text-[11px] text-slate-400 mb-1">
                        Prévia automática:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {previewQualificacaoRotulos || qualificacaoConfig.rotulos}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Marcadores de Valores ({{VALOR:...}}) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Marcadores de Valores Dinâmicos ({'{{VALOR:...}}'})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controlam os campos numéricos exibidos automaticamente no gerador conforme os marcadores presentes no contrato do kit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={abrirNovoValorMarcador}
                    className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Marcador de Valor</span>
                  </button>
                </div>

                {valorFormAberto && (
                  <form
                    onSubmit={handleSalvarValorMarcador}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-sm font-semibold text-white">
                        {valorEditandoId
                          ? 'Editar Marcador de Valor'
                          : 'Novo Marcador de Valor ({{VALOR:...}})'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setValorFormAberto(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Chave no DOCX *
                        </label>
                        <input
                          type="text"
                          required
                          disabled={Boolean(valorEditandoId)}
                          value={valorKey}
                          onChange={(e) => setValorKey(e.target.value)}
                          placeholder="Ex.: minimo_honorarios_4"
                          className="mt-1.5 block w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Rótulo no Gerador *
                        </label>
                        <input
                          type="text"
                          required
                          value={valorLabel}
                          onChange={(e) => setValorLabel(e.target.value)}
                          placeholder="Ex.: Mín. Honorários 4"
                          className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Valor padrão
                        </label>
                        <input
                          type="text"
                          value={valorDefault}
                          onChange={(e) => setValorDefault(e.target.value)}
                          placeholder="Ex.: 5.000,00"
                          className="mt-1.5 block w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Modelo vinculado
                        </label>
                        <select
                          value={valorDocumentId}
                          onChange={(e) => setValorDocumentId(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {documents.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setValorFormAberto(false)}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={salvando}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50"
                      >
                        {salvando ? 'Salvando...' : 'Salvar Marcador'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                  {parameters.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Nenhum marcador de valor cadastrado.
                    </div>
                  ) : (
                    parameters.map((param) => {
                      const token = `{{VALOR:${param.key}}}`;
                      const confirmando = confirmarExcluirMarcadorId === param.id;
                      return (
                        <div
                          key={param.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="text-xs font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {token}
                              </code>
                              <span className="text-sm font-medium text-white">
                                {param.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 tabular-nums">
                              Valor padrão: R$ {param.default_value || '0,00'} · Modelo:{' '}
                              {docsById.get(param.document_id)?.name || param.document_id}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => copiarToken(token)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800"
                            >
                              {tokenCopiado === token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>Copiar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirEditarValorMarcador(param)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 bg-slate-950 hover:bg-slate-800 border border-slate-800"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            {confirmando ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={salvando}
                                  onClick={() => handleExcluirMarcador(param.id)}
                                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarExcluirMarcadorId(null)}
                                  className="min-h-[36px] px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmarExcluirMarcadorId(param.id)}
                                className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 bg-slate-950 hover:bg-red-950/40 border border-slate-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Marcadores Personalizados ({{CHAVE}}) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Marcadores Personalizados do Escritório
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Crie variáveis próprias (ex.: OAB do escritório, endereço da sede, telefone) para reutilizar em qualquer modelo DOCX.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={abrirNovoCustomMarcador}
                    className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Marcador Personalizado</span>
                  </button>
                </div>

                {customFormAberto && (
                  <form
                    onSubmit={handleSalvarCustomMarcador}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-sm font-semibold text-white">
                        {customEditandoId
                          ? 'Editar Marcador Personalizado'
                          : 'Novo Marcador Personalizado ({{CHAVE}})'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setCustomFormAberto(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Chave do marcador *
                        </label>
                        <input
                          type="text"
                          required
                          disabled={Boolean(customEditandoId)}
                          value={customKey}
                          onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                          placeholder="Ex.: ESCRITORIO_OAB"
                          className="mt-1.5 block w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Nome / Descrição *
                        </label>
                        <input
                          type="text"
                          required
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder="Ex.: Registro OAB da Sociedade"
                          className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300">
                          Valor fixo aplicado no DOCX
                        </label>
                        <input
                          type="text"
                          value={customValue}
                          onChange={(e) => setCustomValue(e.target.value)}
                          placeholder="Ex.: OAB/AP nº 1234"
                          className="mt-1.5 block w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCustomFormAberto(false)}
                        className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={salvando}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50"
                      >
                        {salvando ? 'Salvando...' : 'Salvar Marcador'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                  {customMarkers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Nenhum marcador personalizado cadastrado ainda.
                    </div>
                  ) : (
                    customMarkers.map((m) => {
                      const token = `{{${m.key}}}`;
                      const confirmando = confirmarExcluirMarcadorId === m.id;
                      return (
                        <div
                          key={m.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="text-xs font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {token}
                              </code>
                              <span className="text-sm font-medium text-white">{m.label}</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              Valor: {m.value || '(vazio)'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => copiarToken(token)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800"
                            >
                              {tokenCopiado === token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>Copiar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirEditarCustomMarcador(m)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 bg-slate-950 hover:bg-slate-800 border border-slate-800"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            {confirmando ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={salvando}
                                  onClick={() => handleExcluirMarcador(m.id)}
                                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmarExcluirMarcadorId(null)}
                                  className="min-h-[36px] px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmarExcluirMarcadorId(m.id)}
                                className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 bg-slate-950 hover:bg-red-950/40 border border-slate-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Marcadores Padrão do Sistema & Cláusulas */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Marcadores Padrão do Sistema & Cláusulas
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Referência completa dos marcadores automáticos preenchidos pelos dados do cliente e assinatura.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {standardMarkers.map((m) => (
                    <div
                      key={m.key}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-[11px] font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate">
                            {m.token}
                          </code>
                          <button
                            type="button"
                            onClick={() => copiarToken(m.token)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
                            title="Copiar marcador"
                          >
                            {tokenCopiado === m.token ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs font-medium text-white">{m.label}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{m.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </motion.div>
      )}

      {/* Modal Rápido: Lista de Marcadores Disponíveis */}
      <AnimatePresence>
        {listaMarcadoresAberta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-marcadores-titulo"
              className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800">
                <div>
                  <h2 id="modal-marcadores-titulo" className="text-base font-semibold text-white">
                    Marcadores Disponíveis para Modelos DOCX
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clique em copiar para colar o marcador diretamente na sua moldura Word.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setListaMarcadoresAberta(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaMarcadorModal}
                    onChange={(e) => setBuscaMarcadorModal(e.target.value)}
                    placeholder="Filtrar marcadores por chave, nome ou categoria..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setListaMarcadoresAberta(false);
                    setAba('marcadores');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 whitespace-nowrap"
                >
                  <Tags className="w-3.5 h-3.5" />
                  <span>Gerenciar na Aba Marcadores</span>
                </button>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-800/80 px-5">
                {todosMarcadoresListagem.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    Nenhum marcador encontrado para esta busca.
                  </div>
                ) : (
                  todosMarcadoresListagem.map((item) => (
                    <div
                      key={`${item.grupo}-${item.token}`}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-xs font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {item.token}
                          </code>
                          <span className="text-xs font-medium text-white">{item.label}</span>
                          <span className="text-[11px] text-slate-500">· {item.grupo}</span>
                        </div>
                        <p className="text-xs text-slate-400">{item.descricao}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => copiarToken(item.token)}
                        className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 shrink-0"
                      >
                        {tokenCopiado === item.token ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{tokenCopiado === item.token ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
