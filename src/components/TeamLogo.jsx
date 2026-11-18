import { useState } from 'react';

export default function TeamLogo({ logo, src, name = 'Team', size, className = '', style = {} }) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = logo || src;

  // Handle fallback if no URL or failed to load
  if (!logoUrl || hasError) {
    return (
      <span 
        role="img" 
        aria-label={`${name} crest`}
        className={`team-logo-fallback ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size ? `${size * 0.75}px` : undefined,
          ...style,
        }}
      >
        ⚽
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${name} crest`}
      className={`team-logo-img ${className}`}
      onError={() => setHasError(true)}
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}
