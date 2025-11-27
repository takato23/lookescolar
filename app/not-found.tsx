// Simple 404 page without any external component imports
// Uses Tailwind classes since layout.tsx provides the base HTML structure

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center p-4">
        <h2 className="text-4xl font-bold text-foreground mb-4">
          404 - Página no encontrada
        </h2>
        <p className="text-muted-foreground mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Volver al Inicio
        </a>
      </div>
    </div>
  );
}
