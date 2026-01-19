import { create } from 'zustand';

type ViewMode = 'week' | 'month';

interface ScheduleState {
    selectedDate: Date;
    viewMode: ViewMode;
    selectedStoreId: string | null;
    setSelectedDate: (date: Date) => void;
    setViewMode: (mode: ViewMode) => void;
    setSelectedStoreId: (storeId: string | null) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
    selectedDate: new Date(),
    viewMode: 'week',
    selectedStoreId: null,
    setSelectedDate: (date) => set({ selectedDate: date }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSelectedStoreId: (storeId) => set({ selectedStoreId: storeId }),
}));
