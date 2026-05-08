import { db, storage } from './firebase';
import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function createOrUpdateInternProfile(internId: string, data: Record<string, any>) {
  const refDoc = doc(db, 'interns', internId);
  await setDoc(refDoc, { ...data, updatedAt: Timestamp.now() }, { merge: true });
}

export async function addHoursEntry(internId: string, entry: { date: string; hours: number; source?: string }) {
  const col = collection(db, 'interns', internId, 'hours');
  await addDoc(col, { ...entry, createdAt: Timestamp.now() });
}

export async function addReport(internId: string, report: Record<string, any>) {
  const col = collection(db, 'interns', internId, 'reports');
  await addDoc(col, { ...report, createdAt: Timestamp.now() });
}

export async function uploadProfileImage(file: File, path = 'profiles') {
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}
