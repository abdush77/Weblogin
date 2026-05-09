import { create } from "zustand";

const useGroupStore = create((set) => ({
    groups: [],
    channels: [],
    activeGroup: null,
    groupMessages: {},

    setGroups: (groups) => set({ groups }),
    setChannels: (channels) => set({ channels }),
    setActiveGroup: (group) => set({ activeGroup: group }),

    addGroupMessage: (groupId, msg) =>
        set((state) => ({
            groupMessages: {
                ...state.groupMessages,
                [groupId]: [...(state.groupMessages[groupId] || []), msg],
            },
        })),

    setGroupMessages: (groupId, messages) =>
        set((state) => ({
            groupMessages: {
                ...state.groupMessages,
                [groupId]: messages,
            },
        })),

    updateGroupLastMessage: (groupId, lastMessage) =>
        set((state) => ({
            groups: state.groups.map((g) =>
                (g._id || g.id) === groupId ? { ...g, lastMessage } : g
            ),
            channels: state.channels.map((c) =>
                (c._id || c.id) === groupId ? { ...c, lastMessage } : c
            ),
        })),
}));

export default useGroupStore;
