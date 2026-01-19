import http from 'http';
import { URL } from 'url';

/**
 * OAuth callback server using loopback redirect (Google recommended for desktop apps)
 * Listens on http://127.0.0.1:PORT/oauth/callback
 */

const DEFAULT_PORT = 53682;
const DEFAULT_HOST = '127.0.0.1';

let callbackServer: http.Server | null = null;

export interface OAuthCallback {
  code: string;
  state: string;
  error?: string;
}

/**
 * Starts the OAuth callback server and waits for Google's redirect
 * @param port - Port to listen on (default: 53682)
 * @param host - Host to listen on (default: 127.0.0.1)
 * @returns Promise that resolves with the OAuth callback (code and state)
 */
export function waitForOAuthCallback(port: number = DEFAULT_PORT, host: string = DEFAULT_HOST): Promise<OAuthCallback> {
  return new Promise((resolve, reject) => {
    // Stop any existing server
    if (callbackServer) {
      callbackServer.close();
    }

    callbackServer = http.createServer((req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Error</h1><p>Invalid request</p></body></html>');
          return;
        }

        const url = new URL(req.url, `http://${host}:${port}`);

        // Only handle OAuth callback path
        if (url.pathname !== '/oauth/callback') {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Not Found</h1></body></html>');
          return;
        }

        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Close the server after receiving the callback
        if (callbackServer) {
          callbackServer.close();
          callbackServer = null;
        }

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Authentication Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">Authentication Failed</h1>
                <p>${errorDescription || error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          
          reject(new Error(errorDescription || error));
          return;
        }

        if (!code || !state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Authentication Error</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #d32f2f;">Authentication Error</h1>
                <p>Missing authorization code or state.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          
          reject(new Error('Missing authorization code or state'));
          return;
        }

        // Success - send success page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>Authentication Successful</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #388e3c;">✓ Authentication Successful</h1>
              <p>You can close this window and return to the application.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        // Resolve with the callback data
        resolve({ code, state });
      } catch (err) {
        console.error('Error handling OAuth callback:', err);
        
        if (callbackServer) {
          callbackServer.close();
          callbackServer = null;
        }

        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Internal Server Error</h1></body></html>');
        
        reject(err);
      }
    });

    callbackServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying next port...`);
        // Try next port
        waitForOAuthCallback(port + 1, host).then(resolve).catch(reject);
      } else {
        console.error('OAuth callback server error:', err);
        if (callbackServer) {
          callbackServer.close();
          callbackServer = null;
        }
        reject(err);
      }
    });

    callbackServer.listen(port, host, () => {
      console.log(`OAuth callback server listening on http://${host}:${port}/oauth/callback`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (callbackServer) {
        callbackServer.close();
        callbackServer = null;
        reject(new Error('OAuth callback timeout'));
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Stops the OAuth callback server if it's running
 */
export function stopOAuthCallbackServer(): void {
  if (callbackServer) {
    callbackServer.close();
    callbackServer = null;
    console.log('OAuth callback server stopped');
  }
}
