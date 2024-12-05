import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get API key' }, { status: 500 });
  }
} 