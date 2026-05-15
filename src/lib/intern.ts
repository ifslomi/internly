import { db } from './firebase';
import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

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
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Profile image upload is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local',
    );
  }

  const formData = new FormData();
  formData.append('file', file, file.name || `profile_${Date.now()}.jpg`);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', path);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
    throw new Error(err.error?.message || 'Profile image upload failed');
  }

  const data = await response.json();
  return data.secure_url as string;
}
