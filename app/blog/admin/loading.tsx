export default function Loading() {
  return (
    <main id="main-content" className="shell status-page" aria-busy="true">
      <p role="status" className="eyebrow">
        Loading your next read…
      </p>
      <div className="loading-line" />
      <div className="loading-line short" />
    </main>
  );
}
