import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const host = request.headers.get('host');

    // Handle dashboard.cognode.tech subdomain
    if (host === 'dashboard.cognode.tech') {
        // If the path is just root, rewrite to /dashboard
        if (url.pathname === '/') {
            url.pathname = '/dashboard';
            return NextResponse.rewrite(url);
        }
        
        // If the path doesn't already start with /dashboard, rewrite it
        // This allows dashboard.cognode.tech/projects -> /dashboard/projects
        if (!url.pathname.startsWith('/dashboard')) {
            url.pathname = `/dashboard${url.pathname}`;
            return NextResponse.rewrite(url);
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
