'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// Ensure the API URL is properly constructed
const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

function EditArticleContent() {
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

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
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
    ],
    content: '',
  });

  // Ref for file input
  const fileInputRef = useRef();

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
        // Format the publication date for the input field
        const pubDate = article.meta?.publication_date;
        setPublicationDate(pubDate ? new Date(pubDate).toISOString().split('T')[0] : '');
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

      const url = `${API_BASE_URL}/articles${slug ? `/${slug}` : ''}`;
      console.log('Submitting article to:', url);
      
      const response = await fetch(url, {
        method: slug ? 'PUT' : 'POST',
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
      
      // Only clear form if it's a new article
      if (!slug) {
        setTitle('');
        setSubtitle('');
        setAuthor('');
        setPublicationDate('');
        setOriginalPublication('');
        setTags('');
        setCategories('');
        setFeaturedImage(null);
        editor.commands.setContent('');
      }
      
      alert(`Article ${slug ? 'updated' : 'saved'} successfully!`);
    } catch (error) {
      console.error('Error saving article:', error);
      alert(error.message || 'Failed to save article. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cloudinary featured image upload handler
  const handleCloudinaryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = {
        timestamp,
        folder: 'featured-images',
      };
      const res = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paramsToSign }),
      });
      const { signature } = await res.json();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', 'featured-images');
      formData.append('upload_preset', '');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) {
        setFeaturedImage(uploadData.secure_url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      setUploadError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Cloudinary inline image upload handler
  const handleInlineImageUpload = async (file) => {
    setUploading(true);
    setUploadError(null);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = {
        timestamp,
        folder: 'inline-images',
      };
      const res = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paramsToSign }),
      });
      const { signature } = await res.json();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', 'inline-images');
      formData.append('upload_preset', '');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.secure_url) {
        editor.chain().focus().setImage({ src: uploadData.secure_url }).run();
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      setUploadError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
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
            onClick={() => window.location.href = '/admin/edit'}
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
            <label className="block text-sm font-medium mb-1">Featured Image</label>
            {/* Upload Button or Preview */}
            {uploading ? (
              <div className="flex items-center space-x-2 mb-2">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></span>
                <span className="text-blue-500 text-sm">Uploading image...</span>
              </div>
            ) : featuredImage ? (
              <div className="mb-2 relative group w-full max-w-xs">
                <img
                  src={featuredImage}
                  alt="Featured Preview"
                  className="w-full rounded shadow"
                />
                <button
                  type="button"
                  onClick={() => setFeaturedImage(null)}
                  className="absolute top-2 right-2 bg-white bg-opacity-80 hover:bg-red-500 hover:text-white text-red-600 rounded-full p-1 shadow transition-colors"
                  title="Remove image"
                  aria-label="Remove featured image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="mb-2 flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('featured-image-upload').click()}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors shadow"
                >
                  Upload Featured Image
                </button>
                <span className="text-gray-400 text-xs">No image uploaded</span>
              </div>
            )}
            <input
              id="featured-image-upload"
              type="file"
              accept="image/*"
              onChange={handleCloudinaryUpload}
              className="hidden"
              aria-label="Upload featured image"
            />
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="text-blue-500 text-xs underline mt-1 mb-2 hover:text-blue-700"
            >
              {showUrlInput ? 'Hide URL input' : 'Enter URL manually'}
            </button>
            {showUrlInput && (
              <input
                type="url"
                value={featuredImage || ''}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className="w-full p-2 border rounded mb-2"
                placeholder="https://example.com/image.jpg"
              />
            )}
            {uploadError && <div className="text-red-500 text-sm mb-2">{uploadError}</div>}
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
        <div className="border rounded-t p-2 bg-gray-50 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Bold"
            aria-label="Bold"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Italic"
            aria-label="Italic"
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Bullet List"
            aria-label="Bullet List"
          >
            Bullet List
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = '';
              fileInputRef.current?.click();
            }}
            className="p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100"
            title="Add Image"
            aria-label="Add Image"
          >
            Add Image
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                await handleInlineImageUpload(file);
              } else {
                // fallback: prompt for URL
                const url = window.prompt('Enter image URL:');
                if (url) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }
            }}
            aria-label="Upload inline image"
          />
          {/* Alignment Buttons */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 ${editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
            title="Align Left"
            aria-label="Align Left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h10M4 14h16M4 18h10" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 ${editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
            title="Align Center"
            aria-label="Align Center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M4 10h16M8 14h8M4 18h16" /></svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 ${editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
            title="Align Right"
            aria-label="Align Right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 10h10M4 14h16M10 18h10" /></svg>
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

export default function EditArticle() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditArticleContent />
    </Suspense>
  );
} 