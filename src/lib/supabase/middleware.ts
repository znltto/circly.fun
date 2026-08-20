import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Renova a sessão Supabase em cada requisição e propaga cookies.
 * Também protege rotas privadas — redireciona para /entrar quando
 * necessário e envia usuários logados fora de páginas de auth.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isAuthRoute =
    path.startsWith("/entrar") || path.startsWith("/verificar");
  const isOnboardingRoute = path.startsWith("/onboarding");
  const isPrivateRoute =
    path.startsWith("/inicio") ||
    path.startsWith("/pessoas") ||
    path.startsWith("/salas") ||
    path.startsWith("/conta") ||
    isOnboardingRoute;

  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }

  // Onboarding gate: usuários logados sem onboarded_at vão para /onboarding;
  // usuários que já completaram não conseguem voltar para /onboarding.
  if (user && (isPrivateRoute || isOnboardingRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();

    const hasOnboarded = !!profile?.onboarded_at;

    if (!hasOnboarded && !isOnboardingRoute) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (hasOnboarded && isOnboardingRoute) {
      return NextResponse.redirect(new URL("/inicio", request.url));
    }
  }

  return response;
}
