function App() {
  const [sale, setSale] = React.useState("");
  const [cost, setCost] = React.useState("");

  const saleNum = parseFloat(sale) || 0;
  const costNum = parseFloat(cost) || 0;

  const profit = saleNum - costNum;
  const costPct   = saleNum > 0 ? (costNum / saleNum) * 100 : 0;
  const profitPct = saleNum > 0 ? (profit  / saleNum) * 100 : 0;

  const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pct   = (n) => n.toFixed(1) + "%";

  return (
    <div style={{ maxWidth: 520, fontFamily: "Arial, sans-serif", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Master Calculator</h2>

      <label style={{ display: "block", margin: "8px 0 4px" }}>
        Contract Amount ($)
      </label>
      <input
        type="number"
        step="0.01"
        value={sale}
        onChange={(e) => setSale(e.target.value)}
        placeholder="e.g., 8379"
        style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
      />

      <label style={{ display: "block", margin: "12px 0 4px" }}>
        Job Cost ($)
      </label>
      <input
        type="number"
        step="0.01"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="e.g., 1669.07"
        style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
      />

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
        <div><strong>Profit ($):</strong> {money(profit)}</div>
        <div><strong>Cost %:</strong> {pct(costPct)}</div>
        <div><strong>Profit %:</strong> {pct(profitPct)}</div>
      </div>

      <p style={{ marginTop: 12, color: "#666" }}>
        Tip: Type values above to update results instantly.
      </p>
    </div>
  );
}

