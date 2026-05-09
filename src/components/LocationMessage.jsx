import { useEffect, useRef, useState } from "react";

export default function LocationMessage({ lat, lng, isLive = false, expiresAt, time, isMine }) {
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!isLive || !expiresAt) return;
        const check = () => setIsExpired(new Date() > new Date(expiresAt));
        check();
        const t = setInterval(check, 10000);
        return () => clearInterval(t);
    }, [isLive, expiresAt]);

    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    const approxAddress = `${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E`;

    return (
        <div className="w-[280px] overflow-hidden rounded-[16px] bg-[#1c2837]">
            {/* Map preview */}
            <div className="relative h-[160px] w-full overflow-hidden bg-[#0f1923]">
                {/* Fake map background */}
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-20">
                    {Array.from({ length: 48 }).map((_, i) => (
                        <div key={i} className="border border-[#49a8e8]/30" />
                    ))}
                </div>

                {/* Street lines */}
                <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 280 160">
                    <line x1="0" y1="80" x2="280" y2="80" stroke="#49a8e8" strokeWidth="2" />
                    <line x1="140" y1="0" x2="140" y2="160" stroke="#49a8e8" strokeWidth="2" />
                    <line x1="0" y1="40" x2="280" y2="40" stroke="#49a8e8" strokeWidth="1" />
                    <line x1="0" y1="120" x2="280" y2="120" stroke="#49a8e8" strokeWidth="1" />
                    <line x1="70" y1="0" x2="70" y2="160" stroke="#49a8e8" strokeWidth="1" />
                    <line x1="210" y1="0" x2="210" y2="160" stroke="#49a8e8" strokeWidth="1" />
                </svg>

                {/* Center pin */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                    {isLive && !isExpired ? (
                        <div className="relative flex items-center justify-center">
                            <span className="absolute h-[32px] w-[32px] animate-ping rounded-full bg-[#2ee86f]/40" />
                            <span className="h-[18px] w-[18px] rounded-full bg-[#2ee86f] shadow-[0_0_12px_#2ee86f]" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-[32px] drop-shadow-lg">📍</span>
                        </div>
                    )}
                </div>

                {/* Live badge */}
                {isLive ? (
                    <div
                        className={`absolute top-[10px] left-[10px] flex items-center gap-[5px] rounded-full px-[10px] py-[4px] text-[12px] font-bold ${
                            isExpired
                                ? "bg-[#3b3b3b] text-[#888]"
                                : "bg-[#2ee86f] text-black"
                        }`}
                    >
                        {!isExpired ? (
                            <span className="h-[7px] w-[7px] rounded-full bg-black/60 animate-pulse" />
                        ) : null}
                        {isExpired ? "Tugadi" : "LIVE"}
                    </div>
                ) : null}
            </div>

            {/* Info */}
            <div className="px-[14px] py-[10px]">
                <p className="text-[13px] font-semibold text-white">
                    {isLive ? (isExpired ? "Live lokatsiya (tugadi)" : "Live lokatsiya") : "Lokatsiya"}
                </p>
                <p className="mt-[2px] text-[12px] text-[#8b9ab0]">{approxAddress}</p>

                <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-[10px] flex h-[36px] w-full items-center justify-center rounded-[10px] bg-[#6258ff]/20 text-[13px] font-semibold text-[#a89fff] transition hover:bg-[#6258ff]/30"
                >
                    🗺 Xaritada ochish
                </a>
            </div>

            <div className="px-[14px] pb-[8px] text-right text-[11px] text-[#566a7f]">
                {time} {isMine ? "✓✓" : ""}
            </div>
        </div>
    );
}
