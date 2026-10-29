import React from 'react';

const LogoIcon = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path d="M10.75 2.5a1.25 1.25 0 0 1 2.5 0v5.035l3.56-3.56a1.25 1.25 0 1 1 1.768 1.768l-3.56 3.56H20a1.25 1.25 0 0 1 0 2.5h-5.022l3.56 3.56a1.25 1.25 0 1 1-1.768 1.768l-3.56-3.56V21.5a1.25 1.25 0 0 1-2.5 0v-5.022l-3.56 3.56a1.25 1.25 0 0 1-1.768-1.768l3.56-3.56H4a1.25 1.25 0 0 1 0-2.5h5.035l-3.56-3.56a1.25 1.25 0 0 1 1.768-1.768l3.56 3.56V2.5z" />
  </svg>
);

const Loader = ({ fullPage = true, text = 'Loading...' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-dark-700 border-t-primary-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-primary-400">
          <LogoIcon size={22} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        <span>{text}</span>
        <span className="animate-pulse">.</span>
        <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
        <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      {content}
    </div>
  );
};

export default Loader;
