import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { connectSocket, disconnectSocket, getSocket } from "./socket";

import useCallStore from "./store/callStore";
import useGroupStore from "./store/groupStore";
import useGroupCallStore from "./store/groupCallStore";
import {
    startCall,
    handleAnswer,
    handleIceCandidate,
    cleanup,
} from "./services/webrtc";
import {
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    onNewParticipantJoined,
    handleGroupOffer,
    handleGroupAnswer,
    handleGroupIce,
    removeParticipantPC,
    cleanupGroupCall,
} from "./services/groupWebrtc";
import VideoCallModal from "./components/VideoCallModal";
import GroupCallModal from "./components/GroupCallModal";
import GroupCallBanner from "./components/GroupCallBanner";
import StoriesViewer from "./components/StoriesViewer";
import CreateGroupModal from "./components/CreateGroupModal";
import LocationMessage from "./components/LocationMessage";

const API = "https://vozdux-backend-production.up.railway.app";

const normalizeUser = (data) => {
    const raw = data?.user || data?.data?.user || data?.data || data;
    return {
        _id: raw?._id || raw?.id || "",
        id: raw?.id || raw?._id || "",
        username: raw?.username || raw?.name || raw?.fullName || raw?.email?.split("@")[0] || "User",
        email: raw?.email || "",
        avatar: raw?.avatar || "",
        raw,
    };
};

const STORY_COLORS = [
    "linear-gradient(135deg,#6258ff,#49a8e8)",
    "linear-gradient(135deg,#ff6b6b,#ffa500)",
    "linear-gradient(135deg,#2ee86f,#00bcd4)",
    "linear-gradient(135deg,#ff4e8a,#a855f7)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
];

export default function Chat() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");

    const { callStatus, setIncomingCall, resetCall } = useCallStore();
    const {
        groups, channels,
        setGroups, setChannels,
        groupMessages, setGroupMessages, addGroupMessage,
        updateGroupLastMessage,
    } = useGroupStore();
    const {
        isInCall: isInGroupCall,
        activeGroupId: groupCallActiveGroupId,
        groupActiveCalls,
        setGroupHasActiveCall,
        updateGroupActiveCallParticipants,
        removeGroupActiveCall,
    } = useGroupCallStore();

    const [me, setMe] = useState(storedUser ? normalizeUser(storedUser) : null);
    const [users, setUsers] = useState([]);
    const [onlineIds, setOnlineIds] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
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
    const [sidebarTab, setSidebarTab] = useState("chats");

    const [isRecording, setIsRecording] = useState(false);
    const [isSendingAudio, setIsSendingAudio] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [archivedIds, setArchivedIds] = useState(() =>
        JSON.parse(localStorage.getItem("archivedUsers") || "[]")
    );
    const [blockedIds, setBlockedIds] = useState(() =>
        JSON.parse(localStorage.getItem("blockedUsers") || "[]")
    );
    const [deletedIds, setDeletedIds] = useState(() =>
        JSON.parse(localStorage.getItem("deletedUsers") || "[]")
    );

    // Stories state
    const [stories, setStories] = useState([]);
    const [viewingStoryIndex, setViewingStoryIndex] = useState(null);
    const [showAddStory, setShowAddStory] = useState(false);
    const [addStoryText, setAddStoryText] = useState("");
    const [addStoryBgIdx, setAddStoryBgIdx] = useState(0);
    const storyFileRef = useRef(null);

    // Groups/Channels state
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [createGroupType, setCreateGroupType] = useState("group");
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Live location
    const [isLiveLocation, setIsLiveLocation] = useState(false);
    const [liveLocationMsgId, setLiveLocationMsgId] = useState(null);
    const liveWatchRef = useRef(null);

    const bottomRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const myId = useMemo(() => me?._id || me?.id, [me]);

    const appendMessageUnique = useCallback((newMessage) => {
        if (!newMessage) return;
        setMessages((prev) => {
            const newId = newMessage?._id || newMessage?.id;
            if (newId && prev.some((msg) => (msg?._id || msg?.id) === newId)) return prev;
            return [...prev, newMessage];
        });
    }, []);

    const logout = () => {
        if (liveWatchRef.current) navigator.geolocation.clearWatch(liveWatchRef.current);
        disconnectSocket();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const getInitial = (name = "") => name?.trim()?.charAt(0)?.toUpperCase() || "U";

    const getUserName = (u) =>
        u?.username || u?.name || u?.fullName || u?.email?.split("@")[0] || "User";

    const saveList = (key, value, setter) => {
        localStorage.setItem(key, JSON.stringify(value));
        setter(value);
    };

    const archiveUser = (userId) => {
        const next = archivedIds.includes(userId) ? archivedIds : [...archivedIds, userId];
        saveList("archivedUsers", next, setArchivedIds);
        setMenuUserId(null);
    };

    const unarchiveUser = (userId) => {
        saveList("archivedUsers", archivedIds.filter((id) => id !== userId), setArchivedIds);
        setMenuUserId(null);
    };

    const blockUser = (userId) => {
        const next = blockedIds.includes(userId) ? blockedIds : [...blockedIds, userId];
        saveList("blockedUsers", next, setBlockedIds);
        setMenuUserId(null);
    };

    const deleteUser = (userId) => {
        const next = deletedIds.includes(userId) ? deletedIds : [...deletedIds, userId];
        saveList("deletedUsers", next, setDeletedIds);
        if ((selectedUser?._id || selectedUser?.id) === userId) {
            setSelectedUser(null);
            setMessages([]);
        }
        setMenuUserId(null);
    };

    const deleteCurrentChat = () => { setMessages([]); setChatMenuOpen(false); };

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

    // ──────────────────────── API fetchers ────────────────────────

    const fetchMe = async () => {
        try {
            const res = await fetch(`${API}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "User olinmadi");
            const normalized = normalizeUser(data);
            setMe(normalized);
            localStorage.setItem("user", JSON.stringify(normalized));
        } catch {
            logout();
        }
    };

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const res = await fetch(`${API}/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Userlar olinmadi");
            const list = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : Array.isArray(data?.data) ? data.data : [];
            const normalizedUsers = list.map((u) => normalizeUser(u)).filter((u) => (u._id || u.id) !== myId);
            setUsers(normalizedUsers);
            if (!selectedUser && normalizedUsers.length > 0) {
                const first = normalizedUsers.find((u) => {
                    const uid = u._id || u.id;
                    return !archivedIds.includes(uid) && !blockedIds.includes(uid) && !deletedIds.includes(uid);
                });
                if (first) setSelectedUser(first);
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
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Xabarlar olinmadi");
            const list = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : Array.isArray(data?.data) ? data.data : [];
            setMessages(list);
            const socket = getSocket();
            if (socket) socket.emit("message:read", { senderId: userId });
        } catch (err) {
            console.log(err.message);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const fetchGroups = async () => {
        try {
            setLoadingGroups(true);
            const res = await fetch(`${API}/api/groups`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data) ? data : Array.isArray(data?.groups) ? data.groups : [];
            setGroups(list.filter((g) => g.type === "group" || !g.type));
            setChannels(list.filter((g) => g.type === "channel"));
        } catch (err) {
            console.log("Groups fetch:", err.message);
        } finally {
            setLoadingGroups(false);
        }
    };

    const fetchGroupMessages = async (groupId) => {
        try {
            setLoadingMessages(true);
            const res = await fetch(`${API}/api/groups/${groupId}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];
            setGroupMessages(groupId, list);
            setMessages(list);
        } catch (err) {
            console.log("Group messages:", err.message);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const fetchStories = async () => {
        try {
            const res = await fetch(`${API}/api/stories`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data) ? data : Array.isArray(data?.stories) ? data.stories : [];
            setStories(list);
        } catch (err) {
            console.log("Stories:", err.message);
        }
    };

    // ──────────────────────── Location ────────────────────────

    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            alert("Brauzeringiz lokatsiyani qo'llab-quvvatlamaydi");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                const receiverId = selectedUser?._id || selectedUser?.id;
                const socket = getSocket();
                if (!receiverId || !socket) return;

                socket.emit("message:send", {
                    receiverId,
                    type: "location",
                    latitude,
                    longitude,
                    text: `📍 Lokatsiya: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                }, (response) => {
                    if (response?.message) appendMessageUnique(response.message);
                });
            },
            () => alert("Lokatsiyaga ruxsat berilmadi")
        );
    };

    const startLiveLocation = () => {
        if (!navigator.geolocation) {
            alert("Brauzeringiz lokatsiyani qo'llab-quvvatlamaydi");
            return;
        }
        const receiverId = selectedUser?._id || selectedUser?.id;
        const socket = getSocket();
        if (!receiverId || !socket) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

            socket.emit("message:send", {
                receiverId,
                type: "live_location",
                latitude,
                longitude,
                isLive: true,
                expiresAt,
                text: `📍 Live lokatsiya`,
            }, (response) => {
                if (response?.message) {
                    appendMessageUnique(response.message);
                    const msgId = response.message._id || response.message.id;
                    setLiveLocationMsgId(msgId);
                    setIsLiveLocation(true);

                    liveWatchRef.current = navigator.geolocation.watchPosition((p) => {
                        socket.emit("location:live:update", {
                            messageId: msgId,
                            receiverId,
                            latitude: p.coords.latitude,
                            longitude: p.coords.longitude,
                        });
                        setMessages((prev) =>
                            prev.map((m) =>
                                (m._id || m.id) === msgId
                                    ? { ...m, latitude: p.coords.latitude, longitude: p.coords.longitude }
                                    : m
                            )
                        );
                    });
                }
            });
        }, () => alert("Lokatsiyaga ruxsat berilmadi"));
    };

    const stopLiveLocation = () => {
        if (liveWatchRef.current) {
            navigator.geolocation.clearWatch(liveWatchRef.current);
            liveWatchRef.current = null;
        }
        setIsLiveLocation(false);
        setLiveLocationMsgId(null);
    };

    // ──────────────────────── Stories ────────────────────────

    const handleAddStory = async (file) => {
        try {
            if (file) {
                const formData = new FormData();
                formData.append("media", file);
                formData.append("type", file.type.startsWith("video") ? "video" : "image");
                if (addStoryText) formData.append("text", addStoryText);

                const res = await fetch(`${API}/api/stories`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                if (!res.ok) throw new Error("Story qo'shilmadi");
                const data = await res.json();
                if (data?.story) {
                    setStories((prev) => [data.story, ...prev]);
                }
            } else if (addStoryText.trim()) {
                const res = await fetch(`${API}/api/stories`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        type: "text",
                        text: addStoryText.trim(),
                        bg: STORY_COLORS[addStoryBgIdx],
                    }),
                });
                if (!res.ok) throw new Error("Story qo'shilmadi");
                const data = await res.json();
                if (data?.story) setStories((prev) => [data.story, ...prev]);
            }

            setShowAddStory(false);
            setAddStoryText("");
        } catch (err) {
            alert(err.message);
        }
    };

    // ──────────────────────── Groups ────────────────────────

    const handleGroupCreated = (group) => {
        if (group.type === "channel") {
            setChannels((prev) => [group, ...prev]);
        } else {
            setGroups((prev) => [group, ...prev]);
        }
        setShowCreateGroup(false);
        setSelectedGroup(group);
        setSelectedUser(null);
        setSidebarTab(group.type === "channel" ? "channels" : "groups");
    };

    const handleSendGroupMessage = () => {
        const text = message.trim();
        const groupId = selectedGroup?._id || selectedGroup?.id;
        const socket = getSocket();
        if (!text || !groupId || !socket) return;

        setMessage("");
        socket.emit("group:message:send", { groupId, text }, (response) => {
            if (response?.message) {
                const msg = response.message;
                addGroupMessage(groupId, msg);
                setMessages((prev) => {
                    const id = msg._id || msg.id;
                    if (id && prev.some((m) => (m._id || m.id) === id)) return prev;
                    return [...prev, msg];
                });
            }
        });
    };

    // ──────────────────────── Upload / Audio ────────────────────────

    const uploadFile = async (file) => {
        const receiverId = selectedUser?._id || selectedUser?.id;
        if (!file || !receiverId || !token) return;
        try {
            setUploadingFile(true);
            const formData = new FormData();
            formData.append("file", file);
            formData.append("receiverId", receiverId);
            if (message.trim()) formData.append("text", message.trim());

            const res = await fetch(`${API}/api/messages/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Fayl yuborilmadi");
            setMessage("");
            if (data?.message) appendMessageUnique(data.message);
        } catch (err) {
            alert(err.message || "Fayl yuklashda xato");
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) await uploadFile(file);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch {
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
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                audioChunksRef.current = [];
                const formData = new FormData();
                formData.append("audio", audioBlob, "voice.webm");
                formData.append("receiverId", receiverId);
                const res = await fetch(`${API}/api/messages/audio`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.message || "Audio yuborilmadi");
                if (data?.message) appendMessageUnique(data.message);
            } catch {
                alert("Audio yuborilmadi");
            } finally {
                setIsSendingAudio(false);
                streamRef.current?.getTracks()?.forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
        mediaRecorder.stop();
    };

    const handleAudioClick = () => {
        if (isSendingAudio) return;
        isRecording ? stopRecording() : startRecording();
    };

    // ──────────────────────── Helpers ────────────────────────

    const getFileUrl = (url) => (!url ? "" : url.startsWith("http") ? url : `${API}${url}`);
    const getAudioUrl = (url) => (!url ? "" : url.startsWith("http") ? url : `${API}${url}`);

    const formatTime = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "";
        const kb = bytes / 1024;
        return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
    };

    // ──────────────────────── Effects ────────────────────────

    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        fetchMe();
    }, [token]);

    useEffect(() => {
        if (!token) return;
        const socket = connectSocket(token);
        if (!socket) return;

        const onUsersOnline = (userIds) => setOnlineIds(userIds || []);
        const onUserOnline = ({ userId }) => setOnlineIds((prev) => prev.includes(userId) ? prev : [...prev, userId]);
        const onUserOffline = ({ userId }) => setOnlineIds((prev) => prev.filter((id) => id !== userId));

        const onMessageNew = (newMessage) => {
            const senderId = newMessage?.sender?._id || newMessage?.sender?.id;
            const receiverId = newMessage?.receiver?._id || newMessage?.receiver?.id;
            const activeId = selectedUser?._id || selectedUser?.id;
            if (senderId === activeId || receiverId === activeId) appendMessageUnique(newMessage);
        };

        const onTypingStart = ({ userId }) => {
            if (userId === (selectedUser?._id || selectedUser?.id)) setTypingText("yozmoqda...");
        };
        const onTypingStop = ({ userId }) => {
            if (userId === (selectedUser?._id || selectedUser?.id)) setTypingText("");
        };

        const onMessageRead = ({ by }) => {
            if (by === (selectedUser?._id || selectedUser?.id)) {
                setMessages((prev) =>
                    prev.map((msg) => {
                        const senderId = msg?.sender?._id || msg?.sender?.id;
                        return senderId === myId ? { ...msg, read: true } : msg;
                    })
                );
            }
        };

        const onGroupMessage = ({ groupId, message: msg }) => {
            const activeGroupId = selectedGroup?._id || selectedGroup?.id;
            addGroupMessage(groupId, msg);
            updateGroupLastMessage(groupId, msg);
            if (groupId === activeGroupId) {
                setMessages((prev) => {
                    const id = msg._id || msg.id;
                    if (id && prev.some((m) => (m._id || m.id) === id)) return prev;
                    return [...prev, msg];
                });
            }
        };

        const onLiveLocationUpdate = ({ messageId, latitude, longitude }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    (m._id || m.id) === messageId ? { ...m, latitude, longitude } : m
                )
            );
        };

        const onNewStory = (story) => {
            setStories((prev) => {
                const userId = story.userId || story.user?._id;
                const idx = prev.findIndex((s) => (s.userId || s.user?._id) === userId);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], items: [...(updated[idx].items || []), story] };
                    return updated;
                }
                return [story, ...prev];
            });
        };

        const onGroupCreated = (group) => {
            if (group.type === "channel") {
                setChannels((prev) => prev.some((g) => (g._id || g.id) === (group._id || group.id)) ? prev : [group, ...prev]);
            } else {
                setGroups((prev) => prev.some((g) => (g._id || g.id) === (group._id || group.id)) ? prev : [group, ...prev]);
            }
        };

        const onCallOffer = (data) => setIncomingCall(data);
        const onCallAnswer = ({ answer }) => handleAnswer(answer);
        const onCallIceCandidate = ({ candidate }) => handleIceCandidate(candidate);
        const onCallReject = () => { alert("Qo'ng'iroq rad etildi"); cleanup(); };
        const onCallEnd = () => { cleanup(); resetCall(); };

        // ── Group call events ──
        const onGroupCallStarted = ({ groupId, callerId, callerName, participants }) => {
            if (callerId === myId) return; // we started it, already in state
            setGroupHasActiveCall(groupId, {
                callerName: callerName || "User",
                participants: participants || [],
            });
        };

        const onGroupCallUserJoined = ({ groupId, userId, username, participants: allParticipants }) => {
            updateGroupActiveCallParticipants(groupId, allParticipants || []);
            const { isInCall, activeGroupId } = useGroupCallStore.getState();
            if (isInCall && activeGroupId === groupId && userId !== myId) {
                onNewParticipantJoined(userId, username, groupId);
            }
        };

        const onGroupCallUserLeft = ({ groupId, userId }) => {
            const { groupActiveCalls } = useGroupCallStore.getState();
            const call = groupActiveCalls[groupId];
            if (call) {
                const nextParticipants = (call.participants || []).filter((p) => p.userId !== userId);
                if (nextParticipants.length === 0) {
                    removeGroupActiveCall(groupId);
                } else {
                    updateGroupActiveCallParticipants(groupId, nextParticipants);
                }
            }
            const { isInCall, activeGroupId } = useGroupCallStore.getState();
            if (isInCall && activeGroupId === groupId) {
                removeParticipantPC(userId);
            }
        };

        const onGroupCallEnded = ({ groupId }) => {
            removeGroupActiveCall(groupId);
            const { isInCall, activeGroupId } = useGroupCallStore.getState();
            if (isInCall && activeGroupId === groupId) {
                cleanupGroupCall();
            }
        };

        const onGroupCallOffer = ({ from, fromUsername, groupId, offer }) => {
            const { isInCall, activeGroupId } = useGroupCallStore.getState();
            if (isInCall && activeGroupId === groupId) {
                handleGroupOffer(from, fromUsername, groupId, offer);
            }
        };

        const onGroupCallAnswer = ({ from, answer }) => {
            handleGroupAnswer(from, answer);
        };

        const onGroupCallIce = ({ from, candidate }) => {
            handleGroupIce(from, candidate);
        };

        socket.off("users:online"); socket.off("user:online"); socket.off("user:offline");
        socket.off("message:new"); socket.off("typing:start"); socket.off("typing:stop");
        socket.off("message:read"); socket.off("group:message"); socket.off("group:created");
        socket.off("location:live:update"); socket.off("story:new");
        socket.off("call:offer"); socket.off("call:answer");
        socket.off("call:ice-candidate"); socket.off("call:reject"); socket.off("call:end");
        socket.off("group:call:started"); socket.off("group:call:user:joined");
        socket.off("group:call:user:left"); socket.off("group:call:ended");
        socket.off("group:call:offer"); socket.off("group:call:answer"); socket.off("group:call:ice");

        socket.on("users:online", onUsersOnline);
        socket.on("user:online", onUserOnline);
        socket.on("user:offline", onUserOffline);
        socket.on("message:new", onMessageNew);
        socket.on("typing:start", onTypingStart);
        socket.on("typing:stop", onTypingStop);
        socket.on("message:read", onMessageRead);
        socket.on("group:message", onGroupMessage);
        socket.on("group:created", onGroupCreated);
        socket.on("location:live:update", onLiveLocationUpdate);
        socket.on("story:new", onNewStory);
        socket.on("call:offer", onCallOffer);
        socket.on("call:answer", onCallAnswer);
        socket.on("call:ice-candidate", onCallIceCandidate);
        socket.on("call:reject", onCallReject);
        socket.on("call:end", onCallEnd);
        socket.on("group:call:started", onGroupCallStarted);
        socket.on("group:call:user:joined", onGroupCallUserJoined);
        socket.on("group:call:user:left", onGroupCallUserLeft);
        socket.on("group:call:ended", onGroupCallEnded);
        socket.on("group:call:offer", onGroupCallOffer);
        socket.on("group:call:answer", onGroupCallAnswer);
        socket.on("group:call:ice", onGroupCallIce);

        return () => {
            socket.off("users:online", onUsersOnline);
            socket.off("user:online", onUserOnline);
            socket.off("user:offline", onUserOffline);
            socket.off("message:new", onMessageNew);
            socket.off("typing:start", onTypingStart);
            socket.off("typing:stop", onTypingStop);
            socket.off("message:read", onMessageRead);
            socket.off("group:message", onGroupMessage);
            socket.off("group:created", onGroupCreated);
            socket.off("location:live:update", onLiveLocationUpdate);
            socket.off("story:new", onNewStory);
            socket.off("call:offer", onCallOffer);
            socket.off("call:answer", onCallAnswer);
            socket.off("call:ice-candidate", onCallIceCandidate);
            socket.off("call:reject", onCallReject);
            socket.off("call:end", onCallEnd);
            socket.off("group:call:started", onGroupCallStarted);
            socket.off("group:call:user:joined", onGroupCallUserJoined);
            socket.off("group:call:user:left", onGroupCallUserLeft);
            socket.off("group:call:ended", onGroupCallEnded);
            socket.off("group:call:offer", onGroupCallOffer);
            socket.off("group:call:answer", onGroupCallAnswer);
            socket.off("group:call:ice", onGroupCallIce);
        };
    }, [token, selectedUser, selectedGroup, myId, setIncomingCall, resetCall]);

    useEffect(() => {
        if (me) { fetchUsers(); fetchGroups(); fetchStories(); }
    }, [me]);

    useEffect(() => {
        const activeId = selectedUser?._id || selectedUser?.id;
        if (activeId) {
            setSelectedGroup(null);
            fetchMessages(activeId);
        }
    }, [selectedUser]);

    useEffect(() => {
        const groupId = selectedGroup?._id || selectedGroup?.id;
        if (groupId) {
            setSelectedUser(null);
            fetchGroupMessages(groupId);
        }
    }, [selectedGroup]);

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

    // ──────────────────────── Derived ────────────────────────

    const visibleUsers = users.filter((u) => {
        const uid = u._id || u.id;
        const name = getUserName(u).toLowerCase();
        return !archivedIds.includes(uid) && !blockedIds.includes(uid) && !deletedIds.includes(uid) && name.includes(search.toLowerCase());
    });

    const archivedUsers = users.filter((u) => {
        const uid = u._id || u.id;
        const name = getUserName(u).toLowerCase();
        return archivedIds.includes(uid) && !blockedIds.includes(uid) && !deletedIds.includes(uid) && name.includes(search.toLowerCase());
    });

    const filteredGroups = groups.filter((g) => (g.name || "").toLowerCase().includes(search.toLowerCase()));
    const filteredChannels = channels.filter((g) => (g.name || "").toLowerCase().includes(search.toLowerCase()));

    const handleInputChange = (e) => {
        const value = e.target.value;
        setMessage(value);
        const socket = getSocket();
        const receiverId = selectedUser?._id || selectedUser?.id;
        if (!socket || !receiverId) return;
        socket.emit("typing:start", { receiverId });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => socket.emit("typing:stop", { receiverId }), 700);
    };

    const handleSendMessage = () => {
        if (selectedGroup) { handleSendGroupMessage(); return; }
        const text = message.trim();
        const receiverId = selectedUser?._id || selectedUser?.id;
        const socket = getSocket();
        if (!text || !receiverId || !socket) return;
        setMessage("");
        socket.emit("typing:stop", { receiverId });
        socket.emit("message:send", { receiverId, text }, (response) => {
            if (response?.message) appendMessageUnique(response.message);
        });
    };

    // ──────────────────────── Sub-components ────────────────────────

    const VoiceMessage = ({ src, time, isMine, fileSize }) => {
        const audioRef = useRef(null);
        const [isPlaying, setIsPlaying] = useState(false);
        const [duration, setDuration] = useState(0);
        const [audioTime, setAudioTime] = useState(0);
        const [audioSize, setAudioSize] = useState(fileSize || 0);

        useEffect(() => {
            let cancelled = false;
            const loadSize = async () => {
                if (fileSize) { setAudioSize(fileSize); return; }
                try {
                    const res = await fetch(src);
                    const blob = await res.blob();
                    if (!cancelled) setAudioSize(blob.size);
                } catch {}
            };
            loadSize();
            return () => { cancelled = true; };
        }, [src, fileSize]);

        const formatAudioTime = (s) => {
            if (!s || isNaN(s) || !isFinite(s)) return "00:00";
            return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
        };

        const formatAudioSize = (bytes) => {
            if (!bytes) return "";
            const kb = bytes / 1024;
            return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
        };

        const togglePlay = async () => {
            const audio = audioRef.current;
            if (!audio) return;
            try {
                if (audio.paused) { await audio.play(); setIsPlaying(true); }
                else { audio.pause(); setIsPlaying(false); }
            } catch {}
        };

        const progress = duration > 0 ? audioTime / duration : 0;
        const shownTime = audioTime > 0 ? audioTime : duration;

        return (
            <div className="flex min-w-[360px] items-center gap-[12px]">
                <button type="button" onClick={togglePlay}
                    className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#49a8e8] text-[24px] text-white transition active:scale-95">
                    {isPlaying ? "⏸" : "▶"}
                </button>
                <div className="flex flex-1 flex-col">
                    <div className="flex h-[26px] items-center gap-[2px] overflow-hidden">
                        {Array.from({ length: 58 }).map((_, i) => (
                            <span key={i}
                                className={`w-[2px] shrink-0 rounded-full ${progress > 0 && i / 58 <= progress ? "bg-[#49a8e8]" : "bg-[#42607d]"}`}
                                style={{ height: `${6 + ((i * 7) % 18)}px` }}
                            />
                        ))}
                    </div>
                    <div className="mt-[4px] flex items-center justify-between gap-[14px]">
                        <span className="text-[15px] text-[#82a5c8]">
                            {formatAudioTime(shownTime)}{formatAudioSize(audioSize) ? `, ${formatAudioSize(audioSize)}` : ""}
                        </span>
                        <span className="shrink-0 text-[15px] text-[#7f92a6]">{time} {isMine ? "✓✓" : ""}</span>
                    </div>
                    <audio ref={audioRef} src={src} preload="metadata"
                        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (d && isFinite(d)) setDuration(d); }}
                        onDurationChange={(e) => { const d = e.currentTarget.duration; if (d && isFinite(d)) setDuration(d); }}
                        onTimeUpdate={(e) => setAudioTime(e.currentTarget.currentTime || 0)}
                        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                        onEnded={() => { setIsPlaying(false); setAudioTime(0); }}
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
                    <img src={fileUrl} alt={fileName} onClick={() => window.open(fileUrl, "_blank")}
                        className="max-h-[320px] w-full cursor-pointer rounded-[14px] object-cover" />
                    {msg?.text ? <p className="mt-[7px] break-words text-[17px] leading-[22px] text-white">{msg.text}</p> : null}
                </div>
            );
        }
        if (fileType === "video") {
            return (
                <div className="max-w-[330px]">
                    <video src={fileUrl} controls className="max-h-[320px] w-full rounded-[14px]" />
                    {msg?.text ? <p className="mt-[7px] break-words text-[17px] leading-[22px] text-white">{msg.text}</p> : null}
                </div>
            );
        }
        return (
            <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer"
                className="flex min-w-[260px] max-w-[340px] items-center gap-[12px] rounded-[14px] bg-[#122437] p-[12px] hover:bg-[#17304a]">
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[#49a8e8] text-[24px]">📄</div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-white">{fileName}</p>
                    <p className="mt-[2px] text-[14px] text-[#82a5c8]">{formatFileSize(fileSize) || "File"}</p>
                    {msg?.text ? <p className="mt-[6px] break-words text-[15px] text-white/90">{msg.text}</p> : null}
                </div>
            </a>
        );
    };

    const AttachmentMenu = () => (
        <div className="group relative">
            <button type="button"
                className="flex h-[58px] w-[42px] items-center justify-center text-[32px] text-[#8f9cab] hover:text-white">
                📎
            </button>
            <div className="pointer-events-none absolute bottom-[64px] left-0 z-50 w-[225px] translate-y-[8px] rounded-[14px] bg-[#17212b] py-[8px] opacity-0 shadow-2xl transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                {[
                    ["🖼", "Foto yoki video", () => fileInputRef.current?.click()],
                    ["📄", "Hujjat", () => fileInputRef.current?.click()],
                    ["📍", "Lokatsiya", handleShareLocation],
                    ["📡", "Live lokatsiya", isLiveLocation ? stopLiveLocation : startLiveLocation],
                    ["📊", "So'rovnoma", null],
                ].map(([icon, title, handler]) => (
                    <button key={title} type="button" onClick={handler || undefined}
                        className={`flex h-[44px] w-full items-center gap-[14px] px-[18px] text-left text-[16px] text-white hover:bg-white/10 ${!handler ? "opacity-40" : ""}`}>
                        <span className="w-[24px] text-[22px] text-[#9dafbf]">{icon}</span>
                        <span>{title === "Live lokatsiya" && isLiveLocation ? "Live lokatsiyani to'xtatish" : title}</span>
                        {title === "Live lokatsiya" && isLiveLocation ? (
                            <span className="ml-auto h-[8px] w-[8px] rounded-full bg-[#2ee86f] animate-pulse" />
                        ) : null}
                    </button>
                ))}
            </div>
            <input ref={fileInputRef} type="file" onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar,.txt,.xls,.xlsx"
                className="hidden" />
        </div>
    );

    // ── Stories Bar ──
    const StoriesBar = () => {
        const myStory = stories.find((s) => (s.userId || s.user?._id) === myId);
        const otherStories = stories.filter((s) => (s.userId || s.user?._id) !== myId);
        const allForViewer = myStory ? [myStory, ...otherStories] : otherStories;

        return (
            <div className="flex gap-[14px] overflow-x-auto px-[14px] py-[12px] scrollbar-none"
                style={{ scrollbarWidth: "none" }}>
                {/* My story / add */}
                <div className="flex flex-col items-center gap-[5px] shrink-0">
                    <button type="button" onClick={() => setShowAddStory(true)}
                        className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border-[2px] border-dashed border-[#6258ff] bg-[#1a1b24] text-[26px] transition hover:border-[#8c7fff]">
                        {myStory ? (
                            <span className="absolute inset-0 rounded-full border-[3px] border-[#6258ff]" />
                        ) : null}
                        {myStory ? (
                            <span className="text-[22px] font-bold text-white">{getInitial(me?.username)}</span>
                        ) : (
                            <span className="text-[22px] text-[#6258ff]">+</span>
                        )}
                    </button>
                    <span className="text-[10px] text-[#6b7280] max-w-[58px] truncate">Mening</span>
                </div>

                {/* Other users' stories */}
                {otherStories.map((s, i) => {
                    const uname = s.username || s.user?.username || "User";
                    const hasUnviewed = (s.items || []).some((item) => !item.viewed);
                    const viewerIdx = myStory ? i + 1 : i;

                    return (
                        <div key={s.userId || s.user?._id || i} className="flex flex-col items-center gap-[5px] shrink-0">
                            <button type="button" onClick={() => setViewingStoryIndex(viewerIdx)}
                                className={`flex h-[58px] w-[58px] items-center justify-center rounded-full text-[22px] font-bold text-white transition hover:scale-105 ${hasUnviewed ? "ring-[3px] ring-[#6258ff] ring-offset-[2px] ring-offset-[#0b0c11]" : "ring-[3px] ring-[#444] ring-offset-[2px] ring-offset-[#0b0c11]"}`}
                                style={{ background: STORY_COLORS[i % STORY_COLORS.length] }}>
                                {getInitial(uname)}
                            </button>
                            <span className="text-[10px] text-[#6b7280] max-w-[58px] truncate">{uname}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── Add Story Modal ──
    const AddStoryModal = () => (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddStory(false)}>
            <div className="w-full max-w-[380px] overflow-hidden rounded-[20px] bg-[#17212b] shadow-2xl"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/10 px-[20px] py-[16px]">
                    <h2 className="text-[18px] font-bold text-white">Story qo'shish</h2>
                    <button type="button" onClick={() => setShowAddStory(false)}
                        className="text-[22px] text-white/60 hover:text-white">✕</button>
                </div>

                <div className="px-[20px] py-[16px] space-y-[14px]">
                    {/* Text preview */}
                    <div className="flex h-[160px] items-center justify-center rounded-[14px] p-[20px]"
                        style={{ background: STORY_COLORS[addStoryBgIdx] }}>
                        <p className="text-center text-[22px] font-bold text-white">
                            {addStoryText || "Matn kiriting..."}
                        </p>
                    </div>

                    {/* Background selector */}
                    <div className="flex gap-[8px]">
                        {STORY_COLORS.map((color, i) => (
                            <button key={i} type="button" onClick={() => setAddStoryBgIdx(i)}
                                className={`h-[30px] w-[30px] rounded-full transition ${addStoryBgIdx === i ? "ring-2 ring-white ring-offset-2 ring-offset-[#17212b]" : ""}`}
                                style={{ background: color }} />
                        ))}
                    </div>

                    <input value={addStoryText} onChange={(e) => setAddStoryText(e.target.value)}
                        placeholder="Story matni yozing..."
                        className="w-full rounded-[12px] bg-[#1c2837] px-[14px] py-[11px] text-[15px] text-white outline-none placeholder:text-[#566a7f] focus:ring-1 focus:ring-[#6258ff]" />

                    <div className="flex gap-[10px]">
                        <button type="button"
                            onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*,video/*"; input.onchange = (e) => { const f = e.target.files?.[0]; if (f) handleAddStory(f); }; input.click(); }}
                            className="flex-1 rounded-[12px] border border-[#566a7f] py-[11px] text-[14px] text-white hover:bg-white/5">
                            📷 Rasm/Video
                        </button>
                        <button type="button" onClick={() => handleAddStory(null)}
                            disabled={!addStoryText.trim()}
                            className="flex-1 rounded-[12px] bg-[#6258ff] py-[11px] text-[14px] font-semibold text-white transition hover:bg-[#7068ff] disabled:opacity-50">
                            ✓ Qo'shish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Group Row ──
    const GroupRow = ({ g }) => {
        const gid = g._id || g.id;
        const active = (selectedGroup?._id || selectedGroup?.id) === gid;
        const memberCount = g.members?.length || 0;
        return (
            <button type="button"
                onClick={() => { setSelectedGroup(g); setSelectedUser(null); }}
                className={`flex w-full h-[78px] items-center gap-[12px] px-[14px] text-left transition ${active ? "bg-[#242536]" : "hover:bg-[#181923]"}`}>
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[24px]"
                    style={{ background: STORY_COLORS[(gid?.charCodeAt(0) || 0) % STORY_COLORS.length] }}>
                    {g.type === "channel" ? "📢" : "👥"}
                </div>
                <div className="min-w-0 flex-1 border-b border-white/[0.06] py-[10px]">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-[16px] font-semibold text-white">{g.name}</h3>
                        <span className="shrink-0 text-[12px] text-[#858b9b]">
                            {g.lastMessage ? formatTime(g.lastMessage.createdAt) : ""}
                        </span>
                    </div>
                    <div className="mt-[4px] flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] text-[#8b91a4]">
                            {g.lastMessage?.text || `${memberCount} a'zo`}
                        </p>
                        {g.type === "channel" ? (
                            <span className="text-[11px] text-[#6258ff] bg-[#6258ff]/10 rounded-full px-[6px] py-[1px]">Kanal</span>
                        ) : null}
                    </div>
                </div>
            </button>
        );
    };

    // ── User Row ──
    const UserRow = ({ u, archived = false }) => {
        const uid = u?._id || u?.id;
        const active = (selectedUser?._id || selectedUser?.id) === uid;
        const online = onlineIds.includes(uid);
        return (
            <div className={`group relative flex h-[78px] w-full items-center px-[12px] transition ${active ? "bg-[#242536]" : "hover:bg-[#181923]"}`}>
                <button type="button"
                    onClick={() => { setSelectedUser(u); setSelectedGroup(null); setShowArchive(false); }}
                    onDoubleClick={() => navigate(`/profile/${u._id || u.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-[12px] text-left">
                    <div className="relative h-[52px] w-[52px] shrink-0">
                        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#7d63ff] text-[25px] font-bold text-white">
                            {getInitial(getUserName(u))}
                        </div>
                        <span className={`absolute bottom-[1px] right-[1px] h-[12px] w-[12px] rounded-full border-[2px] border-[#111217] ${online ? "bg-[#2ee86f]" : "bg-[#7d8294]"}`} />
                    </div>
                    <div className="min-w-0 flex-1 border-b border-white/[0.06] py-[10px]">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-[16px] font-semibold text-white">{getUserName(u)}</h3>
                            <span className="shrink-0 text-[12px] text-[#858b9b]">{online ? "now" : "Fri"}</span>
                        </div>
                        <div className="mt-[4px] flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] text-[#8b91a4]">
                                {archived ? "Archived" : online ? "Online" : "Offline"}
                            </p>
                            <span className="text-[13px] text-[#777d8f]">★</span>
                        </div>
                    </div>
                </button>
                <button type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuUserId(menuUserId === uid ? null : uid); }}
                    className="ml-[6px] hidden h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[22px] text-[#9ba1b4] hover:bg-white/10 group-hover:flex">
                    ⋯
                </button>
                {menuUserId === uid ? (
                    <div className="absolute right-[10px] top-[52px] z-50 w-[165px] overflow-hidden rounded-[14px] border border-white/10 bg-[#1f2029] shadow-2xl">
                        <button type="button" onClick={() => (archived ? unarchiveUser(uid) : archiveUser(uid))}
                            className="flex h-[42px] w-full items-center justify-between px-4 text-left text-[14px] text-white hover:bg-white/10">
                            <span>{archived ? "Unarchive" : "Archive"}</span><span>▣</span>
                        </button>
                        <button type="button" onClick={() => blockUser(uid)}
                            className="flex h-[42px] w-full items-center justify-between px-4 text-left text-[14px] text-white hover:bg-white/10">
                            <span>Block user</span><span>⊘</span>
                        </button>
                        <button type="button" onClick={() => deleteUser(uid)}
                            className="flex h-[42px] w-full items-center justify-between px-4 text-left text-[14px] text-[#ff4e4e] hover:bg-white/10">
                            <span>Delete</span><span>🗑</span>
                        </button>
                    </div>
                ) : null}
            </div>
        );
    };

    // ──────────────────────── Render ────────────────────────

    const activeTitle = selectedGroup
        ? selectedGroup.name
        : selectedUser
        ? getUserName(selectedUser)
        : "Chat";

    const activeSubtitle = selectedGroup
        ? `${selectedGroup.members?.length || 0} a'zo`
        : selectedUser && onlineIds.includes(selectedUser?._id || selectedUser?.id)
        ? typingText || "online"
        : "last seen just now";

    const activeInitial = selectedGroup
        ? (selectedGroup.type === "channel" ? "📢" : "👥")
        : selectedUser
        ? getInitial(getUserName(selectedUser))
        : "C";

    const activeIsEmoji = selectedGroup && (selectedGroup.type === "channel" || selectedGroup.type === "group");

    return (
        <div className="h-screen w-full overflow-hidden bg-[#0c1020] text-white">
            <VideoCallModal />
            <GroupCallModal myId={myId} myUsername={me?.username} />

            {/* Stories Viewer */}
            {viewingStoryIndex !== null && stories.length > 0 ? (
                <StoriesViewer
                    allStories={stories}
                    startIndex={viewingStoryIndex}
                    onClose={() => setViewingStoryIndex(null)}
                />
            ) : null}

            {/* Add Story Modal */}
            {showAddStory ? <AddStoryModal /> : null}

            {/* Create Group/Channel Modal */}
            {showCreateGroup ? (
                <CreateGroupModal
                    users={users}
                    token={token}
                    type={createGroupType}
                    onCreated={handleGroupCreated}
                    onClose={() => setShowCreateGroup(false)}
                />
            ) : null}

            <div className="flex h-full">
                {/* ── Sidebar ── */}
                <div className="w-[370px] shrink-0 border-r border-white/10 bg-[#0b0c11] flex flex-col">
                    {/* Header */}
                    <div className="px-[14px] pt-[14px] pb-[8px]">
                        <div className="flex h-[34px] items-center justify-between text-white">
                            <button type="button" className="text-[15px] text-white/90">Edit</button>
                            <h2 className="text-[16px] font-semibold">
                                {sidebarTab === "groups" ? "Guruhlar" : sidebarTab === "channels" ? "Kanallar" : "Chats"}
                            </h2>
                            <div className="flex items-center gap-[6px]">
                                <button type="button"
                                    onClick={() => { setCreateGroupType("group"); setShowCreateGroup(true); }}
                                    className="flex h-[28px] w-[28px] items-center justify-center rounded-md text-[18px] text-white/90 hover:bg-white/10"
                                    title="Guruh yaratish">
                                    ✚
                                </button>
                                <button type="button" onClick={logout}
                                    className="flex h-[28px] w-[28px] items-center justify-center rounded-md text-[18px] text-white/90 hover:bg-white/10">
                                    ⏻
                                </button>
                            </div>
                        </div>

                        <div className="mt-[10px] flex h-[34px] items-center rounded-[9px] bg-[#15161d] px-[12px]">
                            <span className="mr-[8px] text-[14px] text-[#767c8b]">⌕</span>
                            <input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Qidirish..."
                                className="h-full flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#747987]" />
                        </div>
                    </div>

                    {/* Stories bar (only in chats tab) */}
                    {sidebarTab === "chats" ? (
                        <div className="border-b border-white/[0.06]">
                            <StoriesBar />
                        </div>
                    ) : null}

                    {/* Tab filter */}
                    <div className="flex border-b border-white/[0.06] px-[14px]">
                        {[
                            { key: "chats", label: "Chatlar" },
                            { key: "groups", label: "Guruhlar" },
                            { key: "channels", label: "Kanallar" },
                        ].map(({ key, label }) => (
                            <button key={key} type="button" onClick={() => setSidebarTab(key)}
                                className={`flex-1 py-[10px] text-[13px] font-semibold transition ${sidebarTab === key ? "border-b-[2px] border-[#6258ff] text-white" : "text-[#6b7280] hover:text-white"}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {sidebarTab === "chats" ? (
                            <>
                                {archivedUsers.length > 0 ? (
                                    <button type="button" onClick={() => setShowArchive((p) => !p)}
                                        className="flex h-[58px] w-full items-center gap-[12px] border-b border-white/[0.06] px-[14px] text-left hover:bg-[#181923]">
                                        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#252733] text-[22px]">🗄</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[15px] font-semibold text-white">Arxivlangan</p>
                                                <span className="rounded-full bg-[#2f3240] px-[7px] py-[1px] text-[12px] text-white">{archivedUsers.length}</span>
                                            </div>
                                            <p className="text-[13px] text-[#8b91a4]">{showArchive ? "Yashirish" : "Ko'rsatish"}</p>
                                        </div>
                                    </button>
                                ) : null}

                                {showArchive ? (
                                    <div>
                                        <div className="px-[14px] py-[8px] text-[12px] font-semibold uppercase tracking-[1px] text-[#6f778a]">Arxiv</div>
                                        {archivedUsers.map((u) => <UserRow key={u._id || u.id} u={u} archived />)}
                                    </div>
                                ) : null}

                                <div className="px-[14px] py-[8px] text-[12px] font-semibold uppercase tracking-[1px] text-[#6f778a]">
                                    Foydalanuvchilar
                                </div>

                                {loadingUsers ? (
                                    <div className="px-[14px] py-[12px] text-[14px] text-[#8b91a4]">Yuklanmoqda...</div>
                                ) : visibleUsers.length === 0 ? (
                                    <div className="px-[18px] py-[20px] text-center text-[14px] text-[#8b91a4]">User topilmadi</div>
                                ) : (
                                    visibleUsers.map((u) => <UserRow key={u._id || u.id} u={u} />)
                                )}
                            </>
                        ) : sidebarTab === "groups" ? (
                            <>
                                <button type="button"
                                    onClick={() => { setCreateGroupType("group"); setShowCreateGroup(true); }}
                                    className="flex h-[52px] w-full items-center gap-[12px] border-b border-white/[0.06] px-[14px] text-left hover:bg-[#181923]">
                                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#6258ff]/20 text-[20px]">+</div>
                                    <span className="text-[15px] font-semibold text-[#6258ff]">Yangi guruh yaratish</span>
                                </button>

                                {loadingGroups ? (
                                    <div className="px-[14px] py-[12px] text-[14px] text-[#8b91a4]">Yuklanmoqda...</div>
                                ) : filteredGroups.length === 0 ? (
                                    <div className="px-[18px] py-[20px] text-center text-[14px] text-[#8b91a4]">Guruh topilmadi</div>
                                ) : (
                                    filteredGroups.map((g) => <GroupRow key={g._id || g.id} g={g} />)
                                )}
                            </>
                        ) : (
                            <>
                                <button type="button"
                                    onClick={() => { setCreateGroupType("channel"); setShowCreateGroup(true); }}
                                    className="flex h-[52px] w-full items-center gap-[12px] border-b border-white/[0.06] px-[14px] text-left hover:bg-[#181923]">
                                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#6258ff]/20 text-[20px]">+</div>
                                    <span className="text-[15px] font-semibold text-[#6258ff]">Yangi kanal yaratish</span>
                                </button>

                                {loadingGroups ? (
                                    <div className="px-[14px] py-[12px] text-[14px] text-[#8b91a4]">Yuklanmoqda...</div>
                                ) : filteredChannels.length === 0 ? (
                                    <div className="px-[18px] py-[20px] text-center text-[14px] text-[#8b91a4]">Kanal topilmadi</div>
                                ) : (
                                    filteredChannels.map((g) => <GroupRow key={g._id || g.id} g={g} />)
                                )}
                            </>
                        )}
                    </div>

                    {/* Bottom nav */}
                    <div className="grid h-[58px] grid-cols-4 border-t border-white/10 bg-[#101116] text-[11px] text-[#727989]">
                        <button type="button" onClick={() => setSidebarTab("chats")}
                            className={`flex flex-col items-center justify-center gap-[3px] ${sidebarTab === "chats" ? "text-white" : ""}`}>
                            <span className="text-[19px]">💬</span>Chatlar
                        </button>
                        <button type="button" onClick={() => setSidebarTab("groups")}
                            className={`flex flex-col items-center justify-center gap-[3px] ${sidebarTab === "groups" ? "text-white" : ""}`}>
                            <span className="text-[19px]">👥</span>Guruhlar
                        </button>
                        <button type="button" onClick={() => setSidebarTab("channels")}
                            className={`flex flex-col items-center justify-center gap-[3px] ${sidebarTab === "channels" ? "text-white" : ""}`}>
                            <span className="text-[19px]">📢</span>Kanallar
                        </button>
                        <button type="button" onClick={() => navigate("/settings")}
                            className="flex flex-col items-center justify-center gap-[3px] hover:text-white">
                            <span className="text-[19px]">⚙</span>Settings
                        </button>
                    </div>
                </div>

                {/* ── Main chat area ── */}
                <div className="relative flex-1 overflow-hidden bg-[#151515]">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: "url('https://img.freepik.com/free-vector/hand-drawn-doodle-icons-set_1308-90706.jpg?semt=ais_hybrid&w=740&q=80')" }} />
                    <div className="absolute inset-0 bg-black/40" />

                    <div className="relative z-10 flex h-full flex-col">
                        {/* Chat header */}
                        <div className="relative z-30 flex h-[76px] w-full shrink-0 items-center justify-between bg-[#202938]/95 px-[24px] shadow-lg backdrop-blur-md">
                            <div className="flex items-center gap-[16px]">
                                <div className="text-[18px] font-semibold text-white">{currentTime}</div>

                                <div className={`flex h-[48px] w-[48px] items-center justify-center rounded-full text-[22px] font-bold text-white ${activeIsEmoji ? "bg-[#6258ff]/30 text-[28px]" : "bg-[#8a73ff]"}`}>
                                    {activeInitial}
                                </div>

                                <div>
                                    <h3 className="text-[22px] font-bold leading-none text-white">{activeTitle}</h3>
                                    <p className="mt-[6px] text-[14px] text-[#aeb7c8]">{activeSubtitle}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center gap-[18px]">
                                {selectedUser ? (
                                    <button type="button"
                                        onClick={() => { if (!selectedUser || !me) return; startCall(selectedUser, me.username); }}
                                        disabled={callStatus !== "idle"}
                                        className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[24px] text-white hover:bg-white/10 disabled:opacity-50">
                                        📹
                                    </button>
                                ) : null}

                                {selectedGroup ? (
                                    <>
                                        <button type="button"
                                            onClick={() => {
                                                const gid = selectedGroup?._id || selectedGroup?.id;
                                                if (isInGroupCall && groupCallActiveGroupId === gid) return;
                                                startGroupCall(gid, selectedGroup.name, myId, me?.username);
                                            }}
                                            disabled={isInGroupCall}
                                            title="Guruh qo'ng'irog'ini boshlash"
                                            className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[22px] text-white hover:bg-white/10 disabled:opacity-40">
                                            📞
                                        </button>
                                        <button type="button"
                                            onClick={() => alert(`A'zolar: ${selectedGroup.members?.map((m) => m.username || m).join(", ") || "yo'q"}`)}
                                            className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[24px] text-white hover:bg-white/10">
                                            👁
                                        </button>
                                    </>
                                ) : null}

                                <button type="button" onClick={() => setChatMenuOpen((p) => !p)}
                                    className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-[30px] text-white hover:bg-white/10">
                                    ⋮
                                </button>

                                {chatMenuOpen ? (
                                    <div className="absolute right-0 top-[52px] z-50 w-[210px] overflow-hidden rounded-[16px] border border-white/10 bg-[#20222d] shadow-2xl">
                                        <button type="button" onClick={deleteCurrentChat}
                                            className="flex h-[46px] w-full items-center justify-between px-4 text-left text-[15px] text-white hover:bg-white/10">
                                            <span>Chatni o'chirish</span><span>🧹</span>
                                        </button>
                                        {selectedUser ? (
                                            <>
                                                <button type="button" onClick={deleteCurrentUser}
                                                    className="flex h-[46px] w-full items-center justify-between px-4 text-left text-[15px] text-[#ff5c5c] hover:bg-white/10">
                                                    <span>Userni o'chirish</span><span>🗑</span>
                                                </button>
                                                <button type="button" onClick={blockCurrentUser}
                                                    className="flex h-[46px] w-full items-center justify-between px-4 text-left text-[15px] text-[#ffb84d] hover:bg-white/10">
                                                    <span>Userni blok qilish</span><span>🚫</span>
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="relative mx-auto flex-1 w-full overflow-hidden bg-[#242424]/30">
                            <div className="absolute inset-0 opacity-[0.28] bg-[radial-gradient(circle_at_20px_20px,#fff_1px,transparent_1px)] [background-size:32px_32px]" />

                            <div className="relative z-10 h-full overflow-y-auto pb-[98px] pt-[8px]">
                                {/* Group call banner */}
                                {selectedGroup && (() => {
                                    const gid = selectedGroup?._id || selectedGroup?.id;
                                    const callInfo = groupActiveCalls[gid];
                                    const isCurrentGroupCall = isInGroupCall && groupCallActiveGroupId === gid;
                                    if (!callInfo && !isCurrentGroupCall) return null;
                                    const displayInfo = callInfo || { callerName: me?.username, participants: [] };
                                    return (
                                        <GroupCallBanner
                                            callInfo={displayInfo}
                                            isInCall={isCurrentGroupCall}
                                            onJoin={() => {
                                                joinGroupCall(
                                                    gid,
                                                    selectedGroup.name,
                                                    displayInfo.participants || [],
                                                    myId,
                                                    me?.username
                                                );
                                            }}
                                            onLeave={() => leaveGroupCall(gid)}
                                        />
                                    );
                                })()}

                                <div className="px-[22px]">
                                {loadingMessages ? (
                                    <p className="text-center text-[15px] text-white/60">Xabarlar yuklanmoqda...</p>
                                ) : messages.length === 0 ? (
                                    <div className="flex h-full items-center justify-center">
                                        <div className="flex w-[360px] flex-col items-center rounded-[24px] bg-[#223044]/85 px-7 py-7 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                                            {selectedGroup ? (
                                                <>
                                                    <div className="mb-5 flex h-[135px] w-[135px] items-center justify-center rounded-full bg-[#2f3d55] text-[78px]">
                                                        {selectedGroup.type === "channel" ? "📢" : "👥"}
                                                    </div>
                                                    <h4 className="text-[21px] font-bold text-white">{selectedGroup.name}</h4>
                                                    <p className="mt-3 text-[17px] leading-[24px] text-white/85">
                                                        {selectedGroup.description || "Hozircha xabarlar yo'q"}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button"
                                                        onClick={() => {
                                                            const socket = getSocket();
                                                            const receiverId = selectedUser?._id || selectedUser?.id;
                                                            if (!receiverId || !socket) return;
                                                            socket.emit("message:send", { receiverId, text: "Assalomu alaykum 👋" }, (response) => {
                                                                if (response?.message) appendMessageUnique(response.message);
                                                            });
                                                        }}
                                                        className="mb-5 flex h-[135px] w-[135px] items-center justify-center rounded-full bg-[#2f3d55] text-[78px] transition hover:scale-105 active:scale-95">
                                                        👋
                                                    </button>
                                                    <h4 className="text-[21px] font-bold text-white">Hozircha xabarlar yo'q...</h4>
                                                    <p className="mt-3 text-[17px] leading-[24px] text-white/85">Suhbatni boshlash uchun salomlashuv stickeri ustiga bosing.</p>
                                                    <p className="mt-4 rounded-full bg-white/10 px-5 py-2 text-[15px] text-white/75">"Assalomu alaykum 👋"</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((m, index) => {
                                        const senderId = m?.sender?._id || m?.sender?.id;
                                        const isMine = senderId === myId;
                                        const hasAudio = Boolean(m?.audioUrl);
                                        const hasFile = Boolean(m?.fileUrl);
                                        const isLocation = m?.type === "location" || m?.type === "live_location";
                                        const senderName = m?.sender?.username || m?.sender?.name || "";

                                        return (
                                            <div key={m?._id || index}
                                                className={`mb-[8px] flex ${isMine ? "justify-end" : "justify-start"}`}>
                                                {/* Group: show sender name */}
                                                <div className="flex flex-col">
                                                    {selectedGroup && !isMine && senderName ? (
                                                        <span className="mb-[3px] ml-[14px] text-[12px] font-semibold text-[#6258ff]">
                                                            {senderName}
                                                        </span>
                                                    ) : null}
                                                    <div className={`max-w-[54%] rounded-[18px] px-[13px] py-[8px] shadow-md ${hasAudio || hasFile || isLocation ? "bg-[#122437]" : isMine ? "bg-[#3a3a3a]" : "bg-[#303030]"}`}
                                                        style={{ maxWidth: isLocation ? "300px" : undefined, padding: isLocation ? "0" : undefined, overflow: isLocation ? "hidden" : undefined }}>
                                                        {isLocation ? (
                                                            <LocationMessage
                                                                lat={m.latitude}
                                                                lng={m.longitude}
                                                                isLive={m.type === "live_location" || m.isLive}
                                                                expiresAt={m.expiresAt}
                                                                time={formatTime(m?.createdAt)}
                                                                isMine={isMine}
                                                            />
                                                        ) : hasAudio ? (
                                                            <VoiceMessage
                                                                src={getAudioUrl(m.audioUrl)}
                                                                time={formatTime(m?.createdAt)}
                                                                isMine={isMine}
                                                                fileSize={m?.audioSize || m?.fileSize || m?.size || 0}
                                                            />
                                                        ) : hasFile ? (
                                                            <FileMessage msg={m} />
                                                        ) : (
                                                            <p className="break-words text-[18px] leading-[23px] text-white">{m?.text}</p>
                                                        )}

                                                        {!hasAudio && !isLocation ? (
                                                            <p className="mt-[2px] text-right text-[12px] text-[#9e9e9e]">
                                                                {formatTime(m?.createdAt)} {isMine ? "✓✓" : ""}
                                                            </p>
                                                        ) : null}
                                                    </div>
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
                                </div>{/* end px-[22px] */}
                            </div>

                            {/* Input bar */}
                            <div className="absolute bottom-[24px] left-1/2 z-20 flex w-[92%] -translate-x-1/2 items-center gap-[12px]">
                                {/* Disable attachments in channel if not admin */}
                                {selectedGroup?.type !== "channel" || (selectedGroup?.admins?.includes?.(myId)) ? (
                                    <AttachmentMenu />
                                ) : (
                                    <div className="flex h-[58px] w-[42px] items-center justify-center text-[24px] text-[#566a7f]">🔒</div>
                                )}

                                <input value={message} onChange={handleInputChange}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                                    placeholder={
                                        selectedGroup?.type === "channel" && !selectedGroup?.admins?.includes?.(myId)
                                            ? "Faqat adminlar yoza oladi"
                                            : uploadingFile ? "Fayl yuklanmoqda..."
                                            : isRecording ? "Ovoz yozilmoqda..."
                                            : isLiveLocation ? "📡 Live lokatsiya faol..."
                                            : "Xabar yozing..."
                                    }
                                    disabled={selectedGroup?.type === "channel" && !selectedGroup?.admins?.includes?.(myId)}
                                    className="h-[58px] flex-1 rounded-full bg-[#1e1e1e]/95 px-[24px] text-[18px] text-white outline-none placeholder:text-[#9a9a9a] disabled:opacity-50" />

                                {selectedUser ? (
                                    <button type="button" onClick={handleAudioClick}
                                        disabled={isSendingAudio || uploadingFile}
                                        className={`flex h-[58px] w-[58px] items-center justify-center rounded-full text-[26px] text-white shadow-lg transition active:scale-95 ${isRecording ? "bg-[#ff3b30] animate-pulse" : "bg-[#303030] hover:bg-[#3b3b3b]"}`}>
                                        {isSendingAudio ? "⏳" : isRecording ? "⏹" : "🎤"}
                                    </button>
                                ) : null}

                                <button type="button" onClick={handleSendMessage}
                                    disabled={uploadingFile || (selectedGroup?.type === "channel" && !selectedGroup?.admins?.includes?.(myId))}
                                    className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#6258ff] text-[28px] text-white shadow-lg disabled:opacity-50">
                                    ➤
                                </button>
                            </div>

                            {/* Live location indicator */}
                            {isLiveLocation ? (
                                <div className="absolute top-[16px] left-1/2 z-30 -translate-x-1/2 flex items-center gap-[10px] rounded-full bg-[#1c2837]/95 px-[16px] py-[8px] shadow-lg">
                                    <span className="h-[10px] w-[10px] rounded-full bg-[#2ee86f] animate-pulse" />
                                    <span className="text-[14px] font-semibold text-white">Live lokatsiya faol</span>
                                    <button type="button" onClick={stopLiveLocation}
                                        className="ml-[4px] text-[13px] text-[#ff5c5c] hover:underline">
                                        To'xtatish
                                    </button>
                                </div>
                            ) : null}

                            <div className="absolute bottom-[8px] left-1/2 z-20 h-[4px] w-[165px] -translate-x-1/2 rounded-full bg-white" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
