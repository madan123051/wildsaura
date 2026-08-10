import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Category } from '../types';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

const CATEGORY_PLACEHOLDER = '/images/placeholder-card.svg';

interface CategorySectionProps {
  categories: Category[];
  onCategoryClick: (key: string) => void;
  loading?: boolean;
}

const CategoryCard: React.FC<{
  category: Category;
  index: number;
  onClick: () => void;
}> = ({ category, index, onClick }) => {
  const optimizedImage = getOptimizedImageUrl(category.imageUrl, {
    width: 720,
    quality: 76,
    fit: 'cover',
  }) || category.imageUrl || CATEGORY_PLACEHOLDER;
  const optimizedSrcSet = getOptimizedSrcSet(category.imageUrl, [320, 480, 640, 720], {
    quality: 76,
    fit: 'cover',
  });
  const [src, setSrc] = React.useState(optimizedImage);

  React.useEffect(() => setSrc(optimizedImage), [optimizedImage]);

  return (
    <button type="button" className="collection-card" onClick={onClick}>
      <img
        src={src}
        srcSet={src === optimizedImage ? optimizedSrcSet : undefined}
        sizes="(max-width: 640px) 72vw, (max-width: 1100px) 34vw, 24vw"
        alt=""
        width={720}
        height={900}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (src !== category.imageUrl && category.imageUrl) setSrc(category.imageUrl);
          else setSrc(CATEGORY_PLACEHOLDER);
        }}
      />
      <span className="collection-card__wash" />
      <span className="collection-card__number">{String(index + 1).padStart(2, '0')}</span>
      <span className="collection-card__content">
        <span>{category.label}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </span>
    </button>
  );
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  onCategoryClick,
  loading = false,
}) => (
  <section className="collection-rail" aria-labelledby="collections-title">
    <div className="wa-container collection-rail__header">
      <div>
        <p className="section-kicker"><span>00</span> Collections</p>
        <h2 id="collections-title">Follow a trail</h2>
      </div>
      <p>Browse the archive by subject and landscape.</p>
    </div>

    <div className="collection-rail__scroller">
      <div className="collection-rail__track">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div className="collection-card collection-card--loading" key={index}>
                <span className="skeleton-image" />
              </div>
            ))
          : categories.map((category, index) => (
              <CategoryCard
                key={category.key}
                category={category}
                index={index}
                onClick={() => onCategoryClick(category.key)}
              />
            ))}
      </div>
    </div>
  </section>
);
