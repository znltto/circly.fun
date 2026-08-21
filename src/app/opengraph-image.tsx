import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Circly — Perto, mesmo de longe.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Banner Open Graph — usado pelo WhatsApp, Instagram, Twitter, LinkedIn,
 * Discord, Slack e qualquer plataforma que puxa o og:image.
 *
 * Renderizado on-the-fly pelo Next `ImageResponse`. Sem dependência
 * externa, sem fonte custom (usa system fonts).
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 96px",
          background:
            "radial-gradient(1200px 800px at 90% 15%, rgba(215,255,63,0.10) 0%, transparent 55%), #0C0D0F",
          color: "#F5F5F2",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header row: logo mark + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <svg
            width="88"
            height="88"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M60.9 25.5 A27 27 0 0 0 26.6 10.7"
              stroke="#D7FF3F"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M11.2 25.2 A27 27 0 0 0 11.5 47.4"
              stroke="#D7FF3F"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M27.2 61.5 A27 27 0 0 0 60.9 46.5"
              stroke="#D7FF3F"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="17" cy="16" r="5" fill="#D7FF3F" />
            <circle cx="63" cy="36" r="5" fill="#D7FF3F" />
            <circle cx="17" cy="57" r="5" fill="#D7FF3F" />
            <circle cx="29" cy="36" r="3.2" fill="#F5F5F2" />
            <circle cx="40" cy="36" r="3.2" fill="#F5F5F2" />
          </svg>

          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            <span>Cir</span>
            <span style={{ color: "#D7FF3F" }}>cl</span>
            <span>y</span>
          </div>
        </div>

        {/* Big tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              fontSize: 108,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-4px",
            }}
          >
            <span>Perto, </span>
            <span style={{ color: "#D7FF3F", fontStyle: "italic" }}>
              mesmo
            </span>
            <br />
            <span>de longe.</span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#A3A8B2",
              maxWidth: "780px",
              lineHeight: 1.4,
            }}
          >
            Sala privada de videochamada pra estar junto com quem importa.
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#6F7580",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#57D98D",
              }}
            />
            <span>Online agora</span>
          </div>
          <div
            style={{
              fontFamily:
                'ui-monospace, "SF Mono", "Menlo", "Consolas", monospace',
              color: "#F5F5F2",
              fontWeight: 500,
            }}
          >
            circly.fun
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
