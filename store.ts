
import { db } from './lib/firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { AppData, User, UserRole, DayType, SwapStatus, ScheduleDay, SwapRequest } from './types';

export class Store {
  // Listeners for real-time updates
  subscribeToUsers(callback: (users: User[]) => void) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      callback(users);
    });
  }

  subscribeToSwaps(callback: (swaps: SwapRequest[]) => void) {
    return onSnapshot(collection(db, 'swapRequests'), (snapshot) => {
      const swaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SwapRequest));
      callback(swaps);
    });
  }

  subscribeToSchedules(callback: (schedules: any) => void) {
    return onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const schedules: any = {};
      snapshot.docs.forEach(doc => {
        schedules[doc.id] = doc.data();
      });
      callback(schedules);
    });
  }

  async getCurrentAppData(): Promise<AppData> {
    const users = await this.getUsers();
    const swapRequests = await this.getSwapRequests();
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const schedules: Record<string, Record<string, ScheduleDay>> = {};
    schedulesSnap.docs.forEach(doc => {
      schedules[doc.id] = doc.data() as any;
    });
    return { users, swapRequests, schedules };
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }
  
  async addUser(user: User) {
    await setDoc(doc(db, 'users', user.id), user);
  }

  async updateUser(user: User) {
    await updateDoc(doc(db, 'users', user.id), { ...user });
  }

  async deleteUser(userId: string) {
    await deleteDoc(doc(db, 'users', userId));
  }

  async getSchedule(userId: string): Promise<Record<string, ScheduleDay>> {
    const docRef = doc(db, 'schedules', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as any : {};
  }

  async updateDay(userId: string, date: string, dayData: any) {
    const docRef = doc(db, 'schedules', userId);
    const current = await this.getSchedule(userId);
    current[date] = { ...dayData, date };
    await setDoc(docRef, current);
  }

  /**
   * Updates multiple days for a user in a single request.
   * Useful for "Apply to Week" functionality to avoid race conditions.
   */
  async updateBatchDays(userId: string, daysMap: Record<string, any>) {
    const docRef = doc(db, 'schedules', userId);
    const current = await this.getSchedule(userId);
    const updated = { ...current, ...daysMap };
    await setDoc(docRef, updated);
  }

  async getSwapRequests(): Promise<SwapRequest[]> {
    const snapshot = await getDocs(collection(db, 'swapRequests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SwapRequest));
  }

  async addSwapRequest(req: SwapRequest) {
    await setDoc(doc(db, 'swapRequests', req.id), req);
  }

  async updateSwapRequest(id: string, status: SwapStatus) {
    const docRef = doc(db, 'swapRequests', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const req = snap.data() as SwapRequest;
      await updateDoc(docRef, { status });
      if (status === SwapStatus.APPROVED) {
        await this.executeSwap(req);
      }
    }
  }

  private async executeSwap(req: SwapRequest) {
    const reqSched = await this.getSchedule(req.requesterId);
    const targetSched = await this.getSchedule(req.targetId);

    const reqDayData = reqSched[req.date] ? JSON.parse(JSON.stringify(reqSched[req.date])) : null;
    const targetDayData = targetSched[req.date] ? JSON.parse(JSON.stringify(targetSched[req.date])) : null;

    if (targetDayData) {
      reqSched[req.date] = { ...targetDayData, date: req.date };
    } else {
      reqSched[req.date] = { id: Math.random().toString(), date: req.date, type: DayType.DAY_OFF };
    }

    if (reqDayData) {
      targetSched[req.date] = { ...reqDayData, date: req.date };
    } else {
      targetSched[req.date] = { id: Math.random().toString(), date: req.date, type: DayType.DAY_OFF };
    }

    await setDoc(doc(db, 'schedules', req.requesterId), reqSched);
    await setDoc(doc(db, 'schedules', req.targetId), targetSched);
  }

  async login(u: string, p: string): Promise<User | null> {
    const q = query(collection(db, 'users'), where('username', '==', u), where('password', '==', p));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
    }
    return null;
  }
}

export const store = new Store();
