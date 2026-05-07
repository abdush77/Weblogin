import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEFAULT_PASSWORD = "abdush2717";

export default function Settings() {
    const navigate = useNavigate();

    const savedPassword = localStorage.getItem("settingsPassword") || DEFAULT_PASSWORD;

    const [password, setPassword] = useState("");
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [error, setError] = useState("");

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [changeMessage, setChangeMessage] = useState("");

    const openSettings = () => {
        if (password === savedPassword) {
            setIsUnlocked(true);
            setError("");
            setPassword("");
        } else {
            setError("Parol noto‘g‘ri");
        }
    };

    const changePassword = () => {
        const currentPassword = localStorage.getItem("settingsPassword") || DEFAULT_PASSWORD;

        if (oldPassword !== currentPassword) {
            setChangeMessage("Eski parol noto‘g‘ri");
            return;
        }

        if (newPassword.length < 4) {
            setChangeMessage("Yangi parol kamida 4 ta belgi bo‘lsin");
            return;
        }

        localStorage.setItem("settingsPassword", newPassword);
        setOldPassword("");
        setNewPassword("");
        setChangeMessage("Parol muvaffaqiyatli o‘zgartirildi");
    };

    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-[#0e1621] flex items-center justify-center text-white">
                <div className="w-[390px] rounded-[18px] bg-[#17212b] border border-white/10 shadow-2xl overflow-hidden">
                    <div className="h-[58px] flex items-center gap-4 px-5 bg-[#1f2c39]">
                        <button
                            onClick={() => navigate("/chat")}
                            className="text-[26px] text-[#8ea2b5]"
                        >
                            ×
                        </button>
                        <h1 className="text-[20px] font-semibold">Настройки</h1>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col items-center">
                            <div className="w-[96px] h-[96px] rounded-full bg-black flex items-center justify-center text-[48px]">
                                🌹
                            </div>

                            <h2 className="mt-4 text-[22px] font-bold">Settings himoyalangan</h2>
                            <p className="mt-2 text-center text-[15px] text-[#8ea2b5]">
                                Sozlamalarni ochish uchun parol kiriting.
                            </p>
                        </div>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") openSettings();
                            }}
                            placeholder="Parol"
                            className="mt-6 h-[48px] w-full rounded-[10px] bg-[#0f1a24] px-4 text-white outline-none border border-white/10 placeholder:text-[#6f8294]"
                        />

                        {error ? (
                            <p className="mt-3 text-[14px] text-red-400">{error}</p>
                        ) : null}

                        <button
                            onClick={openSettings}
                            className="mt-5 h-[48px] w-full rounded-[10px] bg-[#5288c1] text-[16px] font-semibold text-white active:scale-[0.98]"
                        >
                            Ochish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0e1621] text-white flex justify-center">
            <div className="w-full max-w-[500px] min-h-screen bg-[#17212b] shadow-2xl">
                <div className="h-[62px] flex items-center justify-between px-5 bg-[#17212b] border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/chat")}
                            className="text-[28px] text-[#8ea2b5]"
                        >
                            ‹
                        </button>
                        <h1 className="text-[21px] font-semibold">Настройки</h1>
                    </div>

                    <div className="flex items-center gap-5 text-[#8ea2b5] text-[24px]">
                        <button>⌕</button>
                        <button>⋮</button>
                    </div>
                </div>

                <div className="flex items-center gap-4 px-7 py-5 bg-[#17212b]">
                    <div className="w-[90px] h-[90px] rounded-full bg-black flex items-center justify-center text-[44px]">
                        🌹
                    </div>

                    <div>
                        <h2 className="text-[22px] font-bold">.@.</h2>
                        <p className="mt-1 text-[16px] text-white/90">+998 99 *** 27 17</p>
                        <p className="mt-1 text-[15px] text-[#6fa8dc]">@uuogc4</p>
                    </div>
                </div>

                <div className="h-[10px] bg-[#101b25]" />

                <div className="py-2">
                    <div className="flex items-center gap-5 px-7 h-[54px] hover:bg-white/5">
                        <span className="text-[25px] text-[#9dafbf]">☻</span>
                        <span className="text-[17px]">Мой аккаунт</span>
                    </div>

                    <div className="flex items-center gap-5 px-7 h-[54px] hover:bg-white/5">
                        <span className="text-[25px] text-[#9dafbf]">🔔</span>
                        <span className="text-[17px]">Уведомления и звуки</span>
                    </div>

                    <div className="flex items-center gap-5 px-7 h-[54px] hover:bg-white/5">
                        <span className="text-[25px] text-[#9dafbf]">🔒</span>
                        <span className="text-[17px]">Конфиденциальность</span>
                    </div>

                    <div className="flex items-center gap-5 px-7 h-[54px] hover:bg-white/5">
                        <span className="text-[25px] text-[#9dafbf]">💬</span>
                        <span className="text-[17px]">Настройки чатов</span>
                    </div>

                    <div className="flex items-center gap-5 px-7 h-[54px] hover:bg-white/5">
                        <span className="text-[25px] text-[#9dafbf]">📁</span>
                        <span className="text-[17px]">Папки с чатами</span>
                    </div>

                    <div className="flex items-center gap-5 px-7 h-[54px] hover:bg-white/5">
                        <span className="text-[25px] text-[#9dafbf]">🎙</span>
                        <span className="text-[17px]">Звук и камера</span>
                    </div>
                </div>

                <div className="h-[10px] bg-[#101b25]" />

                <div className="px-7 py-5">
                    <h3 className="text-[15px] uppercase tracking-wide text-[#6fa8dc] mb-4">
                        Shaxsiy ma’lumot
                    </h3>

                    <div className="space-y-3 text-[16px]">
                        <div className="flex justify-between gap-4">
                            <span className="text-[#8ea2b5]">Tug‘ilgan kun</span>
                            <span>2008.07.17</span>
                        </div>

                        <div className="flex justify-between gap-4">
                            <span className="text-[#8ea2b5]">Telefon</span>
                            <span>+998 99 *** 27 17</span>
                        </div>

                        <div className="flex justify-between gap-4">
                            <span className="text-[#8ea2b5]">Login</span>
                            <span>@uuogc4</span>
                        </div>

                        <div className="flex justify-between gap-4">
                            <span className="text-[#8ea2b5]">Parol</span>
                            <span>••••••••••</span>
                        </div>
                    </div>

                    <p className="mt-5 rounded-[12px] bg-[#101b25] px-4 py-3 text-[15px] leading-[22px] text-[#d7e3ee]">
                        Quvnoq MARS IT o‘quvchisi. Dasturlashga qiziqadi, 4 ta til biladi,
                        yangi texnologiyalarni tez o‘rganadi va doim o‘z ustida ishlaydi.
                    </p>
                </div>

                <div className="h-[10px] bg-[#101b25]" />

                <div className="px-7 py-5">
                    <h3 className="text-[15px] uppercase tracking-wide text-[#6fa8dc] mb-4">
                        Settings parolini o‘zgartirish
                    </h3>

                    <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Eski parol"
                        className="h-[46px] w-full rounded-[10px] bg-[#0f1a24] px-4 text-white outline-none border border-white/10 placeholder:text-[#6f8294]"
                    />

                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Yangi parol"
                        className="mt-3 h-[46px] w-full rounded-[10px] bg-[#0f1a24] px-4 text-white outline-none border border-white/10 placeholder:text-[#6f8294]"
                    />

                    {changeMessage ? (
                        <p className="mt-3 text-[14px] text-[#6fa8dc]">{changeMessage}</p>
                    ) : null}

                    <button
                        onClick={changePassword}
                        className="mt-4 h-[46px] w-full rounded-[10px] bg-[#5288c1] text-[16px] font-semibold active:scale-[0.98]"
                    >
                        Parolni o‘zgartirish
                    </button>
                </div>
            </div>
        </div>
    );
}