'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Ensure the API URL is properly constructed
const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

export default function Admin() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [originalPublication, setOriginalPublication] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState('');
  const [featuredImage, setFeaturedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Write your article content here...',
      }),
    ],
    content: '',
  });

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const url = `${API_BASE_URL}/articles/${slug}`;
        console.log('Fetching article from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch article: ${response.statusText}`);
        }
        
        const article = await response.json();
        console.log('Article data:', article);
        
        if (!article) {
          throw new Error('No data received from API');
        }
        
        // Set form fields with null checks
        setTitle(article.title ?? '');
        setSubtitle(article.subtitle ?? '');
        setAuthor(article.meta?.author ?? '');
        setPublicationDate(article.meta?.publication_date ?? '');
        setOriginalPublication(article.meta?.original_publication ?? '');
        setTags(Array.isArray(article.tags) ? article.tags.join(', ') : '');
        setCategories(Array.isArray(article.categories) ? article.categories.join(', ') : '');
        setFeaturedImage(article.media?.featured_image?.url ?? null);
        
        // Set editor content
        if (editor && article.content) {
          editor.commands.setContent(article.content);
        }
      } catch (error) {
        console.error('Error fetching article:', error);
        setError(error.message || 'Failed to load article data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [slug, editor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const articleData = {
        article: {
          title,
          subtitle,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          meta: {
            publication_date: publicationDate,
            original_publication: originalPublication,
            author,
            status: 'published'
          },
          content: editor.getHTML(),
          media: {
            featured_image: featuredImage ? {
              url: featuredImage,
              alt: title,
              title: title
            } : null
          },
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          categories: categories.split(',').map(cat => cat.trim()).filter(Boolean)
        }
      };

      const url = `${API_BASE_URL}/articles`;
      console.log('Submitting article to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save article');
      }

      const result = await response.json();
      
      // Clear form
      setTitle('');
      setSubtitle('');
      setAuthor('');
      setPublicationDate('');
      setOriginalPublication('');
      setTags('');
      setCategories('');
      setFeaturedImage(null);
      editor.commands.setContent('');
      
      alert('Article saved successfully!');
    } catch (error) {
      console.error('Error saving article:', error);
      alert(error.message || 'Failed to save article. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <button
            onClick={() => window.location.href = '/admin'}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Create New Article
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {slug ? 'Edit Article' : 'Create New Article'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Publication Date</label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Original Publication</label>
            <input
              type="text"
              value={originalPublication}
              onChange={(e) => setOriginalPublication(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Featured Image URL</label>
            <input
              type="url"
              value={featuredImage || ''}
              onChange={(e) => setFeaturedImage(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        {/* Tags and Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Tag1, Tag2, Tag3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categories (comma-separated)</label>
            <input
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Category1, Category2"
            />
          </div>
        </div>

        {/* Editor Toolbar */}
        <div className="border rounded-t p-2 bg-gray-50">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          >
            Bullet List
          </button>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className="p-2 rounded"
          >
            Add Image
          </button>
        </div>

        {/* Editor Content */}
        <div className="border rounded-b p-4 min-h-[400px]">
          <EditorContent editor={editor} />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Article'}
          </button>
        </div>
      </form>
    </div>
  );
} 