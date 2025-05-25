"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || "https://snackmachine.onrender.com/api";
const ARTICLES_PER_PAGE = 15;

function HeaderNav({ categories, currentCategory }) {
  return (
    <header className="w-full bg-gray-50 border-b mb-0">
      <div className="flex items-center max-w-4xl mx-auto px-6 py-3 gap-6">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Mindsnack Books Home">
          <span className="font-bold text-xl tracking-tight text-gray-800 group-hover:text-blue-600 transition-colors select-none">Mindsnack Books</span>
        </Link>
      </div>
    </header>
  );
}

export default function SnacksPage() {
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState('alpha'); // default to alphabetical

  // Fetch categories for nav
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch all snacks articles (no pagination on API)
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const fetchArticles = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/articles?category=Snacks`
        );
        if (!res.ok) throw new Error("Failed to fetch articles");
        const data = await res.json();
        const allArticles = Array.isArray(data) ? data : [];
        setArticles(allArticles);
        setTotalPages(Math.ceil(allArticles.length / ARTICLES_PER_PAGE));
      } catch (err) {
        setError("Failed to load snacks articles");
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Sort articles before paginating
  const sortedArticles = [...articles].sort((a, b) => {
    if (sortOrder === 'alpha') {
      return a.title.localeCompare(b.title);
    } else {
      // Default: sort by publication date, newest first
      const dateA = new Date(a.meta?.publication_date || a.createdAt || 0);
      const dateB = new Date(b.meta?.publication_date || b.createdAt || 0);
      return dateB - dateA;
    }
  });

  const paginatedArticles = sortedArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  // Compute available first letters from sorted articles
  const alphaLetters = Array.from(new Set(sortedArticles.map(a => a.title[0]?.toUpperCase()).filter(l => l && /[A-Z]/.test(l)))).sort();

  // Handler to jump to the first page with a given letter
  const handleAlphaJump = (letter) => {
    const idx = sortedArticles.findIndex(a => a.title[0]?.toUpperCase() === letter);
    if (idx !== -1) {
      setCurrentPage(Math.floor(idx / ARTICLES_PER_PAGE) + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <HeaderNav categories={categories} currentCategory="snacks" />
      {categories.length > 0 && (
        <nav className="w-full bg-gray-50 border-b mb-2">
          <ul className="flex flex-wrap gap-4 px-6 py-3 max-w-4xl mx-auto">
            {categories.map((cat) => {
              const isActive = "snacks" === cat.slug;
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
            <li className="truncate text-gray-800 font-semibold" aria-current="page">Snacks</li>
          </ol>
        </nav>
        <h1 className="text-3xl font-bold mb-4">Snacks</h1>
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
        {isLoading ? (
          <div className="text-center text-gray-500 py-12">Loading snacks articles...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">{error}</div>
        ) : (
          <>
            {/* Grid of snacks articles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
              {paginatedArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/post/${article.slug}`}
                  className="block border rounded-lg shadow hover:shadow-lg transition overflow-hidden bg-white group"
                >
                  {article.media?.featured_image?.url ? (
                    <img
                      src={article.media.featured_image.url}
                      alt={article.media.featured_image.alt || article.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <img
                      src="https://res.cloudinary.com/phonetag/image/upload/v1748047004/default-images/iuhveytvdb6dytdhztsc.png"
                      alt="Default snacks article cover"
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform opacity-60"
                    />
                  )}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-1 truncate" title={article.title}>{article.title}</h2>
                    {article.subtitle && (
                      <div className="text-gray-500 text-sm mb-2 truncate" title={article.subtitle}>{article.subtitle}</div>
                    )}
                    <div className="text-xs text-gray-400 mb-1">
                      {article.meta?.author && <span>By {article.meta.author}</span>}
                      {article.meta?.publication_date && (
                        <span> &middot; {new Date(article.meta.publication_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Bottom Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mb-10">
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
          </>
        )}
      </main>
    </div>
  );
} 