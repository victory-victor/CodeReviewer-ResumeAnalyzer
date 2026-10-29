import React from 'react';

const GradientText = ({ children, className = '', animate = false }) => {
  return (
    <span
      className={`
        bg-clip-text text-transparent
        bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400
        ${animate ? 'animate-gradient bg-[length:200%_auto]' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default GradientText;
