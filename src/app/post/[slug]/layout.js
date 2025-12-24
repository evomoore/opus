export async function generateMetadata({ params }) {
  const CACHED_API_BASE_URL = '/api/cached';
  const SITE_URL = 'https://mindsnackbooks.com'; // Update to your production URL
  try {
    const response = await fetch(`${CACHED_API_BASE_URL}/articles/${params.slug}`, {
      next: { revalidate: 86400 }, // 24 hours
    });
    if (!response.ok) {
      return {
        title: 'Mind Snack Books',
      };
    }
    const article = await response.json();
    const categoryName = article.categories?.[0]?.name || article.categories?.[0] || 'Uncategorized';
    const description = article.subtitle || article.content?.replace(/<[^>]+>/g, '').slice(0, 160) || '';
    const image = article.media?.featured_image?.url || 'https://mindsnackbooks.com/default-og-image.jpg';
    const canonical = `${SITE_URL}/post/${article.slug}`;
    return {
      title: `${article.title} - ${categoryName} - Mind Snack Books`,
      description,
      alternates: { canonical },
      openGraph: {
        title: article.title,
        description,
        url: canonical,
        type: 'article',
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ],
        siteName: 'Mind Snack Books',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description,
        images: [image],
        site: '@yourtwitter', // Update to your Twitter handle
      },
    };
  } catch (error) {
    return {
      title: 'Mind Snack Books',
    };
  }
}

export default function ArticleLayout({ children }) {
  return children;
} 