import { useEffect, useRef } from "react";
import useCallStore from "../store/callStore";
import {
    setStreamCallbacks,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
} from "../services/webrtc";

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

    useEffect(() => {
        setStreamCallbacks(
            (stream) => {
                if (localRef.current) localRef.current.srcObject = stream;
            },
            (stream) => {
                if (remoteRef.current) remoteRef.current.srcObject = stream;
            }
        );

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