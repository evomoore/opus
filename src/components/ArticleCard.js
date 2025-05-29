import Link from 'next/link';
import Image from 'next/image';

const DEFAULT_IMAGE = 'https://res.cloudinary.com/phonetag/image/upload/v1747421822/default-images/hlu8cde20ntizfjq0tbn.png';

export default function ArticleCard({ article, categoryDefaultImage, categoryName }) {
  const {
    title,
    subtitle,
    slug,
    meta,
    media,
    categories
  } = article;

  const featuredImage = media?.featured_image?.url || categoryDefaultImage || DEFAULT_IMAGE;
  const publicationDate = meta?.publication_date ? new Date(meta.publication_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  // Use the passed categoryName prop if available, otherwise fallback to categories[0]
  const displayCategory = categoryName || categories?.[0];

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link href={`/post/${slug}`} className="block">
        <div className="relative h-48 w-full">
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-6">
          {displayCategory && (
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mb-2">
              {displayCategory}
            </span>
          )}
          <h2 className="text-xl font-bold mb-2 line-clamp-2">{title}</h2>
          {subtitle && (
            <p className="text-gray-600 mb-4 line-clamp-2">{subtitle}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            {meta?.author && (
              <span className="font-medium">{meta.author}</span>
            )}
            {publicationDate && (
              <time dateTime={meta.publication_date}>{publicationDate}</time>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
} 