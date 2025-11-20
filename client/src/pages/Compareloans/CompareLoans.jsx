import React, { useState, useEffect } from "react";
import CategorySelection from "./CategorySelection";
import LoanSelection from "./LoanSelection";
import ComparisonTable from "./ComparisonTable";
import { loanCategories } from "./loanData";
import { formatRangeValue, formatToIndianCurrency } from "./utils";

const CompareLoans = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [showLoanList, setShowLoanList] = useState(false);
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [availableLoans, setAvailableLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination States
  const [page, setPage] = useState(0);
  const pageSize = 4; // Ensure this matches backend default if needed
  const [hasMore, setHasMore] = useState(true);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowLoanList(true);
    setSelectedLoans([]);
    setShowComparison(false);
    setPage(0);
    setHasMore(true);
    setAvailableLoans([]); // Clear previous loans immediately
  };

  const handleLoanSelection = (loan) => {
    setSelectedLoans((prevSelected) => {
      const isAlreadySelected = prevSelected.find((l) => l.id === loan.id);
      if (isAlreadySelected) {
        return prevSelected.filter((l) => l.id !== loan.id);
      } else {
        return [...prevSelected, loan];
      }
    });
  };

  const handleCompareLoans = () => {
    if (selectedLoans.length >= 2) {
      setShowComparison(true);
    }
  };

  const getCategoryDisplayName = () => {
    const category = loanCategories.find((cat) => cat.key === selectedCategory);
    return category ? category.name : "";
  };

  const resetToCategories = () => {
    setShowComparison(false);
    setShowLoanList(false);
    setSelectedLoans([]);
    setSelectedCategory("");
    setAvailableLoans([]);
    setPage(0);
  };

  const backToLoanSelection = () => {
    setShowComparison(false);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && (hasMore || newPage < page)) {
      setPage(newPage);
      // Scroll to top smoothly when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!selectedCategory) return;

    const fetchLoans = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_BASE_URL
          }/banks/compare?loanType=${selectedCategory}&page=${page}&size=${pageSize}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch loans");
        const data = await response.json();

        if (Array.isArray(data)) {
          // Determine if we have more pages based on if we received a full page
          setHasMore(data.length === pageSize);
        }

        // MAP DTO TO COMPONENT STATE
        const transformedLoans = Array.isArray(data)
          ? data.map((loan, index) => ({
              id: `${loan.bankName}-${index}`, // Unique ID
              name: loan.bankName,
              bankType: loan.bankType,

              // Interest Rate: "Starting from"
              interestRateDisplay: formatRangeValue(
                loan.minInterestRate,
                loan.maxInterestRate,
                "%",
                "start"
              ),

              // Loan Amount
              loanAmountDisplay: `upto ${formatToIndianCurrency(
                loan.maxLoanAmount || loan.minLoanAmount
              )}`,

              // Age
              minAge: loan.minAge,
              maxAge: loan.maxAge,
              ageDisplay: formatRangeValue(
                loan.minAge,
                loan.maxAge,
                " Years",
                "upto"
              ),

              // Tenure
              termYears: loan.tenure,
              tenureDisplay: `upto ${loan.tenure} Years`,

              cibilScore: loan.cibilScore,

              // Logo
              logo: loan.bankLogo
                ? `data:image/png;base64,${loan.bankLogo}`
                : null,
            }))
          : [];

        setAvailableLoans(transformedLoans);
      } catch (error) {
        console.error("Error fetching loans:", error);
        setAvailableLoans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [selectedCategory, page]);

  if (!showLoanList && !showComparison) {
    return (
      <CategorySelection
        categories={loanCategories}
        onCategorySelect={handleCategorySelect}
      />
    );
  }

  if (showLoanList && !showComparison) {
    return (
      <LoanSelection
        selectedCategory={selectedCategory}
        availableLoans={availableLoans}
        selectedLoans={selectedLoans}
        onLoanSelect={handleLoanSelection}
        onCompare={handleCompareLoans}
        onBack={resetToCategories}
        getCategoryDisplayName={getCategoryDisplayName}
        loading={loading}
        // Passing Pagination Props
        page={page}
        hasMore={hasMore}
        onPageChange={handlePageChange}
      />
    );
  }

  if (showComparison) {
    return (
      <ComparisonTable
        selectedLoans={selectedLoans}
        onBack={backToLoanSelection}
        getCategoryDisplayName={getCategoryDisplayName}
      />
    );
  }

  return null;
};

export default CompareLoans;