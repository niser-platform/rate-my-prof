import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

const SCHOOLS = ["All", "SPS", "SCS", "SBS", "SMS", "SEPS", "SHSS"];

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + r.score, 0) / arr.length;
}

// ⭐ Rating Form
function RatingForm({ profId, onSubmit }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const MIN_CHARS = 50;

  const valid = score > 0 && comment.length >= MIN_CHARS;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            onClick={() => setScore(n)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              border: "1px solid #ccc",
              background: score >= n ? "#2d6a4f" : "#fff",
              color: score >= n ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Write at least 50 characters..."
        value={comment}
        onChange={e => setComment(e.target.value)}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 10,
          borderRadius: 6,
          border: "1px solid #ccc"
        }}
      />

      <div style={{ fontSize: 12, marginTop: 4 }}>
        {comment.length}/50 characters
      </div>

      <button
        disabled={!valid}
        onClick={() => {
          onSubmit({ profId, score, comment });
          setComment("");
          setScore(0);
        }}
        style={{
          marginTop: 10,
          padding: "8px 16px",
          background: valid ? "#2d6a4f" : "#ccc",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: valid ? "pointer" : "not-allowed"
        }}
      >
        Submit Rating
      </button>
    </div>
  );
}

// ⭐ Main App
export default function App() {
  const [profs, setProfs] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);
  const [school, setSchool] = useState("All");

  // Fetch professors
  useEffect(() => {
    async function fetchProfs() {
      const { data } = await supabase.from("professors").select("*");
      setProfs(data || []);
    }
    fetchProfs();
  }, []);

  // Fetch ratings
  useEffect(() => {
    async function fetchRatings() {
      const { data } = await supabase.from("ratings").select("*");
      setRatings(data || []);
    }
    fetchRatings();
  }, []);

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

  const filteredProfs = useMemo(() => {
    return profs.filter(p => school === "All" || p.school === school);
  }, [profs, school]);

  const profRatings = selectedProf
    ? ratings.filter(r => r.professor_id === selectedProf.id)
    : [];

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", background: "#f7f7f7", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 20 }}>NISER · Rate My Professor</h1>

      {!selectedProf && (
        <>
          {/* School Filter */}
          <div style={{ marginBottom: 20 }}>
            {SCHOOLS.map(s => (
              <button
                key={s}
                onClick={() => setSchool(s)}
                style={{
                  marginRight: 8,
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "1px solid #ccc",
                  background: school === s ? "#2d6a4f" : "#fff",
                  color: school === s ? "#fff" : "#333",
                  cursor: "pointer"
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Professor Cards */}
          <div style={{ display: "grid", gap: 12 }}>
            {filteredProfs.map(p => {
              const r = ratings.filter(rt => rt.professor_id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProf(p)}
                  style={{
                    background: "#fff",
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    cursor: "pointer"
                  }}
                >
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {p.rank} · {p.school}
                  </div>

                  <div style={{ marginTop: 8, fontWeight: "bold", color: "#2d6a4f" }}>
                    {avg(r).toFixed(1)} / 10
                  </div>

                  <div style={{ fontSize: 12, color: "#999" }}>
                    {r.length} ratings
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedProf && (
        <div>
          <button onClick={() => setSelectedProf(null)}>← Back</button>

          <h2>{selectedProf.name}</h2>

          <div style={{ marginBottom: 10 }}>
            {avg(profRatings).toFixed(1)} / 10 ({profRatings.length} ratings)
          </div>

          {/* Reviews */}
          {profRatings.map(r => (
            <div key={r.id} style={{ marginBottom: 10 }}>
              <strong>{r.score}/10</strong>
              <p>{r.comment}</p>
            </div>
          ))}

          <RatingForm profId={selectedProf.id} onSubmit={handleNewRating} />
        </div>
      )}
    </div>
  );
}
