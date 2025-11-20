import React from "react";

const PaginationControls = ({ page, hasMore, onPageChange, loading }) => {
  const isFirstPage = page === 0;
  
  const baseButtonClasses = 
    "px-6 py-3 rounded-xl border font-medium transition-all duration-300 flex items-center gap-2 backdrop-blur-md";
  
  const activeClasses = 
    "bg-white/5 border-white/10 text-white hover:border-[#4f46e5] hover:bg-[#4f46e5]/10 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] cursor-pointer";
  
  const disabledClasses = 
    "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-50";

  return (
    <div className="flex items-center justify-center gap-6 mt-10 mb-6">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={isFirstPage || loading}
        className={`${baseButtonClasses} ${isFirstPage || loading ? disabledClasses : activeClasses}`}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Previous</span>
      </button>

      {/* Page Indicator */}
      <div className="flex flex-col items-center">
        <span className="text-gray-400 text-xs uppercase tracking-wider">Current Page</span>
        <span className="text-xl font-bold text-white font-mono">
          {page + 1}
        </span>
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore || loading}
        className={`${baseButtonClasses} ${!hasMore || loading ? disabledClasses : activeClasses}`}
      >
        <span>Next</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default PaginationControls;