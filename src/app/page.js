"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || "https://snackmachine.onrender.com/api";
const ARTICLES_PER_SECTION = 6;

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

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [sections, setSections] = useState({
    bookReviews: [],
    movieReviews: [],
    humor: [],
    mad: [],
    snacks: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editorNote, setEditorNote] = useState('');

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

  // Fetch editor note
  useEffect(() => {
    const fetchEditorNote = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/editor-notes`);
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

  // Fetch latest articles for each section
  useEffect(() => {
    const fetchSectionArticles = async (category) => {
      try {
        const res = await fetch(`${API_BASE_URL}/articles?category=${encodeURIComponent(category)}&limit=6`);
        if (!res.ok) throw new Error(`Failed to fetch ${category} articles`);
        const data = await res.json();
        const articles = Array.isArray(data) ? data : [];
        // Filter out draft articles and ensure we only get 6 articles
        return articles
          .filter(article => article.meta?.status !== 'draft')
          .slice(0, 6);
      } catch (err) {
        console.error(`Error fetching ${category} articles:`, err);
        return [];
      }
    };

    const fetchAllSections = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [bookReviews, movieReviews, humor, mad, snacks] = await Promise.all([
          fetchSectionArticles('Book Reviews'),
          fetchSectionArticles('Movie Reviews'),
          fetchSectionArticles('Humor'),
          fetchSectionArticles('Mad'),
          fetchSectionArticles('Snacks')
        ]);

        setSections({
          bookReviews,
          movieReviews,
          humor,
          mad,
          snacks
        });
      } catch (err) {
        setError("Failed to load articles");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllSections();
  }, []);

  const renderSection = (title, articles, categorySlug) => {
    // Define default images for each category
    const defaultImages = {
      'book-reviews': 'https://res.cloudinary.com/phonetag/image/upload/v1747073407/default-images/wnnfjreg3mnys258nbdg.png',
      'humor': 'https://res.cloudinary.com/phonetag/image/upload/v1747356428/default-images/i05vwkjzgj8chahtqkz3.png',
      'mad': 'https://res.cloudinary.com/phonetag/image/upload/v1747421822/default-images/u1rcp0ej5urz60ce0qj2.png',
      'snacks': 'https://res.cloudinary.com/phonetag/image/upload/v1748047004/default-images/iuhveytvdb6dytdhztsc.png',
      'movie-reviews': 'https://res.cloudinary.com/phonetag/image/upload/v1748045157/default-images/ujxndspocflqkqlkcx1o.png'
    };

    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <Link 
            href={`/category/${categorySlug}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/post/${article.slug}`}
              className="block border rounded-lg shadow hover:shadow-lg transition overflow-hidden bg-white group"
            >
              {article.media?.featured_image?.url ? (
                <img
                  src={article.media.featured_image.url}
                  alt={article.media.featured_image.alt || article.title}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <img
                  src={defaultImages[categorySlug]}
                  alt="Default article cover"
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform opacity-60"
                />
              )}
              <div className="p-3">
                <h3 className="text-base font-semibold mb-1 truncate" title={article.title}>{article.title}</h3>
                {article.subtitle && (
                  <div className="text-gray-500 text-sm mb-1 truncate" title={article.subtitle}>{article.subtitle}</div>
                )}
                <div className="text-xs text-gray-400">
                  {article.meta?.author && <span>By {article.meta.author}</span>}
                  {article.meta?.publication_date && (
                    <span> &middot; {new Date(article.meta.publication_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <HeaderNav categories={categories} />
      {categories.length > 0 && (
        <nav className="w-full bg-gray-50 border-b mb-2">
          <ul className="flex flex-wrap gap-4 px-6 py-3 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <li key={cat._id || cat.slug}>
                <Link
                  href={`/category/${cat.slug}`}
                  className="px-3 py-1 rounded-full text-sm font-medium transition-colors bg-gray-200 text-gray-700 hover:bg-blue-100"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Note from the Editor */}
        {editorNote && (
          <section className="mb-12 bg-blue-50 rounded-lg p-6 border border-blue-100">
            <h2 className="text-2xl font-bold mb-4">Note from the Editor</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700">{editorNote}</p>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="text-center text-gray-500 py-12">Loading latest articles...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">{error}</div>
        ) : (
          <>
            {renderSection("Latest Book Reviews", sections.bookReviews, "book-reviews")}
            {renderSection("Latest Movie Reviews", sections.movieReviews, "movie-reviews")}
            {renderSection("Latest Humor", sections.humor, "humor")}
            {renderSection("Latest Mad", sections.mad, "mad")}
            {renderSection("Latest Snacks", sections.snacks, "snacks")}
          </>
        )}
      </main>
    </div>
  );
}
