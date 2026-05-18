import DisabledForm from "../../components/DisabledForm";

export const metadata = {
  title: "Link unavailable",
};

export default function DisabledPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#fcfbf8",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          background: "#fff",
          border: "1px solid #dedad0",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 12px 32px rgba(60,58,52,0.08)",
        }}
      >
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, margin: "0 0 8px", color: "#33403a" }}>
          This link is no longer active.
        </h1>
        <p style={{ color: "#7b8e80", fontSize: 14, lineHeight: 1.5, margin: "0 0 18px" }}>
          Enter your email below if you&rsquo;d like to request access. We&rsquo;ll be in touch.
        </p>
        <DisabledForm />
      </div>
    </main>
  );
}
