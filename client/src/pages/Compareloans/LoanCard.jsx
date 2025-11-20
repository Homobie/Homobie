import React from 'react';

const LoanCard = ({ loan, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(loan)}
      className={`text-left backdrop-blur-md bg-white/5 border rounded-xl p-6 transition-all duration-300 cursor-pointer group relative overflow-hidden ${
        isSelected 
          ? 'border-[#4f46e5] bg-blue-500/10 shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
          : 'border-white/10 hover:border-[#4f46e5] hover:bg-white/10 hover:shadow-xl'
      }`}
    >
      {/* Card Header: Logo & Name */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {loan.logo ? (
             <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center overflow-hidden shadow-lg">
                <img 
                    src={loan.logo} 
                    alt={`${loan.name} logo`} 
                    className="w-full h-full object-contain" 
                />
             </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                {loan.name.charAt(0)}
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-bold text-white leading-tight">{loan.name}</h3>
            <span className="text-xs text-blue-300 font-medium px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 mt-1 inline-block">
                {loan.bankType}
            </span>
          </div>
        </div>

        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
          isSelected ? 'border-[#4f46e5] bg-[#4f46e5]' : 'border-gray-500 group-hover:border-[#4f46e5]'
        }`}>
          {isSelected && <div className="text-white text-xs font-bold">✓</div>}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Interest Rate</p>
          <p className="text-white font-bold text-lg">{loan.interestRateDisplay}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Tenure</p>
          <p className="text-white font-bold text-lg">{loan.tenureDisplay}</p>
        </div>
        
        <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Loan Amount</p>
            <p className="text-white font-medium text-sm break-words">{loan.loanAmountDisplay}</p>
        </div>
        <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Age Eligibility</p>
            <p className="text-white font-medium">{loan.ageDisplay}</p>
        </div>
      </div>

      {/* Footer Data */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between text-sm">
        <div className="text-gray-300">
          <span className="text-gray-500 mr-2">CIBIL:</span> 
          <span className="font-semibold text-green-400">{loan.cibilScore}+</span>
        </div>
      </div>
    </div>
  );
};

export default LoanCard;