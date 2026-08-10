import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Story } from '../types';
import { getOptimizedImageUrl, getOptimizedSrcSet } from '../utils/imageUrl';

const STORY_PLACEHOLDER = '/images/placeholder-card.svg';
const INITIAL_COUNT = 3;

const estimateReadTime = (content: string) => Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));

const formatStoryDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

interface StoriesSectionProps {
  stories: Story[];
  isLoading?: boolean;
  onStoryClick: (story: Story) => void;
  onViewAll?: () => void;
}

const StoryCard: React.FC<{
  story: Story;
  featured?: boolean;
  onOpen: () => void;
}> = ({ story, featured = false, onOpen }) => {
  const image = getOptimizedImageUrl(story.coverImageUrl, {
    width: featured ? 1200 : 800,
    quality: 78,
    fit: 'cover',
  }) || story.coverImageUrl || STORY_PLACEHOLDER;
  const srcSet = getOptimizedSrcSet(story.coverImageUrl, [480, 640, 800, 1000, 1200], {
    quality: 78,
    fit: 'cover',
  });
  const href = `/story/${encodeURIComponent(story.slug || story.firestoreId || String(story.id))}`;

  return (
    <article className={`journal-story-card ${featured ? 'journal-story-card--featured' : ''}`}>
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault();
          onOpen();
        }}
      >
        <div className="journal-story-card__media">
          <img
            src={image}
            srcSet={srcSet}
            sizes={featured ? '(max-width: 900px) 100vw, 62vw' : '(max-width: 900px) 100vw, 32vw'}
            alt={story.title}
            width={featured ? 1200 : 800}
            height={featured ? 760 : 620}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.srcset = '';
              event.currentTarget.onerror = null;
              event.currentTarget.src = STORY_PLACEHOLDER;
            }}
          />
          <span className="journal-story-card__wash" />
          {story.tags[0] && <span className="journal-story-card__tag">{story.tags[0]}</span>}
        </div>

        <div className="journal-story-card__body">
          <p className="journal-story-card__meta">
            {formatStoryDate(story.createdAt)}
            <span aria-hidden="true">/</span>
            <span><Clock size={12} aria-hidden="true" /> {estimateReadTime(story.content)} min read</span>
          </p>
          <h3>{story.title}</h3>
          <p className="journal-story-card__excerpt">{story.excerpt}</p>
          <span className="journal-story-card__read">
            Read field note <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
      </a>
    </article>
  );
};

export const StoriesSection: React.FC<StoriesSectionProps> = ({
  stories,
  isLoading = false,
  onStoryClick,
  onViewAll,
}) => {
  const visibleStories = stories.slice(0, INITIAL_COUNT);

  return (
    <section id="stories" className="journal-stories" aria-labelledby="stories-title">
      <div className="wa-container">
        <div className="journal-stories__header">
          <div>
            <p className="section-kicker"><span>02</span> Field notes</p>
            <h2 id="stories-title">Behind every frame,<br /><em>a story.</em></h2>
          </div>
          <div>
            <p>Long waits, changing weather, and the small decisions that happen before a photograph is made.</p>
            {onViewAll && (
              <button type="button" className="text-arrow-link" onClick={onViewAll}>
                Read all stories <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {isLoading && stories.length === 0 ? (
          <div className="journal-stories__grid" aria-label="Loading stories">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className={`journal-story-skeleton ${index === 0 ? 'journal-story-skeleton--featured' : ''}`} key={index}>
                <div className="skeleton-image" />
                <div className="skeleton-text medium" />
                <div className="skeleton-text full" />
              </div>
            ))}
          </div>
        ) : visibleStories.length > 0 ? (
          <div className="journal-stories__grid">
            {visibleStories.map((story, index) => (
              <StoryCard
                key={story.firestoreId || story.id}
                story={story}
                featured={index === 0}
                onOpen={() => onStoryClick(story)}
              />
            ))}
          </div>
        ) : (
          <p className="journal-stories__empty">New field notes are being prepared.</p>
        )}
      </div>
    </section>
  );
};
