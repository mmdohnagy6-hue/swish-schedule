
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
  where,
  orderBy
} from 'firebase/firestore';
import { AppData, User, UserRole, DayType, SwapStatus, ScheduleDay, SwapRequest, LeaveRequest, LeaveStatus } from './types';

export class Store {
  subscribeToUsers(callback: (users: User[]) => void) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      callback(users);
    });
  }

  subscribeToSwaps(callback: (swaps: SwapRequest[]) => void) {
    return onSnapshot(collection(db, 'swapRequests'), (snapshot) => {
      const swaps = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SwapRequest));
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

  subscribeToLeaveRequests(callback: (leaves: LeaveRequest[]) => void) {
    const q = query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const leaves = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeaveRequest));
      callback(leaves);
    });
  }

  async getCurrentAppData(): Promise<AppData> {
    const users = await this.getUsers();
    const swapRequests = await this.getSwapRequests();
    const leaveRequestsSnap = await getDocs(collection(db, 'leaveRequests'));
    const leaveRequests = leaveRequestsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeaveRequest));
    
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const schedules: Record<string, Record<string, ScheduleDay>> = {};
    schedulesSnap.docs.forEach(doc => {
      schedules[doc.id] = doc.data() as any;
    });
    return { users, swapRequests, schedules, leaveRequests };
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
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

  async getSwapRequests(): Promise<SwapRequest[]> {
    const snapshot = await getDocs(collection(db, 'swapRequests'));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SwapRequest));
  }

  async addSwapRequest(req: SwapRequest) {
    await setDoc(doc(db, 'swapRequests', req.id), req);
  }

  async updateSwapRequest(id: string, status: SwapStatus) {
    const docRef = doc(db, 'swapRequests', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as SwapRequest;
    await updateDoc(docRef, { status });

    if (status === SwapStatus.APPROVED) {
      const reqSchedule = await this.getSchedule(req.requesterId);
      const targetSchedule = await this.getSchedule(req.targetId);

      const shiftA = reqSchedule[req.requesterDate];
      const shiftB = targetSchedule[req.targetDate];

      const newReqSched = { ...reqSchedule };
      const newTargetSched = { ...targetSchedule };

      if (shiftA) {
        delete newReqSched[req.requesterDate];
        newTargetSched[req.requesterDate] = { ...shiftA, date: req.requesterDate };
      }
      if (shiftB) {
        delete newTargetSched[req.targetDate];
        newReqSched[req.targetDate] = { ...shiftB, date: req.targetDate };
      }

      await setDoc(doc(db, 'schedules', req.requesterId), newReqSched);
      await setDoc(doc(db, 'schedules', req.targetId), newTargetSched);
    }
  }

  async updateBatchDays(userId: string, batch: Record<string, ScheduleDay>) {
    const docRef = doc(db, 'schedules', userId);
    const current = await this.getSchedule(userId);
    const updated = { ...current, ...batch };
    await setDoc(docRef, updated);
  }

  async getSchedule(userId: string): Promise<Record<string, ScheduleDay>> {
    const docRef = doc(db, 'schedules', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as any : {};
  }

  async updateDay(userId: string, date: string, dayData: any) {
    const docRef = doc(db, 'schedules', userId);
    const current = await this.getSchedule(userId);
    current[date] = { ...current[date], ...dayData, date };
    await setDoc(docRef, current);
  }

  async addLeaveRequest(req: LeaveRequest) {
    await setDoc(doc(db, 'leaveRequests', req.id), req);
  }

  async updateLeaveRequestStatus(id: string, status: LeaveStatus) {
    try {
      const docRef = doc(db, 'leaveRequests', id);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        console.error("Leave request not found in DB:", id);
        return false;
      }

      const req = snap.data() as LeaveRequest;
      await updateDoc(docRef, { status: status });
      
      if (status === LeaveStatus.APPROVED) {
        // Fetch current schedule to see if a shift already exists for this day
        const currentSched = await this.getSchedule(req.userId);
        const existingDay = currentSched[req.date];

        const updatePayload: any = {
          type: req.type,
          date: req.date
        };

        // If it's an early leave, we must keep the existing shift data if possible
        if (req.type === DayType.EARLY_LEAVE) {
          updatePayload.minutes = req.earlyLeaveTime ? 0 : updatePayload.minutes;
          // Note: updateDay merges with existing data, so shift is preserved
        }

        await this.updateDay(req.userId, req.date, updatePayload);
      }
      return true;
    } catch (error) {
      console.error("Update status error:", error);
      return false;
    }
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
