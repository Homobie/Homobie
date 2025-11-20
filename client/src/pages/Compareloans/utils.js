export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Custom formatter for Indian Number System (Lakhs/Crores)
 * 100000 -> 1 Lac
 * 10000000 -> 1 Cr
 */
export const formatToIndianCurrency = (num) => {
  if (!num) return "N/A";
  const val = parseFloat(num);
  
  if (val >= 10000000) {
    // Divide by 1 Crore (10,000,000)
    // toFixed(2) keeps 2 decimals, replace removes trailing .00
    return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (val >= 100000) {
    // Divide by 1 Lakh (100,000)
    return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')} Lac`;
  }
  
  // Fallback for smaller numbers
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

/**
 * Formats a range value.
 * @param {string} labelType - "start" for "starting from", "upto" for "upto"
 */
export const formatRangeValue = (min, max, suffix = "", labelType = "upto") => {
  if (min === undefined || min === null) return "N/A";
  
  const isSingleValue = (max === undefined || max === null || parseFloat(min) === parseFloat(max));

  if (isSingleValue) {
    if (labelType === "start") {
      return `Starting from ${min}${suffix}`;
    } else {
      return `upto ${min}${suffix}`;
    }
  }

  return `${min}${suffix} - ${max}${suffix}`;
};