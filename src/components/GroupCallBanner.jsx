export default function GroupCallBanner({ callInfo, onJoin, onLeave, isInCall }) {
    const count = callInfo?.participants?.length || 1;

    return (
        <div className="mx-4 mt-3 mb-1 rounded-[18px] border border-[#6258ff]/25 bg-[#13192b] shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-[#6258ff]/20 flex items-center justify-center text-[22px]">
                            📞
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#22c55e] border-2 border-[#13192b] animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white text-[14px] font-semibold leading-tight">
                            Guruh qo'ng'irog'i faol
                        </p>
                        <p className="text-white/45 text-[12px] truncate mt-0.5">
                            {callInfo?.callerName} boshladi · {count} ishtirokchi
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isInCall ? (
                        <button
                            type="button"
                            onClick={onLeave}
                            className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition active:scale-95"
                        >
                            Chiqish
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onJoin}
                            className="px-4 py-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-[13px] font-semibold transition active:scale-95"
                        >
                            Qo'shilish
                        </button>
                    )}
                </div>
            </div>

            {/* Participants avatars row */}
            {count > 0 && (
                <div className="flex items-center gap-1.5 px-4 pb-3">
                    {(callInfo?.participants || []).slice(0, 6).map((p, i) => (
                        <div
                            key={p.userId || i}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                            style={{ background: `hsl(${(p.userId?.charCodeAt(0) || i) * 47 % 360}, 60%, 45%)` }}
                            title={p.username}
                        >
                            {p.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                    ))}
                    {count > 6 && (
                        <span className="text-white/40 text-[12px] ml-1">+{count - 6}</span>
                    )}
                </div>
            )}
        </div>
    );
}
