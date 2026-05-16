import { useEffect, useRef } from "react";
import useGroupCallStore from "../store/groupCallStore";
import {
    getLocalGroupStream,
    setLocalGroupStreamCallback,
    toggleGroupMute,
    toggleGroupCamera,
    leaveGroupCall,
} from "../services/groupWebrtc";

function LocalTile({ username }) {
    const videoRef = useRef(null);

    useEffect(() => {
        setLocalGroupStreamCallback((stream) => {
            if (videoRef.current) videoRef.current.srcObject = stream;
        });
        const s = getLocalGroupStream();
        if (s && videoRef.current) videoRef.current.srcObject = s;
        return () => setLocalGroupStreamCallback(null);
    }, []);

    return (
        <div className="relative overflow-hidden rounded-[20px] bg-[#1a1f2e] aspect-video flex items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                <span className="text-white text-[13px] font-medium drop-shadow">
                    {username} <span className="text-white/60">(Siz)</span>
                </span>
            </div>
        </div>
    );
}

function RemoteTile({ participant }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream;
        }
    }, [participant.stream]);

    const initial = participant.username?.trim()?.charAt(0)?.toUpperCase() || "U";

    return (
        <div className="relative overflow-hidden rounded-[20px] bg-[#1a1f2e] aspect-video flex items-center justify-center">
            {participant.stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg"
                        style={{ background: "linear-gradient(135deg,#6258ff,#49a8e8)" }}
                    >
                        {initial}
                    </div>
                    <span className="text-white/40 text-[13px]">Kamera o'chiq</span>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 left-3">
                <span className="text-white text-[13px] font-medium drop-shadow">
                    {participant.username}
                </span>
            </div>
        </div>
    );
}

export default function GroupCallModal({ myId, myUsername }) {
    const {
        isInCall,
        activeGroupId,
        activeGroupName,
        participants,
        isMuted,
        isCameraOff,
    } = useGroupCallStore();

    if (!isInCall) return null;

    const remoteParticipants = participants.filter((p) => p.userId !== myId);
    const totalTiles = remoteParticipants.length + 1;
    const cols = totalTiles === 1 ? 1 : totalTiles <= 4 ? 2 : 3;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0d1117] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0d1117]">
                <div>
                    <h2 className="text-white text-[20px] font-bold leading-tight">
                        {activeGroupName}
                    </h2>
                    <p className="text-white/40 text-[13px] mt-0.5">
                        {participants.length} ishtirokchi
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-[#22c55e] text-[13px] font-medium">Faol</span>
                </div>
            </div>

            {/* Video Grid */}
            <div
                className="flex-1 min-h-0 p-4 overflow-y-auto"
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gridAutoRows: "1fr",
                    gap: 10,
                    alignContent: totalTiles <= 2 ? "center" : "start",
                }}
            >
                <LocalTile username={myUsername || "Siz"} />
                {remoteParticipants.map((p) => (
                    <RemoteTile key={p.userId} participant={p} />
                ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-6 border-t border-white/[0.08] bg-[#0d1117]">
                <button
                    type="button"
                    onClick={toggleGroupMute}
                    title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-[22px] transition active:scale-90 ${
                        isMuted
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-[#222a35] hover:bg-[#2d3847]"
                    }`}
                >
                    {isMuted ? "🔇" : "🎤"}
                </button>

                <button
                    type="button"
                    onClick={() => leaveGroupCall(activeGroupId)}
                    title="Qo'ng'iroqni tugatish"
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-[26px] transition active:scale-90 shadow-lg shadow-red-500/30"
                >
                    📵
                </button>

                <button
                    type="button"
                    onClick={toggleGroupCamera}
                    title={isCameraOff ? "Kamerani yoqish" : "Kamerani o'chirish"}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-[22px] transition active:scale-90 ${
                        isCameraOff
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-[#222a35] hover:bg-[#2d3847]"
                    }`}
                >
                    {isCameraOff ? "📷" : "📹"}
                </button>
            </div>
        </div>
    );
}
