import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-me";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "data", "db.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const books = [
  { id: "b1", title: "Atomic Habits", author: "James Clear", category: "Personal Growth", year: 2018, available: 4, color: "coral", description: "A practical guide to building good habits and breaking bad ones." },
  { id: "b2", title: "The Alchemist", author: "Paulo Coelho", category: "Fiction", year: 1988, available: 3, color: "gold", description: "A shepherd's journey in search of treasure and purpose." },
  { id: "b3", title: "Clean Code", author: "Robert C. Martin", category: "Technology", year: 2008, available: 2, color: "blue", description: "A handbook of agile software craftsmanship." },
  { id: "b4", title: "Ikigai", author: "Héctor García & Francesc Miralles", category: "Wellness", year: 2016, available: 5, color: "green", description: "Japanese ideas for a meaningful and balanced life." },
  { id: "b5", title: "Sapiens", author: "Yuval Noah Harari", category: "History", year: 2011, available: 1, color: "purple", description: "A sweeping exploration of humankind's history." },
  { id: "b6", title: "The Pragmatic Programmer", author: "Andrew Hunt & David Thomas", category: "Technology", year: 1999, available: 2, color: "blue", description: "Timeless practices for effective software development." },
  { id: "b7", title: "Pride and Prejudice", author: "Jane Austen", category: "Classic", year: 1813, available: 3, color: "pink", description: "A classic novel of manners, family, and first impressions." },
  { id: "b8", title: "Deep Work", author: "Cal Newport", category: "Personal Growth", year: 2016, available: 2, color: "coral", description: "Rules for focused success in a distracted world." }
];

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { users: [], requests: [] }; }
}
function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  const value = req.headers.authorization || "";
  const token = value.startsWith("Bearer ") ? value.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please sign in to continue." });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    req.user = db.users.find(u => u.id === req.auth.id);
    if (!req.user) return res.status(401).json({ message: "Account not found." });
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
  next();
}

// Create a demo administrator once, without overwriting existing data.
const initialDb = readDb();
if (!initialDb.users.some(u => u.email === "admin@library.local")) {
  initialDb.users.push({
    id: crypto.randomUUID(), name: "Library Administrator", email: "admin@library.local",
    passwordHash: bcrypt.hashSync("Admin@123", 10), role: "admin", membership: "Staff",
    joinedAt: new Date().toISOString()
  });
  writeDb(initialDb);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "Library Membership API" }));
app.get("/api/books", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  const category = String(req.query.category || "");
  const result = books.filter(b =>
    (!q || `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(q)) &&
    (!category || category === "All" || b.category === category)
  );
  res.json({ books: result, total: result.length });
});

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2) return res.status(400).json({ message: "Please enter your full name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
  const db = readDb();
  if (db.users.some(u => u.email === email)) return res.status(409).json({ message: "An account with this email already exists." });
  const user = {
    id: crypto.randomUUID(), name, email, passwordHash: await bcrypt.hash(password, 10),
    role: "member", membership: "Standard", joinedAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const db = readDb();
  const user = db.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  res.json({ token: tokenFor(user), user: publicUser(user) });
});
app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get("/api/requests", auth, (req, res) => {
  const db = readDb();
  const items = req.user.role === "admin"
    ? db.requests
    : db.requests.filter(r => r.userId === req.user.id);
  res.json({ requests: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});
app.post("/api/requests", auth, (req, res) => {
  const book = books.find(b => b.id === req.body.bookId);
  if (!book) return res.status(400).json({ message: "Choose a valid book from the catalogue." });
  const note = String(req.body.note || "").trim().slice(0, 500);
  const db = readDb();
  const duplicate = db.requests.some(r => r.userId === req.user.id && r.bookId === book.id && ["Pending", "Approved"].includes(r.status));
  if (duplicate) return res.status(409).json({ message: "You already have an active request for this book." });
  const request = {
    id: crypto.randomUUID(), userId: req.user.id, memberName: req.user.name,
    bookId: book.id, bookTitle: book.title, author: book.author, note,
    status: "Pending", createdAt: new Date().toISOString()
  };
  db.requests.push(request);
  writeDb(db);
  res.status(201).json({ request });
});
app.patch("/api/requests/:id/status", auth, adminOnly, (req, res) => {
  const allowed = ["Pending", "Approved", "Ready for pickup", "Completed", "Rejected"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid request status." });
  const db = readDb();
  const item = db.requests.find(r => r.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Request not found." });
  item.status = req.body.status;
  item.updatedAt = new Date().toISOString();
  writeDb(db);
  res.json({ request: item });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});
app.listen(PORT, () => console.log(`Library Portal API running at http://localhost:${PORT}`));
