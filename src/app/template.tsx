/**
 * Template raiz — re-renderiza a cada navegação e envolve o conteúdo
 * numa div com animação de entrada. Sem lib externa, só CSS puro.
 *
 * Diferente de layout.tsx (persiste entre rotas), template.tsx é
 * recriado a cada navegação, então a animação `page-fade-in` toca
 * toda vez que o usuário muda de página.
 *
 * Respeita `prefers-reduced-motion` (definido em globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
