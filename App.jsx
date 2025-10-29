/* Browser-friendly App.jsx (UMD React + Babel) — NO imports/exports — NEW CLAUDE UI KEPT
   - Replaces lucide-react icons with text buttons
   - Uses localStorage via window.storage adapter
   - Mounts with ReactDOM at bottom
*/

window.storage = {
  async list(prefix = "") {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    return { keys };
  },
  async get(key) { return { value: localStorage.getItem(key) }; },
  async set(key, value) { localStorage.setItem(key, value); },
  async delete(key) { localStorage.removeItem(key); }
};

function App() {
  const { useState, useEffect } = React;

  const [calculators, setCalculators] = useState([{
    id: 1,
    customerName: '',
    jobNumber: '',
    contractAmount: '',
    cashCheck: '',
    financeAmount: '',
    dealerFee: '',
    creditCard: '',
    creditCardFee: '',
    houseFeePercent: '',
    laborMaterial: '',
    rideAlong: '',
    rideAlongBonus: '',
    numRideAlongs: '',
    numVets: '',
    numReps: ''
  }]);

  const [showReport, setShowReport] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [reportName, setReportName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [printSingleCalc, setPrintSingleCalc] = useState(null);

  useEffect(() => { loadSavedReports(); }, []);

  async function loadSavedReports() {
    try {
      const result = await window.storage.list('report:');
      if (result && result.keys) {
        const reports = [];
        for (const key of result.keys) {
          try {
            const data = await window.storage.get(key);
            if (data && data.value) {
              const parsed = JSON.parse(data.value);
              reports.push({ key, ...parsed });
            }
          } catch (e) {
            console.log('Error loading report:', e);
          }
        }
        setSavedReports(reports);
      }
    } catch (error) {
      console.log('No saved reports yet');
      setSavedReports([]);
    }
  }

  async function saveReport() {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }
    try {
      const timestamp = new Date().toISOString();
      const reportData = { name: reportName, date: timestamp, calculators };
      const key = `report:${Date.now()}`;
      await window.storage.set(key, JSON.stringify(reportData));
      setShowSaveDialog(false);
      setReportName('');
      await loadSavedReports();
      alert('Report saved successfully!');
    } catch (error) {
      alert('Error saving report: ' + error.message);
    }
  }

  function loadReport(report) {
    setCalculators(report.calculators);
    setShowSavedReports(false);
  }

  async function deleteReport(key) {
    try {
      setSavedReports(savedReports.filter(r => r.key !== key));
      await window.storage.delete(key);
      setDeleteConfirm(null);
      alert('Report deleted!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting report: ' + error.message);
      loadSavedReports();
      setDeleteConfirm(null);
    }
  }

  const formatCurrency = (value) => {
    if (isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:2 }).format(value);
  };

  const parseValue = (value) => {
    if (!value || value === '') return 0;
    const parsed = parseFloat(String(value).replace(/[,$]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseFee = (amount, fee) => {
    if (!fee || fee === '') return 0;
    const amountVal = parseValue(amount);
    const feeStr = String(fee).trim();
    const percent = parseFloat(feeStr.replace('%', '')) || 0; // treat fee as %
    const feeAmount = (amountVal * percent) / 100;
    return Math.round(feeAmount * 100) / 100;
  };

  function calculateForOne(data) {
    const contractAmount = parseValue(data.contractAmount);
    const houseFeePercent = parseValue(data.houseFeePercent);
    const houseFeeAmount = (contractAmount * houseFeePercent) / 100;

    const dealerFeeAmount = parseFee(data.financeAmount, data.dealerFee);
    const creditCardFeeAmount = parseFee(data.creditCard, data.creditCardFee);

    const totalPayments = parseValue(data.cashCheck) + parseValue(data.financeAmount) + parseValue(data.creditCard);
    const afterHouseFee = totalPayments - houseFeeAmount;
    const totalAfterFees = afterHouseFee - parseValue(data.laborMaterial);
    const afterJobCost = totalAfterFees; // alias used in UI
    const percentOfContract = afterHouseFee > 0 ? (totalAfterFees / afterHouseFee) * 100 : 0;

    let vetRate = 25;
    if (percentOfContract >= 50) vetRate = 55;
    else if (percentOfContract >= 40) vetRate = 45;
    else if (percentOfContract >= 33) vetRate = 35;

    let repRate = 20;
    if (percentOfContract >= 50) repRate = 40;
    else if (percentOfContract >= 40) repRate = 30;
    else if (percentOfContract >= 33) repRate = 25;

    const vetsCount = parseValue(data.numVets);
    const repsCount = parseValue(data.numReps);
    const totalPeople = vetsCount + repsCount;

    const vetCommissionTotal = (totalAfterFees * vetRate) / 100;
    const repCommissionTotal = (totalAfterFees * repRate) / 100;

    const perVetPayout = totalPeople > 0 ? (vetCommissionTotal / totalPeople) : 0;
    const perRepPayout = totalPeople > 0 ? (repCommissionTotal / totalPeople) : 0;

    const rideAlongFeeAmount = parseValue(data.rideAlong);
    const rideAlongFeePerPerson = totalPeople > 0 ? rideAlongFeeAmount / totalPeople : 0;

    const dealerFeePerPerson = totalPeople > 0 ? dealerFeeAmount / totalPeople : 0;
    const creditCardFeePerPerson = totalPeople > 0 ? creditCardFeeAmount / totalPeople : 0;

    const finalPerVetPayout = perVetPayout - rideAlongFeePerPerson - dealerFeePerPerson - creditCardFeePerPerson;
    const finalPerRepPayout = perRepPayout - rideAlongFeePerPerson - dealerFeePerPerson - creditCardFeePerPerson;
    const finalTotalVetsPayout = finalPerVetPayout * vetsCount;
    const finalTotalRepsPayout = finalPerRepPayout * repsCount;

    const rideAlongBonusAmount = parseValue(data.rideAlongBonus);
    const totalRideAlongPayout = rideAlongFeeAmount + rideAlongBonusAmount;
    const numRideAlongs = parseValue(data.numRideAlongs);
    const perRideAlongPayout = numRideAlongs > 0 ? (totalRideAlongPayout / numRideAlongs) : 0;

    return {
      houseFeeAmount,
      totalAfterFees: afterJobCost,
      afterJobCost,
      percentOfContract,
      vetRate,
      repRate,
      perVetPayout,
      perRepPayout,
      rideAlongFeePerPerson,
      dealerFeePerPerson,
      creditCardFeePerPerson,
      finalPerVetPayout,
      finalPerRepPayout,
      finalTotalVetsPayout,
      finalTotalRepsPayout,
      combinedPayout: finalTotalVetsPayout + finalTotalRepsPayout,
      totalRideAlongPayout,
      perRideAlongPayout
    };
  }

  function calculateTotals() {
    let totalVetPayout = 0;
    let totalRepPayout = 0;
    let totalRideAlongPayout = 0;
    let totalAfterFees = 0;

    calculators.forEach(data => {
      const calc = calculateForOne(data);
      totalVetPayout += calc.finalTotalVetsPayout;
      totalRepPayout += calc.finalTotalRepsPayout;
      totalRideAlongPayout += calc.totalRideAlongPayout;
      totalAfterFees += calc.totalAfterFees;
    });

    const totalProfit = totalAfterFees - totalVetPayout - totalRepPayout - totalRideAlongPayout;

    return {
      totalVetPayout,
      totalRepPayout,
      totalCombinedPayout: totalVetPayout + totalRepPayout,
      totalRideAlongPayout,
      totalProfit
    };
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <style>
        {`
          @media print {
            @page { size: legal; margin: 0.25in; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-report { font-size: 7px !important; }
            .print-report h1 { font-size: 12px !important; margin-bottom: 8px !important; }
            .print-report table { width: 100%; border-collapse: collapse; }
            .print-report th { font-size: 6px !important; padding: 2px !important; }
            .print-report td { font-size: 6px !important; padding: 1px 2px !important; }
            .print-single-calc { font-size: 8px !important; }
            .print-single-calc h1 { font-size: 14px !important; margin-bottom: 6px !important; }
            .print-single-calc h2 { font-size: 11px !important; }
            .print-single-calc h3 { font-size: 10px !important; margin-bottom: 4px !important; }
            .print-single-calc label { font-size: 7px !important; margin-bottom: 2px !important; }
            .print-single-calc .text-3xl { font-size: 14px !important; }
            .print-single-calc .text-2xl { font-size: 12px !important; }
            .print-single-calc .text-xl { font-size: 10px !important; }
            .print-single-calc .text-lg { font-size: 9px !important; }
            .print-single-calc .text-sm { font-size: 7px !important; }
            .print-single-calc .text-xs { font-size: 6px !important; }
            .print-single-calc .p-4 { padding: 6px !important; }
            .print-single-calc .p-6 { padding: 8px !important; }
            .print-single-calc .mb-4 { margin-bottom: 6px !important; }
            .print-single-calc .mb-3 { margin-bottom: 4px !important; }
            .print-single-calc .mb-2 { margin-bottom: 2px !important; }
            .print-single-calc .gap-4 { gap: 6px !important; }
          }
        `}
      </style>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete this report?</p>
            <div className="flex gap-3">
              <button onClick={() => deleteReport(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Save Report</h2>
            <label className="block text-sm font-bold mb-2">Report Name</label>
            <input type="text" value={reportName} onChange={(e)=>setReportName(e.target.value)} className="w-full border-2 border-gray-300 px-3 py-2 rounded mb-4" placeholder="Enter report name"/>
            <div className="flex gap-3">
              <button onClick={saveReport} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Save</button>
              <button onClick={()=>{ setShowSaveDialog(false); setReportName(''); }} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved reports */}
      {showSavedReports && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Saved Reports</h2>
            {savedReports.length === 0 ? (
              <p className="text-gray-600 mb-4">No saved reports yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {savedReports.map((report) => (
                  <div key={report.key} className="border-2 border-gray-300 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg">{report.name}</div>
                      <div className="text-sm text-gray-600">{new Date(report.date).toLocaleString()} • {report.calculators.length} calculator(s)</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>loadReport(report)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Load</button>
                      <button onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setDeleteConfirm(report.key); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>setShowSavedReports(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Close</button>
          </div>
        </div>
      )}

      {/* PRINT SINGLE CALC VIEW */}
      {printSingleCalc !== null && (
        <div className="print-single-calc bg-white p-6">
          <h1 className="text-2xl font-bold text-center mb-4">ALTA CAL PROFIT SHARE - CALCULATOR #{printSingleCalc + 1}</h1>
          {(() => {
            const calc = calculators[printSingleCalc];
            const data = calculateForOne(calc);
            const profit = data.afterJobCost - data.finalTotalVetsPayout - data.finalTotalRepsPayout - data.totalRideAlongPayout;
            return (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-100 p-4 rounded">
                  <div><span className="font-semibold">Customer Name:</span> <span className="font-bold text-lg">{calc.customerName || 'N/A'}</span></div>
                  <div><span className="font-semibold">Job Number:</span> <span className="font-bold text-lg">{calc.jobNumber || 'N/A'}</span></div>
                </div>

                <div className="mb-4 bg-blue-50 border-2 border-blue-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-2">CONTRACT & PAYMENT</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><strong>Contract Amount:</strong> {formatCurrency(parseValue(calc.contractAmount))}</div>
                    <div><strong>Cash/Check:</strong> {formatCurrency(parseValue(calc.cashCheck))}</div>
                    <div><strong>Labor & Material:</strong> {formatCurrency(parseValue(calc.laborMaterial))}</div>
                  </div>
                </div>

                <div className="mb-4 bg-green-50 border-2 border-green-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-2">FINANCE INFO</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div><strong>Finance Amount:</strong> {formatCurrency(parseValue(calc.financeAmount))}</div>
                      <div><strong>Dealer Fee:</strong> {calc.dealerFee || 'N/A'} ({formatCurrency(parseFee(calc.financeAmount, calc.dealerFee))})</div>
                    </div>
                    <div>
                      <div><strong>Credit Card:</strong> {formatCurrency(parseValue(calc.creditCard))}</div>
                      <div><strong>CC Fee:</strong> {calc.creditCardFee || 'N/A'} ({formatCurrency(parseFee(calc.creditCard, calc.creditCardFee))})</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 bg-orange-50 border-2 border-orange-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-2">FEES & BONUSES</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div><strong>House Fee %:</strong> {calc.houseFeePercent}%</div>
                      <div><strong>Amount:</strong> {formatCurrency(data.houseFeeAmount)}</div>
                    </div>
                    <div>
                      <div><strong>Ride Along Fee:</strong> {formatCurrency(parseValue(calc.rideAlong))}</div>
                      <div><strong>Per Person:</strong> {formatCurrency(data.rideAlongFeePerPerson)}</div>
                    </div>
                    <div>
                      <div><strong>Ride Along Bonus:</strong> {formatCurrency(parseValue(calc.rideAlongBonus))}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 bg-purple-50 border-2 border-purple-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-2 text-center">CALCULATED TOTALS</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded p-3 border-2">
                      <div className="text-sm font-bold">TOTAL AFTER FEES</div>
                      <div className="text-2xl font-bold">{formatCurrency(data.totalAfterFees)}</div>
                    </div>
                    <div className="bg-white rounded p-3 border-2">
                      <div className="text-sm font-bold">VETS PROFIT %</div>
                      <div className="text-2xl font-bold">{data.vetRate}%</div>
                    </div>
                    <div className="bg-white rounded p-3 border-2">
                      <div className="text-sm font-bold">REP PROFIT %</div>
                      <div className="text-2xl font-bold">{data.repRate}%</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 bg-yellow-50 border-2 border-yellow-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-3 text-center">TEAM PAYOUTS</h3>

                  {parseValue(calc.numVets) > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="font-bold">VETS ON CONTRACT</div>
                        <div className="text-xl">{parseValue(calc.numVets)}</div>
                      </div>
                      <div className="bg-white rounded p-3 border-2 text-center">
                        <div className="text-sm font-bold">PER VET</div>
                        <div className="text-xl font-bold text-green-700">{formatCurrency(data.finalPerVetPayout)}</div>
                      </div>
                      <div className="bg-white rounded p-3 border-2 text-center">
                        <div className="text-sm font-bold">TOTAL VET PAYOUT</div>
                        <div className="text-xl font-bold">{formatCurrency(data.finalTotalVetsPayout)}</div>
                      </div>
                    </div>
                  )}

                  {parseValue(calc.numReps) > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="font-bold">REPS ON CONTRACT</div>
                        <div className="text-xl">{parseValue(calc.numReps)}</div>
                      </div>
                      <div className="bg-white rounded p-3 border-2 text-center">
                        <div className="text-sm font-bold">PER REP</div>
                        <div className="text-xl font-bold text-purple-700">{formatCurrency(data.finalPerRepPayout)}</div>
                      </div>
                      <div className="bg-white rounded p-3 border-2 text-center">
                        <div className="text-sm font-bold">TOTAL REP PAYOUT</div>
                        <div className="text-xl font-bold">{formatCurrency(data.finalTotalRepsPayout)}</div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-green-400 to-green-600 rounded p-4 text-center mb-3">
                    <div className="font-bold text-white">COMBINED PAYOUT</div>
                    <div className="text-3xl font-bold text-white">{formatCurrency(data.combinedPayout)}</div>
                  </div>

                  {parseValue(calc.numRideAlongs) > 0 && (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center">
                          <div className="font-bold">RIDE ALONGS</div>
                          <div className="text-xl">{parseValue(calc.numRideAlongs)}</div>
                        </div>
                        <div className="bg-white rounded p-3 border-2 text-center">
                          <div className="text-sm font-bold">PER RIDE ALONG</div>
                          <div className="text-xl font-bold">{formatCurrency(data.perRideAlongPayout)}</div>
                        </div>
                        <div className="bg-white rounded p-3 border-2 text-center">
                          <div className="text-sm font-bold">TOTAL RA PAYOUT</div>
                          <div className="text-xl font-bold">{formatCurrency(data.totalRideAlongPayout)}</div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-red-400 to-red-600 rounded p-4 text-center mb-3">
                        <div className="font-bold text-white">RIDE ALONG PAYOUT</div>
                        <div className="text-3xl font-bold text-white">{formatCurrency(data.totalRideAlongPayout)}</div>
                      </div>
                    </>
                  )}

                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded p-4 text-center">
                    <div className="font-bold text-white">PROFIT</div>
                    <div className="text-3xl font-bold text-white">{formatCurrency(profit)}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="no-print mt-6 text-center">
            <button onClick={()=>setPrintSingleCalc(null)} className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg">CLOSE</button>
          </div>
        </div>
      )}

      {/* REPORT VIEW */}
      {showReport && (
        <div className="print-report bg-white p-4">
          <h1 className="text-xl font-bold text-center mb-4">ALTA CAL PROFIT SHARE - PAYOUT REPORT</h1>
          <table className="w-full border-2 border-black text-xs">
            <thead>
              <tr className="bg-blue-200 border-b-2 border-black">
                <th className="border border-black p-1 text-left">#</th>
                <th className="border border-black p-1 text-left">Customer</th>
                <th className="border border-black p-1 text-left">Job#</th>
                {calculators.some(c => parseValue(c.numVets) > 0) && (<><th className="border border-black p-1 text-right">Vets</th><th className="border border-black p-1 text-right">Per Vet</th><th className="border border-black p-1 text-right">Total Vet</th></>)}
                {calculators.some(c => parseValue(c.numReps) > 0) && (<><th className="border border-black p-1 text-right">Reps</th><th className="border border-black p-1 text-right">Per Rep</th><th className="border border-black p-1 text-right">Total Rep</th></>)}
                {calculators.some(c => parseValue(c.numRideAlongs) > 0) && (<><th className="border border-black p-1 text-right">RAs</th><th className="border border-black p-1 text-right">Per RA</th><th className="border border-black p-1 text-right">Total RA</th></>)}
                <th className="border border-black p-1 text-right bg-green-200">Combined</th>
                <th className="border border-black p-1 text-right bg-yellow-200">Profit</th>
              </tr>
            </thead>
            <tbody>
              {calculators.map((data, index) => {
                const calc = calculateForOne(data);
                const profit = calc.afterJobCost - calc.finalTotalVetsPayout - calc.finalTotalRepsPayout - calc.totalRideAlongPayout;
                const hasVets = calculators.some(c => parseValue(c.numVets) > 0);
                const hasReps = calculators.some(c => parseValue(c.numReps) > 0);
                const hasRideAlongs = calculators.some(c => parseValue(c.numRideAlongs) > 0);
                return (
                  <tr key={index} className="border-b border-gray-400">
                    <td className="border border-black p-1">{index + 1}</td>
                    <td className="border border-black p-1">{data.customerName || 'N/A'}</td>
                    <td className="border border-black p-1">{data.jobNumber || 'N/A'}</td>
                    {hasVets && (<><td className="border border-black p-1 text-right">{parseValue(data.numVets) > 0 ? parseValue(data.numVets) : ''}</td><td className="border border-black p-1 text-right">{parseValue(data.numVets) > 0 ? formatCurrency(calc.finalPerVetPayout) : ''}</td><td className="border border-black p-1 text-right bg-green-50 font-bold">{parseValue(data.numVets) > 0 ? formatCurrency(calc.finalTotalVetsPayout) : ''}</td></>)}
                    {hasReps && (<><td className="border border-black p-1 text-right">{parseValue(data.numReps) > 0 ? parseValue(data.numReps) : ''}</td><td className="border border-black p-1 text-right">{parseValue(data.numReps) > 0 ? formatCurrency(calc.finalPerRepPayout) : ''}</td><td className="border border-black p-1 text-right bg-purple-50 font-bold">{parseValue(data.numReps) > 0 ? formatCurrency(calc.finalTotalRepsPayout) : ''}</td></>)}
                    {hasRideAlongs && (<><td className="border border-black p-1 text-right">{parseValue(data.numRideAlongs) > 0 ? parseValue(data.numRideAlongs) : ''}</td><td className="border border-black p-1 text-right">{parseValue(data.numRideAlongs) > 0 ? formatCurrency(calc.perRideAlongPayout) : ''}</td><td className="border border-black p-1 text-right bg-red-50 font-bold">{parseValue(data.numRideAlongs) > 0 ? formatCurrency(calc.totalRideAlongPayout) : ''}</td></>)}
                    <td className="border border-black p-1 text-right bg-green-200 font-bold">{formatCurrency(calc.combinedPayout)}</td>
                    <td className="border border-black p-1 text-right bg-yellow-100 font-bold">{formatCurrency(profit)}</td>
                  </tr>
                );
              })}
              <tr className="bg-yellow-100 font-bold border-t-4 border-black">
                <td colSpan="3" className="border border-black p-1 text-right">TOTALS:</td>
                {calculators.some(c => parseValue(c.numVets) > 0) && (<><td colSpan="2" className="border border-black p-1"></td><td className="border border-black p-1 text-right bg-green-100">{formatCurrency(totals.totalVetPayout)}</td></>)}
                {calculators.some(c => parseValue(c.numReps) > 0) && (<><td colSpan="2" className="border border-black p-1"></td><td className="border border-black p-1 text-right bg-purple-100">{formatCurrency(totals.totalRepPayout)}</td></>)}
                {calculators.some(c => parseValue(c.numRideAlongs) > 0) && (<><td colSpan="2" className="border border-black p-1"></td><td className="border border-black p-1 text-right bg-red-100">{formatCurrency(totals.totalRideAlongPayout)}</td></>)}
                <td className="border border-black p-1 text-right bg-green-300">{formatCurrency(totals.totalCombinedPayout)}</td>
                <td className="border border-black p-1 text-right bg-yellow-200">{formatCurrency(totals.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
          <div className="no-print mt-4 text-center">
            <button onClick={()=>setShowReport(false)} className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg">CLOSE REPORT</button>
          </div>
        </div>
      )}

      {/* MAIN APP (when not printing views) */}
      {!showReport && printSingleCalc === null && (
        <div className="max-w-full mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-4 border-blue-500">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-blue-800">ALTA CAL PROFIT SHARE</h1>
              <div className="flex gap-3">
                <button onClick={()=>setShowSavedReports(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg">SAVED REPORTS</button>
                <button onClick={()=>setShowSaveDialog(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">SAVE REPORT</button>
                <button onClick={()=>setShowReport(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">PRINT REPORT</button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-6 rounded-lg shadow-lg text-white">
                <div className="text-sm font-bold mb-2">TOTAL VET PAYOUT</div>
                <div className="text-3xl font-bold">{formatCurrency(totals.totalVetPayout)}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-6 rounded-lg shadow-lg text-white">
                <div className="text-sm font-bold mb-2">TOTAL REP PAYOUT</div>
                <div className="text-3xl font-bold">{formatCurrency(totals.totalRepPayout)}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-6 rounded-lg shadow-lg text-white">
                <div className="text-sm font-bold mb-2">COMBINED PAYOUT</div>
                <div className="text-3xl font-bold">{formatCurrency(totals.totalCombinedPayout)}</div>
              </div>
              <div className="bg-gradient-to-br from-red-400 to-red-600 p-6 rounded-lg shadow-lg text-white">
                <div className="text-sm font-bold mb-2">RIDE ALONG PAYOUT</div>
                <div className="text-3xl font-bold">{formatCurrency(totals.totalRideAlongPayout)}</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-lg shadow-lg text-white">
                <div className="text-sm font-bold mb-2">TOTAL PROFIT</div>
                <div className="text-3xl font-bold">{formatCurrency(totals.totalProfit)}</div>
              </div>
            </div>
          </div>

          {calculators.map((calc, index) => {
            const data = calculateForOne(calc);
            return (
              <div key={calc.id} className="relative mb-6 bg-white border-4 border-gray-300 rounded-lg">
                {calculators.length > 1 && (
                  <button onClick={()=>setCalculators(calculators.filter(c => c.id !== calc.id))} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 z-10 shadow-lg">×</button>
                )}

                <div className="bg-blue-300 text-center py-2 border-b-2 border-black flex justify-between items-center px-4">
                  <div className="w-8"></div>
                  <h2 className="text-lg font-bold">CALCULATOR #{index + 1}</h2>
                  <button onClick={()=>setPrintSingleCalc(index)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">PRINT</button>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b-2 border-black">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-1 block">CUSTOMER NAME</label>
                    <input type="text" value={calc.customerName || ''} onChange={(e)=>{ const next=[...calculators]; next[index].customerName=e.target.value; setCalculators(next); }} className="w-full border-2 border-gray-300 px-3 py-2 rounded" placeholder="Enter customer name"/>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-1 block">JOB NUMBER</label>
                    <input type="text" value={calc.jobNumber || ''} onChange={(e)=>{ const next=[...calculators]; next[index].jobNumber=e.target.value; setCalculators(next); }} className="w-full border-2 border-gray-300 px-3 py-2 rounded" placeholder="Enter job number"/>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* CONTRACT & PAYMENT */}
                  <div className="bg-blue-50 border-4 border-blue-400 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-blue-900 mb-4 text-center">CONTRACT & PAYMENT</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <LabeledMoney label="CONTRACT AMOUNT" value={calc.contractAmount} onChange={(v)=>update(index,'contractAmount',v)} />
                      <LabeledMoney label="CASH/CHECK" value={calc.cashCheck} onChange={(v)=>update(index,'cashCheck',v)} />
                      <LabeledMoney label="LABOR & MATERIAL" value={calc.laborMaterial} onChange={(v)=>update(index,'laborMaterial',v)} />
                    </div>
                  </div>

                  {/* FINANCE INFO */}
                  <div className="bg-green-50 border-4 border-green-400 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-green-900 mb-4 text-center">FINANCE INFO</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <LabeledMoney label="FINANCE AMOUNT" value={calc.financeAmount} onChange={(v)=>update(index,'financeAmount',v)} />
                        <LabeledText label="DEALER FEE" value={calc.dealerFee} onChange={(v)=>update(index,'dealerFee',v)} placeholder="3.5% or 150" />
                        {calc.dealerFee && parseValue(calc.financeAmount) > 0 && (
                          <div className="text-center text-sm font-bold text-green-700 mt-1">{formatCurrency(parseFee(calc.financeAmount, calc.dealerFee))}</div>
                        )}
                      </div>
                      <div>
                        <LabeledMoney label="CREDIT CARD" value={calc.creditCard} onChange={(v)=>update(index,'creditCard',v)} />
                        <LabeledText label="CC FEE %" value={calc.creditCardFee} onChange={(v)=>update(index,'creditCardFee',v)} />
                        {calc.creditCardFee && parseValue(calc.creditCard) > 0 && (
                          <div className="text-center text-sm font-bold text-green-700 mt-1">{formatCurrency(parseFee(calc.creditCard, calc.creditCardFee))}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FEES & BONUSES */}
                  <div className="bg-orange-50 border-4 border-orange-400 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-orange-900 mb-4 text-center">FEES & BONUSES</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">HOUSE FEE %</label>
                        <div className="flex items-center bg-white border-2 rounded px-3 py-3 mb-2">
                          <input type="text" value={calc.houseFeePercent} onChange={(e)=>update(index,'houseFeePercent',e.target.value)} className="w-full text-right focus:outline-none"/>
                          <span className="ml-2">%</span>
                        </div>
                        <div className="text-center text-lg font-bold">{formatCurrency(data.houseFeeAmount)}</div>
                      </div>
                      <LabeledMoney label="RIDE ALONG FEE" value={calc.rideAlong} onChange={(v)=>update(index,'rideAlong',v)} red />
                      <LabeledMoney label="RIDE ALONG BONUS" value={calc.rideAlongBonus || ''} onChange={(v)=>update(index,'rideAlongBonus',v)} red />
                    </div>
                  </div>

                  {/* CALCULATED TOTALS */}
                  <div className="bg-purple-50 border-4 border-purple-400 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-purple-900 mb-4 text-center">CALCULATED TOTALS</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <SummaryCard label="TOTAL AFTER FEES" value={formatCurrency(data.totalAfterFees)} />
                      <SummaryCard label="VETS PROFIT %" value={`${data.vetRate}%`} />
                      <SummaryCard label="REP PROFIT %" value={`${data.repRate}%`} />
                    </div>
                  </div>

                  {/* TEAM PAYOUTS */}
                  <div className="bg-yellow-50 border-4 border-yellow-400 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-yellow-900 mb-4 text-center">TEAM PAYOUTS</h3>

                    <div className="grid grid-cols-3 gap-4">
                      <LabeledNumber label="VETS ON CONTRACT" value={calc.numVets} onChange={(v)=>update(index,'numVets',v)} />
                      <SummaryCard label="PER VET" value={formatCurrency(data.finalPerVetPayout)} />
                      <SummaryCard label="TOTAL VET PAYOUT" value={formatCurrency(data.finalTotalVetsPayout)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <LabeledNumber label="REPS ON CONTRACT" value={calc.numReps} onChange={(v)=>update(index,'numReps',v)} />
                      <SummaryCard label="PER REP" value={formatCurrency(data.finalPerRepPayout)} />
                      <SummaryCard label="TOTAL REP PAYOUT" value={formatCurrency(data.finalTotalRepsPayout)} />
                    </div>

                    <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-6 text-center shadow-lg mt-4">
                      <div className="text-lg font-bold text-white mb-2">COMBINED PAYOUT</div>
                      <div className="text-4xl font-bold text-white">{formatCurrency(data.combinedPayout)}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <LabeledNumber label="RIDE ALONGS ON CONTRACT" value={calc.numRideAlongs || ''} onChange={(v)=>update(index,'numRideAlongs',v)} />
                      <SummaryCard label="PER RIDE ALONG" value={formatCurrency(data.perRideAlongPayout)} />
                      <SummaryCard label="TOTAL RIDE ALONG PAYOUT" value={formatCurrency(data.totalRideAlongPayout)} />
                    </div>

                    {parseValue(calc.numRideAlongs) > 0 && (
                      <div className="bg-gradient-to-r from-red-400 to-red-600 rounded-lg p-6 text-center shadow-lg mt-4">
                        <div className="text-lg font-bold text-white mb-2">RIDE ALONG PAYOUT</div>
                        <div className="text-4xl font-bold text-white">{formatCurrency(data.totalRideAlongPayout)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="text-center mt-6">
            <button
              onClick={() => {
                const newId = Math.max(...calculators.map(c => c.id)) + 1;
                setCalculators([...calculators, {
                  id: newId,
                  customerName: '',
                  jobNumber: '',
                  contractAmount: '',
                  cashCheck: '',
                  financeAmount: '',
                  dealerFee: '',
                  creditCard: '',
                  creditCardFee: '',
                  houseFeePercent: '',
                  laborMaterial: '',
                  rideAlong: '',
                  rideAlongBonus: '',
                  numRideAlongs: '',
                  numVets: '',
                  numReps: ''
                }]);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg flex items-center gap-3 mx-auto text-xl"
            >
              ADD NEW FILE
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ---------- helpers ----------
  function update(i, field, raw) {
    const sanitized = String(raw ?? '').replace(/[^0-9.]/g, '');
    const next = calculators.slice();
    next[i] = { ...next[i], [field]: sanitized };
    setCalculators(next);
  }
}

/* small subcomponents that don’t require imports */
function LabeledMoney({label, value, onChange, red}) {
  return (
    <div>
      <label className={`block text-sm font-bold ${red ? 'text-red-700' : ''} mb-2`}>{label}</label>
      <div className={`flex items-center ${red ? 'bg-red-100 border-red-400' : 'bg-white'} border-2 rounded px-3 py-3`}>
        <span className="mr-2">$</span>
        <input type="text" value={value || ''} onChange={(e)=>onChange(e.target.value)} className={`w-full text-right focus:outline-none ${red ? 'bg-transparent' : ''}`} />
      </div>
    </div>
  );
}
function LabeledText({label, value, onChange, placeholder}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <input type="text" value={value || ''} placeholder={placeholder || ''} onChange={(e)=>onChange(e.target.value)} className="w-full text-right bg-white border-2 rounded px-3 py-3"/>
    </div>
  );
}
function LabeledNumber({label, value, onChange}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <input type="text" value={value || ''} onChange={(e)=>onChange(e.target.value.replace(/[^0-9]/g,''))} className="w-full text-center text-xl border-2 rounded px-3 py-3"/>
    </div>
  );
}
function SummaryCard({label, value}) {
  return (
    <div className="bg-white rounded-lg p-4 border-2 text-center">
      <div className="text-sm font-bold mb-2">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

/* Mount for UMD React */
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot ? ReactDOM.createRoot(rootEl) : { render: (el)=>ReactDOM.render(el, rootEl) };
  root.render(React.createElement(App));
}
