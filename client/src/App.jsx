import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Search, Sun, Moon, UserRound, LogOut, LibraryBig, BookmarkPlus,
  ArrowUpRight, Clock3, CheckCircle2, XCircle, LayoutDashboard, Sparkles,
  Menu, X, ChevronRight, ShieldCheck, BookMarked, Send, LoaderCircle
} from "lucide-react";

const API = "/api";
const initialCategories = ["All", "Fiction", "Technology", "Personal Growth", "Wellness", "History", "Classic"];
const coverPalette = { coral: "#e6a08d", gold: "#e8c779", blue: "#8da9c8", green: "#a8bda2", purple: "#b5a2c8", pink: "#dba6b7" };

async function api(path, options = {}) {
  const token = localStorage.getItem("library_token");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
function initials(name = "") { return name.split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase(); }
function prettyDate(value) { return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }

function App() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState("Discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [theme, setTheme] = useState(localStorage.getItem("library_theme") || "light");
  const [authMode, setAuthMode] = useState("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("library_theme", theme); }, [theme]);
  useEffect(() => { loadBooks(); if (localStorage.getItem("library_token")) loadSession(); }, []);
  useEffect(() => { if (user) loadRequests(); }, [user]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  async function loadBooks(q = query, c = category) {
    try { const data = await api(`/books?q=${encodeURIComponent(q)}&category=${encodeURIComponent(c)}`); setBooks(data.books); }
    catch (e) { setNotice({ type: "error", text: e.message }); }
  }
  async function loadSession() {
    try { const data = await api("/auth/me"); setUser(data.user); }
    catch { localStorage.removeItem("library_token"); }
  }
  async function loadRequests() {
    try { const data = await api("/requests"); setRequests(data.requests); }
    catch (e) { setNotice({ type: "error", text: e.message }); }
  }
  function notify(type, text) { setNotice({ type, text }); }
  async function handleAuth(form) {
    setBusy(true);
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const data = await api(path, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("library_token", data.token);
      setUser(data.user); setAuthOpen(false); setPage("Discover");
      notify("success", authMode === "login" ? "Welcome back!" : "Your membership is ready. Welcome to the library!");
    } catch (e) { notify("error", e.message); }
    finally { setBusy(false); }
  }
  function logout() {
    localStorage.removeItem("library_token"); setUser(null); setRequests([]); setPage("Discover");
    notify("success", "You have been signed out.");
  }
  async function submitRequest(book, note) {
    if (!user) { setSelectedBook(book); setAuthMode("login"); setAuthOpen(true); return; }
    setBusy(true);
    try {
      await api("/requests", { method: "POST", body: JSON.stringify({ bookId: book.id, note }) });
      await loadRequests(); setSelectedBook(null); notify("success", `Request submitted for “${book.title}”.`);
    } catch (e) { notify("error", e.message); }
    finally { setBusy(false); }
  }
  async function updateStatus(id, status) {
    try { await api(`/requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await loadRequests(); notify("success", "Request status updated."); }
    catch (e) { notify("error", e.message); }
  }

  const activeRequests = requests.filter(r => ["Pending", "Approved", "Ready for pickup"].includes(r.status));
  const categories = useMemo(() => initialCategories, []);
  const navItems = user?.role === "admin" ? ["Discover", "Requests", "Admin"] : ["Discover", "My Requests", "Membership"];
  const filteredCount = books.length;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setPage("Discover")} aria-label="Go to home">
        <span className="brand-mark"><BookOpen size={21} strokeWidth={1.8} /></span>
        <span className="brand-copy"><strong>chapter<span>&</span>co.</strong><small>YOUR NEIGHBORHOOD LIBRARY</small></span>
      </button>
      <button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">{mobileNav ? <X /> : <Menu />}</button>
      <nav className={`main-nav ${mobileNav ? "nav-open" : ""}`}>
        {navItems.map(item => <button key={item} className={`nav-link ${page === item ? "active" : ""}`} onClick={() => { setPage(item); setMobileNav(false); }}>{item}</button>)}
      </nav>
      <div className="top-actions">
        <button className="icon-button theme-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle theme">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
        {user ? <div className="user-menu"><div className="avatar">{initials(user.name)}</div><div className="user-meta"><strong>{user.name.split(" ")[0]}</strong><span>{user.role === "admin" ? "Administrator" : "Library member"}</span></div><button className="icon-button logout" onClick={logout} title="Sign out"><LogOut size={17} /></button></div>
          : <button className="button button-dark sign-in" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Sign in <ArrowUpRight size={16} /></button>}
      </div>
    </header>

    <main>
      {page === "Discover" && <section className="discover-page">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line"></span> A LITTLE SPACE FOR BIG IDEAS</div>
            <h1>Find your next<br /><em>great read.</em></h1>
            <p className="hero-description">A good book can take you anywhere. Explore our shelves, request a title, and let curiosity lead the way.</p>
            <button className="button button-dark hero-cta" onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })}>Explore the collection <ChevronRight size={17} /></button>
            <div className="hero-footnote"><span className="avatar-stack"><i>J</i><i>M</i><i>A</i></span><span>For curious minds, of every kind.</span></div>
          </div>
          <div className="hero-art">
            <div className="sun-disc"></div><div className="art-caption">THE ART OF<br />SLOW LIVING</div>
            <div className="hero-book book-one"><span>THE<br />CREATIVE<br />ACT</span><small>RICK RUBIN</small></div>
            <div className="hero-book book-two"><span>Ways of<br />Seeing</span><small>JOHN BERGER</small></div>
            <div className="hero-book book-three"><span>THE<br />BOOK OF<br />JOY</span><small>DALAI LAMA</small></div>
            <div className="plant"><i></i><i></i><i></i><i></i><b></b></div>
            <div className="art-note"><Sparkles size={15} /> Make room for wonder</div>
          </div>
        </div>

        <div className="stats-strip">
          <div><span className="stat-icon"><LibraryBig size={19} /></span><div><strong>Curated shelves</strong><small>Thoughtfully selected titles</small></div></div>
          <div><span className="stat-icon"><BookmarkPlus size={19} /></span><div><strong>Easy book requests</strong><small>Ask for the book you want</small></div></div>
          <div><span className="stat-icon"><Clock3 size={19} /></span><div><strong>Track every request</strong><small>Updates from your dashboard</small></div></div>
        </div>

        <section className="catalogue section-wrap" id="catalogue">
          <div className="section-heading"><div><div className="eyebrow">THE COLLECTION</div><h2>Stories worth <em>sharing.</em></h2></div><span className="results-count">{filteredCount} titles to explore</span></div>
          <div className="catalogue-controls">
            <div className="search-box"><Search size={18} /><input value={query} onChange={e => { setQuery(e.target.value); loadBooks(e.target.value, category); }} placeholder="Search title, author, or topic..." /></div>
            <div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? "selected" : ""} onClick={() => { setCategory(c); loadBooks(query, c); }}>{c}</button>)}</div>
          </div>
          <div className="book-grid">
            {books.map((book, index) => <BookCard key={book.id} book={book} index={index} onRequest={() => setSelectedBook(book)} />)}
            {!books.length && <div className="empty-state"><Search size={25} /><h3>No books found</h3><p>Try a different title or category.</p><button className="button button-outline" onClick={() => { setQuery(""); setCategory("All"); loadBooks("", "All"); }}>Clear filters</button></div>}
          </div>
        </section>
      </section>}

      {page === "My Requests" && <section className="dashboard-page section-wrap">
        <PageTitle eyebrow="YOUR READING JOURNEY" title="My requests." subtitle="Keep an eye on the books you've asked for." />
        <div className="metric-grid"><Metric icon={<BookmarkPlus />} label="Total requests" value={requests.length} /><Metric icon={<Clock3 />} label="In progress" value={activeRequests.length} /><Metric icon={<CheckCircle2 />} label="Completed" value={requests.filter(r => r.status === "Completed").length} /></div>
        <RequestsTable requests={requests} />
        <button className="button button-dark" onClick={() => setPage("Discover")}>Discover more books <ChevronRight size={16} /></button>
      </section>}

      {page === "Membership" && <section className="dashboard-page section-wrap">
        <PageTitle eyebrow="YOUR MEMBERSHIP" title="Welcome to the club." subtitle="A little more room for the things you love to learn." />
        <div className="membership-card"><div className="membership-card-top"><span className="membership-logo"><BookOpen /></span><span className="membership-pill">ACTIVE MEMBER</span></div><div><div className="membership-label">CHAPTER & CO. · {user?.membership || "STANDARD"}</div><h2>{user?.name}</h2><p>{user?.email}</p></div><div className="membership-card-bottom"><span>MEMBER SINCE {user?.joinedAt ? prettyDate(user.joinedAt).toUpperCase() : "TODAY"}</span><span className="member-number">MEMBER · {user?.id?.slice(0, 8).toUpperCase()}</span></div></div>
        <div className="membership-info-grid"><div className="info-card"><ShieldCheck /><h3>Your membership</h3><p>You're part of a community built around curiosity, learning, and sharing great books.</p></div><div className="info-card"><BookMarked /><h3>Request a title</h3><p>Choose a book from our catalogue and send a request. We'll update its status as it moves along.</p></div></div>
      </section>}

      {page === "Requests" && user?.role === "admin" && <section className="dashboard-page section-wrap"><PageTitle eyebrow="LIBRARY OPERATIONS" title="Book requests." subtitle="Review member requests and keep the shelves moving." /><div className="metric-grid"><Metric icon={<BookmarkPlus />} label="All requests" value={requests.length} /><Metric icon={<Clock3 />} label="Pending review" value={requests.filter(r => r.status === "Pending").length} /><Metric icon={<CheckCircle2 />} label="Completed" value={requests.filter(r => r.status === "Completed").length} /></div><RequestsTable requests={requests} admin onUpdate={updateStatus} /></section>}

      {page === "Admin" && user?.role === "admin" && <section className="dashboard-page section-wrap"><PageTitle eyebrow="ADMINISTRATION" title="Library overview." subtitle="A quick view of your community's reading activity." /><div className="metric-grid"><Metric icon={<UserRound />} label="Your role" value="Admin" /><Metric icon={<BookmarkPlus />} label="Total requests" value={requests.length} /><Metric icon={<Clock3 />} label="Pending requests" value={requests.filter(r => r.status === "Pending").length} /></div><div className="admin-callout"><div className="admin-callout-icon"><LayoutDashboard /></div><div><h3>Everything in one place</h3><p>Review requests, approve titles, and update members when books are ready for pickup.</p></div><button className="button button-dark" onClick={() => setPage("Requests")}>Manage requests <ChevronRight size={16} /></button></div></section>}
    </main>

    <footer className="footer"><div className="footer-brand"><BookOpen size={18} /> chapter<span>&</span>co.</div><p>Made for readers, thinkers, and lifelong learners.</p><span>© 2026 Chapter & Co. Library</span></footer>

    {notice && <div className={`toast ${notice.type}`}><span>{notice.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}</span>{notice.text}<button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={15} /></button></div>}
    {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} busy={busy} />}
    {selectedBook && <RequestModal book={selectedBook} onClose={() => setSelectedBook(null)} onSubmit={submitRequest} busy={busy} user={user} />}
  </div>;
}

function BookCard({ book, index, onRequest }) {
  const palettes = { coral: "cover-coral", gold: "cover-gold", blue: "cover-blue", green: "cover-green", purple: "cover-purple", pink: "cover-pink" };
  const covers = {
    "Atomic Habits": ["ATOMIC", "HABITS", "JAMES CLEAR"], "The Alchemist": ["THE", "ALCHEMIST", "PAULO COELHO"],
    "Clean Code": ["CLEAN", "CODE", "ROBERT C. MARTIN"], "Ikigai": ["IKIGAI", "THE JAPANESE SECRET", "GARCÍA & MIRALLES"],
    "Sapiens": ["SAPIENS", "A BRIEF HISTORY", "YUVAL NOAH HARARI"], "The Pragmatic Programmer": ["THE PRAGMATIC", "PROGRAMMER", "HUNT & THOMAS"],
    "Pride and Prejudice": ["PRIDE AND", "PREJUDICE", "JANE AUSTEN"], "Deep Work": ["DEEP", "WORK", "CAL NEWPORT"]
  };
  const cover = covers[book.title] || [book.title.toUpperCase(), book.category.toUpperCase(), book.author.toUpperCase()];
  return <article className="book-card" style={{ animationDelay: `${index * 55}ms` }}>
    <div className={`book-cover ${palettes[book.color] || "cover-blue"}`}>
      <span className="cover-topline">{book.category} · {book.year}</span><div className="cover-art-circle"></div><div className="cover-title">{cover[0]}<br />{cover[1]}</div><div className="cover-author">{cover[2]}</div><div className="cover-spine"></div>
    </div>
    <div className="book-info"><span className="book-category">{book.category}</span><h3>{book.title}</h3><p>by {book.author}</p><div className="book-card-bottom"><span className="availability"><i></i>{book.available} available</span><button className="request-button" onClick={onRequest} aria-label={`Request ${book.title}`}><BookmarkPlus size={17} /></button></div></div>
  </article>;
}
function PageTitle({ eyebrow, title, subtitle }) { return <div className="page-title"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>; }
function Metric({ icon, label, value }) { return <div className="metric-card"><span className="metric-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></div>; }
function RequestsTable({ requests, admin = false, onUpdate }) {
  if (!requests.length) return <div className="empty-state request-empty"><BookOpen size={28} /><h3>Your shelf is waiting</h3><p>When you request a book, it'll show up here.</p></div>;
  return <div className="table-wrap"><table><thead><tr>{admin && <th>Member</th>}<th>Book</th><th>Requested</th><th>Status</th>{admin && <th>Update status</th>}</tr></thead><tbody>{requests.map(r => <tr key={r.id}>{admin && <td><strong>{r.memberName}</strong></td>}<td><strong>{r.bookTitle}</strong><small>{r.author}</small></td><td>{prettyDate(r.createdAt)}</td><td><span className={`status status-${r.status.toLowerCase().replaceAll(" ", "-")}`}>{r.status}</span></td>{admin && <td><select value={r.status} onChange={e => onUpdate(r.id, e.target.value)}>{["Pending", "Approved", "Ready for pickup", "Completed", "Rejected"].map(s => <option key={s}>{s}</option>)}</select></td>}</tr>)}</tbody></table></div>;
}
function AuthModal({ mode, setMode, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal auth-modal">
    <button className="modal-close icon-button" onClick={onClose}><X size={19} /></button><div className="modal-symbol"><BookOpen size={24} /></div>
    <div className="eyebrow">{mode === "login" ? "GOOD TO SEE YOU AGAIN" : "YOUR NEXT CHAPTER STARTS HERE"}</div><h2>{mode === "login" ? "Welcome back." : "Join the library."}</h2><p className="modal-intro">{mode === "login" ? "Sign in to manage your requests and keep reading." : "Create your free member account to request books."}</p>
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      {mode === "register" && <label>Full name<input name="name" value={form.name} onChange={change} placeholder="Your name" autoComplete="name" required minLength="2" /></label>}
      <label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="you@example.com" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" value={form.password} onChange={change} placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} /></label>
      <button className="button button-dark modal-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{mode === "login" ? "Sign in" : "Create account"} <ArrowUpRight size={16} /></button>
    </form>
    <div className="auth-switch">{mode === "login" ? "New to the library?" : "Already a member?"} <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Sign in"}</button></div>
    {mode === "login" && <p className="demo-hint">Demo admin: admin@library.local · Admin@123</p>}
  </section></div>;
}
function RequestModal({ book, onClose, onSubmit, busy, user }) {
  const [note, setNote] = useState("");
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal request-modal">
    <button className="modal-close icon-button" onClick={onClose}><X size={19} /></button><div className="request-modal-cover"><BookOpen size={28} /></div>
    <div className="eyebrow">BOOK REQUEST</div><h2>{book.title}</h2><p className="request-author">by {book.author}</p><p className="modal-intro">Send a request to your library team. You can track updates from your dashboard.</p>
    <label>Note for the librarian <span className="optional">(optional)</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Anything you'd like us to know?" rows={3} /></label>
    <button className="button button-dark modal-submit" disabled={busy} onClick={() => onSubmit(book, note)}>{busy ? <LoaderCircle className="spin" size={17} /> : <Send size={16} />}{user ? "Submit book request" : "Sign in to request"} <ArrowUpRight size={16} /></button>
    {!user && <p className="demo-hint">You'll need a free member account to submit a request.</p>}
  </section></div>;
}

export default App;
