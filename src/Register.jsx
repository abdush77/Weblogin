import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
        <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,80,255,0.22),transparent_45%)]" />

            <div className="relative z-10 w-full max-w-[500px] rounded-[28px] border border-white/10 bg-[#151a26]/95 shadow-[0_0_50px_rgba(88,70,255,0.18)] px-10 py-10">
                <h1 className="text-center text-[34px] font-bold text-[#7f6dff] mb-10">
                    Vozdux Chat
                </h1>

                <div className="mb-8 flex rounded-[18px] bg-[#090d17] p-[4px]">
                    <Link
                        to="/login"
                        className="w-1/2 rounded-[14px] py-4 text-center text-[18px] font-medium text-[#7f8599]"
                    >
                        Kirish
                    </Link>

                    <button
                        type="button"
                        className="w-1/2 rounded-[14px] bg-[#6f63ff] py-4 text-[18px] font-medium text-white shadow-md"
                    >
                        Ro‘yxat
                    </button>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        className="h-[68px] w-full rounded-[18px] border border-white/5 bg-[#060b16] px-6 text-[24px] text-white outline-none placeholder:text-[#6f7488] focus:border-[#6f63ff]"
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        className="h-[68px] w-full rounded-[18px] border border-white/5 bg-[#060b16] px-6 text-[24px] text-white outline-none placeholder:text-[#6f7488] focus:border-[#6f63ff]"
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Parol"
                        value={form.password}
                        onChange={handleChange}
                        className="h-[68px] w-full rounded-[18px] border border-white/5 bg-[#060b16] px-6 text-[24px] text-white outline-none placeholder:text-[#6f7488] focus:border-[#6f63ff]"
                    />

                    {error ? <p className="text-sm text-red-400">{error}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-3 h-[68px] w-full rounded-[18px] bg-[#6f63ff] text-[28px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                        {loading ? "Kutilmoqda..." : "Ro‘yxatdan o‘tish"}
                    </button>
                </form>
            </div>
        </div>
    );
}