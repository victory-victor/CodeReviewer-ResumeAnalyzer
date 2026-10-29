import React from 'react';

const variantStyles = {
  default: 'bg-dark-800 border border-dark-700',
  'gradient-border': 'bg-dark-800 gradient-border',
  glass: 'glass',
};

const Card = ({
  children,
  className = '',
  variant = 'default',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl p-6 transition-all duration-300
        ${variantStyles[variant]}
        ${hoverable ? 'cursor-pointer hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-1' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
