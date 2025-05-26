export async function generateMetadata({ params }) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';
  
  try {
    const response = await fetch(`${API_BASE_URL}/categories/${params.slug}`);
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