export async function generateMetadata({ params }) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';
  
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${params.slug}`);
    if (!response.ok) {
      return {
        title: 'Mind Snack Books',
      };
    }
    
    const article = await response.json();
    const categoryName = article.categories?.[0] || 'Uncategorized';
    
    return {
      title: `${article.title} - ${categoryName} - Mind Snack Books`,
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