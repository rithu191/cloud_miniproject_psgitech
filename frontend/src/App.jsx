
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Bell, Boxes, ChevronDown, Cloud,
  Database, DollarSign, Gauge, LayoutDashboard, LoaderCircle,
  RefreshCw, Search, Settings, ShieldCheck, TrendingUp, Server,
  CircleHelp, Download, ArrowUpDown, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import "./App.css";


const API = "http://127.0.0.1:8000";
const COLORS = ["#8B7CFF", "#35C8B5", "#F5B85C", "#5BA9FF"];

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(value ?? 0);
}

export default function App() {
  const [overview, setOverview] = useState(null);
  const [resources, setResources] = useState([]);
  const [budget, setBudget] = useState(1000);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetMessage, setBudgetMessage] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [search, setSearch] = useState("");
  const [service, setService] = useState("All services");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overviewResponse, resourcesResponse, budgetResponse] =
        await Promise.all([
          fetch(`${API}/api/overview`),
          fetch(`${API}/api/resources`),
          fetch(`${API}/api/budgets`)
        ]);

      if (!overviewResponse.ok || !resourcesResponse.ok || !budgetResponse.ok) {
        throw new Error("The API returned an error.");
      }

      const [overviewData, resourcesData, budgetData] = await Promise.all([
        overviewResponse.json(),
        resourcesResponse.json(),
        budgetResponse.json()
      ]);

      setOverview(overviewData);
      setResources(resourcesData);
      setBudget(budgetData.monthly_limit);
    } catch {
      setError("Could not connect to CloudPulse API. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBudget() {
    const amount = Number(budgetInput);

    if (!budgetInput.trim() || !Number.isFinite(amount) || amount <= 0) {
      setBudgetMessage("Enter a valid budget greater than 0.");
      return;
    }

    setSavingBudget(true);
    setBudgetMessage("");

    try {
      const response = await fetch(`${API}/api/budgets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_limit: amount })
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Could not update budget.");
      }

      const updatedBudget = await response.json();
      setBudget(updatedBudget.monthly_limit);
      setBudgetInput("");
      setBudgetMessage("Budget updated successfully.");
      await loadData();
    } catch (error) {
      setBudgetMessage(error.message || "Failed to update budget. Check the backend.");
    } finally {
      setSavingBudget(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredResources = useMemo(() => {
  const filtered = resources.filter(resource => {
    const query = search.toLowerCase();

    const matchesSearch =
      `${resource.name} ${resource.service} ${resource.region} ${resource.provider}`
        .toLowerCase()
        .includes(query);

    const matchesService =
      service === "All services" || resource.service === service;

    return matchesSearch && matchesService;
  });

  return [...filtered].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "name") {
      comparison = (a.name ?? "").localeCompare(b.name ?? "");
    } else if (sortBy === "cost") {
      comparison = Number(a.monthly_cost ?? 0) - Number(b.monthly_cost ?? 0);
    } else if (sortBy === "utilization") {
      comparison = Number(a.utilization ?? 0) - Number(b.utilization ?? 0);
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });
}, [resources, search, service, sortBy, sortDirection]);

  const serviceCosts = useMemo(() => {
    const totals = {};
    resources.forEach(resource => {
      totals[resource.service] =
        (totals[resource.service] || 0) + resource.monthly_cost;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [resources]);

  const trend = useMemo(() => {
    const current = overview?.total_monthly_cost ?? 0;
    return [
      { month: "May", cost: Math.round(current * 0.67) },
      { month: "Jun", cost: Math.round(current * 0.73) },
      { month: "Jul", cost: Math.round(current * 0.81) },
      { month: "Aug", cost: Math.round(current * 0.76) },
      { month: "Sep", cost: Math.round(current * 0.91) },
      { month: "Oct", cost: current }
    ];
  }, [overview]);

  const serviceOptions = ["All services", ...new Set(resources.map(r => r.service))];
  function exportResourcesToCSV() {
  const columns = [
    ["Resource Name", "name"],
    ["Provider", "provider"],
    ["Service", "service"],
    ["Region", "region"],
    ["Status", "status"],
    ["Utilization (%)", "utilization"],
    ["Monthly Cost (INR)", "monthly_cost"],
    ["Potentially Idle", "idle"]
  ];

  const escapeCSV = value => {
    let text = String(value ?? "");

    // Prevent spreadsheet formula injection from text fields.
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = [
    columns.map(([heading]) => escapeCSV(heading)).join(","),
    ...filteredResources.map(resource =>
      columns.map(([, key]) =>
        escapeCSV(key === "idle" ? (resource[key] ? "Yes" : "No") : resource[key])
      ).join(",")
    )
  ];

  const csv = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cloudpulse-resources.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Cloud size={23} /></div>
          <div><strong>CloudPulse</strong><span>Cloud intelligence</span></div>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace"><div className="workspace-avatar">C</div>
          <div className="workspace-copy"><strong>Cloud workspace</strong><span>Personal account</span></div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">MONITORING</div>
        <nav className="nav-list">
          <a className="nav-item active" href="#overview"><LayoutDashboard size={18} />Overview</a>
          <a className="nav-item" href="#resources"><Boxes size={18} />Resources</a>
          <a className="nav-item" href="#costs"><TrendingUp size={18} />Cost analytics</a>
          <a className="nav-item" href="#alerts"><Bell size={18} />Alerts <span className="nav-count">{resources.filter(r => r.idle).length}</span></a>
        </nav>

        <div className="nav-label">MANAGE</div>
        <nav className="nav-list">
          <a className="nav-item" href="#budget"><Gauge size={18} />Budgets</a>
          <a className="nav-item" href="#resources"><Database size={18} />Inventory</a>
          <a className="nav-item" href="#help"><Settings size={18} />Settings</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card"><CircleHelp size={19} /><div><strong>Need help?</strong><span>Explore your cloud insights</span></div></div>
          
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions">
            
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <div className="top-avatar">S</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div><div className="eyebrow">CLOUD OVERVIEW</div><h1>Your cloud at a glance</h1>
              <p>Monitor infrastructure costs, resource health and potential waste.</p></div>
            <button className="refresh-button" onClick={loadData} disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
              Refresh data
            </button>
          </section>

          {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}

          

          <section className="kpi-grid">
            <article className="kpi-card"><div className="kpi-top"><span>Total monthly spend</span><span className="kpi-icon purple"><DollarSign size={19} /></span></div>
              <div className="kpi-value">{loading ? "—" : money(overview?.total_monthly_cost)}</div><div className="kpi-foot"><span className="muted">Across all tracked resources</span></div></article>
            <article className="kpi-card"><div className="kpi-top"><span>Tracked resources</span><span className="kpi-icon blue"><Server size={19} /></span></div>
              <div className="kpi-value">{loading ? "—" : overview?.total_resources ?? 0}</div><div className="kpi-foot"><span className="positive"><Activity size={14} /> Inventory available</span></div></article>
            <article className="kpi-card"><div className="kpi-top"><span>Potentially idle</span><span className="kpi-icon amber"><AlertTriangle size={19} /></span></div>
              <div className="kpi-value">{loading ? "—" : overview?.idle_resources ?? 0}</div><div className="kpi-foot"><span className="muted">Review before taking action</span></div></article>
            <article className="kpi-card" id="budget"><div className="kpi-top"><span>Monthly budget</span><span className="kpi-icon teal"><Gauge size={19} /></span></div>
              <div className="kpi-value">{loading ? "—" : money(budget)}</div><div className="budget-progress"><span style={{ width: `${Math.min(100, budget ? (overview?.total_monthly_cost ?? 0) / budget * 100 : 0)}%` }} /></div>
              <div className="kpi-foot"><span className="muted">{budget > 0 ? Math.round(((overview?.total_monthly_cost ?? 0) / budget) * 100) : 0}% budget used</span></div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                <label htmlFor="budget-input" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>New monthly budget in rupees</label>
                <input
                  id="budget-input"
                  type="number"
                  min="1"
                  step="1"
                  value={budgetInput}
                  onChange={event => setBudgetInput(event.target.value)}
                  placeholder="New budget (₹)"
                  disabled={savingBudget}
                  style={{ minWidth: 0, width: "140px", flex: "1 1 120px", padding: "9px 10px", color: "#F3F5FC", background: "#111B2D", border: "1px solid #303D56", borderRadius: 8 }}
                />
                <button type="button" className="refresh-button" onClick={saveBudget} disabled={savingBudget || !budgetInput.trim()} style={{ padding: "9px 12px" }}>
                  {savingBudget ? "Saving…" : "Save budget"}
                </button>
              </div>
              {budgetMessage && <p role="status" style={{ margin: "8px 0 0", fontSize: 12, color: budgetMessage.includes("successfully") ? "#35C8B5" : "#F5B85C" }}>{budgetMessage}</p>}
            </article>
          </section>

          <section className="chart-grid" id="costs">
            <article className="panel cost-panel">
              <div className="panel-heading"><div><h2>Cost overview</h2><p>Monthly spend across tracked resources</p></div><span className="panel-tag">INR · DEMO</span></div>
              <div className="chart-total">{loading ? "—" : money(overview?.total_monthly_cost)} <span>current sample</span></div>
              <div className="cost-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                    <defs><linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B7CFF" stopOpacity={0.28} /><stop offset="95%" stopColor="#8B7CFF" stopOpacity={0.01} /></linearGradient></defs>
                    <CartesianGrid stroke="#263148" strokeDasharray="4 5" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8C98AE", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8C98AE", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#111B2D", border: "1px solid #303D56", borderRadius: 10, color: "#F3F5FC" }} formatter={value => [money(value), "Sample cost"]} />
                    <Area type="monotone" dataKey="cost" stroke="#9A8CFF" strokeWidth={2.5} fill="url(#costGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-foot"><span><span className="legend-dot" />Illustrative trend</span><span>Historical values are simulated</span></div>
            </article>

            <article className="panel service-panel">
              <div className="panel-heading"><div><h2>Cost by service</h2><p>Distribution of sample monthly cost</p></div><button className="more-button" onClick={() => document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" })}>Details ↗</button></div>
              <div className="donut-area">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={serviceCosts} dataKey="value" nameKey="name" innerRadius={63} outerRadius={88} paddingAngle={4} stroke="none">
                    {serviceCosts.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie><Tooltip contentStyle={{ background: "#111B2D", border: "1px solid #303D56", borderRadius: 10, color: "#F3F5FC" }} formatter={value => money(value)} /></PieChart>
                </ResponsiveContainer>
                <div className="donut-center"><strong>{loading ? "—" : money(overview?.total_monthly_cost)}</strong><span>Total spend</span></div>
              </div>
              <div className="service-legend">{serviceCosts.map((entry, index) => <div className="legend-row" key={entry.name}><span className="legend-name"><i style={{ background: COLORS[index % COLORS.length] }} />{entry.name}</span><strong>{money(entry.value)}</strong></div>)}</div>
            </article>
          </section>

          <section className="panel utilization-panel">
            <div className="panel-heading"><div><h2>Resource utilization</h2><p>Reported utilization in the current demo inventory</p></div><span className="panel-tag">UTILIZATION</span></div>
            <div className="utilization-list">{resources.slice(0, 4).map(resource => <div className="util-row" key={resource.id}><div className="util-name"><span className="resource-symbol"><Server size={16} /></span><div><strong>{resource.name}</strong><span>{resource.service} · {resource.region}</span></div></div><div className="util-bar"><span style={{ width: `${Math.max(0, Math.min(100, resource.utilization))}%` }} /></div><strong className="util-value">{resource.utilization}%</strong></div>)}
              {!resources.length && !loading && <div className="empty-state">No resources available.</div>}</div>
          </section>

          <section className="panel resources-panel" id="resources">
            <div className="panel-heading resource-heading"><div><h2>Resource inventory</h2><p>Review tracked cloud assets and potential waste</p></div><span className="resource-count">{filteredResources.length} resources</span></div>
            <div className="table-tools">
  <label className="search-box">
    <Search size={16} />
    <input
      value={search}
      onChange={event => setSearch(event.target.value)}
      placeholder="Search resources..."
    />
  </label>

  <select
    aria-label="Filter by service"
    value={service}
    onChange={event => setService(event.target.value)}
  >
    {serviceOptions.map(option => (
      <option key={option}>{option}</option>
    ))}
  </select>

  <select
    aria-label="Sort resources by"
    value={sortBy}
    onChange={event => setSortBy(event.target.value)}
  >
    <option value="name">Sort: Name</option>
    <option value="cost">Sort: Monthly cost</option>
    <option value="utilization">Sort: Utilization</option>
  </select>

  <button
    type="button"
    className="refresh-button"
    onClick={() => setSortDirection(current => current === "asc" ? "desc" : "asc")}
    aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
    title="Reverse sort order"
  >
    <ArrowUpDown size={15} />
    {sortDirection === "asc" ? "Ascending" : "Descending"}
  </button>

  <button
    type="button"
    className="refresh-button"
    onClick={exportResourcesToCSV}
    disabled={filteredResources.length === 0}
  >
    <Download size={15} />
    Export CSV
  </button>
</div>

            <div className="table-scroll"><table><thead><tr><th>RESOURCE</th><th>PROVIDER</th><th>REGION</th><th>UTILIZATION</th><th>MONTHLY COST</th><th>STATUS</th></tr></thead>
              <tbody>{filteredResources.map(resource => <tr key={resource.id}
      onClick={() => setSelectedResource(resource)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedResource(resource);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${resource.name}`}
      style={{ cursor: "pointer" }}
    ><td><div className="table-resource"><span className="table-resource-icon"><Server size={16} /></span><div><strong>{resource.name}</strong><span>{resource.service}</span></div></div></td><td><span className="provider-pill"><Cloud size={13} />{resource.provider}</span></td><td>{resource.region}</td><td><div className="table-util"><span>{resource.utilization}%</span><div><i style={{ width: `${Math.max(0, Math.min(100, resource.utilization))}%` }} /></div></div></td><td className="cost-cell">{money(resource.monthly_cost)}</td><td><span className={`status-pill ${resource.idle ? "status-warning" : "status-ok"}`}><i />{resource.idle ? "Potentially idle" : resource.status}</span></td></tr>)}</tbody>
            </table></div>
            {!filteredResources.length && <div className="empty-state">No resources match your search.</div>}
            <div className="table-footer">Showing {filteredResources.length} of {resources.length} resources <span>Source: {overview?.data_source ?? "DEMO"}</span></div>
          </section>

          <section className="panel alerts-panel" id="alerts">
            <div className="panel-heading"><div><h2>Needs your attention</h2><p>Review potential optimization opportunities</p></div><span className="alert-count">{resources.filter(r => r.idle).length} alerts</span></div>
            {resources.filter(r => r.idle).map(resource => <div className="alert-row" key={resource.id}><div className="alert-symbol"><AlertTriangle size={18} /></div><div className="alert-copy"><strong>Potentially idle resource: {resource.name}</strong><span>{resource.service} in {resource.region} has {resource.utilization}% reported utilization. Verify its usage before making changes.</span></div><strong className="alert-cost">{money(resource.monthly_cost)}<span>/month</span></strong></div>)}
            {!resources.some(r => r.idle) && <div className="empty-state">No potentially idle resources in the current inventory.</div>}
          </section>

          <footer className="page-footer"><span>CloudPulse · Cloud intelligence dashboard</span><span>Last refreshed: {overview?.last_updated ? new Date(overview.last_updated).toLocaleString() : "Not yet synced"}</span></footer>

{selectedResource && (
  <div
    className="resource-modal-overlay"
    onClick={() => setSelectedResource(null)}
  >
    <div
      className="resource-modal"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-modal-title"
    >
      <div className="resource-modal-header">
        <div>
          <h2 id="resource-modal-title">Resource Details</h2>
          <p>View your cloud resource information</p>
        </div>

        <button
          type="button"
          className="resource-modal-close"
          onClick={() => setSelectedResource(null)}
          aria-label="Close resource details"
        >
          <X size={20} />
        </button>
      </div>

      <div className="resource-modal-body">
        <div className="resource-detail-item">
          <span>Resource Name</span>
          <strong>{selectedResource.name ?? "N/A"}</strong>
        </div>

        <div className="resource-detail-item">
          <span>Provider</span>
          <strong>{selectedResource.provider ?? "N/A"}</strong>
        </div>

        <div className="resource-detail-item">
          <span>Service</span>
          <strong>{selectedResource.service ?? "N/A"}</strong>
        </div>

        <div className="resource-detail-item">
          <span>Region</span>
          <strong>{selectedResource.region ?? "N/A"}</strong>
        </div>

        <div className="resource-detail-item">
          <span>Status</span>
          <strong>{selectedResource.status ?? "N/A"}</strong>
        </div>

        <div className="resource-detail-item">
          <span>Utilization</span>
          <strong>
            {selectedResource.utilization ?? 0}%
          </strong>
        </div>

        <div className="resource-detail-item">
          <span>Monthly Cost</span>
          <strong>
            {money(selectedResource.monthly_cost ?? 0)}
          </strong>
        </div>

        <div className="resource-detail-item">
          <span>Potentially Idle</span>
          <strong>
            {selectedResource.is_idle
              ? "Yes"
              : "No"}
          </strong>
        </div>

        <div className="resource-detail-item">
          <span>Resource ID</span>
          <strong>
            {selectedResource.id ?? "N/A"}
          </strong>
        </div>
      </div>

      <div className="resource-modal-footer">
        <button
          type="button"
          onClick={() => setSelectedResource(null)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

        </div>
      </main>
    </div>
  );
}
