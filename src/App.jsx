// FULL CLEAN VERSION — UI + SUPABASE

import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

const SCHOOLS = ["All", "SPS", "SCS", "SBS", "SMS", "SEPS", "SHSS"];

// ─── HELPERS ───

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + r.score, 0) / arr.length;
}

// ─── MAIN APP ───

export default function App() {
  const [profs, setProfs] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);
  const [school, setSchool] = useState("All");
  const [search, setSearch] = useState("");
  const [isDark, setIsDark] = useState(false);

  // 🔥 Fetch professors
  useEffect(() => {
    async function fetchProfs() {
      const { data } = await supabase.from("professors").select("*");
      setProfs(data || []);
    }
    fetchProfs();
  }, []);

  // 🔥 Fetch ratings
  useEffect(() => {
    async function fetchRatings() {
      const { data } = await supabase.from("ratings").select("*");
      setRatings(data || []);
    }
    fetchRatings();
  }, []);

  // 🔥 Submit rating
  async function handleNewRating(r) {
    await supabase.from("ratings").insert([
      {
        professor_id: r.profId,
        score: r.score,
        comment: r.comment,
      },
    ]);

    const { data } = await supabase.from("ratings").select("*");
    setRatings(data || []);
  }

  // FILTER
  const filtered = useMemo(() => {
    return profs.filter(p => {
      const matchSchool = school === "All" || p.school === school;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchSchool && matchSearch;
    });
  }, [profs, school, search]);

  const profRatings = selectedProf
    ? ratings.filter(r => r.professor_id === selectedProf.id)
    : [];

  const theme = isDark
    ? { bg: "#121212", card: "#1e1e1e", text: "#fff", sub: "#aaa" }
    : { bg: "#faf8f4", card: "#fff", text: "#111", sub: "#666" };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      color: theme.text,
      padding: 20,
      fontFamily: "sans-serif"
    }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>NISER · Rate My Professor</h1>

        <button onClick={() => setIsDark(!isDark)}>
          {isDark ? "Light" : "Dark"}
        </button>
      </div>

      {!selectedProf && (
        <>
          {/* SEARCH */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search professor..."
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
          />

          {/* FILTER */}
          {SCHOOLS.map(s => (
            <button key={s} onClick={() => setSchool(s)}>
              {s}
            </button>
          ))}

          {/* CARDS */}
          <div style={{ marginTop: 20 }}>
            {filtered.map(p => {
              const r = ratings.filter(rt => rt.professor_id === p.id);

              return (
                <div key={p.id}
                  onClick={() => setSelectedProf(p)}
                  style={{
                    background: theme.card,
                    padding: 16,
                    borderRadius: 10,
                    marginBottom: 10,
                    cursor: "pointer"
                  }}
                >
                  <h3>{p.name}</h3>
                  <div>{p.rank} · {p.school}</div>

                  <strong>
                    {avg(r).toFixed(1)} / 10 ({r.length})
                  </strong>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DETAIL */}
      {selectedProf && (
        <div>
          <button onClick={() => setSelectedProf(null)}>← Back</button>

          <h2>{selectedProf.name}</h2>

          <div>
            {avg(profRatings).toFixed(1)} / 10 ({profRatings.length})
          </div>

          {/* REVIEWS */}
          {profRatings.map(r => (
            <div key={r.id}>
              <strong>{r.score}/10</strong>
              <p>{r.comment}</p>
            </div>
          ))}

          {/* FORM */}
          <div style={{ marginTop: 20 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n}
                onClick={() => handleNewRating({
                  profId: selectedProf.id,
                  score: n,
                  comment: "Quick rating"
                })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
