import { useEffect, useRef, useState } from "react";
import useStoriesStore from "../store/storiesStore";

const API = "https://vozdux-backend-production.up.railway.app";

export default function StoriesViewer({ allStories, startIndex = 0, onClose }) {
    const [userIndex, setUserIndex] = useState(startIndex);
    const [itemIndex, setItemIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);
    const DURATION = 5000;

    const currentUser = allStories[userIndex];
    const currentItem = currentUser?.items?.[itemIndex];

    const goNext = () => {
        const items = currentUser?.items || [];
        if (itemIndex < items.length - 1) {
            setItemIndex((i) => i + 1);
            setProgress(0);
        } else if (userIndex < allStories.length - 1) {
            setUserIndex((u) => u + 1);
            setItemIndex(0);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (itemIndex > 0) {
            setItemIndex((i) => i - 1);
            setProgress(0);
        } else if (userIndex > 0) {
            setUserIndex((u) => u - 1);
            const prevItems = allStories[userIndex - 1]?.items || [];
            setItemIndex(Math.max(prevItems.length - 1, 0));
            setProgress(0);
        }
    };

    useEffect(() => {
        setProgress(0);
        clearInterval(intervalRef.current);

        const step = 100 / (DURATION / 50);
        intervalRef.current = setInterval(() => {
            setProgress((p) => {
                if (p + step >= 100) {
                    clearInterval(intervalRef.current);
                    setTimeout(goNext, 80);
                    return 100;
                }
                return p + step;
            });
        }, 50);

        return () => clearInterval(intervalRef.current);
    }, [userIndex, itemIndex]);

    if (!currentUser || !currentItem) return null;

    const items = currentUser.items || [];
    const mediaUrl = currentItem.mediaUrl
        ? currentItem.mediaUrl.startsWith("http")
            ? currentItem.mediaUrl
            : `${API}${currentItem.mediaUrl}`
        : null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90"
            onClick={onClose}
        >
            <div
                className="relative flex h-full max-h-[900px] w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] bg-black"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 z-10 flex gap-[4px] px-[12px] pt-[12px]">
                    {items.map((_, i) => (
                        <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                            <div
                                className="h-full rounded-full bg-white transition-none"
                                style={{
                                    width:
                                        i < itemIndex
                                            ? "100%"
                                            : i === itemIndex
                                            ? `${progress}%`
                                            : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-[24px] left-0 right-0 z-10 flex items-center gap-[12px] px-[16px] pt-[8px]">
                    <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#7d63ff] text-[18px] font-bold text-white">
                        {(currentUser.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[15px] font-semibold text-white">
                            {currentUser.username}
                        </p>
                        <p className="text-[12px] text-white/60">
                            {currentItem.createdAt
                                ? new Date(currentItem.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : ""}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-auto text-[26px] text-white/80 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex h-full w-full items-center justify-center bg-[#111]">
                    {currentItem.type === "text" || !mediaUrl ? (
                        <div
                            className="flex h-full w-full items-center justify-center p-[32px]"
                            style={{ background: currentItem.bg || "linear-gradient(135deg,#7d63ff,#49a8e8)" }}
                        >
                            <p className="text-center text-[26px] font-bold text-white leading-[1.4]">
                                {currentItem.text}
                            </p>
                        </div>
                    ) : currentItem.type === "video" ? (
                        <video
                            src={mediaUrl}
                            autoPlay
                            muted
                            loop
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <img
                            src={mediaUrl}
                            alt="story"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>

                {/* Text overlay */}
                {mediaUrl && currentItem.text ? (
                    <div className="absolute bottom-[60px] left-0 right-0 px-[20px] text-center">
                        <p className="text-[20px] font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                            {currentItem.text}
                        </p>
                    </div>
                ) : null}

                {/* Nav zones */}
                <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-0 top-[60px] h-[calc(100%-120px)] w-[40%]"
                />
                <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-0 top-[60px] h-[calc(100%-120px)] w-[40%]"
                />

                {/* User navigation dots */}
                {allStories.length > 1 ? (
                    <div className="absolute bottom-[18px] left-0 right-0 flex justify-center gap-[6px]">
                        {allStories.map((_, i) => (
                            <div
                                key={i}
                                className={`h-[6px] w-[6px] rounded-full transition ${
                                    i === userIndex ? "bg-white" : "bg-white/30"
                                }`}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
