import { ImageResponse } from "next/og";

type Options = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export function renderOG({ eyebrow, title, subtitle }: Options) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background:
          "linear-gradient(135deg, #fff1f2 0%, #ffffff 55%, #fdf2f8 100%)",
        fontFamily: "sans-serif",
        padding: "80px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 360,
          height: 360,
          borderRadius: 9999,
          background: "rgba(253, 164, 175, 0.35)",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -120,
          left: -120,
          width: 360,
          height: 360,
          borderRadius: 9999,
          background: "rgba(254, 205, 211, 0.45)",
          filter: "blur(60px)",
        }}
      />

      {eyebrow && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(254, 205, 211, 0.8)",
            background: "rgba(255, 255, 255, 0.7)",
            color: "#e11d48",
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "10px 20px",
            borderRadius: 9999,
          }}
        >
          {eyebrow}
        </div>
      )}

      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#1c1917",
          marginTop: 32,
          lineHeight: 1.05,
          textAlign: "center",
          maxWidth: 1000,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 32,
            color: "#57534e",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {subtitle}
        </div>
      )}

      <div
        style={{
          fontSize: 20,
          color: "#a8a29e",
          marginTop: 48,
        }}
      >
        craftinagma.com
      </div>
    </div>,
    { ...OG_SIZE },
  );
}
