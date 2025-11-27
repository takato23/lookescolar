// Custom error page for Pages Router compatibility
// Prevents Next.js from using its internal error page which triggers Html context issues
import type { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {statusCode ? `Error ${statusCode}` : 'Error'}
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          {statusCode === 404
            ? 'La página que buscas no existe.'
            : 'Ha ocurrido un error inesperado.'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '9999px',
            textDecoration: 'none'
          }}
        >
          Volver al Inicio
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
