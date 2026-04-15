import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

const SCHOOLS = ["All", "SPS", "SCS", "SBS", "SMS", "SEPS", "SHSS"];

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + r.score, 0) / arr.length;
}

function RatingForm({ profId, onSubmit }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const MIN_CHARS = 50;

  const valid = score > 0 && comment.length >= MIN_CHARS;

  return (
    <div style={{ marginTop: 20 }}>
      <div>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => setScore(n)}>
            {n}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Write at least 50 characters..."
        value={comment}
        onChange={e => setComment(e.target.value)}
      />

      <button
        disabled={!valid}
        onClick={() => {
          onSubmit({ profId, score, comment });
          setComment("");
          setScore(0);
        }}
      >
        Submit
      </button>
    </div>
  );
}

export default function App() {
  const [profs, setProfs] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);
  const [school, setSchool] = useState("All");

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

    // reload ratings
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
    <div style={{ padding: 20 }}>
      <h1>NISER Rate My Prof</h1>

      {!selectedProf && (
        <>
          <div>
            {SCHOOLS.map(s => (
              <button key={s} onClick={() => setSchool(s)}>
                {s}
              </button>
            ))}
          </div>

          {filteredProfs.map(p => {
            const r = ratings.filter(rt => rt.professor_id === p.id);
            return (
              <div key={p.id} onClick={() => setSelectedProf(p)} style={{ margin: 10, cursor: "pointer" }}>
                <h3>{p.name}</h3>
                <div>{p.rank} · {p.school}</div>
                <div>Avg: {avg(r).toFixed(1)}</div>
              </div>
            );
          })}
        </>
      )}

      {selectedProf && (
        <div>
          <button onClick={() => setSelectedProf(null)}>Back</button>

          <h2>{selectedProf.name}</h2>

          <div>
            Avg: {avg(profRatings).toFixed(1)} ({profRatings.length} ratings)
          </div>

          {profRatings.map(r => (
            <div key={r.id}>
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
