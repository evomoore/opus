import Image from 'next/image';

export default function Post() {
  // Sample article data - in a real app, this would come from an API or database
  const article = {
    title: "Bad Magazine Review",
    subtitle: "A Forgotten Parody of Mad Magazine",
    meta: {
      publication_date: "2011-05-23",
      original_publication: "Esquire Magazine - August 1964",
      author: "JAM",
      status: "published"
    },
    content: "<p>This is a very short parody of <strong>Mad</strong> magazine that appeared without writing credit in Esquire magazine. The color cover drawing shows the big-footed Bad mascot with a foot in a bucket and a finger in the nose. The cover drawing is signed by \"Hampton.\"</p>",
    media: {
      featured_image: {
        url: "/images/bad-esquire-1964.jpg",
        alt: "Bad Magazine Cover - Esquire 1964",
        title: "Bad Magazine Cover - Esquire 1964"
      }
    },
    tags: ["Mad Magazine", "Esquire", "Parody", "Comics", "1964", "Magazine Review"],
    categories: ["Magazine Reviews", "Comics", "Parody"]
  };

  const { title, subtitle, meta, content, media, tags, categories } = article;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Section */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <h2 className="text-2xl text-gray-600 mb-4">{subtitle}</h2>
        
        {/* Meta Information */}
        <div className="text-sm text-gray-500 space-y-1 mb-6">
          <p>Published: {meta.publication_date}</p>
          <p>Original Publication: {meta.original_publication}</p>
          <p>Author: {meta.author}</p>
        </div>

        {/* Featured Image */}
        {media?.featured_image && (
          <div className="relative w-full h-[400px] mb-8">
            <Image
              src={media.featured_image.url}
              alt={media.featured_image.alt}
              title={media.featured_image.title}
              fill
              className="object-cover rounded-lg"
              priority
            />
          </div>
        )}
      </header>

      {/* Content Section */}
      <div 
        className="prose prose-lg max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Tags and Categories */}
      <footer className="border-t pt-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span 
              key={index}
              className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <span 
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {category}
            </span>
          ))}
        </div>
      </footer>
    </article>
  );
} 