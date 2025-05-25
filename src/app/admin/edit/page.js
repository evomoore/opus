'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import '../../post/[slug]/post-content.css';
import { Extension } from '@tiptap/core';
import ListItem from '@tiptap/extension-list-item';
import PasswordProtection from '@/components/PasswordProtection';

// Custom extension to handle broken images
const BrokenImageHandler = Extension.create({
  name: 'brokenImageHandler',
  onCreate() {
    console.log('[BrokenImageHandler] Created and attaching event listeners.');
    // Add event listener to handle broken images in the editor
    this.editor.view.dom.addEventListener('error', (event) => {
      if (event.target.tagName === 'IMG') {
        console.log('[BrokenImageHandler] Image error event triggered for:', event.target);
        event.target.classList.add('broken-image');
        event.target.setAttribute('title', 'Click to replace broken image');
      }
    }, true);

    // Add click handler for broken images
    this.editor.view.dom.addEventListener('click', (event) => {
      console.log('[BrokenImageHandler] Click event on editor DOM:', event.target);
      if (event.target.tagName === 'IMG' && event.target.classList.contains('broken-image')) {
        console.log('[BrokenImageHandler] Broken image clicked:', event.target);
        event.preventDefault();
        event.stopPropagation();
        if (this.options.handleBrokenImage) {
          console.log('[BrokenImageHandler] Calling handleBrokenImage function from options.');
          this.options.handleBrokenImage(event.target);
        } else {
          console.warn('[BrokenImageHandler] handleBrokenImage function not found in options.');
        }
      }
    }, true);
  },
});

// Sanitize function to remove <p> tags directly inside <ul> or <ol>
function sanitizeListParagraphs(html) {
  return html.replace(/<(ul|ol)>([\s\S]*?)<\/\1>/g, (match, tag, inner) => {
    // Remove <p> tags directly inside <ul> or <ol>
    return `<${tag}>${inner.replace(/<p>([\s\S]*?)<\/p>/g, '$1')}</${tag}>`;
  });
}

// Ensure the API URL is properly constructed
const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

function EditArticleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get('slug');
  
  // State declarations
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [publicationStatus, setPublicationStatus] = useState('published');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState('');
  const [showBrokenImageModal, setShowBrokenImageModal] = useState(false);
  const [currentBrokenImage, setCurrentBrokenImage] = useState(null);

  // Refs
  const fileInputRef = useRef();

  // Broken image handlers
  const handleBrokenImage = (imgElement) => {
    console.log('[EditArticleContent] handleBrokenImage called for:', imgElement);
    setCurrentBrokenImage(imgElement);
    setShowBrokenImageModal(true);
  };

  const replaceBrokenImage = (newUrl) => {
    if (currentBrokenImage && editor) {
      const pos = editor.view.posAtDOM(currentBrokenImage, 0);
      editor.chain().focus().setNodeSelection(pos).setImage({ src: newUrl }).run();
      setShowBrokenImageModal(false);
      setCurrentBrokenImage(null);
    }
  };

  // Editor initialization
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
      BrokenImageHandler.configure({
        handleBrokenImage: handleBrokenImage,
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
        // Format the publication date for the input field
        const pubDate = article.meta?.publication_date;
        setPublicationDate(pubDate ? new Date(pubDate).toISOString().split('T')[0] : '');
        setPublicationStatus(article.meta?.status ?? 'published');
        setTags(Array.isArray(article.tags) ? article.tags.join(', ') : '');
        setSelectedCategory(
          Array.isArray(article.categories) && article.categories[0]
            ? article.categories[0].slug || article.categories[0]
            : ''
        );
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

  useEffect(() => {
    // Fetch categories for dropdown
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (err) {
        setCategoriesError('Could not load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Sync editor content to rawHtml when switching to HTML mode
  useEffect(() => {
    if (isHtmlMode && editor) {
      setRawHtml(sanitizeListParagraphs(editor.getHTML()));
    }
    // When switching back to WYSIWYG, update editor content
    if (!isHtmlMode && editor && rawHtml !== editor.getHTML()) {
      editor.commands.setContent(sanitizeListParagraphs(rawHtml));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHtmlMode]);

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
            author,
            status: publicationStatus
          },
          content: sanitizeListParagraphs(editor.getHTML()),
          media: {
            featured_image: featuredImage ? {
              url: featuredImage,
              alt: title,
              title: title
            } : null
          },
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          categories: selectedCategory ? [selectedCategory] : [],
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
        // Log basic error info
        console.error(`Server error. Status: ${response.status} ${response.statusText}`);
        let errorDetail = 'Failed to save article due to a server error.';
        try {
          const errorData = await response.json();
          console.error('Server error response (JSON):', errorData);
          if (errorData && typeof errorData === 'object') {
            errorDetail = errorData.message || errorData.error || errorData.detail || JSON.stringify(errorData);
          } else if (errorData) {
            errorDetail = JSON.stringify(errorData); // Handle cases where errorData is not an object but still JSON (e.g. a string)
          }
        } catch (jsonError) {
          console.warn('Could not parse error response as JSON:', jsonError);
          try {
            const textError = await response.text();
            console.error('Server error response (text):', textError);
            if (textError) {
              errorDetail = textError.length > 300 ? textError.substring(0, 300) + "... (response truncated)" : textError;
            } else {
              errorDetail = 'Server returned an empty non-JSON error response.';
            }
          } catch (textParseError) {
            console.error('Could not parse error response as text:', textParseError);
            errorDetail = `Server returned an unparseable error response (Status: ${response.status}).`;
          }
        }
        // Construct a more informative error message
        const errorMessage = `Error: ${response.status} ${response.statusText}. Details: ${errorDetail}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!slug) {
        // After creating a new article, redirect to edit page with the new slug
        router.push(`/admin/edit?slug=${result.slug}`);
      } else {
        // For existing articles, just show success message
        alert('Article updated successfully!');
      }
    } catch (error) {
      console.error('Error saving article (handleSubmit catch block):', error);
      alert(error.message || 'An unexpected error occurred. Please check console for more details.');
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
      {/* Link back to Admin Dashboard */}
      <div className="mb-6">
        <a
          href="/admin"
          className="text-blue-600 hover:text-blue-800 font-semibold underline"
        >
          ← Back to Admin
        </a>
      </div>
      <h1 className="text-3xl font-bold mb-8">
        {slug ? 'Edit Article' : 'Create New Article'}
      </h1>
      
      <form onSubmit={handleSubmit} id="editArticleForm" className="space-y-6 pb-24">
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
            <label className="block text-sm font-medium mb-1">Publication Status</label>
            <select
              value={publicationStatus}
              onChange={(e) => setPublicationStatus(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Featured Image Field */}
          <div className="md:col-span-2">
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
            <label className="block text-sm font-medium mb-1">Category</label>
            {categoriesLoading ? (
              <div className="text-gray-400 text-sm">Loading categories...</div>
            ) : categoriesError ? (
              <div className="text-red-500 text-sm">{categoriesError}</div>
            ) : (
              <>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id || cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                  <option value="__new__">+ Create new category</option>
                </select>
                {selectedCategory === '__new__' && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      type="text"
                      className="p-2 border rounded flex-1"
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-colors"
                      disabled={creatingCategory || !newCategoryName.trim()}
                      onClick={async () => {
                        setCreatingCategory(true);
                        setCreateCategoryError(null);
                        try {
                          const res = await fetch(`${API_BASE_URL}/categories`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: newCategoryName.trim(),
                              slug: newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
                            }),
                          });
                          if (!res.ok) throw new Error('Failed to create category');
                          const newCat = await res.json();
                          // Add new category to list and select it
                          setCategories(prev => [...prev, newCat]);
                          setSelectedCategory(newCat.slug);
                          setNewCategoryName('');
                        } catch (err) {
                          setCreateCategoryError('Could not create category');
                        } finally {
                          setCreatingCategory(false);
                        }
                      }}
                    >
                      {creatingCategory ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
                {createCategoryError && <div className="text-red-500 text-sm mt-1">{createCategoryError}</div>}
              </>
            )}
          </div>
        </div>

        {/* Editor Toolbar */}
        <div className="border rounded-t p-2 bg-gray-50 flex flex-wrap gap-2 items-center sticky top-0 z-10">
          <button
            type="button"
            onClick={() => setIsHtmlMode((v) => !v)}
            className="p-2 rounded transition-colors focus:ring-2 focus:ring-blue-300 hover:bg-blue-100 font-semibold"
            title={isHtmlMode ? 'Switch to WYSIWYG' : 'Switch to HTML'}
            aria-label={isHtmlMode ? 'Switch to WYSIWYG' : 'Switch to HTML'}
          >
            {isHtmlMode ? 'Switch to Editor' : 'Switch to HTML'}
          </button>
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
        <div className="border rounded-b p-4 min-h-[400px] bg-white relative">
          {isHtmlMode ? (
            <textarea
              className="w-full h-[350px] font-mono text-sm border-none outline-none resize-none bg-white"
              value={rawHtml}
              onChange={e => setRawHtml(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <EditorContent 
              editor={editor} 
              className="prose prose-lg max-w-none [&_.ProseMirror]:prose [&_.ProseMirror]:prose-lg [&_.ProseMirror]:max-w-none" 
            />
          )}
        </div>
      </form>

      {/* Sticky Footer for Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-end">
          <button
            type="submit"
            form="editArticleForm"
            disabled={isSubmitting}
            className={`bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Article'}
          </button>
        </div>
      </div>

      {/* Broken Image Modal */}
      {showBrokenImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Replace Broken Image</h3>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  fileInputRef.current?.click();
                  setShowBrokenImageModal(false);
                }}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Upload New Image
              </button>
              <div className="relative">
                <input
                  type="url"
                  placeholder="Or enter image URL"
                  className="w-full p-2 border rounded"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      replaceBrokenImage(e.target.value);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => replaceBrokenImage(e.target.closest('div').querySelector('input').value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                >
                  Replace
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBrokenImageModal(false);
                  setCurrentBrokenImage(null);
                }}
                className="w-full border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditArticle() {
  return (
    <PasswordProtection>
      <Suspense fallback={<div>Loading...</div>}>
        <EditArticleContent />
      </Suspense>
    </PasswordProtection>
  );
} 