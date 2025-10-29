/* App.jsx — Tailwind + UMD (no imports/exports). 
   Fixes: focus preservation (caret doesn’t jump) + full print views. */
function App() {
  const { useState, useEffect, useRef } = React;

  // --- simple localStorage adapter (if not provided) ---
  if (!window.storage) {
    window.storage = {
      async list(prefix = "") {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        return { keys };
      },
      async get(key) { return { value: localStorage.getItem(key) }; },
      async set(key, value) { localStorage.setItem(key, value); },
      async delete(key) { localStorage.removeItem(key); }
    };
  }

  // --- focus refs (fixes cursor disappearing) ---
  const inputRefs = useRef({}); // key: `${i}.${field}` -> HTMLInputElement

  const [calculators, setCalculators] = useState([{
    id: 1,
    customerName: '', jobNumber: '',
    contractAmount: '', cashCheck: '',
    financeAmount: '', dealerFee: '',
    creditCard: '', creditCardFee: '',
    houseFeePercent: '', laborMaterial: '',
    rideAlong: '', rideAlongBonus: '',
    numRideAlongs: '', numVets: '', numReps: ''
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
      const reports = [];
      for (const key of (result.keys || [])) {
        try {
          const data = await window.storage.get(key);
          if (data && data.value) reports.push({ key, ...JSON.parse(data.value) });
        } catch {}
      }
      setSavedReports(reports);
    } catch { setSavedReports([]); }
  }

  async function saveReport() {
    if (!reportName.trim()) { alert('Please enter a report name'); return; }
    try {
      const timestamp = new Date().toISOString();
      const reportData = { name: reportName, date: timestamp, calculators };
      const key = `report:${Date.now()}`;
      await window.storage.set(key, JSON.stringify(reportData));
      setShowSaveDialog(false); setReportName('');
      await loadSavedReports();
      alert('Report saved successfully!');
    } catch (e) {
      alert('Error saving report: ' + e.message);
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
    } catch (e) {
      alert('Error deleting report: ' + e.message);
      loadSavedReports();
      setDeleteConfirm(null);
    }
  }

  const formatCurrency = v =>
    isNaN(v) ? '$0.00' :
    new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:2 }).format(v);

  const parseValue = v => {
    if (v === '' || v == null) return 0;
    const p = parseFloat(String(v).replace(/[,$]/g, ''));
    return isNaN(p) ? 0 : p;
  };

  const parseFee = (amount, fee) => {
    if (!fee) return 0;
    const s = String(fee).trim();
    const percent = parseFloat(s.replace('%','')) || 0;
    const amt = parseValue(amount);
    return Math.round((amt * percent / 100) * 100) / 100;
  };

  function calculateForOne(d) {
    const contractAmount = parseValue(d.contractAmount);
    const houseFeeAmount = contractAmount * (parseValue(d.houseFeePercent)/100);

    const dealerFeeAmount = parseFee(d.financeAmount, d.dealerFee);
    const creditCardFeeAmount = parseFee(d.creditCard, d.creditCardFee);

    const totalPayments = parseValue(d.cashCheck) + parseValue(d.financeAmount) + parseValue(d.creditCard);
    const afterHouseFee = totalPayments - houseFeeAmount;
    const totalAfterFees = afterHouseFee - parseValue(d.laborMaterial);
    const percentOfContract = afterHouseFee > 0 ? (totalAfterFees / afterHouseFee) * 100 : 0;

    let vetRate = 25; if (percentOfContract >= 50) vetRate = 55; else if (percentOfContract >= 40) vetRate = 45; else if (percentOfContract >= 33) vetRate = 35;
    let repRate = 20; if (percentOfContract >= 50) repRate = 40; else if (percentOfContract >= 40) repRate = 30; else if (percentOfContract >= 33) repRate = 25;

    const vets = parseValue(d.numVets);
    const reps = parseValue(d.numReps);
    const people = vets + reps;

    const vetCommissionTotal = totalAfterFees * (vetRate/100);
    const repCommissionTotal = totalAfterFees * (repRate/100);

    const perVetPayout = people ? (vetCommissionTotal / people) : 0;
    const perRepPayout = people ? (repCommissionTotal / people) : 0;

    const rideAlongFeeAmount = parseValue(d.rideAlong);
    const rideAlongBonusAmount = parseValue(d.rideAlongBonus);
    const perPersonRA = people ? rideAlongFeeAmount / people : 0;

    const dealerFeePerPerson = people ? dealerFeeAmount / people : 0;
    const creditCardFeePerPerson = people ? creditCardFeeAmount / people : 0;

    const finalPerVetPayout = perVetPayout - perPersonRA - dealerFeePerPerson - creditCardFeePerPerson;
    const finalPerRepPayout = perRepPayout - perPersonRA - dealerFeePerPerson - creditCardFeePerPerson;

    const finalTotalVetsPayout = finalPerVetPayout * vets;
    const finalTotalRepsPayout = finalPerRepPayout * reps;
    const combinedPayout = finalTotalVetsPayout + finalTotalRepsPayout;

    const totalRideAlongPayout = rideAlongFeeAmount + rideAlongBonusAmount;

    const numRideAlongs = parseValue(d.numRideAlongs);
    const perRideAlongPayout = numRideAlongs > 0 ? (totalRideAlongPayout / numRideAlongs) : 0;

    const profit = totalAfterFees - finalTotalVetsPayout - finalTotalRepsPayout - totalRideAlongPayout;

    return {
      houseFeeAmount, totalAfterFees, percentOfContract,
      vetRate, repRate, perVetPayout, perRepPayout,
      rideAlongFeePerPerson: perPersonRA,
      dealerFeePerPerson, creditCardFeePerPerson,
      finalPerVetPayout, finalPerRepPayout,
      finalTotalVetsPayout, finalTotalRepsPayout,
      combinedPayout, totalRideAlongPayout, perRideAlongPayout, profit,
      afterJobCost: totalAfterFees
    };
  }

  function calculateTotals() {
    let totalVetPayout = 0, totalRepPayout = 0, totalRideAlongPayout = 0, totalAfterFees = 0;
    calculators.forEach(d => {
      const c = calculateForOne(d);
      totalVetPayout += c.finalTotalVetsPayout;
      totalRepPayout += c.finalTotalRepsPayout;
      totalRideAlongPayout += c.totalRideAlongPayout;
      totalAfterFees += c.totalAfterFees;
    });
    const totalProfit = totalAfterFees - totalVetPayout - totalRepPayout - totalRideAlongPayout;
    return { totalVetPayout, totalRepPayout, totalCombinedPayout: totalVetPayout + totalRepPayout, totalRideAlongPayout, totalProfit };
  }

  const totals = calculateTotals();

  // --- focus-preserving update (fixes caret disappearing) ---
  function update(i, field, nextValue, evt) {
    // Remember caret position & element
    let selStart=null, selEnd=null, key=null;
    if (evt && evt.target && evt.target.selectionStart != null) {
      selStart = evt.target.selectionStart;
      selEnd   = evt.target.selectionEnd;
    }
    key = `${i}.${field}`;

    // Update state
    setCalculators(prev => {
      const next = prev.slice();
      next[i] = { ...next[i], [field]: nextValue };
      return next;
    });

    // Restore focus + selection on next frame
    requestAnimationFrame(() => {
      const el = inputRefs.current[key];
      if (el && document.activeElement !== el) {
        el.focus({ preventScroll: true });
        if (selStart != null && selEnd != null) {
          try { el.setSelectionRange(selStart, selEnd); } catch {}
        }
      }
    });
  }

  // Button
  const Btn = ({className='', ...p}) =>
    <button {...p} className={`font-bold rounded-lg px-4 py-3 text-white ${className}`} />;

  // Inputs (wire ref keys so we can restore focus)
  const MoneyInput = ({i, field, label, value, onChange}) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="flex items-center bg-white border-2 rounded px-3 py-3">
        <span className="mr-2">$</span>
        <input
          ref={el => inputRefs.current[`${i}.${field}`] = el}
          className="w-full text-right focus:outline-none"
          value={value||''}
          onChange={e=>onChange(e.target.value.replace(/[^0-9.]/g,''), e)}
          type="text"
        />
      </div>
    </div>
  );

  const TextInput = ({i, field, label, value, onChange, placeholder, right}) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="flex items-center bg-white border-2 rounded px-3 py-3">
        <input
          ref={el => inputRefs.current[`${i}.${field}`] = el}
          className="w-full text-right focus:outline-none"
          value={value||''}
          placeholder={placeholder||''}
          onChange={e=>onChange(e.target.value, e)}
          type="text"
        />
        {right ? <span className="ml-2">{right}</span> : null}
      </div>
    </div>
  );

  const PlainTextInput = ({i, field, label, value, onChange, placeholder}) => (
    <div>
      <label className="text-sm font-bold text-gray-700 mb-1 block">{label}</label>
      <input
        ref={el => inputRefs.current[`${i}.${field}`] = el}
        className="w-full border-2 border-gray-300 px-3 py-2 rounded"
        value={value||''}
        placeholder={placeholder||''}
        onChange={e=>onChange(e.target.value, e)}
        type="text"
      />
    </div>
  );

  const NumberInput = ({i, field, label, value, onChange}) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <input
        ref={el => inputRefs.current[`${i}.${field}`] = el}
        className="w-full text-center text-xl border-2 rounded px-3 py-3"
        value={value||''}
        onChange={e=>onChange(e.target.value.replace(/[^0-9]/g,''), e)}
        type="text"
      />
    </div>
  );

  // UI blocks
  function Labeled({label, children}) {
    return (
      <div>
        <label className="text-sm font-bold text-gray-700 mb-1 block">{label}</label>
        {children}
      </div>
    );
  }
  function Section({title, color, children}) {
    const border = {
      blue:'border-blue-400', green:'border-green-400', orange:'border-orange-400', purple:'border-purple-400', yellow:'border-yellow-400'
    }[color] || 'border-blue-400';
    const text = {
      blue:'text-blue-900', green:'text-green-900', orange:'text-orange-900', purple:'text-purple-900', yellow:'text-yellow-900'
    }[color] || 'text-blue-900';
    return (
      <div className={`bg-white border-4 ${border} rounded-lg p-4`}>
        <h3 className={`text-xl font-bold ${text} mb-4 text-center`}>{title}</h3>
        {children}
      </div>
    );
  }
  function Summary({title, value, bg}) {
    return (
      <div className={`bg-gradient-to-br ${bg} p-6 rounded-lg shadow-lg text-white`}>
        <div className="text-sm font-bold mb-2">{title}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    );
  }
  function Box({label, value}) {
    return (
      <div className="bg-white rounded-lg p-4 border-2 text-center">
        <div className="text-sm font-bold mb-2">{label}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    );
  }

  const totalsData = totals; // alias for print usage

  // -------- RENDER --------
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">Are you sure you want to delete this report?</p>
            <div className="flex gap-3">
              <Btn className="bg-red-600 hover:bg-red-700 flex-1" onClick={()=>deleteReport(deleteConfirm)}>Delete</Btn>
              <Btn className="bg-gray-600 hover:bg-gray-700 flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Save Report</h2>
            <label className="block text-sm font-bold mb-2">Report Name</label>
            <input className="w-full border-2 border-gray-300 px-3 py-2 rounded mb-4"
                   value={reportName} onChange={e=>setReportName(e.target.value)} />
            <div className="flex gap-3">
              <Btn className="bg-green-600 hover:bg-green-700 flex-1" onClick={saveReport}>Save</Btn>
              <Btn className="bg-gray-600 hover:bg-gray-700 flex-1" onClick={()=>{setShowSaveDialog(false); setReportName('');}}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {showSavedReports && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Saved Reports</h2>
            {savedReports.length === 0 ? (
              <p className="text-gray-600 mb-4">No saved reports yet.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {savedReports.map(r => (
                  <div key={r.key} className="border-2 border-gray-300 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg">{r.name}</div>
                      <div className="text-sm text-gray-600">{new Date(r.date).toLocaleString()} • {r.calculators.length} calculator(s)</div>
                    </div>
                    <div className="flex gap-2">
                      <Btn className="bg-blue-600 hover:bg-blue-700" onClick={()=>loadReport(r)}>Load</Btn>
                      <Btn className="bg-red-600 hover:bg-red-700" onClick={()=>setDeleteConfirm(r.key)}>Delete</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Btn className="bg-gray-600 hover:bg-gray-700 w-full" onClick={()=>setShowSavedReports(false)}>Close</Btn>
          </div>
        </div>
      )}

      {/* PRINT: single calculator view */}
      {printSingleCalc !== null && (
        <div className="print-single-calc bg-white p-6">
          <h1 className="text-2xl font-bold text-center mb-4">ALTA CAL PROFIT SHARE - CALCULATOR #{printSingleCalc + 1}</h1>
          {(() => {
            const calc = calculators[printSingleCalc];
            const data = calculateForOne(calc);
            const profit = data.afterJobCost - data.finalTotalVetsPayout - data.finalTotalRepsPayout - data.totalRideAlongPayout;
            const pv = v => formatCurrency(parseValue(v));
            return (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-100 p-4 rounded">
                  <div><span className="font-semibold">Customer Name:</span> <span className="font-bold text-lg">{calc.customerName || 'N/A'}</span></div>
                  <div><span className="font-semibold">Job Number:</span> <span className="font-bold text-lg">{calc.jobNumber || 'N/A'}</span></div>
                </div>

                <div className="mb-4 bg-blue-50 border-2 border-blue-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-2">CONTRACT & PAYMENT</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><strong>Contract Amount:</strong> {pv(calc.contractAmount)}</div>
                    <div><strong>Cash/Check:</strong> {pv(calc.cashCheck)}</div>
                    <div><strong>Labor & Material:</strong> {pv(calc.laborMaterial)}</div>
                  </div>
                </div>

                <div className="mb-4 bg-green-50 border-2 border-green-400 rounded p-4">
                  <h3 className="font-bold text-lg mb-2">FINANCE INFO</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div><strong>Finance Amount:</strong> {pv(calc.financeAmount)}</div>
                      <div><strong>Dealer Fee:</strong> {calc.dealerFee || 'N/A'} ({formatCurrency(parseFee(calc.financeAmount, calc.dealerFee))})</div>
                    </div>
                    <div>
                      <div><strong>Credit Card:</strong> {pv(calc.creditCard)}</div>
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
                      <div><strong>Ride Along Fee:</strong> {pv(calc.rideAlong)}</div>
                      <div><strong>Per Person:</strong> {formatCurrency(data.rideAlongFeePerPerson)}</div>
                    </div>
                    <div>
                      <div><strong>Ride Along Bonus:</strong> {pv(calc.rideAlongBonus)}</div>
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
            <button
              onClick={() => setPrintSingleCalc(null)}
              className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* PRINT: full report view */}
      {showReport && (
        <div className="print-report bg-white p-4">
          <h1 className="text-xl font-bold text-center mb-4">ALTA CAL PROFIT SHARE - PAYOUT REPORT</h1>
          <table className="w-full border-2 border-black text-xs">
            <thead>
              <tr className="bg-blue-200 border-b-2 border-black">
                <th className="border border-black p-1 text-left">#</th>
                <th className="border border-black p-1 text-left">Customer</th>
                <th className="border border-black p-1 text-left">Job#</th>
                {calculators.some(c => parseValue(c.numVets) > 0) && (
                  <>
                    <th className="border border-black p-1 text-right">Vets</th>
                    <th className="border border-black p-1 text-right">Per Vet</th>
                    <th className="border border-black p-1 text-right">Total Vet</th>
                  </>
                )}
                {calculators.some(c => parseValue(c.numReps) > 0) && (
                  <>
                    <th className="border border-black p-1 text-right">Reps</th>
                    <th className="border border-black p-1 text-right">Per Rep</th>
                    <th className="border border-black p-1 text-right">Total Rep</th>
                  </>
                )}
                {calculators.some(c => parseValue(c.numRideAlongs) > 0) && (
                  <>
                    <th className="border border-black p-1 text-right">RAs</th>
                    <th className="border border-black p-1 text-right">Per RA</th>
                    <th className="border border-black p-1 text-right">Total RA</th>
                  </>
                )}
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
                const hasRA   = calculators.some(c => parseValue(c.numRideAlongs) > 0);
                return (
                  <tr key={index} className="border-b border-gray-400">
                    <td className="border border-black p-1">{index + 1}</td>
                    <td className="border border-black p-1">{data.customerName || 'N/A'}</td>
                    <td className="border border-black p-1">{data.jobNumber || 'N/A'}</td>
                    {hasVets && (
                      <>
                        <td className="border border-black p-1 text-right">{parseValue(data.numVets) || ''}</td>
                        <td className="border border-black p-1 text-right">{parseValue(data.numVets) > 0 ? formatCurrency(calc.finalPerVetPayout) : ''}</td>
                        <td className="border border-black p-1 text-right bg-green-50 font-bold">{parseValue(data.numVets) > 0 ? formatCurrency(calc.finalTotalVetsPayout) : ''}</td>
                      </>
                    )}
                    {hasReps && (
                      <>
                        <td className="border border-black p-1 text-right">{parseValue(data.numReps) || ''}</td>
                        <td className="border border-black p-1 text-right">{parseValue(data.numReps) > 0 ? formatCurrency(calc.finalPerRepPayout) : ''}</td>
                        <td className="border border-black p-1 text-right bg-purple-50 font-bold">{parseValue(data.numReps) > 0 ? formatCurrency(calc.finalTotalRepsPayout) : ''}</td>
                      </>
                    )}
                    {hasRA && (
                      <>
                        <td className="border border-black p-1 text-right">{parseValue(data.numRideAlongs) || ''}</td>
                        <td className="border border-black p-1 text-right">{parseValue(data.numRideAlongs) > 0 ? formatCurrency(calc.perRideAlongPayout) : ''}</td>
                        <td className="border border-black p-1 text-right bg-red-50 font-bold">{parseValue(data.numRideAlongs) > 0 ? formatCurrency(calc.totalRideAlongPayout) : ''}</td>
                      </>
                    )}
                    <td className="border border-black p-1 text-right bg-green-200 font-bold">{formatCurrency(calc.combinedPayout)}</td>
                    <td className="border border-black p-1 text-right bg-yellow-100 font-bold">{formatCurrency(profit)}</td>
                  </tr>
                );
              })}
              <tr className="bg-yellow-100 font-bold border-t-4 border-black">
                <td colSpan="3" className="border border-black p-1 text-right">TOTALS:</td>
                {calculators.some(c => parseValue(c.numVets) > 0) && (<><td colSpan="2" className="border border-black p-1"></td><td className="border border-black p-1 text-right bg-green-100">{formatCurrency(totalsData.totalVetPayout)}</td></>)}
                {calculators.some(c => parseValue(c.numReps) > 0) && (<><td colSpan="2" className="border border-black p-1"></td><td className="border border-black p-1 text-right bg-purple-100">{formatCurrency(totalsData.totalRepPayout)}</td></>)}
                {calculators.some(c => parseValue(c.numRideAlongs) > 0) && (<><td colSpan="2" className="border border-black p-1"></td><td className="border border-black p-1 text-right bg-red-100">{formatCurrency(totalsData.totalRideAlongPayout)}</td></>)}
                <td className="border border-black p-1 text-right bg-green-300">{formatCurrency(totalsData.totalCombinedPayout)}</td>
                <td className="border border-black p-1 text-right bg-yellow-200">{formatCurrency(totalsData.totalProfit)}</td>
              </tr>
            </tbody>
          </table>
          <div className="no-print mt-4 text-center">
            <button onClick={() => setShowReport(false)} className="bg-gray-600 text-white font-bold py-3 px-8 rounded-lg">CLOSE REPORT</button>
          </div>
        </div>
      )}

      {/* MAIN UI */}
      {!showReport && printSingleCalc === null && (
        <div className="max-w-full mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-4 border-blue-500">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-blue-800">ALTA CAL PROFIT SHARE</h1>
              <div className="flex gap-3">
                <Btn className="bg-purple-600 hover:bg-purple-700" onClick={()=>setShowSavedReports(true)}>SAVED REPORTS</Btn>
                <Btn className="bg-green-600 hover:bg-green-700" onClick={()=>setShowSaveDialog(true)}>SAVE REPORT</Btn>
                <Btn className="bg-blue-600 hover:bg-blue-700" onClick={()=>setShowReport(true)}>PRINT REPORT</Btn>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <Summary title="TOTAL VET PAYOUT" value={formatCurrency(totals.totalVetPayout)} bg="from-green-400 to-green-600" />
              <Summary title="TOTAL REP PAYOUT" value={formatCurrency(totals.totalRepPayout)} bg="from-purple-400 to-purple-600" />
              <Summary title="COMBINED PAYOUT"  value={formatCurrency(totals.totalCombinedPayout)} bg="from-blue-400 to-blue-600" />
              <Summary title="RIDE ALONG PAYOUT" value={formatCurrency(totals.totalRideAlongPayout)} bg="from-red-400 to-red-600" />
              <Summary title="TOTAL PROFIT" value={formatCurrency(totals.totalProfit)} bg="from-yellow-400 to-orange-500" />
            </div>
          </div>

          {calculators.map((calc, index) => {
            const data = calculateForOne(calc);
            return (
              <div key={calc.id} className="relative mb-6 bg-white border-4 border-gray-300 rounded-lg">
                {calculators.length > 1 && (
                  <button
                    onClick={() => setCalculators(calculators.filter(c => c.id !== calc.id))}
                    className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 z-10 shadow-lg"
                    title="Remove"
                  >×</button>
                )}

                <div className="bg-blue-300 text-center py-2 border-b-2 border-black flex justify-between items-center px-4">
                  <div className="w-8" />
                  <h2 className="text-lg font-bold">CALCULATOR #{index + 1}</h2>
                  <Btn className="bg-blue-600 hover:bg-blue-700 py-1 px-3" onClick={()=>setPrintSingleCalc(index)}>PRINT</Btn>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b-2 border-black">
                  <PlainTextInput i={index} field="customerName" label="CUSTOMER NAME" value={calc.customerName} onChange={(v,e)=>update(index,'customerName',v,e)} placeholder="Enter customer name" />
                  <PlainTextInput i={index} field="jobNumber" label="JOB NUMBER" value={calc.jobNumber} onChange={(v,e)=>update(index,'jobNumber',v,e)} placeholder="Enter job number" />
                </div>

                <div className="p-6 space-y-6">
                  <Section title="CONTRACT & PAYMENT" color="blue">
                    <div className="grid grid-cols-3 gap-4">
                      <MoneyInput i={index} field="contractAmount" label="CONTRACT AMOUNT" value={calc.contractAmount} onChange={(v,e)=>update(index,'contractAmount',v,e)} />
                      <MoneyInput i={index} field="cashCheck" label="CASH/CHECK" value={calc.cashCheck} onChange={(v,e)=>update(index,'cashCheck',v,e)} />
                      <MoneyInput i={index} field="laborMaterial" label="LABOR & MATERIAL" value={calc.laborMaterial} onChange={(v,e)=>update(index,'laborMaterial',v,e)} />
                    </div>
                  </Section>

                  <Section title="FINANCE INFO" color="green">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <MoneyInput i={index} field="financeAmount" label="FINANCE AMOUNT" value={calc.financeAmount} onChange={(v,e)=>update(index,'financeAmount',v,e)} />
                        <div className="mt-2">
                          <TextInput i={index} field="dealerFee" label="DEALER FEE" value={calc.dealerFee} onChange={(v,e)=>update(index,'dealerFee',v,e)} right="" />
                          {calc.dealerFee && parseValue(calc.financeAmount)>0 && (
                            <div className="text-center text-sm font-bold text-green-700 mt-1">
                              {formatCurrency(parseFee(calc.financeAmount, calc.dealerFee))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <MoneyInput i={index} field="creditCard" label="CREDIT CARD" value={calc.creditCard} onChange={(v,e)=>update(index,'creditCard',v,e)} />
                        <div className="mt-2">
                          <TextInput i={index} field="creditCardFee" label="CC FEE %" value={calc.creditCardFee} onChange={(v,e)=>update(index,'creditCardFee',v,e)} right="" />
                          {calc.creditCardFee && parseValue(calc.creditCard)>0 && (
                            <div className="text-center text-sm font-bold text-green-700 mt-1">
                              {formatCurrency(parseFee(calc.creditCard, calc.creditCardFee))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section title="FEES & BONUSES" color="orange">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <TextInput i={index} field="houseFeePercent" label="HOUSE FEE %" value={calc.houseFeePercent} onChange={(v,e)=>update(index,'houseFeePercent',v,e)} right="%" />
                        <div className="text-center text-lg font-bold mt-2">{formatCurrency(calculateForOne(calc).houseFeeAmount)}</div>
                      </div>
                      <MoneyInput i={index} field="rideAlong" label="RIDE ALONG FEE" value={calc.rideAlong} onChange={(v,e)=>update(index,'rideAlong',v,e)} />
                      <MoneyInput i={index} field="rideAlongBonus" label="RIDE ALONG BONUS" value={calc.rideAlongBonus} onChange={(v,e)=>update(index,'rideAlongBonus',v,e)} />
                    </div>
                  </Section>

                  <Section title="CALCULATED TOTALS" color="purple">
                    <div className="grid grid-cols-3 gap-4">
                      <Box label="TOTAL AFTER FEES" value={formatCurrency(data.totalAfterFees)} />
                      <Box label="VETS PROFIT %" value={`${data.vetRate}%`} />
                      <Box label="REP PROFIT %" value={`${data.repRate}%`} />
                    </div>
                  </Section>

                  <Section title="TEAM PAYOUTS" color="yellow">
                    <div className="grid grid-cols-3 gap-4">
                      <NumberInput i={index} field="numVets" label="VETS ON CONTRACT" value={calc.numVets} onChange={(v,e)=>update(index,'numVets',v,e)} />
                      <Box label="PER VET" value={formatCurrency(data.finalPerVetPayout)} />
                      <Box label="TOTAL VET PAYOUT" value={formatCurrency(data.finalTotalVetsPayout)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <NumberInput i={index} field="numReps" label="REPS ON CONTRACT" value={calc.numReps} onChange={(v,e)=>update(index,'numReps',v,e)} />
                      <Box label="PER REP" value={formatCurrency(data.finalPerRepPayout)} />
                      <Box label="TOTAL REP PAYOUT" value={formatCurrency(data.finalTotalRepsPayout)} />
                    </div>

                    <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-6 text-center shadow-lg mt-4">
                      <div className="text-lg font-bold text-white mb-2">COMBINED PAYOUT</div>
                      <div className="text-4xl font-bold text-white">{formatCurrency(data.combinedPayout)}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <NumberInput i={index} field="numRideAlongs" label="RIDE ALONGS ON CONTRACT" value={calc.numRideAlongs||''} onChange={(v,e)=>update(index,'numRideAlongs',v,e)} />
                      <Box label="PER RIDE ALONG" value={formatCurrency(data.perRideAlongPayout)} />
                      <Box label="TOTAL RIDE ALONG PAYOUT" value={formatCurrency(data.totalRideAlongPayout)} />
                    </div>

                    {parseValue(calc.numRideAlongs)>0 && (
                      <div className="bg-gradient-to-r from-red-400 to-red-600 rounded-lg p-6 text-center shadow-lg mt-4">
                        <div className="text-lg font-bold text-white mb-2">RIDE ALONG PAYOUT</div>
                        <div className="text-4xl font-bold text-white">{formatCurrency(data.totalRideAlongPayout)}</div>
                      </div>
                    )}
                  </Section>
                </div>
              </div>
            );
          })}

          <div className="text-center mt-6">
            <Btn
              className="bg-blue-600 hover:bg-blue-700"
              onClick={()=>{
                const newId = Math.max(...calculators.map(c=>c.id)) + 1;
                setCalculators([...calculators, {
                  id: newId,
                  customerName:'', jobNumber:'', contractAmount:'', cashCheck:'',
                  financeAmount:'', dealerFee:'', creditCard:'', creditCardFee:'',
                  houseFeePercent:'', laborMaterial:'', rideAlong:'', rideAlongBonus:'',
                  numRideAlongs:'', numVets:'', numReps:''
                }]);
              }}
            >
              ADD NEW FILE
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
