'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

export default function AdminDashboard() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const fileInputRef = useRef();
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('alpha'); // default to alphabetical
  const ARTICLES_PER_PAGE = 20;

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/articles`);
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        // The API returns an array of articles directly
        setArticles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching articles:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (err) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  const handleSelect = (slug) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSelectAll = () => {
    if (selectedSlugs.length === articles.length) {
      setSelectedSlugs([]);
    } else {
      setSelectedSlugs(articles.map((a) => a.slug));
    }
  };

  const handleDeleteSelected = async () => {
    setDeleteError(null);
    if (selectedSlugs.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedSlugs.length} article(s)?`)) return;
    let anyError = false;
    for (const slug of selectedSlugs) {
      try {
        console.log('Attempting to delete article:', slug);
        const res = await fetch(`${API_BASE_URL}/articles/${slug}`, { 
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Delete failed:', errorData);
          anyError = true;
        }
      } catch (err) {
        console.error('Delete error:', err);
        anyError = true;
      }
    }
    setArticles((prev) => prev.filter((a) => !selectedSlugs.includes(a.slug)));
    setSelectedSlugs([]);
    if (anyError) setDeleteError('Some articles could not be deleted.');
  };

  // Restore single delete handler
  const handleDelete = async (slug) => {
    setDeleteError(null);
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      console.log('Attempting to delete article:', slug);
      const res = await fetch(`${API_BASE_URL}/articles/${slug}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Delete failed:', errorData);
        throw new Error(errorData.message || 'Failed to delete article');
      }
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
      setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Delete failed.');
    }
  };

  // Filtered and paginated articles
  const filteredArticles = categoryFilter
    ? articles.filter((a) => {
        if (!a.categories) return false;
        if (Array.isArray(a.categories)) {
          return a.categories.some((cat) => {
            if (typeof cat === 'object') {
              return cat.slug === categoryFilter || cat.name === categoryFilter;
            }
            // cat is a string (slug or name)
            const matchedCat = categories.find(c => c.slug === cat || c.name === cat);
            return cat === categoryFilter || (matchedCat && (matchedCat.slug === categoryFilter || matchedCat.name === categoryFilter));
          });
        }
        return false;
      })
    : articles;

  // Sort articles based on selected sort order
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortOrder === 'alpha') {
      return (a.title || '').localeCompare(b.title || '');
    } else {
      // Sort by publication date, newest first
      const dateA = new Date(a.meta?.publication_date || a.createdAt || 0);
      const dateB = new Date(b.meta?.publication_date || b.createdAt || 0);
      return dateB - dateA;
    }
  });

  const totalPages = Math.ceil(sortedArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = sortedArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  // Reset to page 1 if filter or sort changes
  useEffect(() => { setCurrentPage(1); }, [categoryFilter, sortOrder]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading articles...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Articles</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            aria-label="Import Article JSON"
          >
            Import
          </button>
          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            className="hidden"
            onChange={async (e) => {
              setImportError(null);
              setImportSuccess(null);
              const file = e.target.files[0];
              if (!file) return;
              setImporting(true);
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.article) throw new Error('JSON must have an "article" property');
                // Optionally: validate required fields here
                const res = await fetch(`${API_BASE_URL}/articles`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ article: data.article }),
                });
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData.message || 'Failed to import article');
                }
                setImportSuccess('Article imported successfully!');
                // Optionally refresh articles list
                setArticles((prev) => [data.article, ...prev]);
              } catch (err) {
                setImportError(err.message || 'Import failed.');
              } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
            aria-label="Upload article JSON file"
          />
          <Link
            href="/admin/edit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Create New Article
          </Link>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-4">
        <label className="font-medium">Filter by Category:</label>
        <select
          className="p-2 border rounded min-w-[180px]"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.slug || cat} value={cat.slug || cat.name || cat}>{cat.name || cat}</option>
          ))}
        </select>
        <label className="font-medium ml-4">Sort by:</label>
        <select
          className="p-2 border rounded min-w-[180px]"
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
        >
          <option value="alpha">Alphabetical (A–Z)</option>
          <option value="date">Publication Date (Newest)</option>
        </select>
      </div>
      {selectedSlugs.length > 0 && (
        <button
          type="button"
          className="mb-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          onClick={handleDeleteSelected}
        >
          Delete Selected ({selectedSlugs.length})
        </button>
      )}
      {importing && <div className="text-blue-500 mb-2">Importing article...</div>}
      {importError && <div className="text-red-500 mb-2">{importError}</div>}
      {importSuccess && <div className="text-green-600 mb-2">{importSuccess}</div>}
      {deleteError && <div className="text-red-500 mb-2">{deleteError}</div>}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3">
                <input
                  type="checkbox"
                  checked={selectedSlugs.length === paginatedArticles.length && paginatedArticles.length > 0}
                  onChange={handleSelectAll}
                  aria-label="Select all articles"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedArticles.map((article) => (
              <tr key={article.slug}>
                <td className="px-2 py-4">
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(article.slug)}
                    onChange={() => handleSelect(article.slug)}
                    aria-label={`Select article ${article.title}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                  <div className="text-sm font-medium text-gray-900 truncate" title={article.title}>{article.title}</div>
                  {article.subtitle && (
                    <div className="text-sm text-gray-500 truncate" title={article.subtitle}>{article.subtitle}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                  <div className="text-sm text-gray-700 truncate" title={(() => {
                    if (!Array.isArray(article.categories) || article.categories.length === 0) return '';
                    return article.categories.map(cat => typeof cat === 'object' ? cat.name : (categories.find(c => c.slug === cat || c.name === cat)?.name || cat)).join(', ');
                  })()}>
                    {Array.isArray(article.categories) && article.categories.length > 0
                      ? (typeof article.categories[0] === 'object'
                          ? article.categories[0].name
                          : (categories.find(c => c.slug === article.categories[0] || c.name === article.categories[0])?.name || article.categories[0]))
                      : <span className="text-gray-400 italic">None</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{article.meta?.author}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[220px]">
                  <div className="flex gap-4 items-center">
                    <Link
                      href={`/admin/edit?slug=${article.slug}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/post/${article.slug}`}
                      className="text-green-600 hover:text-green-900"
                      target="_blank"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-900 underline bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => handleDelete(article.slug)}
                      aria-label={`Delete article ${article.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
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
  );
} 