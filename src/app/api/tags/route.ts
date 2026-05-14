import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    return NextResponse.json(tags);
  } catch (err) {
    console.error('[tags GET]', err);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { name, color } = await req.json() as { name: string; color: string };
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color);
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('[tags POST]', err);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { id } = await req.json() as { id: number };
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tags DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
