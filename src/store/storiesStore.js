import { create } from "zustand";

const useStoriesStore = create((set) => ({
    stories: [],
    viewingStory: null,
    viewingUserIndex: 0,
    viewingItemIndex: 0,

    setStories: (stories) => set({ stories }),
    addStory: (story) =>
        set((state) => {
            const existing = state.stories.findIndex(
                (s) => (s.userId || s.user?._id) === (story.userId || story.user?._id)
            );
            if (existing >= 0) {
                const updated = [...state.stories];
                updated[existing] = {
                    ...updated[existing],
                    items: [...(updated[existing].items || []), ...(story.items || [story])],
                };
                return { stories: updated };
            }
            return { stories: [...state.stories, story] };
        }),

    setViewingStory: (story, userIndex = 0, itemIndex = 0) =>
        set({ viewingStory: story, viewingUserIndex: userIndex, viewingItemIndex: itemIndex }),

    closeViewer: () =>
        set({ viewingStory: null, viewingUserIndex: 0, viewingItemIndex: 0 }),

    markStoryViewed: (userId, itemId) =>
        set((state) => ({
            stories: state.stories.map((s) =>
                (s.userId || s.user?._id) === userId
                    ? {
                          ...s,
                          items: (s.items || []).map((item) =>
                              (item._id || item.id) === itemId
                                  ? { ...item, viewed: true }
                                  : item
                          ),
                      }
                    : s
            ),
        })),
}));

export default useStoriesStore;
