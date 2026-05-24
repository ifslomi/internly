import { db } from './firebase';
import { doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

const MAX_UPLOAD_IMAGE_DIMENSION = 1920;
const UPLOAD_IMAGE_QUALITY = 0.78;

const isCompressibleImage = (file: File) =>
  file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml';

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image file for compression.'));
    };
    img.src = objectUrl;
  });

async function compressImageForUpload(file: File): Promise<File> {
  if (!isCompressibleImage(file)) return file;

  const image = await loadImageFromFile(file);
  const ratio = Math.min(1, MAX_UPLOAD_IMAGE_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, height);

  const preferredOutput = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, preferredOutput, preferredOutput === 'image/jpeg' ? UPLOAD_IMAGE_QUALITY : undefined);
  });

  if (!blob) return file;
  if (blob.size >= file.size) return file;

  const extension = preferredOutput === 'image/png' ? '.png' : '.jpg';
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName}${extension}`, { type: preferredOutput, lastModified: Date.now() });
}

export async function createOrUpdateInternProfile(internId: string, data: Record<string, unknown>) {
  const refDoc = doc(db, 'interns', internId);
  await setDoc(refDoc, { ...data, updatedAt: Timestamp.now() }, { merge: true });
}

export async function addHoursEntry(internId: string, entry: { date: string; hours: number; source?: string }) {
  const col = collection(db, 'interns', internId, 'hours');
  await addDoc(col, { ...entry, createdAt: Timestamp.now() });
}

export async function addReport(internId: string, report: Record<string, unknown>) {
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

  const optimizedFile = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append('file', optimizedFile, optimizedFile.name || `profile_${Date.now()}.jpg`);
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

export async function uploadEvidenceFile(file: File, path = 'competencies') {
  const result = await uploadEvidenceFileWithMeta(file, path);
  return result.secureUrl;
}

export async function uploadEvidenceFileWithMeta(file: File, path = 'competencies'): Promise<{
  secureUrl: string;
  publicId?: string;
  resourceType?: 'raw' | 'image' | 'video';
}> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Evidence upload is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local',
    );
  }

  const optimizedFile = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append('file', optimizedFile, optimizedFile.name || `evidence_${Date.now()}`);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', path);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
    throw new Error(err.error?.message || 'Evidence upload failed');
  }

  const data = await response.json();
  return {
    secureUrl: data.secure_url as string,
    publicId: (data.public_id as string | undefined) || undefined,
    resourceType: (data.resource_type as 'raw' | 'image' | 'video' | undefined) || undefined,
  };
}
