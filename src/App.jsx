import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SCHOOLS = ["All", "SPS", "SCS", "SBS", "SMS", "SCoS", "SEPS", "SHSS"];

const SORT_OPTIONS = [
  { value: "az", label: "A → Z" },
  { value: "top", label: "Top Rated" },
  { value: "most", label: "Most Reviewed" },
];

const RANGES = [
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "All", days: 9999 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + r.score, 0) / arr.length;
}

function filterByDays(ratings, days) {
  if (days === 9999) return ratings;
  const cutoff = Date.now() - days * 86400000;
  return ratings.filter((r) => new Date(r.created_at).getTime() >= cutoff);
}

function getChartData(ratings, days) {
  const buckets = {};
  const filtered = filterByDays(ratings, days);
  filtered.forEach((r) => {
    const d = new Date(r.created_at);
    const key =
      days <= 30
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString("default", { month: "short" })}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(r.score);
  });
  return Object.entries(buckets)
    .map(([label, scores]) => ({
      label,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .slice(-12);
}

// ─── THEME ───────────────────────────────────────────────────────────────────

function getTheme(dark) {
  return dark
    ? {
        bg: "#0f1a14", surface: "#162011", card: "#1a2a1e", border: "#2a3d2e",
        text: "#e8f0ea", subtext: "#8aab90", accent: "#52b788", accentDark: "#2d6a4f",
        inputBg: "#1a2a1e", tagBg: "#2d6a4f", tagText: "#b7e4c7",
        courseBg: "#1e2e22", courseText: "#8aab90", courseBorder: "#2a3d2e",
        badgeGood: "#1b4332", badgeMid: "#3d2c00", badgeBad: "#3d0f17",
      }
    : {
        bg: "#faf8f4", surface: "#f7f4ef", card: "#ffffff", border: "#e8e2d9",
        text: "#1a1a1a", subtext: "#666666", accent: "#2d6a4f", accentDark: "#1b4332",
        inputBg: "#ffffff", tagBg: "#2d6a4f", tagText: "#ffffff",
        courseBg: "#f0ebe2", courseText: "#555555", courseBorder: "#e0d8cc",
        badgeGood: "#2d6a4f", badgeMid: "#b5830f", badgeBad: "#9b2335",
      };
}

// ─── SCORE BADGE ─────────────────────────────────────────────────────────────

function ScoreBadge({ score, t }) {
  const color = score >= 8 ? t.badgeGood : score >= 6 ? t.badgeMid : t.badgeBad;
  return (
    <span style={{
      display: "inline-block", minWidth: 42, padding: "3px 9px", borderRadius: 5,
      background: color, color: "#fff", fontFamily: "'DM Sans', sans-serif",
      fontWeight: 700, fontSize: 14, textAlign: "center", flexShrink: 0,
    }}>{score}/10</span>
  );
}

// ─── MINI CHART ──────────────────────────────────────────────────────────────

function MiniChart({ data, t }) {
  if (!data.length) return (
    <div style={{ color: t.subtext, fontSize: 13, fontFamily: "'DM Sans', sans-serif", padding: "16px 0" }}>
      Not enough data for this range.
    </div>
  );
  const W = 280, H = 64;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * W;
    const y = H - (d.avg / 10) * H;
    return `${x},${y}`;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={t.accent} strokeWidth={2} />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * W;
        const y = H - (d.avg / 10) * H;
        return <circle key={i} cx={x} cy={y} r={3.5} fill={t.accent} />;
      })}
    </svg>
  );
}

// ─── DARK TOGGLE ─────────────────────────────────────────────────────────────

function DarkToggle({ isDark, onToggle, t }) {
  return (
    <button onClick={onToggle} title={isDark ? "Light mode" : "Dark mode"} style={{
      width: 48, height: 26, borderRadius: 13, border: `1.5px solid ${t.border}`,
      background: isDark ? t.accent : t.surface, cursor: "pointer",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: isDark ? 24 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: isDark ? "#fff" : t.accent,
        transition: "left 0.2s", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10,
      }}>
        {isDark ? "☽" : "○"}
      </span>
    </button>
  );
}

// ─── RATING FORM ─────────────────────────────────────────────────────────────

function RatingForm({ profId, onSubmit, t }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [isSelf, setIsSelf] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const MIN_CHARS = 50;
  const valid = score > 0 && comment.trim().length >= MIN_CHARS;
  const labels = ["","Terrible","Poor","Below avg","Below avg","Average","Average","Good","Good","Excellent","Exceptional"];

  async function handleSubmit() {
    if (!valid || loading) return;
    setLoading(true);
    await onSubmit({ profId, score, comment, name: name.trim() || "Anonymous", isSelf });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: t.accent, fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
      ✦ Rating submitted. Thank you.
    </div>
  );

  return (
    <div style={{ background: t.surface, borderRadius: 10, padding: 24, marginTop: 28, border: `1px solid ${t.border}` }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: t.text, marginBottom: 18 }}>
        Leave a Rating
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[1,2,3,4,5,6,7,8,9,10].map((n) => {
          const active = n <= (hover || score);
          return (
            <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setScore(n)} style={{
              width: 38, height: 38, border: "2px solid",
              borderColor: active ? t.accent : t.border,
              background: active ? t.accent : t.card,
              color: active ? "#fff" : t.subtext,
              borderRadius: 6, fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.12s",
            }}>{n}</button>
          );
        })}
        {(hover || score) > 0 && (
          <span style={{ marginLeft: 6, color: t.accent, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            {labels[hover || score]}
          </span>
        )}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience — teaching clarity, accessibility, exams, workload…"
        style={{
          width: "100%", minHeight: 90, padding: "11px 13px", borderRadius: 7,
          border: `1.5px solid ${t.border}`, fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, lineHeight: 1.6, background: t.inputBg, color: t.text,
          resize: "vertical", boxSizing: "border-box", outline: "none", marginTop: 14,
        }}
      />
      <div style={{ fontSize: 12, color: comment.length >= MIN_CHARS ? t.accent : t.subtext, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
        {comment.length}/{MIN_CHARS} characters minimum
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional — leave blank for Anonymous)"
        style={{
          width: "100%", padding: "10px 13px", marginTop: 10, borderRadius: 7,
          border: `1.5px solid ${t.border}`, fontFamily: "'DM Sans', sans-serif",
          fontSize: 14, background: t.inputBg, color: t.text, boxSizing: "border-box", outline: "none",
        }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.subtext }}>
        <input type="checkbox" checked={isSelf} onChange={(e) => setIsSelf(e.target.checked)} style={{ accentColor: t.accent, width: 15, height: 15 }} />
        I am this professor (self-response — unverified, community decides)
      </label>
      <button onClick={handleSubmit} disabled={!valid || loading} style={{
        marginTop: 18, padding: "11px 28px", background: valid ? t.accent : t.border,
        color: "#fff", border: "none", borderRadius: 7,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14,
        cursor: valid ? "pointer" : "not-allowed", transition: "background 0.2s",
      }}>
        {loading ? "Submitting…" : "Submit Rating"}
      </button>
    </div>
  );
}

// ─── PROF DETAIL ─────────────────────────────────────────────────────────────

function ProfDetail({ prof, ratings, onBack, onNewRating, t }) {
  const [range, setRange] = useState(90);
  const filtered = filterByDays(ratings, range);
  const chartData = getChartData(ratings, range);
  const allAvg = avg(ratings);
  const rangeAvg = avg(filtered);
  const initials = prof.name.replace(/^Prof\.?\s*/i, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer", color: t.accent,
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: "0 0 24px 0",
        display: "flex", alignItems: "center", gap: 6,
      }}>← Back to all professors</button>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", borderBottom: `2px solid ${t.accent}`, paddingBottom: 24, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", background: t.accent, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: t.text, lineHeight: 1.1 }}>{prof.name}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.subtext, marginTop: 5 }}>{prof.rank} · {prof.school}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
            {(prof.positions || []).map((p) => (
              <span key={p} style={{ padding: "3px 10px", borderRadius: 20, background: t.tagBg, color: t.tagText, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600 }}>{p}</span>
            ))}
            {(prof.courses || []).map((c) => (
              <span key={c} style={{ padding: "3px 10px", borderRadius: 20, background: t.courseBg, color: t.courseText, fontFamily: "'DM Sans', sans-serif", fontSize: 12, border: `1px solid ${t.courseBorder}` }}>{c}</span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 700, color: t.accent, lineHeight: 1 }}>
            {allAvg ? allAvg.toFixed(1) : "—"}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.subtext }}>/ 10 · {ratings.length} ratings</div>
        </div>
      </div>

      <div style={{ background: t.surface, borderRadius: 10, padding: 20, marginBottom: 24, border: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: t.text }}>Rating Trend</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.subtext, marginTop: 2 }}>
              {range === 9999 ? "All time" : `Last ${range} days`} avg:{" "}
              <strong style={{ color: t.accent }}>{rangeAvg ? rangeAvg.toFixed(1) : "—"}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {RANGES.map((r) => (
              <button key={r.label} onClick={() => setRange(r.days)} style={{
                padding: "5px 12px", borderRadius: 6, border: "1.5px solid",
                borderColor: range === r.days ? t.accent : t.border,
                background: range === r.days ? t.accent : t.card,
                color: range === r.days ? "#fff" : t.subtext,
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer",
                fontWeight: range === r.days ? 700 : 400,
              }}>{r.label}</button>
            ))}
          </div>
        </div>
        <MiniChart data={chartData} t={t} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: t.subtext }}>
          {chartData.map((d) => <span key={d.label}>{d.label}</span>)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 32 }}>
        {[
          { label: "7-day avg", val: avg(filterByDays(ratings, 7)) },
          { label: "30-day avg", val: avg(filterByDays(ratings, 30)) },
          { label: "90-day avg", val: avg(filterByDays(ratings, 90)) },
          { label: "All-time", val: allAvg },
        ].map((s) => (
          <div key={s.label} style={{ background: t.surface, borderRadius: 8, padding: "14px 12px", textAlign: "center", border: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: t.accent }}>
              {s.val ? s.val.toFixed(1) : "—"}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.subtext, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: t.text, marginBottom: 4 }}>
        Student Reviews
      </div>
      {ratings.length === 0 && (
        <div style={{ padding: "32px 0", textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.subtext }}>
          No reviews yet. Be the first.
        </div>
      )}
      {ratings.map((r) => (
        <div key={r.id} style={{ borderBottom: `1px solid ${t.border}`, padding: "16px 0", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <ScoreBadge score={r.score} t={t} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: t.text, lineHeight: 1.65 }}>{r.comment}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.subtext }}>— {r.name || "Anonymous"}</span>
              {r.is_self && (
                <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, background: "#fff3cd", color: "#856404", border: "1px solid #ffc107", fontFamily: "'DM Sans', sans-serif" }}>
                  Professor (unverified)
                </span>
              )}
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.subtext, opacity: 0.6 }}>
                {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      ))}
      <RatingForm profId={prof.id} onSubmit={onNewRating} t={t} />
    </div>
  );
}

// ─── PROF CARD ────────────────────────────────────────────────────────────────

function ProfCard({ prof, ratings, rank, onClick, t }) {
  const allAvg = avg(ratings);
  const recentAvg = avg(filterByDays(ratings, 30));
  const initials = prof.name.replace(/^Prof\.?\s*/i, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div onClick={onClick} style={{
      background: t.card, borderRadius: 12, padding: 20, border: `1.5px solid ${t.border}`,
      cursor: "pointer", display: "flex", gap: 16, alignItems: "flex-start",
      transition: "border-color 0.15s, box-shadow 0.15s", position: "relative",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.boxShadow = `0 4px 20px rgba(45,106,79,0.12)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = "none"; }}
    >
      {rank && (
        <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.subtext, opacity: 0.5 }}>#{rank}</div>
      )}
      <div style={{
        width: 50, height: 50, borderRadius: "50%", background: t.accent, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, flexShrink: 0,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, color: t.text }}>{prof.name}</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.subtext, marginTop: 2 }}>{prof.rank} · {prof.school}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {(prof.positions || []).map((p) => (
            <span key={p} style={{ padding: "2px 9px", borderRadius: 12, background: t.tagBg, color: t.tagText, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600 }}>{p}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 54 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 700, color: t.accent, lineHeight: 1 }}>
          {allAvg ? allAvg.toFixed(1) : "—"}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: t.subtext }}>/ 10</div>
        {recentAvg > 0 && allAvg > 0 && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.subtext, marginTop: 3 }}>
            30d:{" "}
            <span style={{ color: recentAvg >= allAvg ? t.accent : "#c0392b", fontWeight: 600 }}>
              {recentAvg.toFixed(1)} {recentAvg >= allAvg ? "↑" : "↓"}
            </span>
          </div>
        )}
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: t.subtext, opacity: 0.7, marginTop: 2 }}>{ratings.length} reviews</div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [profs, setProfs] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);
  const [school, setSchool] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("az");
  const [isDark, setIsDark] = useState(false);

  const t = getTheme(isDark);

  useEffect(() => {
    async function fetchAll() {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase.from("professors").select("*"),
        supabase.from("ratings").select("*"),
      ]);
      setProfs(pData || []);
      setRatings(rData || []);
    }
    fetchAll();
  }, []);

  async function handleNewRating(r) {
    const { error } = await supabase.from("ratings").insert([{
      professor_id: r.profId, score: r.score, comment: r.comment,
      name: r.name, is_self: r.isSelf,
    }]);
    if (!error) {
      const { data } = await supabase.from("ratings").select("*");
      setRatings(data || []);
    }
  }

  const filtered = useMemo(() => {
    let list = profs.filter((p) => {
      const matchSchool = school === "All" || p.school === school;
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        (p.school || "").toLowerCase().includes(q) ||
        (p.rank || "").toLowerCase().includes(q) ||
        (p.positions || []).some((pos) => pos.toLowerCase().includes(q));
      return matchSchool && matchSearch;
    });

    if (sortBy === "top") {
      list = [...list].sort((a, b) =>
        avg(ratings.filter((r) => r.professor_id === b.id)) -
        avg(ratings.filter((r) => r.professor_id === a.id))
      );
    } else if (sortBy === "most") {
      list = [...list].sort((a, b) =>
        ratings.filter((r) => r.professor_id === b.id).length -
        ratings.filter((r) => r.professor_id === a.id).length
      );
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [profs, ratings, school, search, sortBy]);

  const top3 = useMemo(() => (
    [...profs]
      .filter((p) => ratings.filter((r) => r.professor_id === p.id).length >= 3)
      .sort((a, b) =>
        avg(ratings.filter((r) => r.professor_id === b.id)) -
        avg(ratings.filter((r) => r.professor_id === a.id))
      )
      .slice(0, 3)
  ), [profs, ratings]);

  const showLeaderboard = sortBy === "top" && school === "All" && !search && top3.length >= 3;
  const profRatings = selectedProf ? ratings.filter((r) => r.professor_id === selectedProf.id) : [];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, transition: "background 0.2s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        button { transition: all 0.15s; }
        textarea:focus, input:focus { outline: none; border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${isDark ? "rgba(82,183,136,0.15)" : "rgba(45,106,79,0.1)"}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%23888' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px !important; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `2px solid ${t.accent}`, background: t.card, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ cursor: "pointer" }} onClick={() => setSelectedProf(null)}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: "-0.3px" }}>
              NISER · Rate My Professor
            </div>
            <div style={{ fontSize: 12, color: t.subtext, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
              Anonymous Student Reviews · Bhubaneswar
            </div>
          </div>
          <DarkToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} t={t} />
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {selectedProf ? (
          <ProfDetail prof={selectedProf} ratings={profRatings} onBack={() => setSelectedProf(null)} onNewRating={handleNewRating} t={t} />
        ) : (
          <>
            {/* Search */}
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, school, rank, or position…"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                border: `1.5px solid ${t.border}`, fontSize: 15,
                background: t.inputBg, color: t.text, marginBottom: 14,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />

            {/* Filters + sort */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                {SCHOOLS.map((s) => (
                  <button key={s} onClick={() => setSchool(s)} style={{
                    padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
                    borderColor: school === s ? t.accent : t.border,
                    background: school === s ? t.accent : t.card,
                    color: school === s ? "#fff" : t.subtext,
                    fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    fontWeight: school === s ? 600 : 400,
                  }}>{s}</button>
                ))}
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
                padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${t.border}`,
                background: t.card, color: t.text, fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, outline: "none", flexShrink: 0,
              }}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Top 3 podium */}
            {showLeaderboard && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: t.subtext, marginBottom: 12 }}>
                  ✦ All-time Top Rated
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {top3.map((p, i) => {
                    const r = ratings.filter((rt) => rt.professor_id === p.id);
                    return (
                      <div key={p.id} onClick={() => setSelectedProf(p)} style={{
                        background: t.card, borderRadius: 10, padding: "14px 16px",
                        border: `1.5px solid ${i === 0 ? t.accent : t.border}`,
                        cursor: "pointer", textAlign: "center",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = i === 0 ? t.accent : t.border; }}
                      >
                        <div style={{ fontSize: 20, marginBottom: 5 }}>{["🥇","🥈","🥉"][i]}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>{p.name}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: t.subtext, marginTop: 3 }}>{p.school}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: t.accent, marginTop: 6 }}>{avg(r).toFixed(1)}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: t.subtext }}>{r.length} reviews</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Count */}
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: t.subtext, marginBottom: 14 }}>
              {filtered.length} professor{filtered.length !== 1 ? "s" : ""}{school !== "All" ? ` in ${school}` : ""}
            </div>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {profs.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: t.subtext, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                  Loading professors…
                </div>
              )}
              {profs.length > 0 && filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: t.subtext, fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
                  No professors found.
                </div>
              )}
              {filtered.map((p, i) => (
                <ProfCard key={p.id} prof={p}
                  ratings={ratings.filter((r) => r.professor_id === p.id)}
                  rank={sortBy !== "az" ? i + 1 : null}
                  onClick={() => setSelectedProf(p)} t={t}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 52, padding: "20px 24px", borderRadius: 10, background: t.surface, border: `1px solid ${t.border}`, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: t.subtext, lineHeight: 1.7 }}>
              <strong style={{ color: t.accent }}>Community Guidelines</strong><br />
              Ratings reflect genuine academic experience — teaching quality, course structure, accessibility.
              Personal attacks or defamatory content will be removed.
              Professors may self-identify in comments; such tags are unverified and community-assessed.<br />
              <span style={{ opacity: 0.6, fontSize: 12 }}>Made with 💚 · NISER Bhubaneswar</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
