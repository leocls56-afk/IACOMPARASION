import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'ucb-document-compliance-v1';

const uid = (prefix = 'ID') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : '—';

const seed = {
  documents: [
    {
      id: 'DOC-1', code: 'L23-APS-001', name: 'Approval Sheet L23', type: 'Approval Sheet',
      customer: 'Samsung', project: 'L23', process: 'OQC', revision: '03', status: 'Vigente',
      owner: 'Qualidade', effectiveDate: '2026-07-10', source: 'Cliente', link: '',
      createdAt: '2026-07-10', updatedAt: '2026-07-10'
    },
    {
      id: 'DOC-2', code: 'IT-LAB-014', name: 'IT Drop Test', type: 'Instrução de Trabalho',
      customer: 'Samsung', project: 'L23', process: 'Laboratório', revision: '01', status: 'Revalidar',
      owner: 'Jayme', effectiveDate: '2026-03-15', source: 'Interno', link: '',
      createdAt: '2026-03-15', updatedAt: '2026-07-15'
    },
    {
      id: 'DOC-3', code: 'WI-FA-022', name: 'WI Montagem Final', type: 'Work Instruction',
      customer: 'Samsung', project: 'M3', process: 'Produção', revision: '07', status: 'Vigente',
      owner: 'Engenharia', effectiveDate: '2026-07-01', source: 'Interno', link: '',
      createdAt: '2026-01-12', updatedAt: '2026-07-01'
    }
  ],
  requirements: [
    {
      id: 'REQ-1', referenceDocumentId: 'DOC-1', referenceItem: '5.1',
      description: 'Comprimento da bateria: 98,0 +0/-1,2 mm', classification: 'Dimensional', critical: true,
      internalDocument: 'IT OQC L23', internalRevision: '03', processRevision: '03', result: 'Atende',
      evidence: 'IT OQC, item 6.1 e registro dimensional', validator: 'Qualidade', validationDate: '2026-07-15', notes: ''
    },
    {
      id: 'REQ-2', referenceDocumentId: 'DOC-1', referenceItem: '7.3',
      description: 'Drop Test deve ser executado na condição de 45°', classification: 'Confiabilidade', critical: true,
      internalDocument: 'IT-LAB-014', internalRevision: '01', processRevision: '01', result: 'Não atende',
      evidence: 'Condição divergente identificada durante auditoria', validator: 'Qualidade', validationDate: '2026-07-15', notes: ''
    },
    {
      id: 'REQ-3', referenceDocumentId: 'DOC-1', referenceItem: '8.2',
      description: 'Teste de abrasão: carga de 500 g e 20 ciclos', classification: 'Confiabilidade', critical: false,
      internalDocument: 'IT Abrasão', internalRevision: '02', processRevision: '02', result: 'Atende parcialmente',
      evidence: 'Parâmetro correto, evidência de treinamento pendente', validator: 'Qualidade', validationDate: '2026-07-15', notes: ''
    }
  ],
  versions: [
    { id: 'VER-1', documentId: 'DOC-1', revision: '02', date: '2026-02-10', status: 'Obsoleta', changeSummary: 'Versão anterior', approvedBy: 'Cliente' },
    { id: 'VER-2', documentId: 'DOC-1', revision: '03', date: '2026-07-10', status: 'Vigente', changeSummary: 'Atualização dos requisitos dimensionais', approvedBy: 'Cliente' },
    { id: 'VER-3', documentId: 'DOC-2', revision: '01', date: '2026-03-15', status: 'Revalidar', changeSummary: 'Primeira emissão', approvedBy: 'Qualidade' }
  ],
  actions: [
    {
      id: 'ACT-1', requirementId: 'REQ-2', title: 'Atualizar IT Drop Test',
      description: 'Corrigir a condição de 45° conforme a especificação oficial e treinar executantes.',
      owner: 'Jayme', department: 'Qualidade', priority: 'Alta', dueDate: '2026-07-18', status: 'Em andamento'
    },
    {
      id: 'ACT-2', requirementId: 'REQ-3', title: 'Concluir treinamento',
      description: 'Coletar evidência de treinamento dos executantes.',
      owner: 'Produção', department: 'Produção', priority: 'Média', dueDate: '2026-07-20', status: 'Aberta'
    }
  ]
};

const emptyDocument = {
  code: '', name: '', type: 'Especificação', customer: '', project: '', process: 'Qualidade',
  revision: '00', status: 'Em elaboração', owner: '', effectiveDate: today(), source: 'Interno', link: ''
};

const emptyRequirement = {
  referenceDocumentId: '', referenceItem: '', description: '', classification: 'Documental', critical: false,
  internalDocument: '', internalRevision: '', processRevision: '', result: 'Não validado', evidence: '',
  validator: '', validationDate: today(), notes: ''
};

const emptyAction = {
  requirementId: '', title: '', description: '', owner: '', department: 'Qualidade', priority: 'Média',
  dueDate: today(), status: 'Aberta'
};

const resultClass = (value) => {
  if (value === 'Atende' || value === 'Vigente' || value === 'Concluída') return 'success';
  if (value === 'Não atende' || value === 'Obsoleto' || value === 'Atrasada') return 'danger';
  if (value === 'Atende parcialmente' || value === 'Revalidar' || value === 'Revalidação necessária' || value === 'Em andamento') return 'warning';
  return 'neutral';
};

function App() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : seed;
    } catch {
      return seed;
    }
  });
  const [tab, setTab] = useState('dashboard');
  const [notice, setNotice] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [docStatus, setDocStatus] = useState('Todos');
  const [docForm, setDocForm] = useState(emptyDocument);
  const [editingDocId, setEditingDocId] = useState(null);
  const [reqForm, setReqForm] = useState(emptyRequirement);
  const [editingReqId, setEditingReqId] = useState(null);
  const [actionForm, setActionForm] = useState(emptyAction);
  const [editingActionId, setEditingActionId] = useState(null);
  const [versionForm, setVersionForm] = useState({ documentId: '', revision: '', date: today(), changeSummary: '', approvedBy: '' });
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const documentMap = useMemo(() => Object.fromEntries(data.documents.map(d => [d.id, d])), [data.documents]);

  const metrics = useMemo(() => {
    const validResults = data.requirements.filter(r => !['Não validado', 'Não aplicável'].includes(r.result));
    const compliant = validResults.filter(r => r.result === 'Atende').length;
    const compliance = validResults.length ? Math.round((compliant / validResults.length) * 100) : 0;
    const current = data.documents.filter(d => d.status === 'Vigente').length;
    const revalidate = data.documents.filter(d => ['Revalidar', 'Revalidação necessária'].includes(d.status)).length;
    const overdue = data.actions.filter(a => a.status !== 'Concluída' && a.dueDate && a.dueDate < today()).length;
    return { compliance, compliant, total: validResults.length, current, revalidate, overdue };
  }, [data]);

  const processSummary = useMemo(() => {
    const processes = [...new Set(data.documents.map(d => d.process).filter(Boolean))];
    return processes.map(process => {
      const ids = data.documents.filter(d => d.process === process).map(d => d.id);
      const reqs = data.requirements.filter(r => ids.includes(r.referenceDocumentId));
      const evaluated = reqs.filter(r => !['Não validado', 'Não aplicável'].includes(r.result));
      const value = evaluated.length ? Math.round((evaluated.filter(r => r.result === 'Atende').length / evaluated.length) * 100) : 0;
      return { process, value, total: reqs.length };
    }).sort((a, b) => b.value - a.value);
  }, [data]);

  const filteredDocuments = useMemo(() => {
    const term = docSearch.toLowerCase().trim();
    return data.documents.filter(doc => {
      const matchesText = !term || [doc.code, doc.name, doc.customer, doc.project, doc.process, doc.owner]
        .join(' ').toLowerCase().includes(term);
      const matchesStatus = docStatus === 'Todos' || doc.status === docStatus;
      return matchesText && matchesStatus;
    });
  }, [data.documents, docSearch, docStatus]);

  const notify = (message) => setNotice(message);

  const saveDocument = (event) => {
    event.preventDefault();
    if (!docForm.code.trim() || !docForm.name.trim()) return notify('Informe o código e o nome do documento.');
    if (editingDocId) {
      setData(prev => ({
        ...prev,
        documents: prev.documents.map(d => d.id === editingDocId ? { ...d, ...docForm, updatedAt: today() } : d)
      }));
      notify('Documento atualizado.');
    } else {
      const id = uid('DOC');
      setData(prev => ({
        ...prev,
        documents: [...prev.documents, { ...docForm, id, createdAt: today(), updatedAt: today() }],
        versions: [...prev.versions, {
          id: uid('VER'), documentId: id, revision: docForm.revision, date: docForm.effectiveDate,
          status: docForm.status, changeSummary: 'Cadastro inicial', approvedBy: docForm.owner || 'Não informado'
        }]
      }));
      notify('Documento cadastrado.');
    }
    setDocForm(emptyDocument);
    setEditingDocId(null);
  };

  const editDocument = (doc) => {
    setDocForm({ ...emptyDocument, ...doc });
    setEditingDocId(doc.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteDocument = (id) => {
    if (!window.confirm('Excluir o documento e os requisitos relacionados?')) return;
    const reqIds = data.requirements.filter(r => r.referenceDocumentId === id).map(r => r.id);
    setData(prev => ({
      documents: prev.documents.filter(d => d.id !== id),
      versions: prev.versions.filter(v => v.documentId !== id),
      requirements: prev.requirements.filter(r => r.referenceDocumentId !== id),
      actions: prev.actions.filter(a => !reqIds.includes(a.requirementId))
    }));
    notify('Documento excluído.');
  };

  const saveRequirement = (event) => {
    event.preventDefault();
    if (!reqForm.referenceDocumentId || !reqForm.description.trim()) return notify('Selecione o documento e descreva o requisito.');
    if (editingReqId) {
      setData(prev => ({ ...prev, requirements: prev.requirements.map(r => r.id === editingReqId ? { ...r, ...reqForm } : r) }));
      notify('Validação atualizada.');
    } else {
      setData(prev => ({ ...prev, requirements: [...prev.requirements, { ...reqForm, id: uid('REQ') }] }));
      notify('Requisito cadastrado e validado.');
    }
    setReqForm({ ...emptyRequirement, referenceDocumentId: reqForm.referenceDocumentId });
    setEditingReqId(null);
  };

  const editRequirement = (req) => {
    setReqForm({ ...emptyRequirement, ...req });
    setEditingReqId(req.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRequirement = (id) => {
    if (!window.confirm('Excluir este requisito?')) return;
    setData(prev => ({
      ...prev,
      requirements: prev.requirements.filter(r => r.id !== id),
      actions: prev.actions.filter(a => a.requirementId !== id)
    }));
    notify('Requisito excluído.');
  };

  const extractRequirements = () => {
    if (!reqForm.referenceDocumentId) return notify('Selecione primeiro o documento de referência.');
    const lines = bulkText.split(/\n+/).map(v => v.trim()).filter(v => v.length > 3);
    if (!lines.length) return notify('Cole uma lista de requisitos, um por linha.');
    const newRequirements = lines.map((line, index) => ({
      ...emptyRequirement,
      id: uid(`REQ${index + 1}`),
      referenceDocumentId: reqForm.referenceDocumentId,
      referenceItem: String(index + 1),
      description: line.replace(/^[-•\d.)\s]+/, ''),
      validationDate: today()
    }));
    setData(prev => ({ ...prev, requirements: [...prev.requirements, ...newRequirements] }));
    setBulkText('');
    notify(`${newRequirements.length} requisito(s) criado(s) para validação.`);
  };

  const addVersion = (event) => {
    event.preventDefault();
    if (!versionForm.documentId || !versionForm.revision.trim()) return notify('Selecione o documento e informe a revisão.');
    const newVersion = {
      id: uid('VER'), documentId: versionForm.documentId, revision: versionForm.revision,
      date: versionForm.date, status: 'Vigente', changeSummary: versionForm.changeSummary,
      approvedBy: versionForm.approvedBy
    };
    setData(prev => ({
      ...prev,
      versions: [...prev.versions.map(v => v.documentId === versionForm.documentId ? { ...v, status: 'Obsoleta' } : v), newVersion],
      documents: prev.documents.map(d => d.id === versionForm.documentId ? {
        ...d, revision: versionForm.revision, effectiveDate: versionForm.date,
        status: 'Revalidação necessária', updatedAt: today()
      } : d),
      requirements: prev.requirements.map(r => r.referenceDocumentId === versionForm.documentId ? {
        ...r, result: 'Revalidação necessária', validationDate: ''
      } : r)
    }));
    setVersionForm({ documentId: '', revision: '', date: today(), changeSummary: '', approvedBy: '' });
    notify('Nova versão registrada. Revalidação aberta automaticamente.');
  };

  const saveAction = (event) => {
    event.preventDefault();
    if (!actionForm.title.trim() || !actionForm.owner.trim()) return notify('Informe a ação e o responsável.');
    if (editingActionId) {
      setData(prev => ({ ...prev, actions: prev.actions.map(a => a.id === editingActionId ? { ...a, ...actionForm } : a) }));
      notify('Ação atualizada.');
    } else {
      setData(prev => ({ ...prev, actions: [...prev.actions, { ...actionForm, id: uid('ACT') }] }));
      notify('Ação cadastrada.');
    }
    setActionForm(emptyAction);
    setEditingActionId(null);
  };

  const editAction = (action) => {
    setActionForm({ ...emptyAction, ...action });
    setEditingActionId(action.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAction = (id) => {
    if (!window.confirm('Excluir esta ação?')) return;
    setData(prev => ({ ...prev, actions: prev.actions.filter(a => a.id !== id) }));
    notify('Ação excluída.');
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `backup-conformidade-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.documents || !parsed.requirements || !parsed.actions || !parsed.versions) throw new Error('Formato inválido');
        setData(parsed);
        notify('Backup importado.');
      } catch {
        notify('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportCsv = () => {
    const headers = ['ID', 'Documento', 'Código', 'Item', 'Requisito', 'Classificação', 'Crítico', 'Resultado', 'Evidência', 'Validador', 'Data'];
    const rows = data.requirements.map(r => {
      const doc = documentMap[r.referenceDocumentId] || {};
      return [r.id, doc.name || '', doc.code || '', r.referenceItem, r.description, r.classification, r.critical ? 'Sim' : 'Não', r.result, r.evidence, r.validator, r.validationDate];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `matriz-requisitos-${today()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetDemo = () => {
    if (!window.confirm('Restaurar os dados de demonstração? Os dados atuais serão substituídos.')) return;
    setData(seed);
    notify('Dados de demonstração restaurados.');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CD</div>
          <div><strong>Conformidade</strong><span>Gestão documental</span></div>
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {[
            ['dashboard', '▦', 'Dashboard'],
            ['documents', '▤', 'Documentos'],
            ['validation', '✓', 'Validação'],
            ['versions', '↻', 'Versões'],
            ['actions', '!', 'Ações']
          ].map(([key, icon, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              <span className="nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="ghost-light" onClick={exportBackup}>Exportar backup</button>
          <button className="ghost-light" onClick={() => fileInputRef.current?.click()}>Importar backup</button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={importBackup} />
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema da Qualidade</p>
            <h1>{({ dashboard: 'Visão geral', documents: 'Controle de documentos', validation: 'Validação de requisitos', versions: 'Histórico de versões', actions: 'Plano de ação' })[tab]}</h1>
          </div>
          <div className="top-actions">
            <button className="secondary" onClick={exportCsv}>Exportar matriz CSV</button>
            <button className="primary" onClick={() => setTab('validation')}>+ Nova validação</button>
          </div>
        </header>

        {notice && <div className="toast" role="status">{notice}</div>}

        {tab === 'dashboard' && (
          <section className="page-grid">
            <div className="metrics-grid">
              <Metric label="Conformidade geral" value={`${metrics.compliance}%`} detail={`${metrics.compliant} de ${metrics.total} requisitos`} tone="blue" />
              <Metric label="Documentos vigentes" value={metrics.current} detail={`${data.documents.length} documentos cadastrados`} tone="green" />
              <Metric label="Revalidações" value={metrics.revalidate} detail="Aguardando análise de impacto" tone="yellow" />
              <Metric label="Ações atrasadas" value={metrics.overdue} detail="Necessitam atuação imediata" tone="red" />
            </div>

            <div className="dashboard-columns">
              <section className="panel">
                <div className="panel-header"><div><h2>Atendimento por processo</h2><p>Percentual de requisitos plenamente atendidos</p></div></div>
                <div className="progress-list">
                  {processSummary.length ? processSummary.map(item => (
                    <div className="progress-item" key={item.process}>
                      <div><span>{item.process}</span><strong>{item.value}%</strong></div>
                      <div className="progress-track"><i style={{ width: `${item.value}%` }} /></div>
                      <small>{item.total} requisito(s)</small>
                    </div>
                  )) : <Empty text="Nenhum processo com requisitos cadastrados." />}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header"><div><h2>Pendências críticas</h2><p>Itens que exigem acompanhamento</p></div></div>
                <div className="critical-list">
                  {data.requirements.filter(r => r.critical && r.result !== 'Atende').slice(0, 5).map(req => (
                    <article key={req.id}>
                      <div className="critical-dot" />
                      <div><strong>{req.description}</strong><span>{documentMap[req.referenceDocumentId]?.name || 'Documento não encontrado'}</span></div>
                      <Badge value={req.result} />
                    </article>
                  ))}
                  {!data.requirements.some(r => r.critical && r.result !== 'Atende') && <Empty text="Nenhuma pendência crítica." />}
                </div>
              </section>
            </div>

            <section className="panel full">
              <div className="panel-header"><div><h2>Ações prioritárias</h2><p>Próximos prazos e responsáveis</p></div><button className="link-button" onClick={() => setTab('actions')}>Ver todas</button></div>
              <div className="table-wrap"><table><thead><tr><th>Ação</th><th>Responsável</th><th>Prioridade</th><th>Prazo</th><th>Status</th></tr></thead>
                <tbody>{data.actions.slice(0, 6).map(action => <tr key={action.id}><td><strong>{action.title}</strong><small>{action.description}</small></td><td>{action.owner}</td><td><Badge value={action.priority} /></td><td>{formatDate(action.dueDate)}</td><td><Badge value={action.status} /></td></tr>)}</tbody>
              </table></div>
            </section>
          </section>
        )}

        {tab === 'documents' && (
          <section className="stack">
            <section className="panel">
              <div className="panel-header"><div><h2>{editingDocId ? 'Editar documento' : 'Cadastrar documento'}</h2><p>Registre a fonte oficial, revisão vigente e responsável.</p></div></div>
              <form className="form-grid" onSubmit={saveDocument}>
                <Field label="Código *"><input value={docForm.code} onChange={e => setDocForm({ ...docForm, code: e.target.value })} placeholder="IT-LAB-014" /></Field>
                <Field label="Nome *" wide><input value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} placeholder="Instrução de Drop Test" /></Field>
                <Field label="Tipo"><select value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}><Options values={['Especificação', 'Approval Sheet', 'Desenho', 'Instrução de Trabalho', 'Work Instruction', 'Control Plan', 'PFMEA', 'Procedimento', 'Formulário', 'Norma técnica', 'Critério cosmético']} /></select></Field>
                <Field label="Cliente"><input value={docForm.customer} onChange={e => setDocForm({ ...docForm, customer: e.target.value })} /></Field>
                <Field label="Projeto / Modelo"><input value={docForm.project} onChange={e => setDocForm({ ...docForm, project: e.target.value })} /></Field>
                <Field label="Processo"><select value={docForm.process} onChange={e => setDocForm({ ...docForm, process: e.target.value })}><Options values={['Qualidade', 'OQC', 'Laboratório', 'Engenharia', 'Produção', 'SMT', 'BMS', 'FA', 'EHS', 'Metrologia']} /></select></Field>
                <Field label="Revisão"><input value={docForm.revision} onChange={e => setDocForm({ ...docForm, revision: e.target.value })} /></Field>
                <Field label="Status"><select value={docForm.status} onChange={e => setDocForm({ ...docForm, status: e.target.value })}><Options values={['Em elaboração', 'Em análise', 'Aguardando aprovação', 'Vigente', 'Revalidar', 'Revalidação necessária', 'Obsoleto', 'Cancelado']} /></select></Field>
                <Field label="Responsável"><input value={docForm.owner} onChange={e => setDocForm({ ...docForm, owner: e.target.value })} /></Field>
                <Field label="Data de vigência"><input type="date" value={docForm.effectiveDate} onChange={e => setDocForm({ ...docForm, effectiveDate: e.target.value })} /></Field>
                <Field label="Origem"><select value={docForm.source} onChange={e => setDocForm({ ...docForm, source: e.target.value })}><Options values={['Interno', 'Cliente', 'Fornecedor', 'Norma externa', 'Requisito legal']} /></select></Field>
                <Field label="Link do arquivo" wide><input type="url" value={docForm.link} onChange={e => setDocForm({ ...docForm, link: e.target.value })} placeholder="https://..." /></Field>
                <div className="form-actions wide"><button type="button" className="secondary" onClick={() => { setDocForm(emptyDocument); setEditingDocId(null); }}>Limpar</button><button className="primary" type="submit">{editingDocId ? 'Salvar alterações' : 'Cadastrar documento'}</button></div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header"><div><h2>Lista mestra</h2><p>{filteredDocuments.length} documento(s) encontrados</p></div></div>
              <div className="filters"><input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Pesquisar por código, nome, projeto ou responsável" /><select value={docStatus} onChange={e => setDocStatus(e.target.value)}><Options values={['Todos', 'Vigente', 'Revalidar', 'Revalidação necessária', 'Em elaboração', 'Aguardando aprovação', 'Obsoleto']} /></select></div>
              <div className="table-wrap"><table><thead><tr><th>Documento</th><th>Processo</th><th>Revisão</th><th>Status</th><th>Responsável</th><th>Vigência</th><th>Ações</th></tr></thead>
                <tbody>{filteredDocuments.map(doc => <tr key={doc.id}><td><strong>{doc.name}</strong><small>{doc.code} · {doc.customer || 'Sem cliente'} · {doc.project || 'Sem projeto'}</small></td><td>{doc.process}</td><td>Rev. {doc.revision}</td><td><Badge value={doc.status} /></td><td>{doc.owner || '—'}</td><td>{formatDate(doc.effectiveDate)}</td><td><div className="row-actions"><button onClick={() => editDocument(doc)}>Editar</button>{doc.link && <a href={doc.link} target="_blank" rel="noreferrer">Abrir</a>}<button className="danger-text" onClick={() => deleteDocument(doc.id)}>Excluir</button></div></td></tr>)}</tbody>
              </table></div>
              {!filteredDocuments.length && <Empty text="Nenhum documento corresponde aos filtros." />}
            </section>
          </section>
        )}

        {tab === 'validation' && (
          <section className="stack">
            <section className="panel">
              <div className="panel-header"><div><h2>{editingReqId ? 'Editar validação' : 'Nova validação de requisito'}</h2><p>Compare o documento de referência com o documento disponível no processo.</p></div></div>
              <form className="form-grid" onSubmit={saveRequirement}>
                <Field label="Documento de referência *" wide><select value={reqForm.referenceDocumentId} onChange={e => setReqForm({ ...reqForm, referenceDocumentId: e.target.value })}><option value="">Selecione...</option>{data.documents.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name} — Rev. {d.revision}</option>)}</select></Field>
                <Field label="Item / Página"><input value={reqForm.referenceItem} onChange={e => setReqForm({ ...reqForm, referenceItem: e.target.value })} placeholder="7.3 / pág. 12" /></Field>
                <Field label="Classificação"><select value={reqForm.classification} onChange={e => setReqForm({ ...reqForm, classification: e.target.value })}><Options values={['Documental', 'Dimensional', 'Elétrico', 'Funcional', 'Cosmético', 'Processo', 'Segurança', 'Confiabilidade', 'Rastreabilidade', 'Embalagem', 'Ambiental']} /></select></Field>
                <Field label="Descrição do requisito *" full><textarea rows="3" value={reqForm.description} onChange={e => setReqForm({ ...reqForm, description: e.target.value })} placeholder="Descreva exatamente o requisito da referência." /></Field>
                <Field label="Documento interno"><input value={reqForm.internalDocument} onChange={e => setReqForm({ ...reqForm, internalDocument: e.target.value })} /></Field>
                <Field label="Revisão no sistema"><input value={reqForm.internalRevision} onChange={e => setReqForm({ ...reqForm, internalRevision: e.target.value })} /></Field>
                <Field label="Revisão no processo"><input value={reqForm.processRevision} onChange={e => setReqForm({ ...reqForm, processRevision: e.target.value })} /></Field>
                <Field label="Resultado"><select value={reqForm.result} onChange={e => setReqForm({ ...reqForm, result: e.target.value })}><Options values={['Atende', 'Atende parcialmente', 'Não atende', 'Não aplicável', 'Não validado', 'Revalidação necessária']} /></select></Field>
                <Field label="Validador"><input value={reqForm.validator} onChange={e => setReqForm({ ...reqForm, validator: e.target.value })} /></Field>
                <Field label="Data da validação"><input type="date" value={reqForm.validationDate} onChange={e => setReqForm({ ...reqForm, validationDate: e.target.value })} /></Field>
                <Field label="Requisito crítico"><label className="check-row"><input type="checkbox" checked={reqForm.critical} onChange={e => setReqForm({ ...reqForm, critical: e.target.checked })} />Sim, requisito crítico</label></Field>
                <Field label="Evidência" full><textarea rows="3" value={reqForm.evidence} onChange={e => setReqForm({ ...reqForm, evidence: e.target.value })} placeholder="Item do documento, registro, foto, relatório ou outro dado objetivo." /></Field>
                <Field label="Observações" full><textarea rows="2" value={reqForm.notes} onChange={e => setReqForm({ ...reqForm, notes: e.target.value })} /></Field>
                <div className="form-actions wide"><button type="button" className="secondary" onClick={() => { setReqForm(emptyRequirement); setEditingReqId(null); }}>Limpar</button><button type="submit" className="primary">{editingReqId ? 'Salvar validação' : 'Registrar validação'}</button></div>
              </form>
            </section>

            <section className="panel accent-panel">
              <div className="panel-header"><div><h2>Cadastro rápido de requisitos</h2><p>Cole o conteúdo com um requisito por linha para criar registros pendentes de validação.</p></div></div>
              <textarea rows="6" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={'Exemplo:\nComprimento: 98,0 +0/-1,2 mm\nDrop Test na condição de 45°\nAbrasão com carga de 500 g e 20 ciclos'} />
              <div className="form-actions"><button className="primary" type="button" onClick={extractRequirements}>Extrair linhas como requisitos</button></div>
            </section>

            <section className="panel">
              <div className="panel-header"><div><h2>Matriz de requisitos</h2><p>{data.requirements.length} requisito(s) cadastrado(s)</p></div></div>
              <div className="table-wrap"><table><thead><tr><th>Referência</th><th>Requisito</th><th>Documento interno</th><th>Revisões</th><th>Resultado</th><th>Validador</th><th>Ações</th></tr></thead>
                <tbody>{data.requirements.map(req => { const doc = documentMap[req.referenceDocumentId]; return <tr key={req.id}><td><strong>{doc?.code || '—'}</strong><small>{doc?.name || 'Documento removido'} · item {req.referenceItem || '—'}</small></td><td><strong>{req.description}</strong><small>{req.classification}{req.critical ? ' · Crítico' : ''}</small></td><td>{req.internalDocument || '—'}</td><td><small>Sistema: {req.internalRevision || '—'}<br />Processo: {req.processRevision || '—'}</small></td><td><Badge value={req.result} /></td><td>{req.validator || '—'}<small>{formatDate(req.validationDate)}</small></td><td><div className="row-actions"><button onClick={() => editRequirement(req)}>Editar</button><button className="danger-text" onClick={() => deleteRequirement(req.id)}>Excluir</button></div></td></tr>; })}</tbody>
              </table></div>
            </section>
          </section>
        )}

        {tab === 'versions' && (
          <section className="stack">
            <section className="panel accent-panel">
              <div className="panel-header"><div><h2>Registrar nova revisão</h2><p>A revisão anterior será marcada como obsoleta e os requisitos serão direcionados para revalidação.</p></div></div>
              <form className="form-grid" onSubmit={addVersion}>
                <Field label="Documento *" wide><select value={versionForm.documentId} onChange={e => setVersionForm({ ...versionForm, documentId: e.target.value })}><option value="">Selecione...</option>{data.documents.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name} — Rev. atual {d.revision}</option>)}</select></Field>
                <Field label="Nova revisão *"><input value={versionForm.revision} onChange={e => setVersionForm({ ...versionForm, revision: e.target.value })} /></Field>
                <Field label="Data de vigência"><input type="date" value={versionForm.date} onChange={e => setVersionForm({ ...versionForm, date: e.target.value })} /></Field>
                <Field label="Aprovado por"><input value={versionForm.approvedBy} onChange={e => setVersionForm({ ...versionForm, approvedBy: e.target.value })} /></Field>
                <Field label="Resumo das alterações" full><textarea rows="3" value={versionForm.changeSummary} onChange={e => setVersionForm({ ...versionForm, changeSummary: e.target.value })} /></Field>
                <div className="form-actions wide"><button className="primary" type="submit">Registrar revisão e abrir revalidação</button></div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header"><div><h2>Histórico completo</h2><p>Trilha das revisões cadastradas.</p></div></div>
              <div className="version-timeline">
                {[...data.versions].sort((a, b) => b.date.localeCompare(a.date)).map(version => {
                  const doc = documentMap[version.documentId];
                  return <article key={version.id}><div className="timeline-marker" /><div className="timeline-card"><div className="timeline-head"><div><strong>{doc?.name || 'Documento removido'}</strong><span>{doc?.code || '—'} · Revisão {version.revision}</span></div><Badge value={version.status} /></div><p>{version.changeSummary || 'Sem descrição das alterações.'}</p><small>Vigência: {formatDate(version.date)} · Aprovado por: {version.approvedBy || 'Não informado'}</small></div></article>;
                })}
              </div>
            </section>
          </section>
        )}

        {tab === 'actions' && (
          <section className="stack">
            <section className="panel">
              <div className="panel-header"><div><h2>{editingActionId ? 'Editar ação' : 'Cadastrar ação'}</h2><p>Controle responsáveis, prazos, prioridades e evidências esperadas.</p></div></div>
              <form className="form-grid" onSubmit={saveAction}>
                <Field label="Requisito relacionado" wide><select value={actionForm.requirementId} onChange={e => setActionForm({ ...actionForm, requirementId: e.target.value })}><option value="">Sem vínculo específico</option>{data.requirements.map(r => <option key={r.id} value={r.id}>{r.id} — {r.description.slice(0, 85)}</option>)}</select></Field>
                <Field label="Título da ação *" wide><input value={actionForm.title} onChange={e => setActionForm({ ...actionForm, title: e.target.value })} /></Field>
                <Field label="Descrição" full><textarea rows="3" value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} /></Field>
                <Field label="Responsável *"><input value={actionForm.owner} onChange={e => setActionForm({ ...actionForm, owner: e.target.value })} /></Field>
                <Field label="Departamento"><select value={actionForm.department} onChange={e => setActionForm({ ...actionForm, department: e.target.value })}><Options values={['Qualidade', 'OQC', 'Laboratório', 'Engenharia', 'Produção', 'EHS', 'TI', 'PCP']} /></select></Field>
                <Field label="Prioridade"><select value={actionForm.priority} onChange={e => setActionForm({ ...actionForm, priority: e.target.value })}><Options values={['Baixa', 'Média', 'Alta', 'Imediata']} /></select></Field>
                <Field label="Prazo"><input type="date" value={actionForm.dueDate} onChange={e => setActionForm({ ...actionForm, dueDate: e.target.value })} /></Field>
                <Field label="Status"><select value={actionForm.status} onChange={e => setActionForm({ ...actionForm, status: e.target.value })}><Options values={['Aberta', 'Em andamento', 'Aguardando evidência', 'Concluída', 'Cancelada']} /></select></Field>
                <div className="form-actions wide"><button type="button" className="secondary" onClick={() => { setActionForm(emptyAction); setEditingActionId(null); }}>Limpar</button><button type="submit" className="primary">{editingActionId ? 'Salvar ação' : 'Cadastrar ação'}</button></div>
              </form>
            </section>

            <section className="actions-board">
              {['Aberta', 'Em andamento', 'Aguardando evidência', 'Concluída'].map(status => (
                <div className="board-column" key={status}><div className="board-title"><span>{status}</span><strong>{data.actions.filter(a => a.status === status).length}</strong></div>
                  <div className="board-list">{data.actions.filter(a => a.status === status).map(action => {
                    const overdue = action.status !== 'Concluída' && action.dueDate < today();
                    return <article className="action-card" key={action.id}><div className="card-top"><Badge value={action.priority} />{overdue && <Badge value="Atrasada" />}</div><h3>{action.title}</h3><p>{action.description}</p><div className="action-meta"><span>Responsável: <strong>{action.owner}</strong></span><span>Prazo: <strong>{formatDate(action.dueDate)}</strong></span></div><div className="row-actions"><button onClick={() => editAction(action)}>Editar</button><button className="danger-text" onClick={() => deleteAction(action.id)}>Excluir</button></div></article>;
                  })}{!data.actions.some(a => a.status === status) && <Empty text="Nenhuma ação." compact />}</div>
                </div>
              ))}
            </section>
          </section>
        )}

        <footer className="app-footer">
          <span>Dados salvos localmente neste navegador.</span>
          <button onClick={resetDemo}>Restaurar demonstração</button>
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value, detail, tone }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Badge({ value }) {
  return <span className={`badge ${resultClass(value)}`}>{value}</span>;
}

function Field({ label, children, wide = false, full = false }) {
  return <label className={`field ${wide ? 'wide' : ''} ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;
}

function Options({ values }) {
  return values.map(value => <option value={value} key={value}>{value}</option>);
}

function Empty({ text, compact = false }) {
  return <div className={`empty ${compact ? 'compact' : ''}`}>{text}</div>;
}

export default App;
