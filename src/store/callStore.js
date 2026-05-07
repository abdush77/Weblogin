import { create } from "zustand";

const useCallStore = create((set) => ({
    callStatus: "idle",
    activeCallUser: null,
    incomingCall: null,
    isMuted: false,
    isCameraOff: false,

    setCallStatus: (callStatus) => set({ callStatus }),
    setActiveCallUser: (activeCallUser) => set({ activeCallUser }),
    setIncomingCall: (incomingCall) =>
        set({ incomingCall, callStatus: "ringing" }),
    setMuted: (isMuted) => set({ isMuted }),
    setCameraOff: (isCameraOff) => set({ isCameraOff }),

    resetCall: () =>
        set({
            callStatus: "idle",
            activeCallUser: null,
            incomingCall: null,
            isMuted: false,
            isCameraOff: false,
        }),
}));

export default useCallStore;