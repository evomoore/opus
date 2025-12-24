import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { clear, clearByPattern, clearArticle, clearAllArticles } from '@/lib/cache';

// Secret token to secure the webhook (set in environment variables)
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';

export async function POST(request) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${REVALIDATE_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, slug, category } = body;

    // Revalidate based on what was updated
    if (type === 'article' && slug) {
      // Clear in-memory cache for the specific article
      clearArticle(slug);
      // Clear all article list caches (home page, category pages, etc.)
      clearAllArticles();
      // Revalidate the specific article page
      revalidatePath(`/post/${slug}`);
      // Revalidate the home page (shows latest articles)
      revalidatePath('/');
      // Revalidate category pages if category is provided
      if (category) {
        revalidatePath(`/category/${category}`);
      }
      // Revalidate all category pages to be safe
      revalidatePath('/category', 'layout');
    } else if (type === 'category') {
      // Clear in-memory cache for categories and articles
      const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';
      clearByPattern(`${EXTERNAL_API_URL}/categories`);
      clearAllArticles();
      // Revalidate category pages
      revalidatePath('/category', 'layout');
      revalidatePath('/');
    } else if (type === 'editor-note') {
      // Clear in-memory cache for editor notes
      const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';
      clearByPattern(`${EXTERNAL_API_URL}/editor-notes`);
      // Revalidate home page where editor note is displayed
      revalidatePath('/');
    } else if (type === 'all') {
      // Clear all in-memory cache
      clear();
      // Revalidate everything
      revalidatePath('/', 'layout');
      revalidatePath('/category', 'layout');
      revalidatePath('/post', 'layout');
    }

    return NextResponse.json({ 
      revalidated: true, 
      message: 'Cache invalidated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error revalidating cache:', error);
    return NextResponse.json(
      { error: 'Error revalidating cache' },
      { status: 500 }
    );
  }
}

