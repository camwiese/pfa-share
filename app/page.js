export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 540, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 28, margin: "0 0 12px" }}>
          A new civic destination at the Palace of Fine Arts
        </h1>
        <p style={{ color: "#7b8e80", fontSize: 15, margin: 0 }}>
          The public deck is coming online shortly. If you have a personal link, open it directly.
        </p>
      </div>
    </main>
  );
}
