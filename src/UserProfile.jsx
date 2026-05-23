import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API = "https://vozdux-backend-production.up.railway.app";

const getInitial = (name = "") => name?.trim()?.charAt(0)?.toUpperCase() || "U";

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/users/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
            .then((res) => res.json())
            .then((data) => setUser(data?.user || data?.data || data))
            .catch(() => {});
    }, [id]);

    const copyUsername = () => {
        if (!user?.username) return;
        navigator.clipboard.writeText(user.username);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0e1621]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-[#6258ff] border-t-transparent animate-spin" />
                    <span className="text-[15px] text-[#aeb7c8]">Yuklanmoqda...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0e1621] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(98,88,255,0.12),transparent_50%)] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex h-[62px] items-center justify-between bg-[#17212b] border-b border-white/[0.07] px-5">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-[22px] text-[#aeb7c8] hover:bg-white/10 transition"
                >
                    ‹
                </button>
                <h2 className="text-[17px] font-semibold text-white">Profil ma'lumotlari</h2>
                <div className="w-[40px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-[480px] px-4 pb-10">
                {/* Avatar section */}
                <div className="flex flex-col items-center pt-10 pb-6">
                    <div className="relative">
                        <div
                            className="flex h-[110px] w-[110px] items-center justify-center rounded-full text-[52px] font-bold text-white shadow-[0_0_40px_rgba(98,88,255,0.4)]"
                            style={{ background: "linear-gradient(135deg,#6258ff,#863bff)" }}
                        >
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.username} className="h-full w-full rounded-full object-cover" />
                            ) : (
                                getInitial(user.username)
                            )}
                        </div>
                        <span className="absolute bottom-[5px] right-[5px] h-[18px] w-[18px] rounded-full bg-[#2ee86f] border-[3px] border-[#0e1621]" />
                    </div>

                    <h1 className="mt-4 text-[26px] font-bold text-white">{user.username || "User"}</h1>
                    <p className="mt-1 text-[14px] text-[#6258ff]">@{user.username?.toLowerCase()}</p>
                    <span className="mt-2 flex items-center gap-[6px] text-[13px] text-[#2ee86f]">
                        <span className="h-[7px] w-[7px] rounded-full bg-[#2ee86f]" />
                        Online
                    </span>
                </div>

                {/* Quick actions */}
                <div className="mb-5 flex gap-3">
                    <button
                        onClick={() => navigate("/chat")}
                        className="flex flex-1 items-center justify-center gap-[8px] rounded-[14px] bg-[#6258ff] py-[13px] text-[15px] font-semibold text-white transition hover:bg-[#7068ff] active:scale-[0.98]"
                    >
                        <span className="text-[18px]">💬</span>
                        Xabar yuborish
                    </button>
                    <button
                        onClick={copyUsername}
                        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] bg-[#1f2d3d] text-[20px] transition hover:bg-[#253545] active:scale-95"
                        title="Nusxa olish"
                    >
                        {copied ? "✓" : "📋"}
                    </button>
                </div>

                {/* Info card */}
                <div className="rounded-[18px] bg-[#17212b] border border-white/[0.07] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06]">
                        <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#6258ff] mb-3">
                            Ma'lumotlar
                        </p>
                        <div className="flex items-center justify-between py-[6px]">
                            <span className="text-[14px] text-[#8b91a4]">Username</span>
                            <span className="text-[15px] font-medium text-white">@{user.username}</span>
                        </div>
                        {user.email ? (
                            <div className="flex items-center justify-between py-[6px]">
                                <span className="text-[14px] text-[#8b91a4]">Email</span>
                                <span className="text-[15px] font-medium text-white">{user.email}</span>
                            </div>
                        ) : null}
                        <div className="flex items-center justify-between py-[6px]">
                            <span className="text-[14px] text-[#8b91a4]">ID</span>
                            <span className="text-[13px] font-mono text-[#aeb7c8]">{user._id || user.id}</span>
                        </div>
                    </div>
                </div>

                {/* Action list */}
                <div className="mt-4 rounded-[18px] bg-[#17212b] border border-white/[0.07] overflow-hidden">
                    {[
                        { icon: "🔔", label: "Bildirishnomalar", action: () => alert("Notifications ON/OFF") },
                        { icon: "🖼", label: "Umumiy media", action: () => {} },
                        { icon: "🔗", label: "Kontaktni ulashish", action: copyUsername },
                    ].map(({ icon, label, action }, i, arr) => (
                        <button
                            key={label}
                            type="button"
                            onClick={action}
                            className={`flex h-[54px] w-full items-center gap-[14px] px-5 text-left hover:bg-white/[0.05] transition ${i < arr.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                        >
                            <span className="text-[20px]">{icon}</span>
                            <span className="text-[15px] text-white">{label}</span>
                            <span className="ml-auto text-[16px] text-[#4a5568]">›</span>
                        </button>
                    ))}
                </div>

                {/* Danger zone */}
                <button
                    onClick={() => alert("Bloklandi")}
                    className="mt-5 flex h-[50px] w-full items-center justify-center gap-[8px] rounded-[14px] border border-[#ff4e4e]/30 bg-[#ff4e4e]/10 text-[15px] font-semibold text-[#ff4e4e] transition hover:bg-[#ff4e4e]/20 active:scale-[0.98]"
                >
                    <span>🚫</span> Foydalanuvchini bloklash
                </button>
            </div>
        </div>
    );
}
