import { rtdb } from '@/lib/firebase';
import { ref, get, query, orderByChild, startAt, endAt, limitToFirst } from 'firebase/database';

export interface School {
  id: string;
  name: string;
  category: string;
  region: string;
  gender: string;
  programmes: string;
}

export const schoolService = {
  async getAllSchools(): Promise<School[]> {
    const schoolsRef = ref(rtdb, 'schools');
    const snapshot = await get(schoolsRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    }
    return [];
  },

  async searchSchools(term: string): Promise<School[]> {
    if (!term) return [];
    
    // RTDB doesn't support full-text search well, so we fetch and filter 
    // or use a more specific query if possible. 
    // For now, since we have ~1000 schools, fetching them all or using a prefix query works.
    const schoolsRef = ref(rtdb, 'schools');
    const snapshot = await get(schoolsRef);
    
    if (snapshot.exists()) {
      const allSchools: School[] = Object.values(snapshot.val());
      return allSchools.filter(school => 
        school.name.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 10); // Limit to 10 results for performance
    }
    return [];
  }
};
