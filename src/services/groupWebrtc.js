import { getSocket } from "../socket";
import useGroupCallStore from "../store/groupCallStore";

const ICE = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

// userId -> RTCPeerConnection
const peers = {};
let localStream = null;
let _onLocalStream = null;

export const getLocalGroupStream = () => localStream;
export const setLocalGroupStreamCallback = (cb) => { _onLocalStream = cb; };

async function acquireMedia() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    _onLocalStream?.(localStream);
}

function createPC(targetUserId, groupId) {
    const existing = peers[targetUserId];
    if (existing) { existing.close(); }

    const pc = new RTCPeerConnection(ICE);
    peers[targetUserId] = pc;

    localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream));

    pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
            getSocket()?.emit("group:call:ice", { to: targetUserId, groupId, candidate });
        }
    };

    pc.ontrack = ({ streams }) => {
        if (streams[0]) {
            useGroupCallStore.getState().setParticipantStream(targetUserId, streams[0]);
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            useGroupCallStore.getState().removeParticipant(targetUserId);
            pc.close();
            delete peers[targetUserId];
        }
    };

    return pc;
}

export async function startGroupCall(groupId, groupName, myId, myUsername) {
    try {
        await acquireMedia();
        useGroupCallStore.getState().setGroupCallActive(groupId, groupName, [
            { userId: myId, username: myUsername },
        ]);
        getSocket()?.emit("group:call:start", { groupId, callerName: myUsername });
    } catch {
        alert("Kameraga yoki mikrofonga ruxsat berilmadi");
    }
}

// New user joins → existing participants will send offers to them
export async function joinGroupCall(groupId, groupName, existingParticipants, myId, myUsername) {
    try {
        await acquireMedia();
        useGroupCallStore.getState().setGroupCallActive(groupId, groupName, [
            { userId: myId, username: myUsername },
            ...(existingParticipants || []).map((p) => ({ ...p, stream: null })),
        ]);
        getSocket()?.emit("group:call:join", { groupId });
    } catch {
        alert("Kameraga yoki mikrofonga ruxsat berilmadi");
    }
}

// We're existing participant → new user joined → we initiate offer to them
export async function onNewParticipantJoined(userId, username, groupId) {
    if (!localStream) return;
    useGroupCallStore.getState().addParticipant(userId, username);
    const pc = createPC(userId, groupId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    getSocket()?.emit("group:call:offer", { to: userId, groupId, offer });
}

// We received an offer (we're the new joiner, existing participant sent it)
export async function handleGroupOffer(fromUserId, fromUsername, groupId, offer) {
    if (!localStream) return;
    useGroupCallStore.getState().addParticipant(fromUserId, fromUsername);
    const pc = createPC(fromUserId, groupId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    getSocket()?.emit("group:call:answer", { to: fromUserId, groupId, answer });
}

export async function handleGroupAnswer(fromUserId, answer) {
    const pc = peers[fromUserId];
    if (!pc || !answer) return;
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch {}
}

export async function handleGroupIce(fromUserId, candidate) {
    const pc = peers[fromUserId];
    if (!pc || !candidate) return;
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
}

export function removeParticipantPC(userId) {
    const pc = peers[userId];
    if (pc) { pc.close(); delete peers[userId]; }
    useGroupCallStore.getState().removeParticipant(userId);
}

export function toggleGroupMute() {
    const track = localStream?.getAudioTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    useGroupCallStore.getState().setMuted(!track.enabled);
}

export function toggleGroupCamera() {
    const track = localStream?.getVideoTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    useGroupCallStore.getState().setCameraOff(!track.enabled);
}

export function leaveGroupCall(groupId) {
    getSocket()?.emit("group:call:leave", { groupId });
    cleanupGroupCall();
}

export function cleanupGroupCall() {
    localStream?.getTracks()?.forEach((t) => t.stop());
    Object.values(peers).forEach((pc) => { try { pc.close(); } catch {} });
    Object.keys(peers).forEach((k) => delete peers[k]);
    localStream = null;
    _onLocalStream = null;
    useGroupCallStore.getState().resetGroupCall();
}
