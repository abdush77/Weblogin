import { useEffect, useRef } from "react";
import useCallStore from "../store/callStore";
import {
    setStreamCallbacks,
    getLocalStream,
    getRemoteStream,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
} from "../services/webrtc";

// Andijon Polkasi — asosiy melodiya, 138 BPM
// [chastota_Hz, boshlash_vaqti_s, davomiylik_s]
const S = 60 / 138 / 2; // 8-nota = 0.217s
const ANDIJON = [
    // 1-ibora: ko'tarilish
    [440.00, 0  * S, S], // A4
    [493.88, 1  * S, S], // B4
    [554.37, 2  * S, S], // C#5
    [587.33, 3  * S, S], // D5
    [659.25, 4  * S, S * 2], // E5 (chorak)
    [659.25, 6  * S, S], // E5
    [587.33, 7  * S, S], // D5
    // 2-ibora: tushish
    [554.37, 8  * S, S], // C#5
    [587.33, 9  * S, S], // D5
    [659.25, 10 * S, S * 2], // E5
    [440.00, 12 * S, S * 2], // A4
    // 3-ibora: o'rta
    [369.99, 14 * S, S], // F#4
    [415.30, 15 * S, S], // G#4
    [440.00, 16 * S, S], // A4
    [493.88, 17 * S, S], // B4
    [554.37, 18 * S, S * 2], // C#5
    [554.37, 20 * S, S], // C#5
    [493.88, 21 * S, S], // B4
    // 4-ibora: yakunlovchi
    [440.00, 22 * S, S], // A4
    [493.88, 23 * S, S], // B4
    [554.37, 24 * S, S], // C#5
    [659.25, 25 * S, S], // E5
    [880.00, 26 * S, S * 4], // A5 — yuqori nota, uzun
];
const ANDIJON_LOOP = 31 * S * 1000 + 400; // ms

function useRingtone(active) {
    const ctxRef = useRef(null);
    const loopRef = useRef(null);
    const vibrateRef = useRef(null);

    useEffect(() => {
        if (!active) { stop(); return; }

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -3;
        comp.knee.value = 3;
        comp.ratio.value = 12;
        comp.attack.value = 0.001;
        comp.release.value = 0.05;
        comp.connect(ctx.destination);

        const master = ctx.createGain();
        master.gain.value = 2.8;
        master.connect(comp);

        const playNote = (freq, startTime, dur) => {
            const t = ctx.currentTime + startTime;

            // Dutar / rubob tembri: triangle + garmoniklar
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.85, t + 0.008);
            gain.gain.setValueAtTime(0.75, t + dur * 0.5);
            gain.gain.linearRampToValueAtTime(0.0, t + dur);
            osc.connect(gain); gain.connect(master);
            osc.start(t); osc.stop(t + dur);

            // Yuqori garmonik — tor tembri
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.value = freq * 3;
            gain2.gain.setValueAtTime(0.18, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.4);
            osc2.connect(gain2); gain2.connect(master);
            osc2.start(t); osc2.stop(t + dur * 0.4);
        };

        const ring = () => {
            ANDIJON.forEach(([freq, offset, dur]) => playNote(freq, offset, dur));
        };

        ring();
        loopRef.current = setInterval(ring, ANDIJON_LOOP);

        if (navigator.vibrate) {
            const vib = () => navigator.vibrate([150, 80, 150, 80, 300, 200, 150, 500]);
            vib();
            vibrateRef.current = setInterval(vib, ANDIJON_LOOP);
        }

        return () => stop();
    }, [active]);

    function stop() {
        clearInterval(loopRef.current);
        clearInterval(vibrateRef.current);
        loopRef.current = null;
        vibrateRef.current = null;
        if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
        if (navigator.vibrate) navigator.vibrate(0);
    }
}

export default function VideoCallModal() {
    const {
        callStatus,
        activeCallUser,
        incomingCall,
        isMuted,
        isCameraOff,
    } = useCallStore();

    const localRef = useRef(null);
    const remoteRef = useRef(null);

    useRingtone(callStatus === "ringing");

    useEffect(() => {
        setStreamCallbacks(
            (stream) => {
                if (localRef.current) localRef.current.srcObject = stream;
            },
            (stream) => {
                if (remoteRef.current) remoteRef.current.srcObject = stream;
            }
        );

        // Agar stream allaqachon mavjud bo'lsa (video elementlar montajdan keyin),
        // uni to'g'ridan-to'g'ri assign qilamiz - bu race condition ni hal qiladi
        const existing = getLocalStream();
        if (existing && localRef.current) localRef.current.srcObject = existing;

        const existingRemote = getRemoteStream();
        if (existingRemote && remoteRef.current) remoteRef.current.srcObject = existingRemote;

        return () => setStreamCallbacks(null, null);
    }, [callStatus]);

    if (callStatus === "idle") return null;

    if (callStatus === "ringing") {
        return (
            <div style={s.overlay}>
                <div style={s.card}>
                    <div style={s.avatar}>
                        {incomingCall?.callerName?.[0]?.toUpperCase() || "U"}
                    </div>

                    <p style={s.name}>{incomingCall?.callerName || "User"}</p>
                    <p style={s.text}>Video qo‘ng‘iroq...</p>

                    <div style={s.row}>
                        <button
                            style={{ ...s.btn, background: "#22c55e" }}
                            onClick={answerCall}
                        >
                            📹 Qabul
                        </button>

                        <button
                            style={{ ...s.btn, background: "#ef4444" }}
                            onClick={rejectCall}
                        >
                            ✕ Rad
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (callStatus === "calling") {
        return (
            <div style={s.overlay}>
                <div style={s.card}>
                    <div style={s.avatar}>
                        {activeCallUser?.username?.[0]?.toUpperCase() || "U"}
                    </div>

                    <p style={s.name}>{activeCallUser?.username || "User"}</p>
                    <p style={s.text}>Qo‘ng‘iroq qilinmoqda...</p>

                    <button
                        style={{ ...s.btn, background: "#ef4444" }}
                        onClick={endCall}
                    >
                        ✕ Bekor
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={s.fullscreen}>
            <video ref={remoteRef} autoPlay playsInline style={s.remoteVideo} />
            <video ref={localRef} autoPlay playsInline muted style={s.localVideo} />

            <div style={s.topBar}>
                {activeCallUser?.username || "Video call"}
            </div>

            <div style={s.controls}>
                <button
                    style={{
                        ...s.ctrl,
                        background: isMuted ? "#ef4444" : "#374151",
                    }}
                    onClick={toggleMute}
                >
                    {isMuted ? "🔇" : "🎤"}
                </button>

                <button
                    style={{
                        ...s.ctrl,
                        background: "#ef4444",
                        width: 64,
                        height: 64,
                    }}
                    onClick={endCall}
                >
                    ✕
                </button>

                <button
                    style={{
                        ...s.ctrl,
                        background: isCameraOff ? "#ef4444" : "#374151",
                    }}
                    onClick={toggleCamera}
                >
                    {isCameraOff ? "📷" : "📹"}
                </button>
            </div>
        </div>
    );
}

const s = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
    },
    card: {
        background: "#1f2937",
        borderRadius: 16,
        padding: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 280,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: "#3b82f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        color: "#fff",
        marginBottom: 16,
        fontWeight: 700,
    },
    name: {
        color: "#fff",
        fontSize: 22,
        fontWeight: 700,
        margin: "0 0 8px",
    },
    text: {
        color: "#aaa",
        marginBottom: 24,
    },
    row: {
        display: "flex",
        gap: 16,
    },
    btn: {
        padding: "12px 24px",
        border: "none",
        borderRadius: 10,
        color: "#fff",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
    },
    fullscreen: {
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    remoteVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    localVideo: {
        position: "absolute",
        bottom: 100,
        right: 20,
        width: 170,
        height: 110,
        borderRadius: 12,
        objectFit: "cover",
        border: "2px solid #374151",
        background: "#111827",
    },
    topBar: {
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        fontSize: 18,
        fontWeight: 600,
        background: "rgba(0,0,0,0.5)",
        padding: "8px 20px",
        borderRadius: 20,
    },
    controls: {
        position: "absolute",
        bottom: 30,
        display: "flex",
        gap: 16,
        alignItems: "center",
    },
    ctrl: {
        width: 52,
        height: 52,
        border: "none",
        borderRadius: "50%",
        color: "#fff",
        fontSize: 20,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
};