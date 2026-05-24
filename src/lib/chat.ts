import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    updateDoc,
    arrayRemove,
    arrayUnion,
    limit,
    increment,
    writeBatch,
    deleteField,
} from 'firebase/firestore';
import { db, auth } from './firebase';

// ─── Types ──────────────────────────────────────────────

export interface ChatUser {
    uid: string;
    name: string;
    email: string;
    profileImage?: string;
    online?: boolean;
    lastSeen?: Timestamp;
}

export interface Message {
    id: string;
    senderId: string;
    text?: string;
    imageUrl?: string;
    imageUrls?: string[];
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileAttachments?: {
        fileUrl: string;
        fileName: string;
        fileSize: number;
        fileType: string;
    }[];
    editedAt?: Timestamp;
    isUnsent?: boolean;
    editHistory?: {
        text: string;
        editedAt: Timestamp;
    }[];
    reactions?: Record<string, string>;
    timestamp: Timestamp;
    read: boolean;
    status?: 'sent' | 'delivered' | 'seen';
    readBy?: Record<string, boolean>;
}

export interface Conversation {
    id: string;
    participants: string[];
    participantDetails: Record<string, { name: string; email: string; profileImage?: string }>;
    lastMessage?: string;
    lastMessageTime?: Timestamp;
    lastMessageSenderId?: string;
    unreadCount: Record<string, number>;
    isGroup?: boolean;
    groupName?: string;
    groupAvatar?: string;
    createdBy?: string;
    participantJoinedAt?: Record<string, Timestamp>;
    nicknames?: Record<string, string>;
    typing?: Record<string, Timestamp>;
    lastMessageType?: 'text' | 'attachments' | 'unsent';
    lastAttachmentImageCount?: number;
    lastAttachmentFileCount?: number;
}

function getParticipantSortIdentity(
    participantDetails: Record<string, { name: string; email: string; profileImage?: string }> | undefined,
    uid: string,
) {
    const details = participantDetails?.[uid];
    const name = (details?.name || '').trim();
    const email = (details?.email || '').trim();
    return {
        name,
        email,
        uid: (uid || '').trim(),
    };
}

function pickNextGroupOwner(
    participants: string[],
    participantDetails: Record<string, { name: string; email: string; profileImage?: string }> | undefined,
    participantJoinedAt: Record<string, Timestamp> | undefined,
) {
    const candidates = Array.from(new Set(participants || [])).filter(Boolean);
    if (candidates.length === 0) return '';

    candidates.sort((a, b) => {
        const joinedAtA = participantJoinedAt?.[a]?.toMillis?.() ?? Number.POSITIVE_INFINITY;
        const joinedAtB = participantJoinedAt?.[b]?.toMillis?.() ?? Number.POSITIVE_INFINITY;

        if (joinedAtA !== joinedAtB) return joinedAtA - joinedAtB;

        const identityA = getParticipantSortIdentity(participantDetails, a);
        const identityB = getParticipantSortIdentity(participantDetails, b);

        const nameCompare = identityA.name.localeCompare(identityB.name, undefined, { numeric: true, sensitivity: 'base' });
        if (nameCompare !== 0) return nameCompare;

        const emailCompare = identityA.email.localeCompare(identityB.email, undefined, { numeric: true, sensitivity: 'base' });
        if (emailCompare !== 0) return emailCompare;

        return identityA.uid.localeCompare(identityB.uid, undefined, { numeric: true, sensitivity: 'base' });
    });

    return candidates[0];
}

function summarizeConversationPreview(messageData: {
    text?: string | null;
    imageUrl?: string | null;
    imageUrls?: string[] | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileType?: string | null;
    fileAttachments?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] | null;
    isUnsent?: boolean | null;
}) {
    const imageUrls = (messageData.imageUrls || []).filter(Boolean);
    if (imageUrls.length === 0 && messageData.imageUrl) imageUrls.push(messageData.imageUrl);

    const fileAttachments = (messageData.fileAttachments || []).filter(Boolean) as { fileUrl: string; fileName: string; fileSize: number; fileType: string }[];
    if (fileAttachments.length === 0 && messageData.fileUrl && messageData.fileName) {
        fileAttachments.push({
            fileUrl: messageData.fileUrl,
            fileName: messageData.fileName,
            fileSize: Number(messageData.fileSize || 0),
            fileType: messageData.fileType || 'file',
        });
    }

    if (messageData.isUnsent) {
        return {
            lastMessage: 'Message removed',
            lastMessageType: 'unsent' as const,
            lastAttachmentImageCount: 0,
            lastAttachmentFileCount: 0,
        };
    }

    if (messageData.text && messageData.text.trim().length > 0) {
        return {
            lastMessage: messageData.text.trim(),
            lastMessageType: 'text' as const,
            lastAttachmentImageCount: imageUrls.length,
            lastAttachmentFileCount: fileAttachments.length,
        };
    }

    if (imageUrls.length > 0 || fileAttachments.length > 0) {
        let label = '';
        if (imageUrls.length > 0 && fileAttachments.length > 0) {
            label = `${imageUrls.length} image${imageUrls.length === 1 ? '' : 's'}, ${fileAttachments.length} file${fileAttachments.length === 1 ? '' : 's'}`;
        } else if (imageUrls.length > 0) {
            label = imageUrls.length === 1 ? 'Image attachment' : `${imageUrls.length} image attachments`;
        } else if (fileAttachments.length > 0) {
            label = fileAttachments.length === 1 ? fileAttachments[0].fileName : `${fileAttachments.length} file attachments`;
        }

        return {
            lastMessage: label,
            lastMessageType: 'attachments' as const,
            lastAttachmentImageCount: imageUrls.length,
            lastAttachmentFileCount: fileAttachments.length,
        };
    }

    return {
        lastMessage: '',
        lastMessageType: 'text' as const,
        lastAttachmentImageCount: 0,
        lastAttachmentFileCount: 0,
    };
}

async function refreshConversationPreview(conversationId: string) {
    const latestMessageQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(1),
    );
    const latestSnapshot = await getDocs(latestMessageQuery);

    if (latestSnapshot.empty) {
        await updateDoc(doc(db, 'conversations', conversationId), {
            lastMessage: '',
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: null,
            lastMessageType: 'text',
            lastAttachmentImageCount: 0,
            lastAttachmentFileCount: 0,
        });
        return;
    }

    const latestDoc = latestSnapshot.docs[0];
    const latestData = latestDoc.data() as {
        senderId?: string;
        timestamp?: Timestamp;
        text?: string | null;
        imageUrl?: string | null;
        imageUrls?: string[] | null;
        fileUrl?: string | null;
        fileName?: string | null;
        fileSize?: number | null;
        fileType?: string | null;
        fileAttachments?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] | null;
        isUnsent?: boolean | null;
    };

    const preview = summarizeConversationPreview(latestData);

    await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: preview.lastMessage,
        lastMessageTime: latestData.timestamp || serverTimestamp(),
        lastMessageSenderId: latestData.senderId || null,
        lastMessageType: preview.lastMessageType,
        lastAttachmentImageCount: preview.lastAttachmentImageCount,
        lastAttachmentFileCount: preview.lastAttachmentFileCount,
    });
}

async function updateConversationForLatestMessageActivity(
    conversationId: string,
    messageId: string,
    options?: {
        activitySenderId?: string;
        activityTextOverride?: string;
        activityTypeOverride?: Conversation['lastMessageType'];
    },
) {
    const latestMessageQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(1),
    );
    const latestSnapshot = await getDocs(latestMessageQuery);
    if (latestSnapshot.empty) return;

    const latestDoc = latestSnapshot.docs[0];
    if (latestDoc.id !== messageId) return;

    const latestData = latestDoc.data() as {
        senderId?: string;
        text?: string | null;
        imageUrl?: string | null;
        imageUrls?: string[] | null;
        fileUrl?: string | null;
        fileName?: string | null;
        fileSize?: number | null;
        fileType?: string | null;
        fileAttachments?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] | null;
        isUnsent?: boolean | null;
    };

    const preview = summarizeConversationPreview(latestData);

    await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: options?.activityTextOverride ?? preview.lastMessage,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: options?.activitySenderId ?? (latestData.senderId || null),
        lastMessageType: options?.activityTypeOverride ?? preview.lastMessageType,
        lastAttachmentImageCount: preview.lastAttachmentImageCount,
        lastAttachmentFileCount: preview.lastAttachmentFileCount,
    });
}

// ─── User Profile ───────────────────────────────────────

export async function upsertChatUser(user: ChatUser): Promise<void> {
    // Always use Firebase Auth UID for Firestore operations
    const uid = auth.currentUser?.uid || user.uid;
    const userRef = doc(db, 'chatUsers', uid);
    await setDoc(userRef, {
        uid: uid,
        name: user.name,
        email: user.email,
        nameLower: (user.name || '').trim().toLowerCase(),
        emailLower: (user.email || '').trim().toLowerCase(),
        profileImage: user.profileImage || null,
        online: true,
        lastSeen: serverTimestamp(),
    }, { merge: true });
}

export async function searchChatUsers(
    searchTerm: string,
    options?: { limitCount?: number; excludeUid?: string },
): Promise<ChatUser[]> {
    const normalizedTerm = (searchTerm || '').trim().toLowerCase();
    const limitCount = Math.max(20, Math.min(options?.limitCount ?? 120, 300));
    const excludeUid = options?.excludeUid || auth.currentUser?.uid || '';

    const byUid = new Map<string, ChatUser>();
    const seenEmails = new Set<string>();

    const addDocs = (docs: Array<{ data: () => unknown }>) => {
        for (const d of docs) {
            const raw = d.data() as Partial<ChatUser> & { uid?: string; name?: string; email?: string };
            if (!raw?.uid || raw.uid.startsWith('_schema')) continue;
            if (excludeUid && raw.uid === excludeUid) continue;

            const candidate = {
                uid: raw.uid,
                name: raw.name || 'Unknown',
                email: raw.email || '',
                profileImage: raw.profileImage,
                online: raw.online,
                lastSeen: raw.lastSeen,
            } as ChatUser;

            const normalizedEmail = (candidate.email || '').trim().toLowerCase();
            if (normalizedEmail && seenEmails.has(normalizedEmail)) continue;

            if (!byUid.has(candidate.uid)) {
                byUid.set(candidate.uid, candidate);
                if (normalizedEmail) seenEmails.add(normalizedEmail);
            }
        }
    };

    try {
        if (!normalizedTerm) {
            const seedSnap = await getDocs(query(collection(db, 'chatUsers'), limit(limitCount + 10)));
            addDocs(seedSnap.docs);
        } else {
            const nameQuery = query(
                collection(db, 'chatUsers'),
                where('nameLower', '>=', normalizedTerm),
                where('nameLower', '<=', `${normalizedTerm}\uf8ff`),
                orderBy('nameLower'),
                limit(limitCount),
            );
            const emailQuery = query(
                collection(db, 'chatUsers'),
                where('emailLower', '>=', normalizedTerm),
                where('emailLower', '<=', `${normalizedTerm}\uf8ff`),
                orderBy('emailLower'),
                limit(limitCount),
            );

            const [nameSnap, emailSnap] = await Promise.all([getDocs(nameQuery), getDocs(emailQuery)]);
            addDocs(nameSnap.docs);
            addDocs(emailSnap.docs);

            // Backward-compatible fallback for legacy docs without lower-case index fields.
            if (byUid.size === 0) {
                const fallbackSnap = await getDocs(query(collection(db, 'chatUsers'), limit(300)));
                addDocs(
                    fallbackSnap.docs.filter((docSnap) => {
                        const data = docSnap.data() as { name?: string; email?: string };
                        const name = (data.name || '').toLowerCase();
                        const email = (data.email || '').toLowerCase();
                        return name.includes(normalizedTerm) || email.includes(normalizedTerm);
                    }),
                );
            }
        }
    } catch {
        // Conservative fallback when indexed search is unavailable.
        const fallbackSnap = await getDocs(query(collection(db, 'chatUsers'), limit(300)));
        const filtered = normalizedTerm
            ? fallbackSnap.docs.filter((docSnap) => {
                const data = docSnap.data() as { name?: string; email?: string };
                const name = (data.name || '').toLowerCase();
                const email = (data.email || '').toLowerCase();
                return name.includes(normalizedTerm) || email.includes(normalizedTerm);
            })
            : fallbackSnap.docs;
        addDocs(filtered);
    }

    return Array.from(byUid.values())
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .slice(0, limitCount);
}

export async function getChatUser(uid: string): Promise<ChatUser | null> {
    const snap = await getDoc(doc(db, 'chatUsers', uid));
    if (!snap.exists()) return null;
    return snap.data() as ChatUser;
}

export async function getAllChatUsers(): Promise<ChatUser[]> {
    const snap = await getDocs(collection(db, 'chatUsers'));
    return snap.docs
        .filter(d => !d.id.startsWith('_schema') && d.data().uid)
        .map(d => d.data() as ChatUser);
}

export function subscribeToAllChatUsers(
    callback: (users: ChatUser[]) => void,
    onError?: (error: Error) => void,
) {
    const q = query(collection(db, 'chatUsers'));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs
            .filter(d => !d.id.startsWith('_schema') && d.data().uid)
            .map(d => d.data() as ChatUser);
        callback(users);
    }, (error) => {
        console.error('Chat users subscription error:', error);
        onError?.(error);
    });
}

export async function syncChatUserProfileInConversations(
    uid: string,
    updates: { name?: string; email?: string; profileImage?: string },
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;

    const fields: Record<string, unknown> = {};
    if (updates.name !== undefined) fields[`participantDetails.${effectiveUid}.name`] = updates.name;
    if (updates.email !== undefined) fields[`participantDetails.${effectiveUid}.email`] = updates.email;
    if (updates.profileImage !== undefined) fields[`participantDetails.${effectiveUid}.profileImage`] = updates.profileImage || null;

    if (Object.keys(fields).length === 0) return;

    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', effectiveUid));
    const snap = await getDocs(q);
    if (snap.empty) return;

    let batch = writeBatch(db);
    let ops = 0;

    for (const convo of snap.docs) {
        batch.update(doc(db, 'conversations', convo.id), fields);
        ops += 1;

        if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
        }
    }

    if (ops > 0) {
        await batch.commit();
    }
}

export async function setUserOnlineStatus(uid: string, online: boolean): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;
    const userRef = doc(db, 'chatUsers', effectiveUid);
    await updateDoc(userRef, {
        online,
        lastSeen: serverTimestamp(),
    });
}

// ─── Conversations ──────────────────────────────────────

export async function getOrCreateConversation(
    currentUser: ChatUser,
    otherUser: ChatUser
): Promise<string> {
    // Use Firebase Auth UID to ensure Firestore rules pass
    const currentUid = auth.currentUser?.uid || currentUser.uid;

    // Check if conversation already exists
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUid)
    );
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const participants = Array.isArray(data.participants) ? data.participants : [];
        const isDirectChat = !data.isGroup && participants.length === 2;
        if (isDirectChat && participants.includes(otherUser.uid) && participants.includes(currentUid)) {
            return docSnap.id;
        }
    }

    // Create new conversation
    const conversationRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUid, otherUser.uid],
        participantDetails: {
            [currentUid]: {
                name: currentUser.name,
                email: currentUser.email,
                profileImage: currentUser.profileImage || null,
            },
            [otherUser.uid]: {
                name: otherUser.name,
                email: otherUser.email,
                profileImage: otherUser.profileImage || null,
            },
        },
        lastMessage: null,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
        unreadCount: {
            [currentUid]: 0,
            [otherUser.uid]: 0,
        },
    });

    return conversationRef.id;
}

export function subscribeToConversations(
    uid: string,
    callback: (conversations: Conversation[]) => void,
    onError?: (error: Error) => void,
) {
    const effectiveUid = auth.currentUser?.uid || uid;
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', effectiveUid),
    );

    return onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data({ serverTimestamps: 'estimate' }),
        })) as Conversation[];

        // Sort by lastMessageTime client-side
        conversations.sort((a, b) => {
            const aTime = a.lastMessageTime?.toMillis?.() || 0;
            const bTime = b.lastMessageTime?.toMillis?.() || 0;
            if (bTime !== aTime) return bTime - aTime;
            return a.id.localeCompare(b.id);
        });

        callback(conversations);
    }, (error) => {
        console.error('Conversations subscription error:', error);
        onError?.(error);
    });
}

export async function createGroupConversation(
    currentUser: ChatUser,
    members: ChatUser[],
    groupName: string,
): Promise<string> {
    const currentUid = auth.currentUser?.uid || currentUser.uid;

    // Sanitize members to avoid duplicates and accidental self-inclusion.
    const uniqueMembers = members.filter((member, index, arr) => {
        if (!member?.uid) return false;
        if (member.uid === currentUid) return false;
        return arr.findIndex(m => m.uid === member.uid) === index;
    });

    if (uniqueMembers.length < 2) {
        throw new Error('Select at least 2 other members to create a group');
    }

    const allParticipants = [currentUid, ...uniqueMembers.map(m => m.uid)];
    const participantDetails: Record<string, { name: string; email: string; profileImage?: string }> = {
        [currentUid]: {
            name: currentUser.name,
            email: currentUser.email,
            profileImage: currentUser.profileImage || null as unknown as undefined,
        },
    };
    const unreadCount: Record<string, number> = { [currentUid]: 0 };
    const participantJoinedAt: Record<string, unknown> = { [currentUid]: serverTimestamp() };

    for (const m of uniqueMembers) {
        participantDetails[m.uid] = {
            name: m.name,
            email: m.email,
            profileImage: m.profileImage || null as unknown as undefined,
        };
        unreadCount[m.uid] = 0;
        participantJoinedAt[m.uid] = serverTimestamp();
    }

    const conversationRef = await addDoc(collection(db, 'conversations'), {
        participants: allParticipants,
        participantDetails,
        lastMessage: `${currentUser.name} created the group`,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
        unreadCount,
        participantJoinedAt,
        isGroup: true,
        groupName,
        groupAvatar: null,
        createdBy: currentUid,
    });

    return conversationRef.id;
}

// ─── Messages ───────────────────────────────────────────

export async function sendMessage(
    conversationId: string,
    senderId: string,
    otherUserIds: string | string[],
    text?: string,
    imageUrl?: string,
    fileData?: { fileUrl: string; fileName: string; fileSize: number; fileType: string },
    multiAttachments?: {
        imageUrls?: string[];
        fileAttachments?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[];
    },
): Promise<void> {
    // Use Firebase Auth UID to ensure Firestore rules pass
    const effectiveSenderId = auth.currentUser?.uid || senderId;

    const normalizedImageUrls = multiAttachments?.imageUrls ?? (imageUrl ? [imageUrl] : []);
    const normalizedFileAttachments = multiAttachments?.fileAttachments ?? (fileData ? [fileData] : []);

    // CRITICAL: Add the message — this is the primary operation
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: effectiveSenderId,
        text: text || null,
        // Legacy single-attachment fields for backward compatibility with old clients.
        imageUrl: normalizedImageUrls[0] || null,
        fileUrl: normalizedFileAttachments[0]?.fileUrl || null,
        fileName: normalizedFileAttachments[0]?.fileName || null,
        fileSize: normalizedFileAttachments[0]?.fileSize || null,
        fileType: normalizedFileAttachments[0]?.fileType || null,
        // New stacked attachments fields.
        imageUrls: normalizedImageUrls.length > 0 ? normalizedImageUrls : null,
        fileAttachments: normalizedFileAttachments.length > 0 ? normalizedFileAttachments : null,
        timestamp: serverTimestamp(),
        read: false,
        status: 'sent',
        readBy: { [effectiveSenderId]: true },
    });

    // NON-CRITICAL: Update conversation metadata + unread counts
    // If this fails, the message was still sent — don't throw
    try {
        const ids = Array.isArray(otherUserIds) ? otherUserIds : [otherUserIds];
        const unreadUpdates: Record<string, ReturnType<typeof increment>> = {};
        for (const id of ids) {
            unreadUpdates[`unreadCount.${id}`] = increment(1);
        }

        const preview = summarizeConversationPreview({
            text,
            imageUrls: normalizedImageUrls,
            fileAttachments: normalizedFileAttachments,
            isUnsent: false,
        });

        await updateDoc(doc(db, 'conversations', conversationId), {
            lastMessage: preview.lastMessage,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: effectiveSenderId,
            lastMessageType: preview.lastMessageType,
            lastAttachmentImageCount: preview.lastAttachmentImageCount,
            lastAttachmentFileCount: preview.lastAttachmentFileCount,
            ...unreadUpdates,
            // Clear typing when sending
            [`typing.${effectiveSenderId}`]: deleteField(),
        });
    } catch (err) {
        console.warn('Failed to update conversation metadata (message was still sent):', err);
    }
}

export async function editChatMessage(
    conversationId: string,
    messageId: string,
    newText: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) throw new Error('Message not found');

    const data = messageSnap.data() as Message;
    if (data.senderId !== effectiveUid) throw new Error('You can only edit your own messages');
    if (data.isUnsent) throw new Error('Cannot edit an unsent message');

    const messageTimestampMs = data.timestamp?.toMillis?.();
    if (!messageTimestampMs) throw new Error('Message timestamp unavailable');
    const EDIT_WINDOW_MS = 10 * 60 * 1000;
    if (Date.now() - messageTimestampMs > EDIT_WINDOW_MS) {
        throw new Error('You can only edit messages within 10 minutes');
    }

    const trimmed = newText.trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    const previousText = (data.text || '').trim();
    if (previousText === trimmed) return;

    const editHistory = Array.isArray(data.editHistory) ? [...data.editHistory] : [];
    if (previousText) {
        editHistory.push({ text: previousText, editedAt: Timestamp.now() });
    }

    await updateDoc(messageRef, {
        text: trimmed,
        editedAt: serverTimestamp(),
        editHistory,
    });

    await updateConversationForLatestMessageActivity(conversationId, messageId, {
        activitySenderId: effectiveUid,
        activityTextOverride: `Edited: ${trimmed}`,
        activityTypeOverride: 'text',
    });
}

export async function unsendChatMessage(
    conversationId: string,
    messageId: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) throw new Error('Message not found');

    const data = messageSnap.data() as Message;
    if (data.senderId !== effectiveUid) throw new Error('You can only unsend your own messages');
    if (data.isUnsent) return;

    await updateDoc(messageRef, {
        text: 'This message was removed',
        imageUrl: null,
        imageUrls: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        fileType: null,
        fileAttachments: null,
        isUnsent: true,
        editedAt: serverTimestamp(),
    });

    // Unsend activity should always refresh conversation preview/time,
    // even when unsending an older message.
    await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: 'Unsent a message',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: effectiveUid,
        lastMessageType: 'text',
        lastAttachmentImageCount: 0,
        lastAttachmentFileCount: 0,
    });
}

export async function setMessageReaction(
    conversationId: string,
    messageId: string,
    reaction: string | null,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) throw new Error('Message not found');

    const data = messageSnap.data() as Message;
    if (data.isUnsent) throw new Error('Cannot react to removed message');

    const reactions = { ...(data.reactions || {}) };
    if (reaction) {
        reactions[effectiveUid] = reaction;
    } else {
        delete reactions[effectiveUid];
    }

    await updateDoc(messageRef, {
        reactions,
    });

    const reactionEmojiMap: Record<string, string> = {
        heart: '❤️',
        haha: '😂',
        wow: '😮',
        sad: '😢',
        angry: '😡',
        like: '👍',
    };
    const reactedToOwnMessage = data.senderId === effectiveUid;
    const reactionText = reaction
        ? `Reacted ${reactionEmojiMap[reaction] || '🙂'} to ${reactedToOwnMessage ? 'own message' : 'a message'}`
        : `Removed reaction from ${reactedToOwnMessage ? 'own message' : 'a message'}`;

    // Reaction activity should always bump conversation preview/time,
    // even when reacting to an older message.
    await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: reactionText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: effectiveUid,
        lastMessageType: 'text',
        lastAttachmentImageCount: 0,
        lastAttachmentFileCount: 0,
    });
}

export function subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void,
    onError?: (error: Error) => void,
) {
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(200),
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
        })) as Message[];
        callback(messages);
    }, (error) => {
        console.error('Messages subscription error:', error);
        onError?.(error);
    });
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;
    await updateDoc(doc(db, 'conversations', conversationId), {
        [`unreadCount.${effectiveUid}`]: 0,
    });
}

// Mark all messages in a conversation as seen by this user
export async function markMessagesAsSeen(
    conversationId: string,
    uid: string,
    messages: Message[],
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;
    const batch = writeBatch(db);
    let count = 0;

    for (const msg of messages) {
        if (msg.senderId !== effectiveUid && !msg.readBy?.[effectiveUid]) {
            const msgRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
            batch.update(msgRef, {
                [`readBy.${effectiveUid}`]: true,
                status: 'seen',
            });
            count++;
            if (count >= 400) break; // Firestore batch limit is 500
        }
    }

    if (count > 0) {
        await batch.commit();
    }
}

// ─── Typing Indicator ───────────────────────────────────

export async function setTypingStatus(
    conversationId: string,
    uid: string,
    isTyping: boolean,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;
    try {
        if (isTyping) {
            await updateDoc(doc(db, 'conversations', conversationId), {
                [`typing.${effectiveUid}`]: serverTimestamp(),
            });
        } else {
            await updateDoc(doc(db, 'conversations', conversationId), {
                [`typing.${effectiveUid}`]: deleteField(),
            });
        }
    } catch {
        // Non-critical, ignore errors
    }
}

// ─── Nicknames ──────────────────────────────────────────

// ─── Kick Group Member ──────────────────────────────────

export async function kickGroupMember(
    conversationId: string,
    targetUid: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    if (data.createdBy !== effectiveUid) {
        throw new Error('Only the group owner can kick members');
    }
    if (targetUid === effectiveUid) {
        throw new Error('You cannot kick yourself');
    }
    if (!data.participants?.includes(targetUid)) {
        throw new Error('User is not in this group');
    }

    // Remove from participants array and clean up related fields
    const updates: Record<string, unknown> = {
        participants: arrayRemove(targetUid),
        [`participantDetails.${targetUid}`]: deleteField(),
        [`unreadCount.${targetUid}`]: deleteField(),
        [`nicknames.${targetUid}`]: deleteField(),
        [`typing.${targetUid}`]: deleteField(),
        [`participantJoinedAt.${targetUid}`]: deleteField(),
    };

    await updateDoc(convRef, updates);

    // Send a system message about the kick
    const kickedName = data.participantDetails?.[targetUid]?.name || 'A member';
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: `${kickedName} was removed from the group`,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    // Update last message
    await updateDoc(convRef, {
        lastMessage: `${kickedName} was removed from the group`,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

export async function addGroupMember(
    conversationId: string,
    member: ChatUser,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');
    if (!member?.uid) throw new Error('Member is required');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    if (!data.isGroup) throw new Error('Can only add members to group chats');
    if (data.createdBy !== effectiveUid) {
        throw new Error('Only the group owner can add members');
    }
    const actorEmail = (
        data.participantDetails?.[effectiveUid]?.email ||
        auth.currentUser?.email ||
        ''
    ).trim().toLowerCase();
    const memberEmail = (member.email || '').trim().toLowerCase();
    if (member.uid === effectiveUid || (actorEmail && memberEmail && actorEmail === memberEmail)) {
        throw new Error('You cannot add yourself to this group');
    }
    if (data.participants?.includes(member.uid)) {
        throw new Error('User is already in this group');
    }

    await updateDoc(convRef, {
        participants: arrayUnion(member.uid),
        [`participantDetails.${member.uid}`]: {
            name: member.name || 'Unknown',
            email: member.email || '',
            profileImage: member.profileImage || null,
        },
        [`participantJoinedAt.${member.uid}`]: serverTimestamp(),
        [`unreadCount.${member.uid}`]: 0,
    });

    const addedName = member.name || 'A member';
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: `${addedName} was added to the group`,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    await updateDoc(convRef, {
        lastMessage: `${addedName} was added to the group`,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

export async function setNickname(
    conversationId: string,
    targetUid: string,
    nickname: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    const participantName = (uid: string) => data.participantDetails?.[uid]?.name || 'A member';

    const trimmedNickname = nickname.trim();
    const previousNickname = (data.nicknames?.[targetUid] || '').trim();
    if (trimmedNickname === previousNickname) return;

    if (trimmedNickname) {
        await updateDoc(convRef, {
            [`nicknames.${targetUid}`]: trimmedNickname,
        });
    } else {
        // Remove nickname by setting to empty string (Firestore doesn't support deleting nested fields easily)
        await updateDoc(convRef, {
            [`nicknames.${targetUid}`]: '',
        });
    }

    const actorName = participantName(effectiveUid);
    const targetName = participantName(targetUid);
    const systemText = trimmedNickname
        ? `${actorName} changed ${targetName}'s nickname to "${trimmedNickname}"`
        : `${actorName} removed ${targetName}'s nickname`;

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: systemText,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    await updateDoc(convRef, {
        lastMessage: systemText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

export async function renameGroupConversation(
    conversationId: string,
    nextGroupName: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    if (!data.isGroup) throw new Error('Can only rename group chats');
    if (data.createdBy !== effectiveUid) {
        throw new Error('Only the group owner can rename this group');
    }

    const trimmedName = nextGroupName.trim();
    if (!trimmedName) throw new Error('Group name cannot be empty');

    const currentGroupName = (data.groupName || '').trim();
    if (trimmedName === currentGroupName) return;

    await updateDoc(convRef, {
        groupName: trimmedName,
    });

    const actorName = data.participantDetails?.[effectiveUid]?.name || 'Group admin';
    const systemText = `${actorName} renamed the group to "${trimmedName}"`;

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: systemText,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    await updateDoc(convRef, {
        lastMessage: systemText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

export async function updateGroupConversationAvatar(
    conversationId: string,
    avatarUrl: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    if (!data.isGroup) throw new Error('Can only update group icon for group chats');
    if (data.createdBy !== effectiveUid) {
        throw new Error('Only the group owner can change the group icon');
    }

    const trimmedAvatarUrl = avatarUrl.trim();
    if (!trimmedAvatarUrl) throw new Error('Group icon URL is required');

    await updateDoc(convRef, {
        groupAvatar: trimmedAvatarUrl,
    });

    const actorName = data.participantDetails?.[effectiveUid]?.name || 'Group owner';
    const systemText = `${actorName} changed the group icon`;

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: systemText,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    await updateDoc(convRef, {
        lastMessage: systemText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

export async function transferGroupOwnership(
    conversationId: string,
    nextOwnerUid: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    if (!data.isGroup) throw new Error('Can only transfer ownership in group chats');
    if (data.createdBy !== effectiveUid) throw new Error('Only the group owner can transfer ownership');
    if (!nextOwnerUid || nextOwnerUid === effectiveUid) throw new Error('Choose another member as the next owner');
    if (!data.participants?.includes(nextOwnerUid)) throw new Error('Selected member is not in this group');

    await updateDoc(convRef, {
        createdBy: nextOwnerUid,
    });

    const actorName = data.participantDetails?.[effectiveUid]?.name || 'Group owner';
    const nextOwnerName = data.participantDetails?.[nextOwnerUid]?.name || 'A member';
    const systemText = `${actorName} transferred group ownership to ${nextOwnerName}`;

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: systemText,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    await updateDoc(convRef, {
        lastMessage: systemText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

export async function leaveGroupConversation(
    conversationId: string,
): Promise<void> {
    const effectiveUid = auth.currentUser?.uid;
    if (!effectiveUid) throw new Error('Not authenticated');

    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) throw new Error('Conversation not found');

    const data = convSnap.data();
    const participants = Array.isArray(data.participants)
        ? data.participants.filter((uid: unknown): uid is string => typeof uid === 'string' && uid.trim().length > 0)
        : [];
    if (!data.isGroup) throw new Error('Can only leave group chats');
    if (!participants.includes(effectiveUid)) {
        throw new Error('You are not a member of this group');
    }

    const remainingParticipants = Array.from(new Set(participants.filter((uid) => uid !== effectiveUid)));
    const isCurrentOwner = data.createdBy === effectiveUid;

    const updates: Record<string, unknown> = {
        participants: arrayRemove(effectiveUid),
        [`participantDetails.${effectiveUid}`]: deleteField(),
        [`participantJoinedAt.${effectiveUid}`]: deleteField(),
        [`unreadCount.${effectiveUid}`]: deleteField(),
        [`nicknames.${effectiveUid}`]: deleteField(),
        [`typing.${effectiveUid}`]: deleteField(),
    };

    let nextOwnerUid = '';
    if (isCurrentOwner) {
        nextOwnerUid = pickNextGroupOwner(
            remainingParticipants,
            data.participantDetails,
            data.participantJoinedAt,
        );
        if (nextOwnerUid) {
            updates.createdBy = nextOwnerUid;
        } else {
            updates.createdBy = deleteField();
        }
    }

    await updateDoc(convRef, updates);

    const actorName = data.participantDetails?.[effectiveUid]?.name || 'A member';
    const nextOwnerName = nextOwnerUid ? (data.participantDetails?.[nextOwnerUid]?.name || 'A member') : '';
    const systemText = isCurrentOwner && nextOwnerUid
        ? `${actorName} left the group. ${nextOwnerName} is now the group owner.`
        : `${actorName} left the group`;

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: 'system',
        text: systemText,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read: true,
        status: 'seen',
        readBy: {},
    });

    await updateDoc(convRef, {
        lastMessage: systemText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: null,
    });
}

// ─── File Upload (Cloudinary - free) ────────────────────

export async function uploadChatFile(
    file: File,
): Promise<{ url: string; name: string; size: number; type: string }> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error(
            'File uploads not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local',
        );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData },
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
        throw new Error(err.error?.message || 'File upload failed');
    }

    const data = await response.json();

    return {
        url: data.secure_url,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
    };
}

// ─── Image Upload (Cloudinary - free) ───────────────────

export async function uploadChatImage(
    _conversationId: string,
    file: File | Blob,
): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Image uploads not configured. Add Cloudinary env vars to .env.local');
    }

    const formData = new FormData();
    formData.append('file', file, file instanceof File ? file.name : `image_${Date.now()}.jpg`);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData },
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
        throw new Error(err.error?.message || 'Image upload failed');
    }

    const data = await response.json();
    return data.secure_url;
}
