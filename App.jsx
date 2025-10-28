/* Browser-friendly App.jsx: no imports/exports; works with React UMD + Babel.
   Also provides a tiny localStorage adapter to replace window.storage. */

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
    customerName: '', jobNumber: '', contractAmount: '', cashCheck: '',
    financeAmount: '', dealerFee: '', creditCard: '', creditCardFee: '',
    houseFeePercent: '', laborMaterial: '', rideAlong: '', rideAlongBonus: '',
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
        const data = await window.storage.get(key);
        if (data && data.value) reports.push({ key, ...JSON.parse(data.value) });
      }
      setSavedReports(reports);
    } catch { setSavedReports([]); }
  }

  async function saveReport() {
    if (!reportName.trim()) { alert('Please enter a report name'); return; }
    const key = `report:${Date.now()}`;
    const payload = { name: reportName, date: new Date().toISOString(), calculators };
    await window.storage.set(key, JSON.stringify(payload));
    setShowSaveDialog(false); setReportName(''); loadSavedReports(); alert('Report saved!');
  }

  async function deleteReport(key) {
    const next = savedReports.filter(r => r.key !== key);
    setSavedReports(next);
    try { await window.storage.delete(key); } catch {}
    setDeleteConfirm(null);
  }

  const money = n => (isNaN(n) ? '$0.00' :
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
  const num = v => {
    if (v === '' || v === null || v === undefined) return 0;
    const p = parseFloat(String(v).replace(/[,$]/g, ''));
    return isNaN(p) ? 0 : p;
  };
  const pctFee = (amt, feeStr) => {
    if (!feeStr) return 0;
    const p = parseFloat(String(feeStr).replace('%', '')) || 0;
    return Math.round((num(amt) * p / 100) * 100) / 100;
  };

  function calcOne(c) {
    const contractAmount = num(c.contractAmount);
    const houseFeeAmount = contractAmount * (num(c.houseFeePercent) / 100);

    const dealerFeeAmount = pctFee(c.financeAmount, c.dealerFee);
    const ccFeeAmount     = pctFee(c.creditCard, c.creditCardFee);

    const totalPayments = num(c.cashCheck) + num(c.financeAmount) + num(c.creditCard);
    const afterHouseFee = totalPayments - houseFeeAmount;
    const totalAfterFees = afterHouseFee - num(c.laborMaterial);
    const percentOfContract = afterHouseFee > 0 ? (totalAfterFees / afterHouseFee) * 100 : 0;

    let vetRate = 25; if (percentOfContract >= 50) vetRate = 55; else if (percentOfContract >= 40) vetRate = 45; else if (percentOfContract >= 33) vetRate = 35;
    let repRate = 20; if (percentOfContract >= 50) repRate = 40; else if (percentOfContract >= 40) repRate = 30; else if (percentOfContract >= 33) repRate = 25;

    const vets = num(c.numVets), reps = num(c.numReps), people = vets + reps;
    const vetCommissionTotal = totalAfterFees * (vetRate / 100);
    const repCommissionTotal = totalAfterFees * (repRate / 100);
    const perVetPayout = people ? vetCommissionTotal / people : 0;
    const perRepPayout = people ? repCommissionTotal / people : 0;

    const rideAlongFee = num(c.rideAlong);
    const rideAlongBonus = num(c.rideAlongBonus);
    const perPersonRA = people ? rideAlongFee / people : 0;

    const perPersonDealer = people ? dealerFeeAmount / people : 0;
    const perPersonCC     = people ? ccFeeAmount / people : 0;

    const finalPerVet = perVetPayout - perPersonRA - perPersonDealer - perPersonCC;
    const finalPerRep = perRepPayout - perPersonRA - perPersonDealer - perPersonCC;

    const finalTotalVets = finalPerVet * vets;
    const finalTotalReps = finalPerRep * reps;

    const combinedPayout = finalTotalVets + finalTotalReps;
    const totalRideAlongPayout = rideAlongFee + rideAlongBonus;

    const remaining = totalAfterFees - (perVetPayout * vets) - (perRepPayout * reps);
    const profit = houseFeeAmount + rideAlongFee + remaining - rideAlongBonus;

    return {
      houseFeeAmount, totalAfterFees, percentOfContract,
      vetRate, repRate, perVetPayout, perRepPayout,
      rideAlongFeePerPerson: perPersonRA,
      dealerFeePerPerson: perPersonDealer, creditCardFeePerPerson: perPersonCC,
      finalPerVetPayout: finalPerVet, finalPerRepPayout: finalPerRep,
      finalTotalVetsPayout: finalTotalVets, finalTotalRepsPayout: finalTotalReps,
      combinedPayout, totalRideAlongPayout, perRideAlongPayout: perPersonRA,
      profit
    };
  }

  function calcTotals() {
    let vets=0, reps=0, ras=0, after=0;
    calculators.forEach(c => {
      const r = calcOne(c);
      vets += r.finalTotalVetsPayout; reps += r.finalTotalRepsPayout;
      ras  += r.totalRideAlongPayout; after += r.totalAfterFees;
    });
    return { totalVetPayout: vets, totalRepPayout: reps,
             totalCombinedPayout: vets + reps,
             totalRideAlongPayout: ras,
             totalProfit: after - vets - reps - ras };
  }

  const totals = calcTotals();

  // NOTE: We removed icon components; using text labels instead.
  const IconBtn = ({label, onClick, color}) => (
    <button onClick={onClick}
      style={{background: color||'#2563eb', color:'#fff', fontWeight:'700',
              padding:'10px 16px', borderRadius:8, border:'none', cursor:'pointer'}}>
      {label}
    </button>
  );

  return (
    <div style={{minHeight:'100vh', background:'#f3f4f6', padding:16, fontFamily:'Arial, sans-serif'}}>
      <div style={{maxWidth:1200, margin:'0 auto'}}>
        <div style={{background:'#fff', border:'4px solid #3b82f6', borderRadius:12, padding:16, marginBottom:24}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
            <h1 style={{margin:0, color:'#1e40af'}}>ALTA CAL PROFIT SHARE</h1>
            <div style={{display:'flex', gap:8}}>
              <IconBtn label="SAVED REPORTS" color="#7c3aed" onClick={()=>setShowSavedReports(true)} />
              <IconBtn label="SAVE REPORT"   color="#16a34a" onClick={()=>setShowSaveDialog(true)} />
              <IconBtn label="PRINT REPORT"  color="#2563eb" onClick={()=>setShowReport(true)} />
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12}}>
            <Card title="TOTAL VET PAYOUT" value={money(totals.totalVetPayout)} bg="#22c55e" />
            <Card title="TOTAL REP PAYOUT" value={money(totals.totalRepPayout)} bg="#a855f7" />
            <Card title="COMBINED PAYOUT"  value={money(totals.totalCombinedPayout)} bg="#3b82f6" />
            <Card title="RIDE ALONG PAYOUT" value={money(totals.totalRideAlongPayout)} bg="#ef4444" />
            <Card title="TOTAL PROFIT" value={money(totals.totalProfit)} bg="#f59e0b" />
          </div>
        </div>

        {calculators.map((c, i) => {
          const r = calcOne(c);
          return (
            <div key={c.id} style={{position:'relative', marginBottom:24, background:'#fff',
              border:'4px solid #d1d5db', borderRadius:12}}>
              {calculators.length > 1 && (
                <button onClick={()=>setCalculators(calculators.filter(x=>x.id!==c.id))}
                  style={{position:'absolute', right:-10, top:-10, background:'#dc2626', color:'#fff',
                    border:'none', borderRadius:'9999px', width:36, height:36, cursor:'pointer'}} title="Remove">×</button>
              )}

              <div style={{background:'#93c5fd', borderBottom:'2px solid #000', display:'flex',
                justifyContent:'space-between', alignItems:'center', padding:'8px 12px'}}>
                <div style={{width:24}} />
                <h2 style={{margin:0}}>CALCULATOR #{i+1}</h2>
                <IconBtn label="PRINT" onClick={()=>setPrintSingleCalc(i)} />
              </div>

              <Section title="CONTRACT & PAYMENT">
                <Grid3>
                  <MoneyInput label="CONTRACT AMOUNT" value={c.contractAmount}
                    onChange={v=>update(i,'contractAmount',v)} />
                  <MoneyInput label="CASH/CHECK" value={c.cashCheck}
                    onChange={v=>update(i,'cashCheck',v)} />
                  <MoneyInput label="LABOR & MATERIAL" value={c.laborMaterial}
                    onChange={v=>update(i,'laborMaterial',v)} />
                </Grid3>
              </Section>

              <Section title="FINANCE INFO" color="#10b981">
                <Grid2>
                  <div>
                    <MoneyInput label="FINANCE AMOUNT" value={c.financeAmount}
                      onChange={v=>update(i,'financeAmount',v)} />
                    <TextInput label="DEALER FEE (%)" value={c.dealerFee}
                      onChange={v=>update(i,'dealerFee',v)} placeholder="e.g., 3.5" />
                    {c.dealerFee && num(c.financeAmount)>0 && (
                      <Center small>Dealer fee = {money(pctFee(c.financeAmount, c.dealerFee))}</Center>
                    )}
                  </div>
                  <div>
                    <MoneyInput label="CREDIT CARD" value={c.creditCard}
                      onChange={v=>update(i,'creditCard',v)} />
                    <TextInput label="CC FEE (%)" value={c.creditCardFee}
                      onChange={v=>update(i,'creditCardFee',v)} />
                    {c.creditCardFee && num(c.creditCard)>0 && (
                      <Center small>CC fee = {money(pctFee(c.creditCard, c.creditCardFee))}</Center>
                    )}
                  </div>
                </Grid2>
              </Section>

              <Section title="FEES & BONUSES" color="#fb923c">
                <Grid3>
                  <div>
                    <TextInput label="HOUSE FEE %" value={c.houseFeePercent}
                      onChange={v=>update(i,'houseFeePercent',v)} />
                    <Center>Amount: <b>{money(r.houseFeeAmount)}</b></Center>
                  </div>
                  <MoneyInput label="RIDE ALONG FEE" value={c.rideAlong}
                    onChange={v=>update(i,'rideAlong',v)} />
                  <MoneyInput label="RIDE ALONG BONUS" value={c.rideAlongBonus}
                    onChange={v=>update(i,'rideAlongBonus',v)} />
                </Grid3>
              </Section>

              <Section title="CALCULATED TOTALS" color="#a78bfa">
                <Grid3>
                  <SummaryCard label="TOTAL AFTER FEES" value={money(r.totalAfterFees)} />
                  <SummaryCard label="VETS PROFIT %" value={`${r.vetRate}%`} />
                  <SummaryCard label="REP PROFIT %"  value={`${r.repRate}%`} />
                </Grid3>
              </Section>

              <Section title="TEAM PAYOUTS" color="#facc15">
                <Grid3>
                  <NumberInput label="VETS ON CONTRACT" value={c.numVets}
                    onChange={v=>update(i,'numVets',v)} />
                  <SummaryCard label="PER VET" value={money(r.finalPerVetPayout)} />
                  <SummaryCard label="TOTAL VET PAYOUT" value={money(r.finalTotalVetsPayout)} />
                </Grid3>

                <Grid3>
                  <NumberInput label="REPS ON CONTRACT" value={c.numReps}
                    onChange={v=>update(i,'numReps',v)} />
                  <SummaryCard label="PER REP" value={money(r.finalPerRepPayout)} />
                  <SummaryCard label="TOTAL REP PAYOUT" value={money(r.finalTotalRepsPayout)} />
                </Grid3>

                <Center big bg="#22c55e">COMBINED PAYOUT — {money(r.combinedPayout)}</Center>

                <Grid3>
                  <NumberInput label="RIDE ALONGS ON CONTRACT" value={c.numRideAlongs}
                    onChange={v=>update(i,'numRideAlongs',v)} />
                  <SummaryCard label="PER RIDE ALONG" value={money(r.perRideAlongPayout)} />
                  <SummaryCard label="TOTAL RIDE ALONG PAYOUT" value={money(r.totalRideAlongPayout)} />
                </Grid3>

                {num(c.numRideAlongs)>0 && (
                  <Center big bg="#ef4444">RIDE ALONG PAYOUT — {money(r.totalRideAlongPayout)}</Center>
                )}
              </Section>
            </div>
          );
        })}

        <div style={{textAlign:'center', marginTop:24}}>
          <IconBtn label="ADD NEW FILE" onClick={()=>{
            const newId = Math.max(...calculators.map(x=>x.id)) + 1;
            setCalculators([...calculators, {...calculators[0], id:newId}]);
          }} />
        </div>
      </div>

      {/* Modals (save / saved / print & report) — unchanged; keep your originals or build later */}
    </div>
  );

  function update(i, field, raw) {
    const sanitized = String(raw).replace(/[^0-9.]/g, '');
    const next = calculators.slice();
    next[i] = { ...next[i], [field]: sanitized };
    setCalculators(next);
  }
}

/* ——— Small presentational helpers ——— */
function Card({title, value, bg}) {
  return (
    <div style={{background: bg, color:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 6px rgba(0,0,0,.15)'}}>
      <div style={{fontSize:12, fontWeight:700, marginBottom:6}}>{title}</div>
      <div style={{fontSize:24, fontWeight:800}}>{value}</div>
    </div>
  );
}
function Section({title, children, color}) {
  return (
    <div style={{background:'#fff7', border:'4px solid '+(color||'#93c5fd'), borderRadius:12, padding:16, margin:16}}>
      <h3 style={{textAlign:'center', marginTop:0}}>{title}</h3>
      {children}
    </div>
  );
}
const row = { display:'grid', gap:12 };
function Grid2({children}) { return <div style={{...row, gridTemplateColumns:'1fr 1fr'}}>{children}</div>; }
function Grid3({children}) { return <div style={{...row, gridTemplateColumns:'1fr 1fr 1fr'}}>{children}</div>; }

function Label({children}) { return <label style={{display:'block', fontWeight:700, fontSize:12, marginBottom:6}}>{children}</label>; }
function MoneyInput({label, value, onChange}) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{display:'flex', alignItems:'center', border:'2px solid #d1d5db', borderRadius:8, padding:'10px 12px', background:'#fff'}}>
        <span style={{marginRight:8}}>$</span>
        <input value={value||''} onChange={e=>onChange(e.target.value)}
               style={{width:'100%', textAlign:'right', border:'none', outline:'none', fontSize:16}} />
      </div>
    </div>
  );
}
function TextInput({label, value, onChange, placeholder}) {
  return (
    <div>
      <Label>{label}</Label>
      <input value={value||''} placeholder={placeholder||''}
             onChange={e=>onChange(e.target.value)}
             style={{width:'100%', textAlign:'right', border:'2px solid #d1d5db', borderRadius:8, padding:'10px 12px', background:'#fff'}} />
    </div>
  );
}
function NumberInput({label, value, onChange}) {
  return (
    <div>
      <Label>{label}</Label>
      <input value={value||''} onChange={e=>onChange(e.target.value)}
             style={{width:'100%', textAlign:'center', border:'2px solid #d1d5db', borderRadius:8, padding:'10px 12px', background:'#fff', fontSize:18}} />
    </div>
  );
}
function SummaryCard({label, value}) {
  return (
    <div style={{background:'#fff', border:'2px solid #e5e7eb', borderRadius:12, padding:16, textAlign:'center'}}>
      <div style={{fontSize:12, fontWeight:700, marginBottom:6}}>{label}</div>
      <div style={{fontSize:24, fontWeight:800}}>{value}</div>
    </div>
  );
}
function Center({children, small, big, bg}) {
  return (
    <div style={{textAlign:'center', padding: big?16:8, margin:'8px 0',
      background:bg||'transparent', color: bg?'#fff':'inherit', fontWeight:700,
      fontSize: big?24:(small?12:16), borderRadius: bg?12:0}}>
      {children}
    </div>
  );
}
