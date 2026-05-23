import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DownloadButtons from "./components/DownloadButtons";

const API = "https://vozdux-backend-production.up.railway.app";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        try {
            setLoading(true);

            const res = await fetch(`${API}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: form.username.trim(),
                    email: form.email.trim(),
                    password: form.password.trim(),
                }),
            });

            const data = await res.json();
            console.log("REGISTER STATUS:", res.status);
            console.log("REGISTER RESPONSE:", data);

            if (!res.ok) {
                throw new Error(data?.message || "Ro‘yxatdan o‘tishda xato");
            }

            navigate("/login");
        } catch (err) {
            setError(err.message || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center px-4 py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,80,255,0.22),transparent_45%)]" />

            <div className="relative z-10 w-full max-w-[480px] rounded-[24px] sm:rounded-[28px] border border-white/10 bg-[#151a26]/95 shadow-[0_0_50px_rgba(88,70,255,0.18)] px-5 sm:px-10 py-8 sm:py-10">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#863bff] to-[#49a8e8] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 48 46">
                            <path fill="white" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
                        </svg>
                    </div>
                    <h1 className="text-[26px] sm:text-[32px] font-bold text-[#7f6dff]">
                        Vozdux Chat
                    </h1>
                </div>

                <div className="mb-6 flex rounded-[16px] bg-[#090d17] p-[4px]">
                    <Link
                        to="/login"
                        className="w-1/2 rounded-[12px] py-3 sm:py-4 text-center text-[15px] sm:text-[17px] font-medium text-[#7f8599] hover:text-white transition-colors"
                    >
                        Kirish
                    </Link>

                    <button
                        type="button"
                        className="w-1/2 rounded-[12px] bg-[#6f63ff] py-3 sm:py-4 text-[15px] sm:text-[17px] font-semibold text-white shadow-md"
                    >
                        Ro’yxat
                    </button>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex items-center gap-3 h-[58px] rounded-[16px] border border-white/10 bg-[#060b16] px-4 focus-within:border-[#6f63ff] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f7488" strokeWidth="2" className="shrink-0">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            className="flex-1 h-full bg-transparent text-[17px] text-white outline-none placeholder:text-[#6f7488]"
                        />
                    </div>

                    <div className="flex items-center gap-3 h-[58px] rounded-[16px] border border-white/10 bg-[#060b16] px-4 focus-within:border-[#6f63ff] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f7488" strokeWidth="2" className="shrink-0">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            className="flex-1 h-full bg-transparent text-[17px] text-white outline-none placeholder:text-[#6f7488]"
                        />
                    </div>

                    <div className="flex items-center gap-3 h-[58px] rounded-[16px] border border-white/10 bg-[#060b16] px-4 focus-within:border-[#6f63ff] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f7488" strokeWidth="2" className="shrink-0">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <input
                            type="password"
                            name="password"
                            placeholder="Parol"
                            value={form.password}
                            onChange={handleChange}
                            className="flex-1 h-full bg-transparent text-[17px] text-white outline-none placeholder:text-[#6f7488]"
                        />
                    </div>

                    {error ? (
                        <div className="flex items-center gap-2 rounded-[12px] bg-red-500/10 border border-red-500/20 px-4 py-3">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 h-[54px] sm:h-[62px] w-full rounded-[16px] bg-gradient-to-r from-[#6f63ff] to-[#863bff] text-[17px] sm:text-[19px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_4px_20px_rgba(111,99,255,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Kutilmoqda...
                            </span>
                        ) : "Ro’yxatdan o’tish"}
                    </button>
                </form>

                <p className="mt-5 text-center text-[13px] text-[#6f7488]">
                    Akkaunt bormi?{" "}
                    <Link to="/login" className="text-[#7f6dff] hover:underline font-medium">
                        Kirish
                    </Link>
                </p>
            </div>

            <DownloadButtons className="relative z-10 w-full max-w-[480px] mt-4" />

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}