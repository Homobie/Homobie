import React from "react";
import LoanCard from "./LoanCard";
import PaginationControls from "./PaginationControls";

const LoanSelection = ({
  selectedCategory,
  availableLoans,
  selectedLoans,
  onLoanSelect,
  onCompare,
  onBack,
  getCategoryDisplayName,
  loading, // Receive loading state from parent
  page,    // Receive current page
  hasMore, // Receive hasMore flag
  onPageChange // Receive handler
}) => {
  
  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Background blur elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/2 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto pt-20 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-8">
          <div>
            <button
              onClick={onBack}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg mb-4 transition duration-300 backdrop-blur-sm border border-white/10"
            >
              ← Back to Categories
            </button>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {getCategoryDisplayName()}
            </h1>
            <p className="text-white/70 text-lg">
              Choose 2 or more loans to compare
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <button
              onClick={onCompare}
              disabled={selectedLoans.length < 2}
              className={`px-6 py-2 rounded-lg font-semibold transition duration-300 backdrop-blur-sm border border-white/10 ${
                selectedLoans.length >= 2
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                  : "bg-white/10 text-white/50 cursor-not-allowed"
              }`}
            >
              Compare ({selectedLoans.length})
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white/50 animate-pulse">Fetching best rates...</p>
          </div>
        ) : (
          <>
            {/* Grid - REVERTED TO ORIGINAL 2-COLUMN LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  isSelected={!!selectedLoans.find((l) => l.id === loan.id)}
                  onSelect={onLoanSelect}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {availableLoans.length > 0 && (
              <PaginationControls 
                page={page}
                hasMore={hasMore}
                onPageChange={onPageChange}
                loading={loading}
              />
            )}
            
            {/* Empty State fallback */}
            {availableLoans.length === 0 && (
              <div className="text-center py-20 text-white/50">
                No loans found for this category.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoanSelection;