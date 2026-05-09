import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Grades {
  math: number;
  english: number;
  science: number;
  social: number;
  el1: number;
  el2: number;
}

interface School {
  id: number;
  name: string;
  category: string;
}

interface CalculatorState {
  grades: Grades;
  selectedSchools: School[];
  course: string;
  isPremium: boolean;
  setGrades: (grades: Partial<Grades>) => void;
  setCourse: (course: string) => void;
  setPremium: (status: boolean) => void;
  setSelectedSchools: (schools: School[]) => void;
  reset: () => void;
}

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      grades: {
        math: 1,
        english: 1,
        science: 1,
        social: 1,
        el1: 1,
        el2: 1,
      },
      course: 'General Science',
      isPremium: false,
      selectedSchools: [],
      setGrades: (newGrades) => 
        set((state) => ({ grades: { ...state.grades, ...newGrades } })),
      setCourse: (course) => set({ course }),
      setPremium: (isPremium) => set({ isPremium }),
      setSelectedSchools: (schools) => set({ selectedSchools: schools }),
      reset: () => set({ 
        grades: { math: 1, english: 1, science: 1, social: 1, el1: 1, el2: 1 },
        course: 'General Science',
        isPremium: false,
        selectedSchools: [] 
      }),
    }),
    {
      name: 'chanceshs-calculator-storage',
    }
  )
);
