import { useState, useMemo } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const SCHOOLS = ["All", "SPS", "SCS", "SBS", "SMS", "SCS-CS", "SEPS", "SHSS"];

const MOCK_PROFS = [
  {
    id: 1,
    name: "Prof. Bedangadas Mohanty",
    school: "SPS",
    rank: "Senior Professor",
    positions: ["Chairperson CMRP"],
    courses: [],
  },
  {
    id: 2,
    name: "Prof. Sanjay Kumar Swain",
    school: "SPS",
    rank: "Professor",
    positions: [],
    courses: [],
  },
  {
    id: 3,
    name: "Prof. Subhankar Bedanta",
    school: "SPS",
    rank: "Professor",
    positions: ["Chief Coordinator CIS"],
    courses: [],
  },
  {
    id: 4,
    name: "Prof. Ashok Mohapatra",
    school: "SPS",
    rank: "Associate Professor",
    positions: ["Dean Student Affairs"],
    courses: [],
  },
  {
    id: 5,
    name: "Prof. Kartikeswar Senapati",
    school: "SPS",
    rank: "Associate Professor",
    positions: ["Chairperson SPS"],
    courses: [],
  },
];

function generateMockRatings(profId, count = 40) {
  const ratings = [];
  const now = Date.now();
  const comments = [
    "Explains concepts with real clarity. Office hours are genuinely helpful and he never makes you feel stupid for asking basic questions.",
    "Lectures can be dense but the course structure is excellent. If you keep up with readings you'll be fine.",
    "Very approachable professor. The exams are tough but fair — everything comes from class. Make sure to attend.",
    "Incredibly passionate about the subject which makes the 8am slots bearable. Research perspective adds depth.",
    "Grading is strict but fair. Clear rubrics, always available on email, responds within a day usually.",
    "The course workload is heavy but the learning is real. Would recommend if you're serious about the subject.",
    "Mid-semester chaos but the final weeks come together. Better than reputation suggests.",
  ];
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const score = Math.floor(Math.random() * 4) + 6 + (profId % 3 === 0 ? 1 : 0);
    ratings.push({
      id: i,
      profId,
      score: Math.min(10, score),
      comment: comments[i % comments.length],
      name: ["A student", "Anonymous", "Final year", "A batchmate", "Alumnus"][i % 5],
      isSelf: i % 17 === 0,
      timestamp: now - daysAgo * 86400000,
    });
  }
  return ratings.sort((a, b) => b.timestamp - a.timestamp);
}

const ALL_RATINGS = {};
MOCK_PROFS.forEach((p) => { ALL_RATINGS[p.id] = generateMockRatings(p.id); });

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + r.score, 0) / arr.length;
}

function filterByDays(ratings, days) {
  const cutoff = Date.now() - days * 86400000;
  return ratings.filter((r) => r.timestamp >= cutoff);
}

function getChartData(ratings, days) {
  const buckets = {};
  const cutoff = Date.now() - days * 86400000;
  const filtered = ratings.filter((r) => r.timestamp >= cutoff);
  filtered.forEach((r) => {
    const d = new Date(r.timestamp);
    const key = days <= 30
      ? `${d.getDate()}/${d.getMonth() + 1}`
      : `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("default", { month: "short" })}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(r.score);
  });
  return Object.entries(buckets)
    .map(([label, scores]) => ({ label, avg: avg(scores.map((s) => ({ score: s }))) }))
    .slice(-12);
}

function ScoreBadge({ score }) {
  const color = score >= 8 ? "#2d6a4f" : score >= 6 ? "#b5830f" : "#9b2335";
  return (
    <span style={{
      display: "inline-block", minWidth: 40, padding: "2px 8px",
      borderRadius: 4, background: color, color: "#fff",
      fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15,
      textAlign: "center",
    }}>{score.toFixed(1)}</span>
  );
}

function MiniChart({ data, theme }) {
  if (!data.length) return <div style={{ color: theme.subtext, fontSize: 13 }}>No data</div>;
  const max = 10, min = 0;
  const W = 260, H = 60;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * W;
    const y = H - ((d.avg - min) / (max - min)) * H;
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={theme.green} strokeWidth={2} />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * W;
        const y = H - ((d.avg - min) / (max - min)) * H;
        return <circle key={i} cx={x} cy={y} r={3} fill={theme.green} />;
      })}
    </svg>
  );
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "All", days: 9999 },
];

// ─── RATING FORM ─────────────────────────────────────────────────────────────

function RatingForm({ profId, onSubmit, theme }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [isSelf, setIsSelf] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hover, setHover] = useState(0);
  const MIN_CHARS = 50;
  const valid = score > 0 && comment.trim().length >= MIN_CHARS;

  function handleSubmit() {
    if (!valid) return;
    onSubmit({ profId, score, comment, name: name.trim() || "Anonymous", isSelf });
    setSubmitted(true);
  }

  if (submitted) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: theme.green, fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
      ✦ Rating submitted. Thank you.
    </div>
  );

  return (
    <div style={{ background: theme.cardAlt, borderRadius: 10, padding: 24, marginTop: 24 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, marginBottom: 16, color: theme.text }}>
        Leave a Rating
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
  {[1,2,3,4,5,6,7,8,9,10].map(n => {
          const active = n <= (hover || score);
          return (
            <button key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setScore(n)}
              style={{
                width: 38, height: 38, border: "2px solid",
                borderColor: active ? theme.green : theme.border,
                background: active ? theme.green : theme.card,
                color: active ? "#fff" : theme.subtext,
                borderRadius: 6, fontWeight: 700, fontSize: 14,
                cursor: "pointer", transition: "all 0.15s",
                fontFamily: "'DM Sans', sans-serif",
              }}>{n}</button>
          );
        })}
        {score > 0 && <span style={{ alignSelf: "center", marginLeft: 8, color: theme.green, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          {["","Terrible","Poor","Below avg","Below avg","Average","Average","Good","Good","Excellent","Exceptional"][score]}
        </span>}
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share your experience with this professor — teaching style, course load, accessibility, exams... (min 50 characters)"
        style={{
          width: "100%", minHeight: 100, padding: "12px 14px",
          borderRadius: 7, border: `1.5px solid ${theme.border}`,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.6,
          background: theme.card, color: theme.text, resize: "vertical", boxSizing: "border-box",
          outline: "none",
        }}
      />
      <div style={{ fontSize: 12, color: comment.length >= MIN_CHARS ? theme.green : theme.subtext, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
        {comment.length}/{MIN_CHARS} characters minimum
      </div>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name (optional — leave blank to post as Anonymous)"
        style={{
          width: "100%", padding: "10px 14px", marginTop: 12,
          borderRadius: 7, border: `1.5px solid ${theme.border}`,
          fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          background: theme.card, color: theme.text, boxSizing: "border-box", outline: "none",
        }}
      />

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.subtext }}>
        <input type="checkbox" checked={isSelf} onChange={e => setIsSelf(e.target.checked)}
          style={{ accentColor: theme.green, width: 16, height: 16 }} />
        I am this professor (self-response — unverified, community decides)
      </label>

      <button
        onClick={handleSubmit}
        disabled={!valid}
        style={{
          marginTop: 16, padding: "11px 28px",
          background: valid ? theme.green : theme.border,
          color: valid ? "#fff" : theme.subtext, border: "none", borderRadius: 7,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14,
          cursor: valid ? "pointer" : "not-allowed", transition: "background 0.2s",
        }}>
        Submit Rating
      </button>
    </div>
  );
}

// ─── PROF DETAIL VIEW ────────────────────────────────────────────────────────

function ProfDetail({ prof, ratings, onBack, onNewRating, theme }) {
  const [range, setRange] = useState(90);
  const filtered = filterByDays(ratings, range);
  const chartData = getChartData(ratings, range);
  const allAvg = avg(ratings);
  const rangeAvg = avg(filtered);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        color: theme.green, fontFamily: "'DM Sans', sans-serif", fontSize: 14,
        padding: "0 0 20px 0", display: "flex", alignItems: "center", gap: 6,
      }}>← Back to all professors</button>

      <div style={{ borderBottom: `2px solid ${theme.green}`, paddingBottom: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: theme.text }}>
              {prof.name}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: theme.subtext, marginTop: 4 }}>
              {prof.rank} · {prof.school}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 700, color: theme.green, lineHeight: 1 }}>
              {allAvg.toFixed(1)}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: theme.subtext }}>/ 10 all-time ({ratings.length} ratings)</div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {prof.positions.map(p => (
            <span key={p} style={{
              padding: "3px 10px", borderRadius: 20,
              background: theme.green, color: "#fff",
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            }}>{p}</span>
          ))}
          {prof.courses.map(c => (
            <span key={c} style={{
              padding: "3px 10px", borderRadius: 20,
              background: theme.badgeBg, color: theme.badgeText,
              fontFamily: "'DM Sans', sans-serif", fontSize: 12,
              border: `1px solid ${theme.border}`,
            }}>{c}</span>
          ))}
        </div>
      </div>

      <div style={{ background: theme.cardAlt, borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: theme.text }}>Rating Trend</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.subtext, marginTop: 2 }}>
              {range === 9999 ? "All time" : `Last ${range} days`} avg: <strong style={{ color: theme.green }}>{rangeAvg.toFixed(1)}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r.days)} style={{
                padding: "5px 12px", borderRadius: 6,
                border: "1.5px solid",
                borderColor: range === r.days ? theme.green : theme.border,
                background: range === r.days ? theme.green : theme.card,
                color: range === r.days ? "#fff" : theme.subtext,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                cursor: "pointer", fontWeight: range === r.days ? 700 : 400,
              }}>{r.label}</button>
            ))}
          </div>
        </div>
        <MiniChart data={chartData} theme={theme} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: theme.subtext }}>
          {chartData.map(d => <span key={d.label}>{d.label}</span>)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "7-day avg", val: avg(filterByDays(ratings, 7)) },
          { label: "30-day avg", val: avg(filterByDays(ratings, 30)) },
          { label: "90-day avg", val: avg(filterByDays(ratings, 90)) },
          { label: "All-time avg", val: allAvg },
        ].map(s => (
          <div key={s.label} style={{
            background: theme.cardAlt, borderRadius: 8, padding: "14px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: theme.green }}>
              {s.val ? s.val.toFixed(1) : "—"}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: theme.subtext, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 8, fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: theme.text }}>
        Student Reviews
      </div>
      {ratings.slice(0, 10).map(r => (
        <div key={r.id} style={{
          borderBottom: `1px solid ${theme.border}`, padding: "16px 0",
          display: "flex", gap: 16, alignItems: "flex-start",
        }}>
          <ScoreBadge score={r.score} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: theme.text, lineHeight: 1.6 }}>
              {r.comment}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: theme.subtext }}>
                — {r.name}
              </span>
              {r.isSelf && (
                <span style={{
                  fontSize: 11, padding: "1px 8px", borderRadius: 10,
                  background: theme.bg === "#121212" ? "#4d3a00" : "#fff3cd", 
                  color: theme.bg === "#121212" ? "#ffc107" : "#856404",
                  border: `1px solid ${theme.bg === "#121212" ? "#b38600" : "#ffc107"}`, 
                  fontFamily: "'DM Sans', sans-serif",
                }}>Professor (unverified)</span>
              )}
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: theme.subtext }}>
                {new Date(r.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      ))}

      <RatingForm profId={prof.id} onSubmit={onNewRating} theme={theme} />
    </div>
  );
}

// ─── PROF CARD ────────────────────────────────────────────────────────────────

function ProfCard({ prof, ratings, onClick, theme }) {
  const allAvg = avg(ratings);
  const recentAvg = avg(filterByDays(ratings, 30));
  const initials = prof.name.replace("Prof. ", "").split(" ").map(w => w).join("").slice(0, 2);

  return (
    <div onClick={onClick} style={{
      background: theme.card, borderRadius: 12, padding: 20,
      border: `1.5px solid ${theme.border}`, cursor: "pointer",
      transition: "all 0.2s", display: "flex", gap: 16,
      alignItems: "flex-start",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.green; e.currentTarget.style.boxShadow = `0 4px 20px ${theme.shadow}`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: theme.green, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700,
        flexShrink: 0,
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, color: theme.text }}>
          {prof.name}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: theme.subtext, marginTop: 2 }}>
          {prof.rank} · {prof.school}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {prof.positions.map(p => (
            <span key={p} style={{
              padding: "2px 8px", borderRadius: 12,
              background: theme.green, color: "#fff",
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
            }}>{p}</span>
          ))}
          {prof.courses.slice(0, 2).map(c => (
            <span key={c} style={{
              padding: "2px 8px", borderRadius: 12,
              background: theme.badgeBg, color: theme.badgeText,
              fontFamily: "'DM Sans', sans-serif", fontSize: 11,
              border: `1px solid ${theme.border}`,
            }}>{c.split(":")}</span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: theme.green, lineHeight: 1 }}>
          {allAvg.toFixed(1)}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: theme.subtext }}>/ 10</div>
        {recentAvg > 0 && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: theme.subtext, marginTop: 4 }}>
            30d: <span style={{ color: recentAvg > allAvg ? theme.green : "#c0392b", fontWeight: 600 }}>
              {recentAvg.toFixed(1)} {recentAvg > allAvg ? "↑" : "↓"}
            </span>
          </div>
        )}
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: theme.subtext, marginTop: 2 }}>
          {ratings.length} reviews
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [school, setSchool] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedProf, setSelectedProf] = useState(null);
  const [allRatings, setAllRatings] = useState(ALL_RATINGS);
  const [isDark, setIsDark] = useState(false);

  // Define Themes
  const theme = isDark ? {
    bg: "#121212", card: "#1e1e1e", cardAlt: "#252525",
    text: "#f1f1f1", subtext: "#a0a0a0", border: "#333",
    green: "#40916c", shadow: "rgba(64, 145, 108, 0.2)",
    badgeBg: "#2c2c2c", badgeText: "#d0d0d0"
  } : {
    bg: "#faf8f4", card: "#fff", cardAlt: "#f7f4ef",
    text: "#1a1a1a", subtext: "#666", border: "#d4c9b8",
    green: "#2d6a4f", shadow: "rgba(45, 106, 79, 0.1)",
    badgeBg: "#f0ebe2", badgeText: "#555"
  };

  const filtered = useMemo(() => MOCK_PROFS.filter(p => {
    const matchSchool = school === "All" || p.school === school;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.courses.some(c => c.toLowerCase().includes(search.toLowerCase())) ||
      p.positions.some(pos => pos.toLowerCase().includes(search.toLowerCase()));
    return matchSchool && matchSearch;
  }), [school, search]);

  function handleNewRating(rating) {
    setAllRatings(prev => ({
      ...prev,
      [rating.profId]: [{ ...rating, id: Date.now(), timestamp: Date.now() }, ...(prev[rating.profId] || [])],
    }));
  }

  const currentRatings = selectedProf ? (allRatings[selectedProf.id] || []) : [];

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      fontFamily: "'DM Sans', sans-serif", color: theme.text,
      transition: "background 0.3s, color 0.3s"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button { transition: all 0.15s; }
        textarea:focus, input:focus { border-color: ${theme.green} !important; box-shadow: 0 0 0 3px ${theme.shadow}; }
      `}</style>

      <header style={{ borderBottom: `2px solid ${theme.green}`, background: theme.card, padding: "0 24px", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: theme.text, letterSpacing: "-0.5px" }}>
              NISER · Rate My Professor
            </div>
            <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
              Anonymous student reviews · Bhubaneswar
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 11, color: theme.subtext, textAlign: "right", fontStyle: "italic", maxWidth: 220 }}>
              Community-run. Opinions are student-sourced,<br />not institutional.
            </div>
            <button onClick={() => setIsDark(!isDark)} style={{
              background: theme.cardAlt, border: `1px solid ${theme.border}`, padding: "6px 12px",
              borderRadius: 20, cursor: "pointer", color: theme.text, display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600
            }}>
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {selectedProf ? (
          <ProfDetail prof={selectedProf} ratings={currentRatings} onBack={() => setSelectedProf(null)} onNewRating={handleNewRating} theme={theme} />
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, course, or position…"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 8,
                  border: `1.5px solid ${theme.border}`, fontSize: 15, background: theme.card,
                  color: theme.text, outline: "none", marginBottom: 14,
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SCHOOLS.map(s => (
                  <button key={s} onClick={() => setSchool(s)} style={{
                    padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
                    borderColor: school === s ? theme.green : theme.border,
                    background: school === s ? theme.green : theme.card,
                    color: school === s ? "#fff" : theme.subtext,
                    fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    fontWeight: school === s ? 600 : 400,
                  }}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: theme.subtext, fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
                  No professors found.
                </div>
              ) : filtered.map(p => (
                <ProfCard key={p.id} prof={p} ratings={allRatings[p.id] || []} onClick={() => setSelectedProf(p)} theme={theme} />
              ))}
            </div>

            <div style={{
              marginTop: 48, padding: "20px 24px", borderRadius: 10,
              background: theme.cardAlt, border: `1px solid ${theme.border}`,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: theme.subtext, lineHeight: 1.7,
            }}>
              <strong style={{ color: theme.green }}>Community Guidelines</strong><br />
              Ratings should reflect genuine academic experience — teaching quality, course structure, accessibility. Personal attacks, defamatory content, or harassment will be removed. Professors may self-identify in comments; such tags are unverified and community-assessed.<br />
              <span style={{ color: theme.subtext, fontSize: 12 }}>Maintained by NISER Gymkhana & Coding Club · Open source</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
