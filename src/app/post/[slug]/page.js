'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './post-content.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

export default function PostPage({ params }) {
  const { slug } = params;
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/articles/${slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch article');
        }
        const data = await response.json();
        console.log('Article data:', data);
        setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading article...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Article</h2>
          <p className="text-gray-600">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Article Not Found</h2>
          <p className="text-gray-600">The article you're looking for doesn't exist.</p>
          <Link
            href="/"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Article Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
        {article.subtitle && (
          <h2 className="text-2xl text-gray-600 mb-4">{article.subtitle}</h2>
        )}
        
        {/* Meta Information */}
        <div className="flex items-center text-gray-600 mb-6">
          <span className="mr-4">By {article.meta?.author}</span>
          {article.meta?.publication_date && (
            <span>
              {new Date(article.meta.publication_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Featured Image */}
        {article.media?.featured_image?.url && (
          <div className="mb-8">
            <img
              src={article.media.featured_image.url}
              alt={article.media.featured_image.alt || article.title}
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        )}
      </header>

      {/* Article Content */}
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Tags and Categories */}
      {(article.tags?.length > 0 || article.categories?.length > 0) && (
        <footer className="mt-8 pt-8 border-t">
          {article.tags?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {article.categories?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {article.categories.map((category) => (
                  <span
                    key={category}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </footer>
      )}

      {/* Admin Edit Link */}
      <div className="mt-8 pt-8 border-t">
        <Link
          href={`/admin/edit?slug=${article.slug}`}
          className="text-blue-600 hover:text-blue-800"
        >
          Edit Article
        </Link>
      </div>
    </article>
  );
} 