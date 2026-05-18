import { NextResponse } from 'next/server';

// Replaced by /api/generate-description + /api/descriptions
export async function GET() {
  return NextResponse.json({ description: null }, { status: 410 });
}
