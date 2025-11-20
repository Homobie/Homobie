import React from "react";

const ComparisonTable = ({
  selectedLoans,
  onBack,
  getCategoryDisplayName,
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
        {/* Header with Back Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <button
              onClick={onBack}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg mb-4 transition duration-300 backdrop-blur-sm"
            >
              ← Back to Loan Selection
            </button>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Comparing {getCategoryDisplayName()}
            </h1>
            <p className="text-white/70 text-lg">
              Comparing {selectedLoans.length} selected loans
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden mb-8 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-center">
              <thead>
                <tr className="bg-white/10 backdrop-blur-sm">
                  <th className="p-4 text-white/80 font-semibold sticky left-0 z-20 bg-black/40 backdrop-blur-md border-r border-white/20 min-w-[180px] text-left">
                    Features
                  </th>
                  {selectedLoans.map((loan) => (
                    <th
                      key={loan.id}
                      className="text-center p-4 text-white font-bold text-lg min-w-[200px] border-r border-white/10"
                    >
                      <div className="flex flex-col items-center gap-2">
                        {loan.logo && (
                            <div className="w-12 h-12 bg-white rounded-full p-1 overflow-hidden shadow-sm">
                                <img src={loan.logo} alt="logo" className="w-full h-full object-contain"/>
                            </div>
                        )}
                        {loan.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Bank Type */}
                <tr className="hover:bg-white/5 border-b border-white/10">
                   <td className="p-4 text-white/70 font-medium sticky left-0 bg-black/20 backdrop-blur-sm border-r border-white/20 text-left">
                       Bank Type
                   </td>
                   {selectedLoans.map(loan => (
                       <td key={loan.id} className="p-4 border-r border-white/10 text-white">
                           {loan.bankType}
                       </td>
                   ))}
                </tr>

                {/* Interest Rate */}
                <tr className="hover:bg-white/5 border-b border-white/10">
                  <td className="p-4 text-white/70 font-medium sticky left-0 bg-black/20 backdrop-blur-sm border-r border-white/20 text-left">
                    Interest Rate
                  </td>
                  {selectedLoans.map((loan) => (
                    <td key={loan.id} className="p-4 border-r border-white/10">
                      <div className="font-bold text-white text-lg">
                        {loan.interestRateDisplay}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Loan Amount */}
                <tr className="hover:bg-white/5 border-b border-white/10">
                   <td className="p-4 text-white/70 font-medium sticky left-0 bg-black/20 backdrop-blur-sm border-r border-white/20 text-left">
                       Loan Amount
                   </td>
                   {selectedLoans.map(loan => (
                       <td key={loan.id} className="p-4 border-r border-white/10 text-white">
                           {loan.loanAmountDisplay}
                       </td>
                   ))}
                </tr>

                {/* Age Eligibility */}
                <tr className="hover:bg-white/5 border-b border-white/10">
                   <td className="p-4 text-white/70 font-medium sticky left-0 bg-black/20 backdrop-blur-sm border-r border-white/20 text-left">
                       Age Eligibility
                   </td>
                   {selectedLoans.map(loan => (
                       <td key={loan.id} className="p-4 border-r border-white/10 text-white">
                           {loan.ageDisplay}
                       </td>
                   ))}
                </tr>

                {/* Tenure */}
                <tr className="hover:bg-white/5 border-b border-white/10">
                   <td className="p-4 text-white/70 font-medium sticky left-0 bg-black/20 backdrop-blur-sm border-r border-white/20 text-left">
                       Max Tenure
                   </td>
                   {selectedLoans.map(loan => (
                       <td key={loan.id} className="p-4 border-r border-white/10 text-white">
                           {loan.tenureDisplay}
                       </td>
                   ))}
                </tr>

                {/* Credit Score */}
                <tr className="hover:bg-white/5 border-b border-white/10">
                  <td className="p-4 text-white/70 font-medium sticky left-0 bg-black/20 backdrop-blur-sm border-r border-white/20 text-left">
                    Min CIBIL Score
                  </td>
                  {selectedLoans.map((loan) => (
                    <td key={loan.id} className="p-4 border-r border-white/10">
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold">
                        {loan.cibilScore}+
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTable;