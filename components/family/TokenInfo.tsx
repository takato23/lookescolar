'use client';

interface TokenInfoProps {
  token: string;
}

export function TokenInfo({ token }: TokenInfoProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(token);
      // Simple feedback - in a real app you might want to use a toast
      const button = document.getElementById('copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = '¡Copiado!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.warn('Failed to copy token:', err);
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">
            Tu código de acceso:
          </p>
          <p className="break-all rounded bg-blue-100 dark:bg-blue-950/30 px-2 py-1 font-mono text-xs text-blue-900">
            {token.slice(0, 8)}...{token.slice(-8)}
          </p>
        </div>
        <button
          id="copy-button"
          onClick={copyToClipboard}
          className="ml-3 rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
          title="Copiar token completo"
        >
          Copiar
        </button>
      </div>
      <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
        💡 Guarda este código para acceder nuevamente a tus fotos
      </p>
    </div>
  );
}
