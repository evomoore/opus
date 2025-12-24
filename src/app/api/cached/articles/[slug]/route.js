import { NextResponse } from 'next/server';
import { getCacheKey, isCacheValid, get, set } from '@/lib/cache';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    const url = `${EXTERNAL_API_URL}/articles/${slug}`;
    
    const cacheKey = getCacheKey(url);
    const cached = get(cacheKey);
    
    // Return cached data if valid
    if (isCacheValid(cached)) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
          'X-Cache': 'HIT',
        },
      });
    }
    
    // Fetch fresh data (without Next.js cache to avoid 2MB limit error)
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Store in our in-memory cache
    try {
      set(cacheKey, data);
    } catch (cacheError) {
      console.warn('Cache storage failed:', cacheError);
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

