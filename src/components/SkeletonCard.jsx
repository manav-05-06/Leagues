import React from 'react';
import './SkeletonCard.css';

export default function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-pulse skeleton-badge"></div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-team">
          <div className="skeleton-pulse skeleton-logo"></div>
          <div className="skeleton-pulse skeleton-text"></div>
        </div>
        <div className="skeleton-score">
          <div className="skeleton-pulse skeleton-score-box"></div>
        </div>
        <div className="skeleton-team">
          <div className="skeleton-pulse skeleton-logo"></div>
          <div className="skeleton-pulse skeleton-text"></div>
        </div>
      </div>
    </div>
  );
}
