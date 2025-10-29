/* App.jsx — Tailwind + UMD (no imports/exports, no lucide-react) */
function App() {
  const { useState, useEffect } = React;

  // --- simple localStorage adapter (replaces window.storage if missing) ---
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
    const percent = parseFloat(String(fee).replace('%','')) || 0;
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
      combinedPayout, totalRideAlongPayout, perRideAlongPayout, profit
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

  const Btn = ({className='', ...p}) =>
    <button {...p} className={`font-bold rounded-lg px-4 py-3 text-white ${className}`} />;

  const MoneyInput = ({label, value, onChange}) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="flex items-center bg-white border-2 rounded px-3 py-3">
        <span className="mr-2">$</span>
        <input
          className="w-full text-right focus:outline-none"
          value={value||''}
          onChange={e=>onChange(e.target.value.replace(/[^0-9.]/g,''))}
        />
      </div>
    </div>
  );

  const TextInput = ({label, value, onChange, placeholder, right='%'} ) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="flex items-center bg-white border-2 rounded px-3 py-3">
        <input
          className="w-full text-right focus:outline-none"
          value={value||''}
          placeholder={placeholder||''}
          onChange={e=>onChange(e.target.value)}
        />
        {right && <span className="ml-2">{right}</span>}
      </div>
    </div>
  );

  const NumberInput = ({label, value, onChange}) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <input
        className="w-full text-center text-xl border-2 rounded px-3 py-3"
        value={value||''}
        onChange={e=>onChange(e.target.value.replace(/[^0-9]/g,''))}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
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

      {/* Saved reports */}
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

      {/* Header + summary cards */}
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
                  <Labeled label="CUSTOMER NAME">
                    <input className="w-full border-2 border-gray-300 px-3 py-2 rounded"
                      value={calc.customerName||''}
                      onChange={e=>update(index,'customerName',e.target.value)} />
                  </Labeled>
                  <Labeled label="JOB NUMBER">
                    <input className="w-full border-2 border-gray-300 px-3 py-2 rounded"
                      value={calc.jobNumber||''}
                      onChange={e=>update(index,'jobNumber',e.target.value)} />
                  </Labeled>
                </div>

                <div className="p-6 space-y-6">
                  <Section title="CONTRACT & PAYMENT" color="blue">
                    <div className="grid grid-cols-3 gap-4">
                      <MoneyInput label="CONTRACT AMOUNT" value={calc.contractAmount} onChange={v=>update(index,'contractAmount',v)} />
                      <MoneyInput label="CASH/CHECK" value={calc.cashCheck} onChange={v=>update(index,'cashCheck',v)} />
                      <MoneyInput label="LABOR & MATERIAL" value={calc.laborMaterial} onChange={v=>update(index,'laborMaterial',v)} />
                  </div>
                  </Section>

                  <Section title="FINANCE INFO" color="green">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <MoneyInput label="FINANCE AMOUNT" value={calc.financeAmount} onChange={v=>update(index,'financeAmount',v)} />
                        <div className="mt-2">
                          <TextInput label="DEALER FEE" value={calc.dealerFee} onChange={v=>update(index,'dealerFee',v)} right="" />
                          {calc.dealerFee && parseValue(calc.financeAmount)>0 && (
                            <div className="text-center text-sm font-bold text-green-700 mt-1">
                              {formatCurrency(parseFee(calc.financeAmount, calc.dealerFee))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <MoneyInput label="CREDIT CARD" value={calc.creditCard} onChange={v=>update(index,'creditCard',v)} />
                        <div className="mt-2">
                          <TextInput label="CC FEE %" value={calc.creditCardFee} onChange={v=>update(index,'creditCardFee',v)} right="" />
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
                        <TextInput label="HOUSE FEE %" value={calc.houseFeePercent} onChange={v=>update(index,'houseFeePercent',v)} right="%" />
                        <div className="text-center text-lg font-bold mt-2">{formatCurrency(data.houseFeeAmount)}</div>
                      </div>
                      <MoneyInput label="RIDE ALONG FEE" value={calc.rideAlong} onChange={v=>update(index,'rideAlong',v)} />
                      <MoneyInput label="RIDE ALONG BONUS" value={calc.rideAlongBonus} onChange={v=>update(index,'rideAlongBonus',v)} />
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
                      <NumberInput label="VETS ON CONTRACT" value={calc.numVets} onChange={v=>update(index,'numVets',v)} />
                      <Box label="PER VET" value={formatCurrency(data.finalPerVetPayout)} />
                      <Box label="TOTAL VET PAYOUT" value={formatCurrency(data.finalTotalVetsPayout)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <NumberInput label="REPS ON CONTRACT" value={calc.numReps} onChange={v=>update(index,'numReps',v)} />
                      <Box label="PER REP" value={formatCurrency(data.finalPerRepPayout)} />
                      <Box label="TOTAL REP PAYOUT" value={formatCurrency(data.finalTotalRepsPayout)} />
                    </div>

                    <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-6 text-center shadow-lg mt-4">
                      <div className="text-lg font-bold text-white mb-2">COMBINED PAYOUT</div>
                      <div className="text-4xl font-bold text-white">{formatCurrency(data.combinedPayout)}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <NumberInput label="RIDE ALONGS ON CONTRACT" value={calc.numRideAlongs||''} onChange={v=>update(index,'numRideAlongs',v)} />
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

      {/* Print views and report view from your previous file can be kept as-is (they’ll inherit Tailwind). */}
    </div>
  );

  function update(i, field, val) {
    const next = calculators.slice();
    next[i] = { ...next[i], [field]: val };
    setCalculators(next);
  }

  // --- small presentational helpers ---
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
}
