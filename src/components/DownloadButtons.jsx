import { useState } from "react";
import { usePWAInstall } from "./PWAInstallButton";

export default function DownloadButtons({ className = "" }) {
  const { canInstall, installed, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone || installed) return null;

  const handleAndroidClick = async () => {
    if (done) return;
    if (canInstall) {
      setInstalling(true);
      const ok = await install();
      setInstalling(false);
      if (ok) setDone(true);
    } else {
      setShowManualModal(true);
    }
  };

  return (
    <div className={className}>
      {/* divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Ilovani yuklab oling
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {/* Android / Desktop */}
        <button
          type="button"
          onClick={handleAndroidClick}
          disabled={installing || done}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid",
            borderColor: done ? "rgba(46,232,111,0.4)" : "rgba(134,59,255,0.5)",
            background: done ? "rgba(46,232,111,0.07)" : "rgba(134,59,255,0.13)",
            cursor: done || installing ? "default" : "pointer",
            transition: "opacity 0.2s",
            opacity: installing ? 0.6 : 1,
            userSelect: "none",
          }}
        >
          <span style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: done ? "rgba(46,232,111,0.18)" : "rgba(134,59,255,0.25)",
          }}>
            {done ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ee86f" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            ) : installing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" style={{ animation: "pwa-spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 1 }}>Android / Desktop</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: done ? "#2ee86f" : "#fff" }}>
              {installing ? "O'rnatilmoqda..." : done ? "O'rnatildi ✓" : "O'rnatish"}
            </div>
          </div>
        </button>

        {/* iOS */}
        <button
          type="button"
          onClick={() => setShowIOSModal(true)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(73,168,232,0.35)",
            background: "rgba(73,168,232,0.08)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(73,168,232,0.2)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#49a8e8" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <circle cx="12" cy="17" r="1" fill="#49a8e8" />
            </svg>
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 1 }}>iPhone / iPad</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>iOS qo'llanma</div>
          </div>
        </button>
      </div>

      {/* Manual install modal */}
      {showManualModal && (
        <InstallModal onClose={() => setShowManualModal(false)} title="Android / Desktop" subtitle="Brauzer menyusi orqali o'rnatish">
          <StepList steps={[
            { icon: "🌐", text: "Saytni Chrome yoki Edge brauzerida oching" },
            { icon: "⋮",  text: 'URL qatori yonidagi "⋮" menyusini bosing' },
            { icon: "📲", text: '"Add to Home screen" yoki "Install app" ni tanlang' },
            { icon: "✓",  text: '"Install" tugmasini bosib tasdiqlang' },
          ]} />
        </InstallModal>
      )}

      {/* iOS modal */}
      {showIOSModal && (
        <InstallModal onClose={() => setShowIOSModal(false)} title="iPhone / iPad" subtitle="Safari orqali o'rnatish">
          <StepList steps={[
            { icon: "🌐", text: "Saytni Safari da oching (Chrome emas!)" },
            { icon: "⬆",  text: 'Quyi qismidagi "Ulashish" (Share) tugmasini bosing' },
            { icon: "➕", text: '"Add to Home Screen" ni tanlang' },
            { icon: "✓",  text: '"Add" tugmasini bosib tasdiqlang' },
          ]} />
        </InstallModal>
      )}

      <style>{`
        @keyframes pwa-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ── shared sub-components ── */

function InstallModal({ onClose, title, subtitle, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "linear-gradient(180deg,#1c1040,#0d0920)",
          border: "1px solid rgba(134,59,255,0.25)",
          borderRadius: "22px 22px 0 0",
          padding: "6px 20px 40px",
        }}
      >
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "10px auto 18px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>{title} ga o'rnatish</p>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 3 }}>{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>

        {children}

        <button
          onClick={onClose}
          style={{
            marginTop: 18, width: "100%", padding: 13, borderRadius: 13,
            border: "none", background: "linear-gradient(135deg,#863bff,#6258ff)",
            color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
            boxShadow: "0 4px 18px rgba(134,59,255,0.38)",
          }}
        >
          Tushunarli
        </button>
      </div>
    </div>
  );
}

function StepList({ steps }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 4 }}>
      {steps.map(({ icon, text }, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "rgba(134,59,255,0.18)", border: "1px solid rgba(134,59,255,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>
            {icon}
          </div>
          <div style={{ paddingTop: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(167,139,250,0.6)", fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 2 }}>
              {i + 1}-QADAM
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
