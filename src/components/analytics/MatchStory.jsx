import { Sparkles } from 'lucide-react';

export default function MatchStory({ story = [] }) {
  if (!story || story.length === 0) return null;

  const mainStory = story[0];
  const secondaryStory = story.slice(1);

  return (
    <div className="analytics-card match-story-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">
          <Sparkles size={14} color="var(--accent-primary, #00ff87)" />
          Match story
        </h3>
      </div>
      <p className="match-story-text">{mainStory}</p>
      {secondaryStory.map((sentence, idx) => (
        <p key={idx} className="match-story-pivotal">
          {sentence}
        </p>
      ))}
    </div>
  );
}
