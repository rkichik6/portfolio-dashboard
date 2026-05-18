'use client';
import { useState, useRef, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

export default function PortfolioTabs() {
  const { portfolios, activePortfolioId, setActivePortfolioId, refreshPortfolios } = usePortfolio();

  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState('');

  const [contextMenu, setContextMenu] = useState<{ portfolioId: number; x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) addInputRef.current?.focus(); }, [adding]);
  useEffect(() => { if (renameId !== null) renameInputRef.current?.focus(); }, [renameId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  async function handleAdd() {
    const trimmed = addName.trim();
    setAdding(false);
    setAddName('');
    if (!trimmed) return;
    setAddSaving(true);
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json() as { id?: number };
      if (res.ok && data.id) {
        await refreshPortfolios();
        setActivePortfolioId(data.id);
      }
    } catch { /* silent */ }
    setAddSaving(false);
  }

  async function handleRename() {
    const id = renameId;
    const trimmed = renameName.trim();
    setRenameId(null);
    if (!id || !trimmed) return;
    try {
      await fetch(`/api/portfolios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      await refreshPortfolios();
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/portfolios/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? 'Failed to delete.');
        setDeleting(false);
        return;
      }
      await refreshPortfolios();
      const remaining = portfolios.filter(p => p.id !== deleteTarget.id);
      if (remaining.length > 0) setActivePortfolioId(remaining[0].id);
      setDeleteTarget(null);
    } catch {
      setDeleteError('Network error.');
    }
    setDeleting(false);
  }

  return (
    <>
      <div style={{
        background: '#000000',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        flexShrink: 0,
        height: 33,
      }}>
        {portfolios.map(p => {
          const isActive = p.id === activePortfolioId;
          return (
            <div
              key={p.id}
              style={{
                padding: '0 14px',
                height: 33,
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? 'var(--accent)' : '#888888',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
              onClick={() => { if (renameId !== p.id) setActivePortfolioId(p.id); }}
              onDoubleClick={e => {
                e.preventDefault();
                setRenameId(p.id);
                setRenameName(p.name);
              }}
              onContextMenu={e => {
                e.preventDefault();
                setContextMenu({ portfolioId: p.id, x: e.clientX, y: e.clientY });
              }}
            >
              {renameId === p.id ? (
                <input
                  ref={renameInputRef}
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleRename(); }
                    if (e.key === 'Escape') setRenameId(null);
                    e.stopPropagation();
                  }}
                  onBlur={handleRename}
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    outline: 'none',
                    width: Math.max(80, renameName.length * 8),
                    padding: '0 2px',
                  }}
                />
              ) : (
                p.name
              )}
            </div>
          );
        })}

        {adding ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', height: 33, flexShrink: 0 }}>
            <input
              ref={addInputRef}
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') { setAdding(false); setAddName(''); }
              }}
              onBlur={handleAdd}
              placeholder="PORTFOLIO NAME"
              disabled={addSaving}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #888888',
                color: 'var(--text)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                outline: 'none',
                width: 140,
                padding: '0 2px',
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#888888',
              fontSize: 16,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              padding: '0 10px',
              height: 33,
              lineHeight: '33px',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#888888')}
            title="New portfolio"
          >
            +
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#0d0d0d',
            border: '1px solid #333333',
            zIndex: 1000,
            fontFamily: 'var(--font-mono)',
            minWidth: 160,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div
            style={{
              padding: '8px 14px',
              fontSize: 11,
              color: 'var(--negative)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
            onClick={() => {
              const p = portfolios.find(p => p.id === contextMenu.portfolioId);
              if (p) { setDeleteTarget({ id: p.id, name: p.name }); setDeleteError(''); }
              setContextMenu(null);
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a0000')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Delete Portfolio
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget && !deleting) { setDeleteTarget(null); setDeleteError(''); } }}
        >
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>DELETE PORTFOLIO</h3>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>
                Delete <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{deleteTarget.name}</span>? This will permanently delete all holdings, trades, cash balance, and watchlist items in this portfolio. This cannot be undone.
              </div>
              {deleteError && (
                <div style={{ fontSize: 11, color: 'var(--negative)', textTransform: 'uppercase', marginTop: 8 }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => { setDeleteTarget(null); setDeleteError(''); }} disabled={deleting}>
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--negative)',
                  color: 'var(--negative)',
                  padding: '4px 12px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
