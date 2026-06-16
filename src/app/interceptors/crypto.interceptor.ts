import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { from, switchMap } from 'rxjs';

// Clave compartida (AES-256-CBC, 32 bytes en base64)
const SHARED_KEY_B64 = 'xuZEy8dYLzEcWfIElAec3T7TA0TOVPvcrO9wAGgEka4=';

// Importar clave AES desde base64
async function importKey(): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(SHARED_KEY_B64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC', length: 256 }, false, ['encrypt', 'decrypt']);
}

// Encriptar: devuelve base64(IV_16bytes + ciphertext)
async function encryptPayload(data: unknown): Promise<string> {
  const key  = await importKey();
  const iv   = crypto.getRandomValues(new Uint8Array(16));
  const body = new TextEncoder().encode(JSON.stringify(data));
  const enc  = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, body);
  const combined = new Uint8Array(16 + enc.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(enc), 16);
  return btoa(String.fromCharCode(...combined));
}

// Desencriptar: base64(IV_16bytes + ciphertext) → objeto
async function decryptPayload(b64: string): Promise<unknown> {
  const key    = await importKey();
  const bytes  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv     = bytes.slice(0, 16);
  const cipher = bytes.slice(16);
  const dec    = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(dec));
}

// Interceptor
export const cryptoInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Solo aplica a llamadas locales/backend
  if (!req.url.includes('backend/')) {
    return next(req);
  }

  // Sin body (GET, DELETE) — solo marcar header para que el backend cifre la respuesta
  if (!req.body) {
    const encReq = req.clone({ setHeaders: { 'X-Encrypted': '1' } });
    return next(encReq).pipe(
      switchMap(event => from((async () => {
        if (event instanceof HttpResponse && event.body && (event.body as Record<string, unknown>)['d']) {
          try {
            const decrypted = await decryptPayload((event.body as Record<string, unknown>)['d'] as string);
            return event.clone({ body: decrypted });
          } catch { return event; }
        }
        return event;
      })()))
    );
  }

  // Con body: cifrar body, mandar, descifrar respuesta
  return from(encryptPayload(req.body)).pipe(
    switchMap(encrypted => {
      const encReq = req.clone({
        body: { d: encrypted },
        setHeaders: { 'X-Encrypted': '1' }
      });
      return next(encReq).pipe(
        switchMap(event => from((async () => {
          if (event instanceof HttpResponse && event.body && (event.body as Record<string, unknown>)['d']) {
            try {
              const decrypted = await decryptPayload((event.body as Record<string, unknown>)['d'] as string);
              return event.clone({ body: decrypted });
            } catch { return event; }
          }
          return event;
        })()))
      );
    })
  );
};
