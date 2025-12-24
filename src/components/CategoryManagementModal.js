'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { API_BASE_URL, CACHED_API_BASE_URL } from '@/lib/constants';

// Use direct API for admin operations (POST, PUT, DELETE)
const DIRECT_API_URL = API_BASE_URL;
// Use cached API for reads
const READ_API_URL = CACHED_API_BASE_URL;

const DEFAULT_IMAGE = 'https://res.cloudinary.com/phonetag/image/upload/v1747421822/default-images/hlu8cde20ntizfjq0tbn.png';

export default function CategoryManagementModal({ isOpen, onClose }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${READ_API_URL}/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  const handleImageUpload = async (categorySlug, file) => {
    setUploadingImage(true);
    setError(null);
    setSuccess(null);

    try {
      // Log all categories for debugging
      console.log('All categories:', categories);

      // Find the category by slug
      const category = categories.find(cat => cat.slug === categorySlug);
      console.log('Looking for category with slug:', categorySlug);
      console.log('Found category:', category);

      if (!category) {
        throw new Error(`Category not found with slug: ${categorySlug}`);
      }

      console.log('Uploading image for category:', {
        slug: categorySlug,
        name: category.name
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = {
        timestamp,
        folder: 'default-images',
      };

      // Get signature from API
      const res = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paramsToSign }),
      });

      if (!res.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature } = await res.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', 'default-images');
      formData.append('upload_preset', '');

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) {
        throw new Error('Upload failed - no secure URL returned');
      }

      console.log('Cloudinary upload successful, updating category with URL:', {
        categorySlug: category.slug,
        imageUrl: uploadData.secure_url
      });

      // Update category with new image URL using PUT request
      const response = await fetch(`${DIRECT_API_URL}/categories/${categorySlug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          defaultImage: {
            url: uploadData.secure_url,
            alt: 'Category default image'
          }
        }),
      });

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('Category update response:', {
        categorySlug: categorySlug,
        response: responseText
      });

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Failed to update category with new image');
        } catch (parseError) {
          throw new Error(`Failed to update category: ${responseText}`);
        }
      }

      // Try to parse the response as JSON if it's not empty
      let responseData;
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.warn('Response was not valid JSON:', responseText);
        }
      }
      
      // Trigger cache revalidation
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'category' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      
      setSuccess('Image uploaded successfully');
      fetchCategories();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (categorySlug) => {
    if (!confirm('Are you sure you want to remove the default image for this category?')) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Find the category to get its slug
      const category = categories.find(cat => cat.slug === categorySlug);
      if (!category) {
        throw new Error('Category not found');
      }

      const response = await fetch(`${DIRECT_API_URL}/categories/${category.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultImage: {
            url: "",
            alt: ""
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to remove image: ${errorText}`);
      }
      
      // Trigger cache revalidation
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'category' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      
      setSuccess('Image removed successfully');
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${DIRECT_API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) throw new Error('Failed to add category');
      
      // Trigger cache revalidation
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'category' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      
      setSuccess('Category added successfully');
      setNewCategory({ name: '', slug: '' });
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${DIRECT_API_URL}/categories/${editingCategory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory),
      });

      if (!response.ok) throw new Error('Failed to update category');
      
      // Trigger cache revalidation
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'category' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      
      setSuccess('Category updated successfully');
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (categorySlug) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Find the category to get its slug
      const category = categories.find(cat => cat.slug === categorySlug);
      if (!category) {
        throw new Error('Category not found');
      }

      const response = await fetch(`${DIRECT_API_URL}/categories/${category.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete category: ${errorText}`);
      }
      
      // Trigger cache revalidation
      try {
        const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'your-secret-token-here';
        await fetch('/api/cache/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revalidateSecret}`,
          },
          body: JSON.stringify({ type: 'category' }),
        });
      } catch (revalidateError) {
        console.error('Error revalidating cache:', revalidateError);
      }
      
      setSuccess('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Manage Categories</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Add New Category Form */}
          <form onSubmit={handleAddCategory} className="mb-8 p-4 bg-gray-50 rounded">
            <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({
                    ...newCategory,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory({
                    ...newCategory,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Category
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Existing Categories</h3>
            {categories.map((category) => (
              <div
                key={category.slug}
                className="p-4 border rounded"
              >
                {editingCategory?._id === category._id ? (
                  <form onSubmit={handleEditCategory} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({
                            ...editingCategory,
                            name: e.target.value
                          })}
                          className="w-full p-2 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Slug</label>
                        <input
                          type="text"
                          value={editingCategory.slug}
                          onChange={(e) => setEditingCategory({
                            ...editingCategory,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                          })}
                          className="w-full p-2 border rounded"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-gray-500">{category.slug}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.slug)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {/* Default Image Section */}
                    <div className="mt-4 border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Default Image</h4>
                        <div className="flex gap-2">
                          <input
                            type="file"
                            id={`file-input-${category.slug}`}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                console.log('File selected for category:', category.slug);
                                handleImageUpload(category.slug, file);
                              }
                            }}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            onClick={() => {
                              console.log('Upload button clicked for category:', category.slug);
                              document.getElementById(`file-input-${category.slug}`).click();
                            }}
                            disabled={uploadingImage}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
                          >
                            {uploadingImage ? 'Uploading...' : 'Upload Image'}
                          </button>
                          {category.defaultImage?.url && (
                            <button
                              onClick={() => handleDeleteImage(category.slug)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="relative h-32 w-full bg-gray-100 rounded overflow-hidden">
                        <Image
                          src={category.defaultImage?.url || DEFAULT_IMAGE}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 