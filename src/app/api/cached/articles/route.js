import { NextResponse } from 'next/server';
import { getCacheKey, isCacheValid, get, set } from '@/lib/cache';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let url = `${EXTERNAL_API_URL}/articles`;
    if (category) {
      url = `${EXTERNAL_API_URL}/articles?category=${encodeURIComponent(category)}`;
    }

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
      cache: 'no-store', // Don't use Next.js cache for large responses
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Store in our in-memory cache
    try {
      set(cacheKey, data);
    } catch (cacheError) {
      // If cache fails, just continue without caching
      console.warn('Cache storage failed:', cacheError);
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

