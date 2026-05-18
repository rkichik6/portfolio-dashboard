'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import TickerSearch from '@/components/shared/TickerSearch';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface AddWatchlistModalProps {
  portfolioId: number;
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<{ ticker: string; name: string; target_price_mxn: number }>;
}

export default function AddWatchlistModal({ portfolioId, onClose, onSaved, initial }: AddWatchlistModalProps) {
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
    if (!ticker || !name) { setError('TICKER AND NAME REQUIRED.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolioId, ticker: ticker.toUpperCase(), name, target_price_mxn: targetPrice ? parseFloat(targetPrice) : null, notes: notes || null, tag_ids: selectedTags }),
      });
      if (!res.ok) throw new Error('Failed');
      // Generate description in background — don't await
      fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), name }),
      }).catch(() => {});
      onSaved();
      onClose();
    } catch {
      setError('FAILED TO ADD TO WATCHLIST.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>ADD TO WATCHLIST</h3>
          <button className="btn" style={{ padding: '2px 6px', borderColor: 'var(--border2)' }} onClick={onClose}><X size={12} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--negative)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Ticker</label>
            <TickerSearch
              defaultValue={initial?.ticker}
              placeholder="Search ticker or type symbol..."
              onSelect={(t, n, price) => { setTicker(t); setName(prev => prev || n); if (price) setTargetPrice(price.toFixed(2)); }}
              onChange={setTicker}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Auto-filled on selection" />
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="badge"
                    style={{
                      color: selectedTags.includes(tag.id) ? '#000' : tag.color,
                      borderColor: tag.color,
                      background: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                      cursor: 'pointer',
                      padding: '2px 8px',
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
          <button className="btn" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'ADD TO WATCHLIST'}
          </button>
        </div>
      </div>
    </div>
  );
}
