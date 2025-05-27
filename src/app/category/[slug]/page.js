'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ArticleCard from '@/components/ArticleCard';
import { API_BASE_URL } from '@/lib/constants';

const ARTICLES_PER_PAGE = 15;

function HeaderNav({ categories, currentCategory }) {
  return (
    <header className="w-full bg-gray-50 border-b mb-0">
      <div className="flex items-center max-w-4xl mx-auto px-6 py-6 gap-6">
        <Link href="/" className="flex items-center gap-5 group" aria-label="Mindsnack Books Home">
          <Image
            src="https://res.cloudinary.com/phonetag/image/upload/v1748312015/default-images/image-2025-05-27T00-11-02-599Z_yt3ssv.jpg"
            alt="Mindsnack Books Logo"
            width={90}
            height={90}
            className="rounded-full"
          />
          <span className="font-bold text-3xl tracking-tight text-gray-800 group-hover:text-blue-600 transition-colors select-none">Mindsnack Books</span>
        </Link>
      </div>
    </header>
  );
}

export default function CategoryPage({ params }) {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDefaultImage, setCategoryDefaultImage] = useState(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch category and articles
  useEffect(() => {
    const fetchCategoryAndArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        // First fetch the category to get its name and default image
        const categoryResponse = await fetch(`${API_BASE_URL}/categories/${params.slug}`);
        if (!categoryResponse.ok) {
          console.error('Category fetch failed:', await categoryResponse.text());
          throw new Error('Failed to fetch category');
        }
        const categoryData = await categoryResponse.json();
        console.log('Category data:', categoryData);
        setCategoryName(categoryData.name);
        setCategoryDefaultImage(categoryData.defaultImage?.url);

        // Fetch articles for this category (no pagination on API)
        const articlesResponse = await fetch(
          `${API_BASE_URL}/articles?category=${encodeURIComponent(categoryData.name)}`
        );
        if (!articlesResponse.ok) {
          console.error('Articles fetch failed:', await articlesResponse.text());
          throw new Error('Failed to fetch articles');
        }
        const data = await articlesResponse.json();
        // Filter out draft articles
        const allArticles = Array.isArray(data) ? data.filter(article => article.meta?.status !== 'draft') : [];
        console.log('Fetched articles:', allArticles.length);
        setArticles(allArticles);
        setTotalPages(Math.ceil(allArticles.length / ARTICLES_PER_PAGE));
      } catch (err) {
        console.error('Error in fetchCategoryAndArticles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndArticles();
  }, [params.slug]);

  // Sort articles based on sortOrder
  const sortedArticles = [...articles].sort((a, b) => {
    if (sortOrder === 'date') {
      return new Date(b.meta?.publication_date || 0) - new Date(a.meta?.publication_date || 0);
    } else if (sortOrder === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Get paginated articles
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = sortedArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  // Compute available first letters from sorted articles
  const alphaLetters = Array.from(new Set(sortedArticles.map(a => a.title[0]?.toUpperCase()).filter(l => l && /[A-Z]/.test(l)))).sort();

  // Handler to jump to the first page with a given letter
  const handleAlphaJump = (letter) => {
    const idx = sortedArticles.findIndex(a => a.title[0]?.toUpperCase() === letter);
    if (idx !== -1) {
      setCurrentPage(Math.floor(idx / ARTICLES_PER_PAGE) + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <HeaderNav categories={categories} currentCategory={params.slug} />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Loading articles...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <HeaderNav categories={categories} currentCategory={params.slug} />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Articles</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderNav categories={categories} currentCategory={params.slug} />
      {categories.length > 0 && (
        <nav className="w-full bg-gray-50 border-b mb-2">
          <ul className="flex flex-wrap gap-4 px-6 py-3 max-w-4xl mx-auto">
            {categories.map((cat) => {
              const isActive = params.slug === cat.slug;
              return (
                <li key={cat._id || cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-500 text-white shadow'
                        : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Breadcrumbs */}
        <nav className="mb-2" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center text-sm text-gray-500 gap-1">
            <li>
              <Link href="/" className="hover:underline text-gray-600">Home</Link>
            </li>
            <li className="mx-1">/</li>
            <li className="truncate text-gray-800 font-semibold" aria-current="page">{categoryName}</li>
          </ol>
        </nav>
        <h1 className="text-3xl font-bold mb-4">{categoryName}</h1>
        {/* Sort Dropdown and Top Pagination */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="font-medium">Sort by:</label>
            <select
              className="p-2 border rounded min-w-[180px]"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
            >
              <option value="date">Publication Date (Newest)</option>
              <option value="alpha">Alphabetical (A–Z)</option>
            </select>
          </div>
          {/* Top Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="mx-2">Page {currentPage} of {totalPages}</span>
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
        {/* A-Z Shortcut Bar */}
        {sortOrder === 'alpha' && (
          <div className="flex flex-wrap gap-1 mb-6">
            {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => {
              const enabled = alphaLetters.includes(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  className={`px-2 py-1 rounded text-xs font-mono border ${enabled ? 'bg-gray-100 hover:bg-blue-100 text-gray-800 cursor-pointer' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                  disabled={!enabled}
                  onClick={() => enabled && handleAlphaJump(letter)}
                  aria-label={`Jump to ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-600">No articles found in this category</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedArticles.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                categoryDefaultImage={categoryDefaultImage}
              />
            ))}
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </main>
    </div>
  );
} 