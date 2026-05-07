import { getSocket } from "../socket";
import useCallStore from "../store/callStore";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

let pc = null;
let localStream = null;
let remoteStream = null;
let _onLocalStream = null;
let _onRemoteStream = null;

export function getLocalStream() { return localStream; }
export function getRemoteStream() { return remoteStream; }

export function setStreamCallbacks(onLocal, onRemote) {
    _onLocalStream = onLocal;
    _onRemoteStream = onRemote;
}

async function getMedia() {
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });

    _onLocalStream?.(localStream);
}

function createPC(targetId) {
    pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
            getSocket()?.emit("call:ice-candidate", {
                to: targetId,
                candidate,
            });
        }
    };

    pc.ontrack = ({ streams }) => {
        remoteStream = streams[0];
        _onRemoteStream?.(streams[0]);
    };

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });
}

export async function startCall(targetUser, myUsername) {
    const targetId = targetUser?._id || targetUser?.id;
    if (!targetId) return;

    await getMedia();
    createPC(targetId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    getSocket()?.emit("call:offer", {
        to: targetId,
        offer,
        callerName: myUsername || "User",
    });

    useCallStore.getState().setActiveCallUser(targetUser);
    useCallStore.getState().setCallStatus("calling");
}

export async function answerCall() {
    const { incomingCall } = useCallStore.getState();
    if (!incomingCall?.from || !incomingCall?.offer) return;

    await getMedia();
    createPC(incomingCall.from);

    await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
    );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    getSocket()?.emit("call:answer", {
        to: incomingCall.from,
        answer,
    });

    useCallStore.getState().setActiveCallUser({
        _id: incomingCall.from,
        username: incomingCall.callerName || "User",
    });

    useCallStore.getState().setCallStatus("active");
}

export async function handleAnswer(answer) {
    if (!pc || !answer) return;

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    useCallStore.getState().setCallStatus("active");
}

export async function handleIceCandidate(candidate) {
    if (!pc || !candidate) return;

    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.log("ICE xato:", err.message);
    }
}

export function rejectCall() {
    const { incomingCall } = useCallStore.getState();

    if (incomingCall?.from) {
        getSocket()?.emit("call:reject", {
            to: incomingCall.from,
        });
    }

    cleanup();
}

export function endCall() {
    const { activeCallUser, incomingCall } = useCallStore.getState();

    const toId =
        activeCallUser?._id ||
        activeCallUser?.id ||
        incomingCall?.from;

    if (toId) {
        getSocket()?.emit("call:end", {
            to: toId,
        });
    }

    cleanup();
}

export function toggleMute() {
    const track = localStream?.getAudioTracks()?.[0];
    if (!track) return;

    track.enabled = !track.enabled;
    useCallStore.getState().setMuted(!track.enabled);
}

export function toggleCamera() {
    const track = localStream?.getVideoTracks()?.[0];
    if (!track) return;

    track.enabled = !track.enabled;
    useCallStore.getState().setCameraOff(!track.enabled);
}

export function cleanup() {
    localStream?.getTracks()?.forEach((track) => track.stop());
    pc?.close();

    pc = null;
    localStream = null;
    remoteStream = null;
    _onLocalStream = null;
    _onRemoteStream = null;

    useCallStore.getState().resetCall();
}