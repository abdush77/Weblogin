import { useState } from "react";

const API = "https://vozdux-backend-production.up.railway.app";

export default function CreateGroupModal({ users, token, type = "group", onCreated, onClose }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [groupType, setGroupType] = useState(type);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const filtered = users.filter((u) =>
        (u.username || u.name || "").toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (uid) => {
        setSelectedIds((prev) =>
            prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
        );
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            setError("Nom kiriting");
            return;
        }
        if (selectedIds.length === 0) {
            setError("Kamida 1 ta a'zo tanlang");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const res = await fetch(`${API}/api/groups`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    type: groupType,
                    memberIds: selectedIds,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data?.message || "Yaratishda xato");

            onCreated(data?.group || data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[440px] overflow-hidden rounded-[20px] bg-[#17212b] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-[20px] py-[16px]">
                    <h2 className="text-[18px] font-bold text-white">
                        {groupType === "channel" ? "Kanal yaratish" : "Guruh yaratish"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[22px] text-white/60 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-[20px] py-[16px] space-y-[14px]">
                    {/* Type selector */}
                    <div className="flex gap-[8px]">
                        {["group", "channel"].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setGroupType(t)}
                                className={`flex-1 rounded-[10px] py-[10px] text-[14px] font-semibold transition ${
                                    groupType === t
                                        ? "bg-[#6258ff] text-white"
                                        : "bg-[#1c2837] text-[#8b9ab0] hover:bg-[#222d3b]"
                                }`}
                            >
                                {t === "group" ? "👥 Guruh" : "📢 Kanal"}
                            </button>
                        ))}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="mb-[6px] block text-[13px] text-[#8b9ab0]">
                            {groupType === "channel" ? "Kanal nomi" : "Guruh nomi"}
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={groupType === "channel" ? "Kanalim" : "Guruhim"}
                            className="w-full rounded-[12px] bg-[#1c2837] px-[14px] py-[11px] text-[15px] text-white outline-none placeholder:text-[#566a7f] focus:ring-1 focus:ring-[#6258ff]"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-[6px] block text-[13px] text-[#8b9ab0]">
                            Tavsif (ixtiyoriy)
                        </label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Bu guruh haqida..."
                            className="w-full rounded-[12px] bg-[#1c2837] px-[14px] py-[11px] text-[15px] text-white outline-none placeholder:text-[#566a7f] focus:ring-1 focus:ring-[#6258ff]"
                        />
                    </div>

                    {/* Members */}
                    <div>
                        <label className="mb-[6px] block text-[13px] text-[#8b9ab0]">
                            A'zolar ({selectedIds.length} tanlandi)
                        </label>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Foydalanuvchi qidiring..."
                            className="mb-[10px] w-full rounded-[12px] bg-[#1c2837] px-[14px] py-[10px] text-[14px] text-white outline-none placeholder:text-[#566a7f] focus:ring-1 focus:ring-[#6258ff]"
                        />
                        <div className="max-h-[200px] overflow-y-auto space-y-[4px] rounded-[12px] bg-[#1c2837] p-[8px]">
                            {filtered.length === 0 ? (
                                <p className="py-[12px] text-center text-[14px] text-[#566a7f]">
                                    Foydalanuvchi topilmadi
                                </p>
                            ) : (
                                filtered.map((u) => {
                                    const uid = u._id || u.id;
                                    const selected = selectedIds.includes(uid);
                                    return (
                                        <button
                                            key={uid}
                                            type="button"
                                            onClick={() => toggleUser(uid)}
                                            className={`flex w-full items-center gap-[12px] rounded-[10px] px-[12px] py-[9px] text-left transition ${
                                                selected ? "bg-[#6258ff]/20" : "hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#7d63ff] text-[16px] font-bold text-white">
                                                {(u.username || u.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <span className="flex-1 text-[15px] text-white">
                                                {u.username || u.name || u.email?.split("@")[0]}
                                            </span>
                                            {selected ? (
                                                <span className="text-[18px] text-[#6258ff]">✓</span>
                                            ) : (
                                                <span className="h-[20px] w-[20px] rounded-full border-2 border-[#566a7f]" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {error ? (
                        <p className="text-[13px] text-[#ff5c5c]">{error}</p>
                    ) : null}

                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full rounded-[14px] bg-[#6258ff] py-[13px] text-[16px] font-semibold text-white transition hover:bg-[#7068ff] disabled:opacity-60"
                    >
                        {loading
                            ? "Yaratilmoqda..."
                            : groupType === "channel"
                            ? "Kanal yaratish"
                            : "Guruh yaratish"}
                    </button>
                </div>
            </div>
        </div>
    );
}
