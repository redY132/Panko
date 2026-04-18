import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { Patient, Room, Schedule, ScheduleUpdate } from '@/types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Not authenticated');
  }
  return uid;
}

function patientsCollection(firestore: Firestore, userId: string) {
  return collection(firestore, 'users', userId, 'patients');
}

function schedulesCollection(firestore: Firestore, userId: string) {
  return collection(firestore, 'users', userId, 'schedules');
}

function mapPatientDoc(id: string, data: DocumentData): Patient {
  return {
    id,
    name: String(data.name ?? ''),
    roomId: String(data.roomId ?? ''),
    faceId: String(data.faceId ?? ''),
    medicines: Array.isArray(data.medicines)
      ? data.medicines.map((m) => String(m))
      : [],
  };
}

function mapScheduleDoc(id: string, data: DocumentData): Schedule {
  const timeRaw = data.time;
  const time =
    typeof timeRaw === 'string'
      ? timeRaw
      : timeRaw?.toDate?.()?.toISOString?.() ?? '';

  return {
    id,
    patientId: String(data.patientId ?? ''),
    medicineId: String(data.medicineId ?? ''),
    time,
    roomId: String(data.roomId ?? ''),
    status: (data.status ?? 'pending') as Schedule['status'],
  };
}

export async function getPatients(userId: string): Promise<Patient[]> {
  const snap = await getDocs(patientsCollection(db, userId));
  return snap.docs.map((d) => mapPatientDoc(d.id, d.data()));
}

export async function addPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
  const userId = requireUid();
  const ref = await addDoc(patientsCollection(db, userId), {
    ...patient,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...patient };
}

export async function getSchedules(userId: string): Promise<Schedule[]> {
  const snap = await getDocs(schedulesCollection(db, userId));
  return snap.docs.map((d) => mapScheduleDoc(d.id, d.data()));
}

export async function createSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
  const userId = requireUid();
  const ref = await addDoc(schedulesCollection(db, userId), {
    ...schedule,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...schedule };
}

export async function updateSchedule(
  scheduleId: string,
  data: ScheduleUpdate,
): Promise<void> {
  const userId = requireUid();
  const ref = doc(db, 'users', userId, 'schedules', scheduleId);
  const payload = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const userId = requireUid();
  const ref = doc(db, 'users', userId, 'schedules', scheduleId);
  await deleteDoc(ref);
}

export async function deletePatient(patientId: string): Promise<void> {
  const userId = requireUid();
  const q = query(schedulesCollection(db, userId), where('patientId', '==', patientId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'users', userId, 'patients', patientId));
}

export async function getRooms(): Promise<Room[]> {
  const snap = await getDocs(collection(db, 'rooms'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.displayName ?? data.name ?? ''),
      polygonCoordinates: Array.isArray(data.polygon) ? data.polygon : [],
    };
  });
}
