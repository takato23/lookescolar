/**
 * Global error handler for message channel errors
 * Prevents console spam from service worker communication issues
 */

const MESSAGE_CHANNEL_ERROR_PATTERNS = [
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
  'message channel closed before a response was received',
  'asynchronous response by returning true',
  'You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot()',
  'createRoot() on a container that has already been passed',
];

export function isMessageChannelError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  return MESSAGE_CHANNEL_ERROR_PATTERNS.some(pattern => 
    errorMessage.includes(pattern)
  );
}

export function setupMessageChannelErrorHandler() {
  if (typeof window === 'undefined') return;

  // Override console.error to filter out message channel errors
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ');
    
    // Check if this is a message channel error
    if (isMessageChannelError(errorMessage)) {
      // Log to debug level instead of error level
      console.debug('[Filtered] Message channel error:', ...args);
      return;
    }
    
    // Log other errors normally
    originalConsoleError.apply(console, args);
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isMessageChannelError(event.reason)) {
      console.debug('[Filtered] Unhandled message channel rejection:', event.reason);
      event.preventDefault(); // Prevent the error from showing in console
    }
  });

  // Handle regular errors
  window.addEventListener('error', (event) => {
    if (isMessageChannelError(event.error)) {
      console.debug('[Filtered] Message channel error event:', event.error);
      event.preventDefault(); // Prevent the error from showing in console
    }
  });
}

// Auto-setup if in browser
if (typeof window !== 'undefined') {
  // Add delay to ensure it runs after other scripts
  setTimeout(() => {
    setupMessageChannelErrorHandler();
  }, 0);
}
