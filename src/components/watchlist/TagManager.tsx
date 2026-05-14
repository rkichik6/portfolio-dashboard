'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
}

const PRESET_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#f97316', '#ec4899', '#06b6d4'];

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
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
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    setNewName('');
    await load();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    await fetch('/api/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="card">
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Tag Manager</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {tags.map(tag => (
          <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', border: `1px solid ${tag.color}`, background: 'transparent' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color, display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: tag.color }}>{tag.name}</span>
            <button onClick={() => handleDelete(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0 }}>
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 120 }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New tag name"
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              style={{
                width: 18, height: 18,
                background: c,
                border: newColor === c ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}
