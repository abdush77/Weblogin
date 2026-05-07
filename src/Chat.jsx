import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket, disconnectSocket, getSocket } from "./socket";

import useCallStore from "./store/callStore";
import {
    startCall,
    handleAnswer,
    handleIceCandidate,
    cleanup,
} from "./services/webrtc";
import VideoCallModal from "./components/VideoCallModal";

const API = "https://vozdux-backend-production.up.railway.app";

const normalizeUser = (data) => {
    const raw = data?.user || data?.data?.user || data?.data || data;

    return {
        _id: raw?._id || raw?.id || "",
        id: raw?.id || raw?._id || "",
        username:
            raw?.username ||
            raw?.name ||
            raw?.fullName ||
            raw?.email?.split("@")[0] ||
            "User",
        email: raw?.email || "",
        avatar: raw?.avatar || "",
        raw,
    };
};

export default function Chat() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");

    const { callStatus, setIncomingCall, resetCall } = useCallStore();

    const [me, setMe] = useState(storedUser ? normalizeUser(storedUser) : null);
    const [users, setUsers] = useState([]);
    const [onlineIds, setOnlineIds] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [typingText, setTypingText] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [search, setSearch] = useState("");
    const [menuUserId, setMenuUserId] = useState(null);
    const [showArchive, setShowArchive] = useState(false);
    const [chatMenuOpen, setChatMenuOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState("");

    const [isRecording, setIsRecording] = useState(false);
    const [isSendingAudio, setIsSendingAudio] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [archivedIds, setArchivedIds] = useState(() => {
        return JSON.parse(localStorage.getItem("archivedUsers") || "[]");
    });

    const [blockedIds, setBlockedIds] = useState(() => {
        return JSON.parse(localStorage.getItem("blockedUsers") || "[]");
    });

    const [deletedIds, setDeletedIds] = useState(() => {
        return JSON.parse(localStorage.getItem("deletedUsers") || "[]");
    });

    const bottomRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const myId = useMemo(() => me?._id || me?.id, [me]);

    const appendMessageUnique = (newMessage) => {
        if (!newMessage) return;

        setMessages((prev) => {
            const newId = newMessage?._id || newMessage?.id;

            if (newId && prev.some((msg) => (msg?._id || msg?.id) === newId)) {
                return prev;
            }

            return [...prev, newMessage];
        });
    };

    const logout = () => {
        disconnectSocket();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const getInitial = (name = "") =>
        name?.trim()?.charAt(0)?.toUpperCase() || "U";

    const getUserName = (u) =>
        u?.username || u?.name || u?.fullName || u?.email?.split("@")[0] || "User";

    const saveList = (key, value, setter) => {
        localStorage.setItem(key, JSON.stringify(value));
        setter(value);
    };

    const archiveUser = (userId) => {
        const next = archivedIds.includes(userId)
            ? archivedIds
            : [...archivedIds, userId];

        saveList("archivedUsers", next, setArchivedIds);
        setMenuUserId(null);
    };

    const unarchiveUser = (userId) => {
        const next = archivedIds.filter((id) => id !== userId);
        saveList("archivedUsers", next, setArchivedIds);
        setMenuUserId(null);
    };

    const blockUser = (userId) => {
        const next = blockedIds.includes(userId)
            ? blockedIds
            : [...blockedIds, userId];

        saveList("blockedUsers", next, setBlockedIds);
        setMenuUserId(null);
    };

    const deleteUser = (userId) => {
        const next = deletedIds.includes(userId)
            ? deletedIds
            : [...deletedIds, userId];

        saveList("deletedUsers", next, setDeletedIds);

        if ((selectedUser?._id || selectedUser?.id) === userId) {
            setSelectedUser(null);
            setMessages([]);
        }

        setMenuUserId(null);
    };

    const deleteCurrentChat = () => {
        setMessages([]);
        setChatMenuOpen(false);
    };

    const deleteCurrentUser = () => {
        const uid = selectedUser?._id || selectedUser?.id;
        if (!uid) return;

        deleteUser(uid);
        setSelectedUser(null);
        setMessages([]);
        setChatMenuOpen(false);
    };

    const blockCurrentUser = () => {
        const uid = selectedUser?._id || selectedUser?.id;
        if (!uid) return;

        blockUser(uid);
        setSelectedUser(null);
        setMessages([]);
        setChatMenuOpen(false);
    };

    const fetchMe = async () => {
        try {
            const res = await fetch(`${API}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.message || "User olinmadi");
            }

            const normalized = normalizeUser(data);
            setMe(normalized);
            localStorage.setItem("user", JSON.stringify(normalized));
        } catch (err) {
            logout();
        }
    };

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);

            const res = await fetch(`${API}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.message || "Userlar olinmadi");
            }

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.users)
                    ? data.users
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];

            const normalizedUsers = list
                .map((u) => normalizeUser(u))
                .filter((u) => (u._id || u.id) !== myId);

            setUsers(normalizedUsers);

            const firstVisible = normalizedUsers.find((u) => {
                const uid = u._id || u.id;
                return (
                    !archivedIds.includes(uid) &&
                    !blockedIds.includes(uid) &&
                    !deletedIds.includes(uid)
                );
            });

            if (!selectedUser && firstVisible) {
                setSelectedUser(firstVisible);
            }
        } catch (err) {
            console.log(err.message);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchMessages = async (userId) => {
        try {
            setLoadingMessages(true);

            const res = await fetch(`${API}/api/messages/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.message || "Xabarlar olinmadi");
            }

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.messages)
                    ? data.messages
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];

            setMessages(list);

            const socket = getSocket();
            if (socket) {
                socket.emit("message:read", { senderId: userId });
            }
        } catch (err) {
            console.log(err.message);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }

        fetchMe();
    }, [token]);

    useEffect(() => {
        if (!token) return;

        const socket = connectSocket(token);
        if (!socket) return;

        const onConnect = () => {
            console.log("Socket ulandi");
        };

        const onConnectError = (err) => {
            console.log("Socket xato:", err.message);
        };

        const onUsersOnline = (userIds) => {
            setOnlineIds(userIds || []);
        };

        const onUserOnline = ({ userId }) => {
            setOnlineIds((prev) =>
                prev.includes(userId) ? prev : [...prev, userId]
            );
        };

        const onUserOffline = ({ userId }) => {
            setOnlineIds((prev) => prev.filter((id) => id !== userId));
        };

        const onMessageNew = (newMessage) => {
            const senderId = newMessage?.sender?._id || newMessage?.sender?.id;
            const receiverId =
                newMessage?.receiver?._id || newMessage?.receiver?.id;
            const activeId = selectedUser?._id || selectedUser?.id;

            if (senderId === activeId || receiverId === activeId) {
                appendMessageUnique(newMessage);
            }
        };

        const onTypingStart = ({ userId }) => {
            const activeId = selectedUser?._id || selectedUser?.id;

            if (userId === activeId) {
                setTypingText("yozmoqda...");
            }
        };

        const onTypingStop = ({ userId }) => {
            const activeId = selectedUser?._id || selectedUser?.id;

            if (userId === activeId) {
                setTypingText("");
            }
        };

        const onMessageRead = ({ by }) => {
            const activeId = selectedUser?._id || selectedUser?.id;

            if (by === activeId) {
                setMessages((prev) =>
                    prev.map((msg) => {
                        const senderId = msg?.sender?._id || msg?.sender?.id;

                        if (senderId === myId) {
                            return { ...msg, read: true };
                        }

                        return msg;
                    })
                );
            }
        };

        const onCallOffer = (data) => {
            console.log("CALL OFFER:", data);
            setIncomingCall(data);
        };

        const onCallAnswer = ({ answer }) => {
            console.log("CALL ANSWER:", answer);
            handleAnswer(answer);
        };

        const onCallIceCandidate = ({ candidate }) => {
            handleIceCandidate(candidate);
        };

        const onCallReject = () => {
            alert("Qo‘ng‘iroq rad etildi");
            cleanup();
        };

        const onCallEnd = () => {
            cleanup();
            resetCall();
        };

        socket.off("connect");
        socket.off("connect_error");
        socket.off("users:online");
        socket.off("user:online");
        socket.off("user:offline");
        socket.off("message:new");
        socket.off("typing:start");
        socket.off("typing:stop");
        socket.off("message:read");

        socket.off("call:offer");
        socket.off("call:answer");
        socket.off("call:ice-candidate");
        socket.off("call:reject");
        socket.off("call:end");

        socket.on("connect", onConnect);
        socket.on("connect_error", onConnectError);
        socket.on("users:online", onUsersOnline);
        socket.on("user:online", onUserOnline);
        socket.on("user:offline", onUserOffline);
        socket.on("message:new", onMessageNew);
        socket.on("typing:start", onTypingStart);
        socket.on("typing:stop", onTypingStop);
        socket.on("message:read", onMessageRead);

        socket.on("call:offer", onCallOffer);
        socket.on("call:answer", onCallAnswer);
        socket.on("call:ice-candidate", onCallIceCandidate);
        socket.on("call:reject", onCallReject);
        socket.on("call:end", onCallEnd);

        return () => {
            socket.off("connect", onConnect);
            socket.off("connect_error", onConnectError);
            socket.off("users:online", onUsersOnline);
            socket.off("user:online", onUserOnline);
            socket.off("user:offline", onUserOffline);
            socket.off("message:new", onMessageNew);
            socket.off("typing:start", onTypingStart);
            socket.off("typing:stop", onTypingStop);
            socket.off("message:read", onMessageRead);

            socket.off("call:offer", onCallOffer);
            socket.off("call:answer", onCallAnswer);
            socket.off("call:ice-candidate", onCallIceCandidate);
            socket.off("call:reject", onCallReject);
            socket.off("call:end", onCallEnd);
        };
    }, [token, selectedUser, myId, setIncomingCall, resetCall]);

    useEffect(() => {
        if (me) {
            fetchUsers();
        }
    }, [me]);

    useEffect(() => {
        const activeId = selectedUser?._id || selectedUser?.id;
        if (activeId) {
            fetchMessages(activeId);
        }
    }, [selectedUser]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingText]);

    useEffect(() => {
        const handlePaste = async (e) => {
            const receiverId = selectedUser?._id || selectedUser?.id;
            if (!receiverId) return;

            const items = Array.from(e.clipboardData?.items || []);
            const fileItem = items.find((item) => item.kind === "file");

            if (!fileItem) return;

            const file = fileItem.getAsFile();
            if (!file) return;

            e.preventDefault();
            await uploadFile(file);
        };

        window.addEventListener("paste", handlePaste);

        return () => window.removeEventListener("paste", handlePaste);
    }, [selectedUser, token, message]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        const socket = getSocket();
        const receiverId = selectedUser?._id || selectedUser?.id;

        if (!socket || !receiverId) return;

        socket.emit("typing:start", { receiverId });

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("typing:stop", { receiverId });
        }, 700);
    };

    const handleSendMessage = () => {
        const text = message.trim();
        const receiverId = selectedUser?._id || selectedUser?.id;
        const socket = getSocket();

        if (!text || !receiverId || !socket) return;

        setMessage("");
        socket.emit("typing:stop", { receiverId });

        socket.emit("message:send", { receiverId, text }, (response) => {
            if (response?.message) {
                appendMessageUnique(response.message);
            }

            if (!response?.ok) {
                console.log("Xabar yuborilmadi", response);
            }
        });
    };

    const uploadFile = async (file) => {
        const receiverId = selectedUser?._id || selectedUser?.id;

        if (!file || !receiverId || !token) return;

        try {
            setUploadingFile(true);

            const formData = new FormData();
            formData.append("file", file);
            formData.append("receiverId", receiverId);

            if (message.trim()) {
                formData.append("text", message.trim());
            }

            const res = await fetch(`${API}/api/messages/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.message || "Fayl yuborilmadi");
            }

            setMessage("");

            if (data?.message) {
                appendMessageUnique(data.message);
            }

            console.log("UPLOAD RESPONSE:", data);
        } catch (err) {
            console.log(err.message);
            alert(err.message || "Fayl yuklashda xato");
        } finally {
            setUploadingFile(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await uploadFile(file);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            streamRef.current = stream;
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm",
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.log("Mikrofon xatosi:", err);
            alert("Mikrofonga ruxsat berilmadi");
        }
    };

    const stopRecording = async () => {
        const receiverId = selectedUser?._id || selectedUser?.id;
        const mediaRecorder = mediaRecorderRef.current;

        if (!mediaRecorder || !receiverId) return;

        setIsRecording(false);
        setIsSendingAudio(true);

        mediaRecorder.onstop = async () => {
            try {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });

                audioChunksRef.current = [];

                const formData = new FormData();
                formData.append("audio", audioBlob, "voice.webm");
                formData.append("receiverId", receiverId);

                const res = await fetch(`${API}/api/messages/audio`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.message || "Audio yuborilmadi");
                }

                if (data?.message) {
                    appendMessageUnique(data.message);
                }

                console.log("AUDIO SEND RESPONSE:", data);
            } catch (err) {
                console.log(err.message);
                alert("Audio yuborilmadi");
            } finally {
                setIsSendingAudio(false);

                streamRef.current?.getTracks()?.forEach((track) => track.stop());
                streamRef.current = null;
            }
        };

        mediaRecorder.stop();
    };

    const handleAudioClick = () => {
        if (isSendingAudio) return;

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const getFileUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${API}${url}`;
    };

    const getAudioUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${API}${url}`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    };

    const visibleUsers = users.filter((u) => {
        const uid = u._id || u.id;
        const name = getUserName(u).toLowerCase();

        return (
            !archivedIds.includes(uid) &&
            !blockedIds.includes(uid) &&
            !deletedIds.includes(uid) &&
            name.includes(search.toLowerCase())
        );
    });

    const archivedUsers = users.filter((u) => {
        const uid = u._id || u.id;
        const name = getUserName(u).toLowerCase();

        return (
            archivedIds.includes(uid) &&
            !blockedIds.includes(uid) &&
            !deletedIds.includes(uid) &&
            name.includes(search.toLowerCase())
        );
    });

    const VoiceMessage = ({ src, time, isMine, fileSize }) => {
        const audioRef = useRef(null);
        const [isPlaying, setIsPlaying] = useState(false);
        const [duration, setDuration] = useState(0);
        const [audioTime, setAudioTime] = useState(0);
        const [audioSize, setAudioSize] = useState(fileSize || 0);

        useEffect(() => {
            let cancelled = false;

            const loadSize = async () => {
                if (fileSize) {
                    setAudioSize(fileSize);
                    return;
                }

                try {
                    const res = await fetch(src);
                    const blob = await res.blob();

                    if (!cancelled) {
                        setAudioSize(blob.size);
                    }
                } catch (err) {
                    console.log("Audio size olinmadi:", err.message);
                }
            };

            loadSize();

            return () => {
                cancelled = true;
            };
        }, [src, fileSize]);

        const formatAudioTime = (seconds) => {
            if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "00:00";

            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);

            return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        };

        const formatAudioSize = (bytes) => {
            if (!bytes) return "";

            const kb = bytes / 1024;

            if (kb < 1024) {
                return `${kb.toFixed(1)} KB`;
            }

            return `${(kb / 1024).toFixed(1)} MB`;
        };

        const togglePlay = async () => {
            const audio = audioRef.current;
            if (!audio) return;

            try {
                if (audio.paused) {
                    await audio.play();
                    setIsPlaying(true);
                } else {
                    audio.pause();
                    setIsPlaying(false);
                }
            } catch (err) {
                console.log("Audio play xatosi:", err.message);
            }
        };

        const progress = duration > 0 ? audioTime / duration : 0;
        const shownTime = audioTime > 0 ? audioTime : duration;
        const shownSize = formatAudioSize(audioSize);

        return (
            <div className="flex min-w-[360px] items-center gap-[12px]">
                <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#49a8e8] text-[24px] text-white transition active:scale-95"
                >
                    {isPlaying ? "⏸" : "▶"}
                </button>

                <div className="flex flex-1 flex-col">
                    <div className="flex h-[26px] items-center gap-[2px] overflow-hidden">
                        {Array.from({ length: 58 }).map((_, i) => {
                            const active = progress > 0 && i / 58 <= progress;

                            return (
                                <span
                                    key={i}
                                    className={`w-[2px] shrink-0 rounded-full ${active ? "bg-[#49a8e8]" : "bg-[#42607d]"
                                        }`}
                                    style={{
                                        height: `${6 + ((i * 7) % 18)}px`,
                                    }}
                                />
                            );
                        })}
                    </div>

                    <div className="mt-[4px] flex items-center justify-between gap-[14px]">
                        <span className="text-[15px] text-[#82a5c8]">
                            {formatAudioTime(shownTime)}
                            {shownSize ? `, ${shownSize}` : ""}
                        </span>

                        <span className="shrink-0 text-[15px] text-[#7f92a6]">
                            {time} {isMine ? "✓✓" : ""}
                        </span>
                    </div>

                    <audio
                        ref={audioRef}
                        src={src}
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                            const audioDuration = e.currentTarget.duration;
                            if (audioDuration && isFinite(audioDuration)) {
                                setDuration(audioDuration);
                            }
                        }}
                        onDurationChange={(e) => {
                            const audioDuration = e.currentTarget.duration;
                            if (audioDuration && isFinite(audioDuration)) {
                                setDuration(audioDuration);
                            }
                        }}
                        onTimeUpdate={(e) => {
                            setAudioTime(e.currentTarget.currentTime || 0);
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => {
                            setIsPlaying(false);
                            setAudioTime(0);
                        }}
                        className="hidden"
                    />
                </div>
            </div>
        );
    };

    const FileMessage = ({ msg }) => {
        const fileUrl = getFileUrl(msg?.fileUrl);
        const fileType = msg?.fileType;
        const fileName = msg?.fileName || "file";
        const fileSize = msg?.fileSize;

        if (fileType === "image") {
            return (
                <div className="max-w-[310px]">
                    <img
                        src={fileUrl}
                        alt={fileName}
                        onClick={() => window.open(fileUrl, "_blank")}
                        className="max-h-[320px] w-full cursor-pointer rounded-[14px] object-cover"
                    />

                    {msg?.text ? (
                        <p className="mt-[7px] break-words text-[17px] leading-[22px] text-white">
                            {msg.text}
                        </p>
                    ) : null}
                </div>
            );
        }

        if (fileType === "video") {
            return (
                <div className="max-w-[330px]">
                    <video
                        src={fileUrl}
                        controls
                        className="max-h-[320px] w-full rounded-[14px]"
                    />

                    {msg?.text ? (
                        <p className="mt-[7px] break-words text-[17px] leading-[22px] text-white">
                            {msg.text}
                        </p>
                    ) : null}
                </div>
            );
        }

        return (
            <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-[260px] max-w-[340px] items-center gap-[12px] rounded-[14px] bg-[#122437] p-[12px] hover:bg-[#17304a]"
            >
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[#49a8e8] text-[24px]">
                    📄
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-white">
                        {fileName}
                    </p>

                    <p className="mt-[2px] text-[14px] text-[#82a5c8]">
                        {formatFileSize(fileSize) || "File"}
                    </p>

                    {msg?.text ? (
                        <p className="mt-[6px] break-words text-[15px] text-white/90">
                            {msg.text}
                        </p>
                    ) : null}
                </div>
            </a>
        );
    };

    const AttachmentMenu = () => {
        return (
            <div className="group relative">
                <button
                    type="button"
                    className="flex h-[58px] w-[42px] items-center justify-center text-[32px] text-[#8f9cab] hover:text-white"
                >
                    📎
                </button>

                <div className="pointer-events-none absolute bottom-[64px] left-0 z-50 w-[225px] translate-y-[8px] rounded-[14px] bg-[#17212b] py-[8px] opacity-0 shadow-2xl transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    {[
                        ["🖼", "Фото или видео"],
                        ["📄", "Документ"],
                        ["📊", "Опрос"],
                        ["📍", "Геопозиция"],
                        ["👛", "Кошелёк"],
                    ].map(([icon, title], idx) => (
                        <button
                            key={title}
                            type="button"
                            onClick={() => {
                                if (idx === 0 || idx === 1) {
                                    fileInputRef.current?.click();
                                }
                            }}
                            className="flex h-[44px] w-full items-center gap-[14px] px-[18px] text-left text-[16px] text-white hover:bg-white/10"
                        >
                            <span className="w-[24px] text-[22px] text-[#9dafbf]">
                                {icon}
                            </span>
                            <span>{title}</span>
                        </button>
                    ))}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar,.txt,.xls,.xlsx"
                    className="hidden"
                />
            </div>
        );
    };

    const UserRow = ({ u, archived = false }) => {
        const uid = u?._id || u?.id;
        const active = (selectedUser?._id || selectedUser?.id) === uid;
        const online = onlineIds.includes(uid);

        return (
            <div
                className={`group relative flex h-[78px] w-full items-center px-[12px] transition ${active ? "bg-[#242536]" : "hover:bg-[#181923]"
                    }`}
            >
                <button
                    type="button"
                    onClick={() => {
                        setSelectedUser(u);
                        setShowArchive(false);
                    }}
                    onDoubleClick={() => navigate(`/profile/${u._id || u.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-[12px] text-left"
                >
                    <div className="relative h-[52px] w-[52px] shrink-0">
                        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#7d63ff] text-[25px] font-bold text-white">
                            {getInitial(getUserName(u))}
                        </div>

                        <span
                            className={`absolute bottom-[1px] right-[1px] h-[12px] w-[12px] rounded-full border-[2px] border-[#111217] ${online ? "bg-[#2ee86f]" : "bg-[#7d8294]"
                                }`}
                        />
                    </div>

                    <div className="min-w-0 flex-1 border-b border-white/[0.06] py-[10px]">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-[16px] font-semibold text-white">
                                {getUserName(u)}
                            </h3>

                            <span className="shrink-0 text-[12px] text-[#858b9b]">
                                {online ? "now" : "Fri"}
                            </span>
                        </div>

                        <div className="mt-[4px] flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] text-[#8b91a4]">
                                {archived ? "Archived chat" : online ? "Online" : "Offline"}
                            </p>

                            <span className="text-[13px] text-[#777d8f]">★</span>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuUserId(menuUserId === uid ? null : uid);
                    }}
                    className="ml-[6px] hidden h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[22px] text-[#9ba1b4] hover:bg-white/10 group-hover:flex"
                >
                    ⋯
                </button>

                {menuUserId === uid ? (
                    <div className="absolute right-[10px] top-[52px] z-50 w-[165px] overflow-hidden rounded-[14px] border border-white/10 bg-[#1f2029] shadow-2xl">
                        <button
                            type="button"
                            onClick={() => (archived ? unarchiveUser(uid) : archiveUser(uid))}
                            className="flex h-[42px] w-full items-center justify-between px-4 text-left text-[14px] text-white hover:bg-white/10"
                        >
                            <span>{archived ? "Unarchive" : "Archive"}</span>
                            <span>▣</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => blockUser(uid)}
                            className="flex h-[42px] w-full items-center justify-between px-4 text-left text-[14px] text-white hover:bg-white/10"
                        >
                            <span>Block user</span>
                            <span>⊘</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => deleteUser(uid)}
                            className="flex h-[42px] w-full items-center justify-between px-4 text-left text-[14px] text-[#ff4e4e] hover:bg-white/10"
                        >
                            <span>Delete</span>
                            <span>🗑</span>
                        </button>
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="h-screen w-full overflow-hidden bg-[#0c1020] text-white">
            <VideoCallModal />

            <div className="flex h-full">
                <div className="w-[370px] shrink-0 border-r border-white/10 bg-[#0b0c11] flex flex-col">
                    <div className="px-[14px] pt-[14px] pb-[10px]">
                        <div className="flex h-[34px] items-center justify-between text-white">
                            <button type="button" className="text-[15px] text-white/90">
                                Edit
                            </button>

                            <h2 className="text-[16px] font-semibold">Chats</h2>

                            <button
                                type="button"
                                onClick={logout}
                                className="flex h-[28px] w-[28px] items-center justify-center rounded-md text-[18px] text-white/90 hover:bg-white/10"
                            >
                                ⏻
                            </button>
                        </div>

                        <div className="mt-[12px] flex h-[34px] items-center rounded-[9px] bg-[#15161d] px-[12px]">
                            <span className="mr-[8px] text-[14px] text-[#767c8b]">⌕</span>

                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search for messages or users"
                                className="h-full flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#747987]"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {archivedUsers.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setShowArchive((prev) => !prev)}
                                className="flex h-[58px] w-full items-center gap-[12px] border-b border-white/[0.06] px-[14px] text-left hover:bg-[#181923]"
                            >
                                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#252733] text-[22px]">
                                    🗄
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[15px] font-semibold text-white">
                                            Archived Chats
                                        </p>

                                        <span className="rounded-full bg-[#2f3240] px-[7px] py-[1px] text-[12px] text-white">
                                            {archivedUsers.length}
                                        </span>
                                    </div>

                                    <p className="text-[13px] text-[#8b91a4]">
                                        {showArchive ? "Hide archived chats" : "Open archived chats"}
                                    </p>
                                </div>
                            </button>
                        ) : null}

                        {showArchive ? (
                            <div>
                                <div className="px-[14px] py-[8px] text-[12px] font-semibold uppercase tracking-[1px] text-[#6f778a]">
                                    Archive
                                </div>

                                {archivedUsers.map((u) => (
                                    <UserRow key={u._id || u.id} u={u} archived />
                                ))}
                            </div>
                        ) : null}

                        <div className="px-[14px] py-[8px] text-[12px] font-semibold uppercase tracking-[1px] text-[#6f778a]">
                            Foydalanuvchilar
                        </div>

                        {loadingUsers ? (
                            <div className="px-[14px] py-[12px] text-[14px] text-[#8b91a4]">
                                Yuklanmoqda...
                            </div>
                        ) : visibleUsers.length === 0 ? (
                            <div className="px-[18px] py-[20px] text-center text-[14px] text-[#8b91a4]">
                                User topilmadi
                            </div>
                        ) : (
                            visibleUsers.map((u) => <UserRow key={u._id || u.id} u={u} />)
                        )}
                    </div>

                    <div className="grid h-[58px] grid-cols-4 border-t border-white/10 bg-[#101116] text-[11px] text-[#727989]">
                        <button
                            type="button"
                            className="flex flex-col items-center justify-center gap-[3px]"
                        >
                            <span className="text-[19px]">👤</span>
                            Contacts
                        </button>

                        <button
                            type="button"
                            className="flex flex-col items-center justify-center gap-[3px]"
                        >
                            <span className="text-[19px]">☎</span>
                            Calls
                        </button>

                        <button
                            type="button"
                            className="relative flex flex-col items-center justify-center gap-[3px] text-white"
                        >
                            <span className="text-[19px]">💬</span>
                            Chats

                            <span className="absolute top-[6px] right-[31px] rounded-full bg-white px-[5px] text-[10px] text-black">
                                {visibleUsers.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/settings")}
                            className="flex flex-col items-center justify-center gap-[3px] hover:text-white"
                        >
                            <span className="text-[19px]">⚙</span>
                            Settings
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 overflow-hidden bg-[#151515]">
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage:
                                "url('https://img.freepik.com/free-vector/hand-drawn-doodle-icons-set_1308-90706.jpg?semt=ais_hybrid&w=740&q=80')",
                        }}
                    />

                    <div className="absolute inset-0 bg-black/40" />

                    <div className="relative z-10 flex h-full flex-col">
                        <div className="relative z-30 flex h-[76px] w-full shrink-0 items-center justify-between bg-[#202938]/95 px-[24px] shadow-lg backdrop-blur-md">
                            <div className="flex items-center gap-[16px]">
                                <div className="text-[18px] font-semibold text-white">
                                    {currentTime}
                                </div>

                                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#8a73ff] text-[22px] font-bold text-white">
                                    {selectedUser ? getInitial(getUserName(selectedUser)) : "C"}
                                </div>

                                <div>
                                    <h3 className="text-[22px] font-bold leading-none text-white">
                                        {selectedUser ? getUserName(selectedUser) : "Chat"}
                                    </h3>

                                    <p className="mt-[6px] text-[14px] text-[#aeb7c8]">
                                        {selectedUser &&
                                            onlineIds.includes(selectedUser?._id || selectedUser?.id)
                                            ? typingText || "online"
                                            : "last seen just now"}
                                    </p>
                                </div>
                            </div>

                            <div className="relative flex items-center gap-[18px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selectedUser || !me) return;
                                        startCall(selectedUser, me.username);
                                    }}
                                    disabled={callStatus !== "idle" || !selectedUser}
                                    className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[24px] text-white hover:bg-white/10 disabled:opacity-50"
                                >
                                    📹
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setChatMenuOpen((prev) => !prev)}
                                    className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[30px] text-white hover:bg-white/10"
                                >
                                    ⋮
                                </button>

                                {chatMenuOpen ? (
                                    <div className="absolute right-0 top-[52px] z-50 w-[210px] overflow-hidden rounded-[16px] border border-white/10 bg-[#20222d] shadow-2xl">
                                        <button
                                            type="button"
                                            onClick={deleteCurrentChat}
                                            className="flex h-[46px] w-full items-center justify-between px-4 text-left text-[15px] text-white hover:bg-white/10"
                                        >
                                            <span>Chatni o‘chirish</span>
                                            <span>🧹</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={deleteCurrentUser}
                                            className="flex h-[46px] w-full items-center justify-between px-4 text-left text-[15px] text-[#ff5c5c] hover:bg-white/10"
                                        >
                                            <span>Userni o‘chirish</span>
                                            <span>🗑</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={blockCurrentUser}
                                            className="flex h-[46px] w-full items-center justify-between px-4 text-left text-[15px] text-[#ffb84d] hover:bg-white/10"
                                        >
                                            <span>Userni blok qilish</span>
                                            <span>🚫</span>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="relative mx-auto flex-1 w-full overflow-hidden bg-[#242424]/30">
                            <div className="absolute inset-0 opacity-[0.28] bg-[radial-gradient(circle_at_20px_20px,#fff_1px,transparent_1px)] [background-size:32px_32px]" />

                            <div className="relative z-10 h-full overflow-y-auto px-[22px] pb-[98px] pt-[20px]">
                                {loadingMessages ? (
                                    <p className="text-center text-[15px] text-white/60">
                                        Xabarlar yuklanmoqda...
                                    </p>
                                ) : messages.length === 0 ? (
                                    <div className="flex h-full items-center justify-center">
                                        <div className="flex w-[360px] flex-col items-center rounded-[24px] bg-[#223044]/85 px-7 py-7 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const socket = getSocket();
                                                    const receiverId =
                                                        selectedUser?._id || selectedUser?.id;

                                                    if (!receiverId || !socket) return;

                                                    socket.emit(
                                                        "message:send",
                                                        { receiverId, text: "Assalomu alaykum 👋" },
                                                        (response) => {
                                                            if (response?.message) {
                                                                appendMessageUnique(response.message);
                                                            }

                                                            if (response?.ok) {
                                                                socket.emit("typing:stop", { receiverId });
                                                            } else {
                                                                console.log("Xabar yuborilmadi", response);
                                                            }
                                                        }
                                                    );
                                                }}
                                                className="mb-5 flex h-[135px] w-[135px] items-center justify-center rounded-full bg-[#2f3d55] text-[78px] transition hover:scale-105 active:scale-95"
                                            >
                                                👋
                                            </button>

                                            <h4 className="text-[21px] font-bold text-white">
                                                Hozircha xabarlar yo‘q...
                                            </h4>

                                            <p className="mt-3 text-[17px] leading-[24px] text-white/85">
                                                Suhbatni boshlash uchun salomlashuv stickeri ustiga bosing.
                                            </p>

                                            <p className="mt-4 rounded-full bg-white/10 px-5 py-2 text-[15px] text-white/75">
                                                “Assalomu alaykum 👋”
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((m, index) => {
                                        const senderId = m?.sender?._id || m?.sender?.id;
                                        const isMine = senderId === myId;
                                        const hasAudio = Boolean(m?.audioUrl);
                                        const hasFile = Boolean(m?.fileUrl);

                                        return (
                                            <div
                                                key={m?._id || index}
                                                className={`mb-[8px] flex ${isMine ? "justify-end" : "justify-start"
                                                    }`}
                                            >
                                                <div
                                                    className={`max-w-[54%] rounded-[18px] px-[13px] py-[8px] shadow-md ${hasAudio || hasFile
                                                            ? "bg-[#122437]"
                                                            : isMine
                                                                ? "bg-[#3a3a3a]"
                                                                : "bg-[#303030]"
                                                        }`}
                                                >
                                                    {hasAudio ? (
                                                        <VoiceMessage
                                                            src={getAudioUrl(m.audioUrl)}
                                                            time={formatTime(m?.createdAt)}
                                                            isMine={isMine}
                                                            fileSize={
                                                                m?.audioSize ||
                                                                m?.fileSize ||
                                                                m?.size ||
                                                                m?.audio?.size ||
                                                                0
                                                            }
                                                        />
                                                    ) : hasFile ? (
                                                        <FileMessage msg={m} />
                                                    ) : (
                                                        <p className="break-words text-[18px] leading-[23px] text-white">
                                                            {m?.text}
                                                        </p>
                                                    )}

                                                    {!hasAudio ? (
                                                        <p className="mt-[2px] text-right text-[12px] text-[#9e9e9e]">
                                                            {formatTime(m?.createdAt)} {isMine ? "✓✓" : ""}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {typingText ? (
                                    <div className="mb-[8px] max-w-[140px] rounded-[12px] bg-[#303030] px-[13px] py-[8px] text-[15px] text-white/70">
                                        yozmoqda...
                                    </div>
                                ) : null}

                                <div ref={bottomRef} />
                            </div>

                            <div className="absolute bottom-[24px] left-1/2 z-20 flex w-[92%] -translate-x-1/2 items-center gap-[12px]">
                                <AttachmentMenu />

                                <input
                                    value={message}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={
                                        uploadingFile
                                            ? "Fayl yuklanmoqda..."
                                            : isRecording
                                                ? "Ovoz yozilmoqda..."
                                                : "Xabar yozing..."
                                    }
                                    className="h-[58px] flex-1 rounded-full bg-[#1e1e1e]/95 px-[24px] text-[18px] text-white outline-none placeholder:text-[#9a9a9a]"
                                />

                                <button
                                    type="button"
                                    onClick={handleAudioClick}
                                    disabled={isSendingAudio || uploadingFile}
                                    className={`flex h-[58px] w-[58px] items-center justify-center rounded-full text-[26px] text-white shadow-lg transition active:scale-95 ${isRecording
                                            ? "bg-[#ff3b30] animate-pulse"
                                            : "bg-[#303030] hover:bg-[#3b3b3b]"
                                        }`}
                                >
                                    {isSendingAudio ? "⏳" : isRecording ? "⏹" : "🎤"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={uploadingFile}
                                    className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#6258ff] text-[28px] text-white shadow-lg"
                                >
                                    ➤
                                </button>
                            </div>

                            <div className="absolute bottom-[8px] left-1/2 z-20 h-[4px] w-[165px] -translate-x-1/2 rounded-full bg-white" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}