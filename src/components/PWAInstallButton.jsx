import { useEffect, useState } from "react";

export function usePWAInstall() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const [canInstall, setCanInstall] = useState(() => !isStandalone && !!window._pwaPrompt);
  const [installed, setInstalled] = useState(() => isStandalone);

  useEffect(() => {
    if (isStandalone) return;

    if (window._pwaPrompt) setCanInstall(true);

    const onReady = () => setCanInstall(true);
    const onInstalled = () => { setInstalled(true); setCanInstall(false); };
    window.addEventListener("pwa-prompt-ready", onReady);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-prompt-ready", onReady);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  const install = async () => {
    const prompt = window._pwaPrompt;
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setCanInstall(false);
      window._pwaPrompt = null;
      return true;
    }
    return false;
  };

  return { canInstall, installed, install };
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    setIsMobile(mobile);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const wasDismissed = sessionStorage.getItem("pwa-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });

    // On iOS show static banner (no beforeinstallprompt)
    if (mobile && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setTimeout(() => setShow(true), 2000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShow(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (installed || dismissed || !show) return null;

  return (
    <>
      {/* Overlay backdrop (mobile) */}
      {isMobile && (
        <div
          className="fixed inset-0 z-[9998]"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
          onClick={handleDismiss}
        />
      )}

      {/* Banner */}
      <div
        className="fixed z-[9999] animate-slide-up"
        style={
          isMobile
            ? {
                bottom: 0,
                left: 0,
                right: 0,
              }
            : {
                bottom: "24px",
                right: "24px",
                width: "360px",
              }
        }
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1a1033 0%, #0f0a20 100%)",
            border: "1px solid rgba(134,59,255,0.3)",
            boxShadow: "0 -4px 40px rgba(134,59,255,0.25), 0 0 0 1px rgba(255,255,255,0.05)",
            borderRadius: isMobile ? "24px 24px 0 0" : "20px",
            padding: isMobile ? "20px 20px 32px" : "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "150px",
              height: "150px",
              background: "radial-gradient(circle, rgba(134,59,255,0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              lineHeight: 1,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            ×
          </button>

          {/* App info row */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #863bff, #49a8e8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 16px rgba(134,59,255,0.4)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 48 46">
                <path fill="white" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
              </svg>
            </div>

            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>
                Vozdux Chat
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", marginTop: "2px" }}>
                vozdux.app
              </div>
            </div>
          </div>

          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.5, marginBottom: "16px" }}>
            {isIOS ? (
              <>
                <span style={{ color: "#a78bfa", fontWeight: 600 }}>Ilovani o'rnatish:</span>{" "}
                Brauzer pastidagi{" "}
                <span style={{ display: "inline-block", verticalAlign: "middle" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(134,59,255,0.9)" strokeWidth="2.5">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>{" "}
                tugmani bosing, keyin <strong style={{ color: "#fff" }}>"Home Screenga qo'shish"</strong>ni tanlang.
              </>
            ) : (
              <>
                <span style={{ color: "#a78bfa", fontWeight: 600 }}>Vozdux Chat</span>-ni qurilmangizga o'rnatib, internetdan tezroq oching.
              </>
            )}
          </div>

          {/* Features row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            {["Tez yuklash", "Offline ishlaydi", "Bildirishnomalar"].map((f) => (
              <span
                key={f}
                style={{
                  background: "rgba(134,59,255,0.15)",
                  border: "1px solid rgba(134,59,255,0.25)",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "#c4b5fd",
                  fontWeight: 500,
                }}
              >
                {f}
              </span>
            ))}
          </div>

          {!isIOS && (
            <button
              onClick={handleInstall}
              disabled={installing}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "14px",
                border: "none",
                background: installing
                  ? "rgba(134,59,255,0.4)"
                  : "linear-gradient(135deg, #863bff 0%, #6258ff 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "15px",
                cursor: installing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: installing ? "none" : "0 4px 20px rgba(134,59,255,0.4)",
                transition: "all 0.2s",
                letterSpacing: "-0.2px",
              }}
              onMouseEnter={(e) => {
                if (!installing)
                  e.currentTarget.style.boxShadow = "0 6px 28px rgba(134,59,255,0.6)";
              }}
              onMouseLeave={(e) => {
                if (!installing)
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(134,59,255,0.4)";
              }}
            >
              {installing ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  O'rnatilmoqda...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Ilovani yuklab olish
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </>
  );
}
