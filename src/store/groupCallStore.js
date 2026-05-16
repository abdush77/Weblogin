import { create } from "zustand";

const useGroupCallStore = create((set) => ({
    isInCall: false,
    activeGroupId: null,
    activeGroupName: null,
    participants: [], // { userId, username, stream }
    isMuted: false,
    isCameraOff: false,

    // Tracks active calls in groups (even when not joined)
    // { [groupId]: { callerName, participants: [{userId, username}] } }
    groupActiveCalls: {},

    setGroupCallActive: (groupId, groupName, participants) =>
        set({ isInCall: true, activeGroupId: groupId, activeGroupName: groupName, participants }),

    addParticipant: (userId, username) =>
        set((state) => ({
            participants: state.participants.some((p) => p.userId === userId)
                ? state.participants
                : [...state.participants, { userId, username, stream: null }],
        })),

    removeParticipant: (userId) =>
        set((state) => ({
            participants: state.participants.filter((p) => p.userId !== userId),
        })),

    setParticipantStream: (userId, stream) =>
        set((state) => ({
            participants: state.participants.map((p) =>
                p.userId === userId ? { ...p, stream } : p
            ),
        })),

    setMuted: (isMuted) => set({ isMuted }),
    setCameraOff: (isCameraOff) => set({ isCameraOff }),

    setGroupHasActiveCall: (groupId, callInfo) =>
        set((state) => ({
            groupActiveCalls: { ...state.groupActiveCalls, [groupId]: callInfo },
        })),

    updateGroupActiveCallParticipants: (groupId, participants) =>
        set((state) => ({
            groupActiveCalls: {
                ...state.groupActiveCalls,
                [groupId]: { ...(state.groupActiveCalls[groupId] || {}), participants },
            },
        })),

    removeGroupActiveCall: (groupId) =>
        set((state) => {
            const next = { ...state.groupActiveCalls };
            delete next[groupId];
            return { groupActiveCalls: next };
        }),

    resetGroupCall: () =>
        set({
            isInCall: false,
            activeGroupId: null,
            activeGroupName: null,
            participants: [],
            isMuted: false,
            isCameraOff: false,
        }),
}));

export default useGroupCallStore;
