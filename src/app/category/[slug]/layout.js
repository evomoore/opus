export async function generateMetadata({ params }) {
  const CACHED_API_BASE_URL = '/api/cached';
  
  try {
    // Fetch category by slug - the cached route handles slug as a query parameter
    const response = await fetch(`${CACHED_API_BASE_URL}/categories?slug=${params.slug}`, {
      next: { revalidate: 86400 }, // 24 hours
    });
    if (!response.ok) {
      return {
        title: 'Mind Snack Books',
      };
    }
    
    const category = await response.json();
    return {
      title: `Mind Snack Books - ${category.name}`,
    };
  } catch (error) {
    return {
      title: 'Mind Snack Books',
    };
  }
}

export default function CategoryLayout({ children }) {
  return children;
} 