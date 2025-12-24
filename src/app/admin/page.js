'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PasswordProtection from '@/components/PasswordProtection';
import CategoryManagementModal from '@/components/CategoryManagementModal';
import { API_BASE_URL, CACHED_API_BASE_URL } from '@/lib/constants';

// Use direct API for admin operations (POST, PUT, DELETE)
const DIRECT_API_URL = API_BASE_URL;
// Use cached API for reads
const READ_API_URL = CACHED_API_BASE_URL;

export default function AdminDashboard() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [editorNote, setEditorNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const [noteSuccess, setNoteSuccess] = useState(null);
  const fileInputRef = useRef();
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('alpha'); // default to alphabetical
  const ARTICLES_PER_PAGE = 20;
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(`${READ_API_URL}/articles`);
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
        const res = await fetch(`${READ_API_URL}/categories`);
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (err) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Fetch editor note on component mount
  useEffect(() => {
    const fetchEditorNote = async () => {
      try {
        const res = await fetch(`${READ_API_URL}/editor-notes`);
        if (!res.ok) throw new Error('Failed to fetch editor note');
        const data = await res.json();
        // The API returns an array of notes, we want the first one
        const note = Array.isArray(data) ? data[0] : data;
        setEditorNote(note?.content || '');
      } catch (err) {
        console.error('Error fetching editor note:', err);
      }
    };
    fetchEditorNote();
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
        const res = await fetch(`${DIRECT_API_URL}/articles/${slug}`, { 
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
        } else {
          // Trigger cache revalidation after successful delete
          try {
            const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
            await fetch('/api/cache/revalidate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${revalidateSecret}`,
              },
              body: JSON.stringify({ type: 'all' }),
            });
          } catch (revalidateError) {
            console.error('Error revalidating cache:', revalidateError);
          }
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
      const res = await fetch(`${DIRECT_API_URL}/articles/${slug}`, { 
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
      // Trigger cache revalidation after successful delete
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'all' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
      setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Delete failed.');
    }
  };

  // Save editor note
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    setNoteError(null);
    setNoteSuccess(null);
    try {
      const res = await fetch(`${DIRECT_API_URL}/editor-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorNote }),
      });
      if (!res.ok) throw new Error('Failed to save editor note');
      // Trigger cache revalidation after saving editor note
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'editor-note' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      setNoteSuccess('Editor note saved successfully!');
    } catch (err) {
      setNoteError(err.message || 'Failed to save editor note');
    } finally {
      setIsSavingNote(false);
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

  const handleFileUpload = async (e) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.article) throw new Error('JSON must have an "article" property');
      
      const res = await fetch(`${DIRECT_API_URL}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: data.article }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to import article');
      }
      
      // Trigger cache revalidation after importing article
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ 
            type: 'article',
            slug: data.article.slug,
            category: data.article.categories?.[0],
          }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      
      setImportSuccess('Article imported successfully!');
      // Refresh articles list
      setArticles((prev) => [data.article, ...prev]);
    } catch (err) {
      setImportError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    <PasswordProtection>
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-4">
          <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Manage Categories
          </button>
          <Link
            href="/admin/edit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create New Article
          </Link>
        </div>
      </div>
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Note from the Editor</h2>
          <div className="mb-4">
            <textarea
              value={editorNote}
              onChange={(e) => setEditorNote(e.target.value)}
              className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the note from the editor..."
            />
          </div>
          <div className="flex justify-between items-center">
            <div>
              {noteError && <p className="text-red-500 text-sm">{noteError}</p>}
              {noteSuccess && <p className="text-green-500 text-sm">{noteSuccess}</p>}
            </div>
            <button
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isSavingNote ? 'Saving...' : 'Save Note'}
            </button>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-4">
        <label className="font-medium">Filter by Category:</label>
        <select
          value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border rounded"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
              <option key={cat._id || cat.slug} value={cat.slug}>
                {cat.name}
              </option>
          ))}
        </select>
          <label className="font-medium">Sort by:</label>
        <select
          value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-2 border rounded"
        >
            <option value="alpha">Alphabetical</option>
            <option value="date">Publication Date</option>
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
        {importError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-600">
            {importSuccess}
          </div>
        )}
        {deleteError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
            {deleteError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left w-8">
                <input
                  type="checkbox"
                    checked={selectedSlugs.length === articles.length}
                  onChange={handleSelectAll}
                    className="mr-2"
                />
              </th>
                <th className="p-2 text-left w-1/4">Title</th>
                <th className="p-2 text-left w-1/5">Category</th>
                <th className="p-2 text-left w-24">Status</th>
                <th className="p-2 text-left w-32">Date</th>
                <th className="p-2 text-left w-48">Actions</th>
            </tr>
          </thead>
            <tbody>
            {paginatedArticles.map((article) => (
                <tr key={article.slug} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(article.slug)}
                    onChange={() => handleSelect(article.slug)}
                  />
                </td>
                  <td className="p-2">
                    <div className="truncate max-w-[300px]" title={article.title}>
                      <Link
                        href={`/admin/edit?slug=${article.slug}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {article.title}
                      </Link>
                  </div>
                </td>
                  <td className="p-2">
                    {Array.isArray(article.categories)
                      ? article.categories
                          .map((cat) => {
                            if (typeof cat === 'object') return cat.name;
                            const foundCat = categories.find(c => c.slug === cat);
                            return foundCat ? foundCat.name : cat;
                          })
                          .join(', ')
                      : article.categories}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      article.meta?.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {article.meta?.status || 'draft'}
                    </span>
                  </td>
                  <td className="p-2">
                    {article.meta?.publication_date
                      ? new Date(article.meta.publication_date).toLocaleDateString()
                      : 'No date'}
                </td>
                  <td className="p-2">
                  <div className="flex gap-4 items-center">
                    <Link
                      href={`/admin/edit?slug=${article.slug}`}
                        className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/post/${article.slug}`}
                        className="text-green-600 hover:text-green-800"
                      target="_blank"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(article.slug)}
                        className="text-red-600 hover:text-red-800"
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

        {/* Category Management Modal */}
        <CategoryManagementModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
        />
    </div>
    </PasswordProtection>
  );
} 