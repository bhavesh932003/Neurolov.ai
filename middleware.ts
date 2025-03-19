import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedPaths = [
  '/dashboard',
  '/gpu-marketplace',
  '/ai-models',
  '/earnings',
  '/connect-to-earn',
  '/wallet',
  '/neurolov-image'
]

// Routes that should be accessible without auth
const publicPaths = ['/', '/auth/callback', '/auth/profile']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // If it's a public path or auth-related path, allow access
  if (publicPaths.includes(path) || path.startsWith('/auth/')) {
    // Only redirect from home to dashboard if logged in
    if (session && path === '/') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  // For protected paths, check if user is authenticated
  if (protectedPaths.some(p => path.startsWith(p))) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.delete('message')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
