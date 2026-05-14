'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface AddWatchlistModalProps {
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<{ ticker: string; name: string; target_price_mxn: number }>;
}

export default function AddWatchlistModal({ onClose, onSaved, initial }: AddWatchlistModalProps) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [targetPrice, setTargetPrice] = useState(initial?.target_price_mxn?.toString() ?? '');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then((data: Tag[]) => setTags(data)).catch(() => {});
  }, []);

  function toggleTag(id: number) {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!ticker || !name) { setError('Ticker and name are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          name,
          target_price_mxn: targetPrice ? parseFloat(targetPrice) : null,
          notes: notes || null,
          tag_ids: selectedTags,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
      onClose();
    } catch {
      setError('Failed to add to watchlist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="mono" style={{ fontSize: '0.85rem' }}>Add to Watchlist</h3>
          <button className="btn" style={{ padding: '0.2rem 0.4rem' }} onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label className="form-label">Ticker</label>
              <input className="form-input" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="TSM" />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="TSMC" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Target Price MXN (optional)</label>
            <input className="form-input" type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="7021" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why watching this?" />
          </div>
          {tags.length > 0 && (
            <div className="form-group">
              <label className="form-label">Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="badge"
                    style={{
                      color: selectedTags.includes(tag.id) ? 'var(--bg)' : tag.color,
                      borderColor: tag.color,
                      background: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  );
}
