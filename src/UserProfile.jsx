import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch(`https://vozdux-backend-production.up.railway.app/api/users/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setUser(data))
            .catch(() => console.log("error"));
    }, [id]);

    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">

            {/* TOP */}
            <div className="flex items-center justify-between p-4 bg-[#111]">
                <button onClick={() => navigate(-1)}>⬅️</button>
                <h2 className="text-lg">Info</h2>
                <span>✏️</span>
            </div>

            {/* USER */}
            <div className="p-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-purple-500 flex items-center justify-center text-2xl">
                        {user.username?.[0]}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold">{user.username}</h2>
                        <p className="text-green-400 text-sm">online</p>
                    </div>
                </div>

                {/* INFO */}
                <div className="mt-6 space-y-4 text-sm">

                    <div>
                        <p className="text-gray-400">username</p>
                        <p>@{user.username}</p>
                    </div>

                    <div>
                        <p className="text-gray-400">id</p>
                        <p>{user._id}</p>
                    </div>

                </div>

                {/* ACTIONS */}
                <div className="mt-8 space-y-4">

                    <button
                        onClick={() => navigate("/chat")}
                        className="w-full text-left py-3 border-b border-gray-700"
                    >
                        Send Message
                    </button>

                    <button
                        onClick={() => navigator.clipboard.writeText(user.username)}
                        className="w-full text-left py-3 border-b border-gray-700"
                    >
                        Share Contact
                    </button>

                    <button
                        onClick={() => alert("Notifications ON/OFF")}
                        className="w-full text-left py-3 border-b border-gray-700"
                    >
                        Notifications
                    </button>

                    <button className="w-full text-left py-3 border-b border-gray-700">
                        Shared Media
                    </button>

                </div>

                {/* DELETE */}
                <button
                    onClick={() => alert("User deleted (fake)")}
                    className="mt-10 text-red-500"
                >
                    Delete User
                </button>
            </div>
        </div>
    );
};

export default UserProfile;