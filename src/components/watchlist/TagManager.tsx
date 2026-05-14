'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
}

const PRESET_COLORS = ['#ff8c00', '#00c853', '#ff1744', '#888888', '#a78bfa', '#f97316', '#06b6d4', '#555555'];

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#ff8c00');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/tags');
    const data = await res.json() as Tag[];
    setTags(data);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), color: newColor }) });
    setNewName('');
    await load();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await fetch('/api/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="section-header">TAG MANAGER</div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', border: `1px solid ${tag.color}` }}>
              <span style={{ width: 6, height: 6, background: tag.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: tag.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tag.name}</span>
              <button onClick={() => handleDelete(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0, marginLeft: 2 }}>
                <Trash2 size={9} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 100 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Tag name"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <div style={{ display: 'flex', gap: 3 }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 16, height: 16,
                  background: c,
                  border: newColor === c ? '2px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ padding: '4px 8px' }}>
            <Plus size={9} /> ADD
          </button>
        </div>
      </div>
    </div>
  );
}
