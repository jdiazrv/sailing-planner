export default function SeasonAccessErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  // searchParams is a Promise in Next.js 15 but we only need to render
  // a static message — the reason param can be shown client-side if needed.
  void searchParams;

  return (
    <main className="auth-layout">
      <div className="auth-card">
        <h1>Enlace no válido</h1>
        <p className="muted">
          Este enlace de acceso ha expirado, ha sido revocado o no es válido.
          Solicita un nuevo enlace al gestor del barco.
        </p>
      </div>
    </main>
  );
}
