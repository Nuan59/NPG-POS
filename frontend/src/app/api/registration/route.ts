import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/util/AuthOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.accessToken) {
      console.log('❌ No session or token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const url = `${apiBase}/order/registration_expiring/`;
    
    console.log('🔗 Fetching:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.accessToken}`,
      },
      cache: 'no-store',
    });

    console.log('📥 Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      return NextResponse.json({ error: 'Backend error', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Success:', Array.isArray(data) ? `${data.length} items` : 'OK');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Exception:', error);
    return NextResponse.json({ error: 'Server error', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}