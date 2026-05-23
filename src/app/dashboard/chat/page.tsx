'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/lib/context';
import {
    ChatUser,
    Conversation,
    Message,
    upsertChatUser,
    searchChatUsers,
    getChatUser,
    getOrCreateConversation,
    createGroupConversation,
    subscribeToConversations,
    subscribeToMessages,
    sendMessage,
    markConversationRead,
    markMessagesAsSeen,
    uploadChatImage,
    uploadChatFile,
    setUserOnlineStatus,
    setNickname,
    setTypingStatus,
    kickGroupMember,
    editChatMessage,
    unsendChatMessage,
    setMessageReaction,
} from '@/lib/chat';
import {
    Search,
    Send,
    Image as ImageIcon,
    ArrowLeft,
    X,
    Mail,
    Clock,
    MessageCircle,
    Users,
    Smile,
    AlertCircle,
    Loader2,
    Plus,
    Check,
    CheckCheck,
    Hash,
    Pencil,
    Crop,
    RotateCw,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    UserMinus,
    Shield,
    FolderOpen,
    Link2,
    FileText,
    ExternalLink,
    Grid3X3,
    MoreVertical,
    Paperclip,
    Download,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Area } from 'react-easy-crop';
import { beginGlobalLoading } from '@/lib/global-loading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Cropper = dynamic(() => import('react-easy-crop').then(mod => mod.default), { ssr: false }) as React.ComponentType<any>;

// ─── Crop helper ────────────────────────────────────────

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const rRad = (rotation * Math.PI) / 180;
    const { width: bW, height: bH } = rotateSize(image.width, image.height, rotation);

    canvas.width = bW;
    canvas.height = bH;

    ctx.translate(bW / 2, bH / 2);
    ctx.rotate(rRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d')!;
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    croppedCtx.drawImage(
        canvas,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height,
    );

    return new Promise((resolve, reject) => {
        croppedCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.92);
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (e) => reject(e));
        img.crossOrigin = 'anonymous';
        img.src = url;
    });
}

function rotateSize(width: number, height: number, rotation: number) {
    const rRad = (rotation * Math.PI) / 180;
    return {
        width: Math.abs(Math.cos(rRad) * width) + Math.abs(Math.sin(rRad) * height),
        height: Math.abs(Math.sin(rRad) * width) + Math.abs(Math.cos(rRad) * height),
    };
}

// ─── Image Editor Modal ─────────────────────────────────

function ImageEditorModal({
    imageSrc,
    onSave,
    onCancel,
    onError,
}: {
    imageSrc: string;
    onSave: (croppedBlob: Blob, previewUrl: string) => void;
    onCancel: () => void;
    onError?: (message: string) => void;
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const [saving, setSaving] = useState(false);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setSaving(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            const url = URL.createObjectURL(blob);
            onSave(blob, url);
        } catch (err) {
            console.error('Crop failed:', err);
            onError?.('Failed to crop image.');
        }
        setSaving(false);
    };

    const aspectOptions: { label: string; value: number | undefined }[] = [
        { label: 'Free', value: undefined },
        { label: '1:1', value: 1 },
        { label: '4:3', value: 4 / 3 },
        { label: '16:9', value: 16 / 9 },
    ];

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '90vw', maxWidth: 600, maxHeight: '90vh',
                    background: 'var(--slate-900)', borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'white' }}>
                        <Crop size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        Edit Image
                    </h3>
                    <button onClick={onCancel} style={{
                        background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer',
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Crop area */}
                <div style={{ position: 'relative', width: '100%', height: 350, background: '#111' }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                    />
                </div>

                {/* Controls */}
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Zoom */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ZoomOut size={16} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
                        <input
                            type="range" min={1} max={3} step={0.05} value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary-500)' }}
                        />
                        <ZoomIn size={16} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
                    </div>

                    {/* Rotation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <RotateCw size={16} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
                        <input
                            type="range" min={0} max={360} step={1} value={rotation}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary-500)' }}
                        />
                        <span style={{ color: 'var(--slate-400)', fontSize: 12, minWidth: 36, textAlign: 'right' }}>
                            {rotation}°
                        </span>
                    </div>

                    {/* Aspect ratio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--slate-400)', fontSize: 12, flexShrink: 0 }}>Ratio:</span>
                        {aspectOptions.map((opt) => (
                            <button
                                key={opt.label}
                                onClick={() => setAspect(opt.value)}
                                style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                                    border: aspect === opt.value ? '1px solid var(--primary-500)' : '1px solid rgba(255,255,255,0.1)',
                                    background: aspect === opt.value ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                                    color: aspect === opt.value ? 'var(--primary-400)' : 'var(--slate-400)',
                                    cursor: 'pointer', transition: 'all 150ms',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'flex-end', gap: 10,
                }}>
                    <button onClick={onCancel} style={{
                        padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: 'var(--slate-300)', cursor: 'pointer', fontSize: 13,
                    }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none',
                        background: 'var(--primary-500)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
                    }}>
                        {saving ? 'Applying…' : 'Apply Crop'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Profile Modal ──────────────────────────────────────

function ProfileModal({ chatUser, onClose }: { chatUser: ChatUser | null; onClose: () => void }) {
    if (!chatUser) return null;

    const initial = (chatUser.name || '?').charAt(0).toUpperCase();
    const isOnline = chatUser.online;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                animation: 'profileFadeIn 0.25s ease-out',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg, rgba(24,24,27,0.97) 0%, rgba(24,24,27,1) 100%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 24,
                    maxWidth: 380,
                    width: '100%',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
                    animation: 'profileSlideIn 0.3s ease-out',
                }}
            >
                {/* Header banner with mesh gradient */}
                <div style={{
                    height: 120,
                    background: 'linear-gradient(135deg, #047857 0%, #059669 30%, #10b981 60%, #34d399 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative circles */}
                    <div style={{
                        position: 'absolute',
                        width: 160,
                        height: 160,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        top: -60,
                        right: -30,
                    }} />
                    <div style={{
                        position: 'absolute',
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        bottom: -40,
                        left: 20,
                    }} />

                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'rgba(0,0,0,0.25)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 200ms',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.45)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Avatar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: -48 }}>
                    <div style={{ position: 'relative' }}>
                        {chatUser.profileImage ? (
                            <img
                                src={chatUser.profileImage}
                                alt={chatUser.name}
                                style={{
                                    width: 96,
                                    height: 96,
                                    borderRadius: '50%',
                                    border: '4px solid rgba(24,24,27,1)',
                                    objectFit: 'cover',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                }}
                            />
                        ) : (
                            <div style={{
                                width: 96,
                                height: 96,
                                borderRadius: '50%',
                                border: '4px solid rgba(24,24,27,1)',
                                background: 'linear-gradient(135deg, #10b981, #22c55e, #34d399)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 36,
                                color: 'white',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                letterSpacing: '-0.02em',
                            }}>
                                {initial}
                            </div>
                        )}
                        {/* Online indicator on avatar */}
                        <div style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: isOnline ? '#22c55e' : '#64748b',
                            border: '3px solid rgba(24,24,27,1)',
                            boxShadow: isOnline ? '0 0 12px rgba(34,197,94,0.5)' : 'none',
                        }} />
                    </div>
                </div>

                {/* Info section */}
                <div style={{ padding: '16px 28px 32px', textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: 'white',
                        marginBottom: 6,
                        letterSpacing: '-0.02em',
                    }}>
                        {chatUser.name}
                    </h2>

                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 14px',
                        borderRadius: 20,
                        background: isOnline ? 'rgba(34,197,94,0.08)' : 'rgba(100,116,139,0.08)',
                        border: `1px solid ${isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)'}`,
                        marginBottom: 24,
                    }}>
                        <div style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: isOnline ? '#22c55e' : '#64748b',
                            boxShadow: isOnline ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                        }} />
                        <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: isOnline ? '#4ade80' : '#94a3b8',
                            letterSpacing: '0.02em',
                        }}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* Info cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '14px 18px',
                            borderRadius: 14,
                            background: 'rgba(16,185,129,0.04)',
                            border: '1px solid rgba(16,185,129,0.08)',
                            transition: 'all 200ms',
                        }}>
                            <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: 'rgba(16,185,129,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Mail size={18} style={{ color: '#6ee7b7' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                                <p style={{ fontSize: 14, color: '#e2e8f0', wordBreak: 'break-all', fontWeight: 500 }}>{chatUser.email}</p>
                            </div>
                        </div>

                        {chatUser.lastSeen && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                padding: '14px 18px',
                                borderRadius: 14,
                                background: 'rgba(52,211,153,0.04)',
                                border: '1px solid rgba(52,211,153,0.08)',
                                transition: 'all 200ms',
                            }}>
                                <div style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: 'rgba(52,211,153,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Clock size={18} style={{ color: '#22d3ee' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: '#64748b', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Seen</p>
                                    <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>
                                        {chatUser.lastSeen?.toDate?.()
                                            ? new Date(chatUser.lastSeen.toDate()).toLocaleString()
                                            : 'Recently'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Send message CTA */}
                    <button
                        onClick={onClose}
                        style={{
                            marginTop: 20,
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'all 200ms',
                            boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.25)';
                        }}
                    >
                        <MessageCircle size={16} />
                        Send Message
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes profileFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes profileSlideIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ─── Image Preview Modal ────────────────────────────────

function ImagePreviewModal({
    images,
    initialIndex,
    onClose,
}: {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}) {
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    useEffect(() => {
        setActiveIndex(initialIndex);
    }, [initialIndex, images]);

    useEffect(() => {
        if (images.length <= 1) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
            } else if (event.key === 'ArrowRight') {
                setActiveIndex((prev) => (prev + 1) % images.length);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length]);

    if (images.length === 0) return null;

    const safeIndex = Math.min(Math.max(activeIndex, 0), images.length - 1);
    const activeImage = images[safeIndex];
    const canNavigate = images.length > 1;

    const goPrev = () => {
        if (!canNavigate) return;
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goNext = () => {
        if (!canNavigate) return;
        setActiveIndex((prev) => (prev + 1) % images.length);
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                cursor: 'zoom-out',
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    maxWidth: '92vw',
                }}
            >
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxWidth: '90vw',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            background: 'rgba(0,0,0,0.48)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: 'white',
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3,
                        }}
                        title="Close"
                    >
                        <X size={18} />
                    </button>

                    {canNavigate && (
                        <button
                            onClick={goPrev}
                            title="Previous image"
                            style={{
                                position: 'absolute',
                                left: 10,
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.45)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 1,
                            }}
                        >
                            <ChevronLeft size={22} />
                        </button>
                    )}

                    <img
                        src={activeImage}
                        alt="Preview"
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '76vh',
                            borderRadius: 12,
                            objectFit: 'contain',
                            cursor: 'default',
                            display: 'block',
                        }}
                    />

                    {canNavigate && (
                        <button
                            onClick={goNext}
                            title="Next image"
                            style={{
                                position: 'absolute',
                                right: 10,
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(0,0,0,0.45)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 1,
                            }}
                        >
                            <ChevronRight size={22} />
                        </button>
                    )}
                </div>

                {canNavigate && (
                    <div style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        maxWidth: '90vw',
                        padding: '4px 2px',
                    }}>
                        {images.map((url, index) => {
                            const isActive = index === safeIndex;
                            return (
                                <button
                                    key={`${url}-${index}`}
                                    onClick={() => setActiveIndex(index)}
                                    title={`Image ${index + 1}`}
                                    style={{
                                        border: isActive ? '2px solid rgba(16,185,129,0.9)' : '1px solid rgba(255,255,255,0.18)',
                                        borderRadius: 10,
                                        padding: 0,
                                        background: 'rgba(255,255,255,0.03)',
                                        cursor: 'pointer',
                                        width: 62,
                                        height: 62,
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        opacity: isActive ? 1 : 0.8,
                                    }}
                                >
                                    <img
                                        src={url}
                                        alt={`Preview ${index + 1}`}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Chat Page ─────────────────────────────────────

export default function ChatPage() {
    const { user } = useApp();
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [chatError, setChatError] = useState<string | null>(null);
    // Auto-dismiss error banner after 8 seconds
    useEffect(() => {
        if (!chatError) return;
        const t = setTimeout(() => setChatError(null), 8000);
        return () => clearTimeout(t);
    }, [chatError]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [userSearchVisibleCount, setUserSearchVisibleCount] = useState(80);
    const [selectedProfile, setSelectedProfile] = useState<ChatUser | null>(null);
    const [previewImage, setPreviewImage] = useState<{ images: string[]; index: number } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [pendingImages, setPendingImages] = useState<{ file: File | Blob; preview: string }[]>([]);
    const [pendingFiles, setPendingFiles] = useState<{ file: File; name: string; size: number; type: string }[]>([]);
    const [uploadHdImages, setUploadHdImages] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingMessageText, setEditingMessageText] = useState('');
    const [savingMessageEdit, setSavingMessageEdit] = useState(false);
    const [unsendingMessageId, setUnsendingMessageId] = useState<string | null>(null);
    const [expandedEditHistoryMessageId, setExpandedEditHistoryMessageId] = useState<string | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
    const [updatingReactionMessageId, setUpdatingReactionMessageId] = useState<string | null>(null);
    const [reactionDetailsMessageId, setReactionDetailsMessageId] = useState<string | null>(null);
    const [showUnsendConfirmModal, setShowUnsendConfirmModal] = useState(false);
    const [pendingUnsendMessage, setPendingUnsendMessage] = useState<Message | null>(null);
    const [rememberUnsendChoice, setRememberUnsendChoice] = useState(false);
    const [skipUnsendConfirm, setSkipUnsendConfirm] = useState(false);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    // Group chat creation state
    const [showGroupCreate, setShowGroupCreate] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<ChatUser[]>([]);
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [groupSearchVisibleCount, setGroupSearchVisibleCount] = useState(80);
    const [creatingGroup, setCreatingGroup] = useState(false);
    // Nickname state
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [nicknameTarget, setNicknameTarget] = useState<string>('');
    const [nicknameValue, setNicknameValue] = useState('');
    const [savingNickname, setSavingNickname] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [kickingUid, setKickingUid] = useState<string | null>(null);
    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [mediaTab, setMediaTab] = useState<'images' | 'files' | 'links'>('images');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const chatMenuRef = React.useRef<HTMLDivElement>(null);

    // ESC key to exit fullscreen
    useEffect(() => {
        if (!isFullscreen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen]);

    // Click-outside to close chat menu
    useEffect(() => {
        if (!showChatMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
                setShowChatMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showChatMenu]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachFileInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);
    const lastTypingWriteRef = useRef<number>(0);
    const sendInFlightRef = useRef(false);
    const previousMessageCountRef = useRef(0);
    const previousConversationIdRef = useRef<string | null>(null);
    const [typingTick, setTypingTick] = useState(0);

    // Always use Firebase Auth UID for chat operations to match Firestore rules
    const currentUserId = firebaseUser?.uid || user?.id || '';

    // Wait for Firebase Auth to restore session before making Firestore calls
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (fbUser) => {
            setFirebaseUser(fbUser);
            setAuthLoading(false);
            if (!fbUser && user) {
                setChatError('Firebase session expired. Please log out and log back in to use chat.');
            }
        });
        return () => unsub();
    }, [user]);

    // Get display name for a user in a conversation (nickname > real name)
    const getDisplayName = useCallback((conv: Conversation, uid: string) => {
        const nickname = conv.nicknames?.[uid];
        if (nickname) return nickname;
        return conv.participantDetails?.[uid]?.name || 'Unknown';
    }, []);

    // Get the other user from a conversation (for 1:1 chats)
    const getOtherUser = useCallback((conv: Conversation) => {
        const otherId = conv.participants.find(p => p !== currentUserId) || '';
        return conv.participantDetails?.[otherId] || { name: 'Unknown', email: '', profileImage: undefined };
    }, [currentUserId]);

    // Get display info for a conversation (works for both 1:1 and group)
    const getConversationDisplay = useCallback((conv: Conversation) => {
        if (conv.isGroup) {
            const uniqueMemberCount = Array.from(new Set(conv.participants || [])).length;
            return {
                name: conv.groupName || 'Unnamed Group',
                avatar: conv.groupAvatar,
                isGroup: true,
                memberCount: uniqueMemberCount,
            };
        }
        const otherId = conv.participants.find(p => p !== currentUserId) || '';
        const other = getOtherUser(conv);
        const displayName = getDisplayName(conv, otherId);
        return {
            name: displayName,
            avatar: other.profileImage,
            isGroup: false,
            memberCount: 2,
        };
    }, [getOtherUser, getDisplayName, currentUserId]);

    // Get sender name from participant details (prefers nickname)
    const getSenderName = useCallback((conv: Conversation, senderId: string) => {
        if (senderId === currentUserId) return 'You';
        return getDisplayName(conv, senderId);
    }, [currentUserId, getDisplayName]);

    // Register current user in Firestore on mount (only after Firebase Auth is ready)
    useEffect(() => {
        if (!user || !firebaseUser) return;
        const fbUid = firebaseUser.uid;
        const chatUser: ChatUser = {
            uid: fbUid,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
        };
        upsertChatUser(chatUser).catch(err => {
            console.error('Failed to register chat user (will retry):', err);
            setTimeout(() => {
                upsertChatUser(chatUser).catch(err2 => {
                    console.error('Retry also failed:', err2);
                });
            }, 2000);
        });

        // Set offline on unmount
        return () => {
            setUserOnlineStatus(fbUid, false).catch(() => {});
        };
    }, [user, firebaseUser]);

    // Debounced server-side user search for scalable user directories.
    useEffect(() => {
        if (!user || !firebaseUser) return;
        if (!showUserSearch && !showGroupCreate) return;

        const myUid = firebaseUser.uid || currentUserId || user.id;
        const activeSearchTerm = showGroupCreate ? groupSearchQuery : searchQuery;
        let cancelled = false;

        setSearchingUsers(true);
        const timer = setTimeout(() => {
            void searchChatUsers(activeSearchTerm, { limitCount: 400, excludeUid: myUid })
                .then((users) => {
                    if (!cancelled) {
                        setAllUsers(users);
                    }
                })
                .catch((err) => {
                    console.error('Failed to search users:', err);
                    if (!cancelled) {
                        setChatError('Failed to load users. Please try again.');
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setSearchingUsers(false);
                    }
                });
        }, 220);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [user, firebaseUser, currentUserId, showUserSearch, showGroupCreate, searchQuery, groupSearchQuery]);

    // Subscribe to conversations (only after Firebase Auth is ready)
    useEffect(() => {
        if (!currentUserId || !firebaseUser) return;
        const unsub = subscribeToConversations(
            currentUserId,
            setConversations,
            (error) => {
                console.error('Conversation error:', error);
                setChatError('Failed to load conversations. Please check Firestore rules allow chat access.');
            }
        );
        return () => unsub();
    }, [currentUserId, firebaseUser]);

    // Subscribe to messages of active conversation
    useEffect(() => {
        if (!activeConversationId || !firebaseUser) {
            setMessages([]);
            return;
        }
        const unsub = subscribeToMessages(
            activeConversationId,
            (msgs) => {
                setMessages(msgs);
                // Mark as read + mark messages as seen
                markConversationRead(activeConversationId, currentUserId).catch(() => {});
                markMessagesAsSeen(activeConversationId, currentUserId, msgs).catch((err) => {
                    console.warn('markMessagesAsSeen failed:', err);
                });
            },
            (error) => {
                console.error('Messages subscription error:', error);
                setChatError('Failed to load messages. Check Firestore rules.');
            }
        );
        return () => unsub();
    }, [activeConversationId, currentUserId, firebaseUser]);

    // Auto-scroll only when a new message is added or conversation changes.
    // This prevents jump-to-bottom on edits/reactions that only modify existing docs.
    useEffect(() => {
        const conversationChanged = previousConversationIdRef.current !== activeConversationId;
        const currentCount = messages.length;
        const hadNewMessage = currentCount > previousMessageCountRef.current;

        if (conversationChanged || hadNewMessage) {
            messagesEndRef.current?.scrollIntoView({ behavior: conversationChanged ? 'auto' : 'smooth' });
        }

        previousConversationIdRef.current = activeConversationId;
        previousMessageCountRef.current = currentCount;
    }, [activeConversationId, messages.length]);

    // Typing indicator: send typing status, refresh every 2s, auto-clear after 3s
    const handleTyping = useCallback(() => {
        if (!activeConversationId || !currentUserId) return;
        const now = Date.now();
        // Write typing status on first keystroke, then refresh every 2s
        if (!isTypingRef.current || (now - lastTypingWriteRef.current > 2000)) {
            isTypingRef.current = true;
            lastTypingWriteRef.current = now;
            setTypingStatus(activeConversationId, currentUserId, true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            lastTypingWriteRef.current = 0;
            setTypingStatus(activeConversationId, currentUserId, false);
        }, 3000);
    }, [activeConversationId, currentUserId]);

    // Clear typing on conversation switch or unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (isTypingRef.current && activeConversationId && currentUserId) {
                setTypingStatus(activeConversationId, currentUserId, false);
                isTypingRef.current = false;
            }
        };
    }, [activeConversationId, currentUserId]);

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const mentionCandidates = React.useMemo(() => {
        if (!activeConversation?.isGroup) return [] as Array<{ uid: string; name: string; email: string }>;

        const uniqueParticipantIds = Array.from(new Set(activeConversation.participants || []));
        return uniqueParticipantIds
            .filter((uid) => uid && uid !== currentUserId)
            .map((uid) => ({
                uid,
                name: getDisplayName(activeConversation, uid),
                email: activeConversation.participantDetails?.[uid]?.email || '',
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [activeConversation, currentUserId, getDisplayName]);

    const mentionSuggestions = React.useMemo(() => {
        if (!mentionCandidates.length) return [];
        const normalizedQuery = mentionQuery.trim().toLowerCase();
        if (!normalizedQuery) return mentionCandidates.slice(0, 6);
        return mentionCandidates
            .filter((candidate) =>
                candidate.name.toLowerCase().includes(normalizedQuery) ||
                candidate.email.toLowerCase().includes(normalizedQuery),
            )
            .slice(0, 6);
    }, [mentionCandidates, mentionQuery]);

    // Periodic tick to re-evaluate stale typing indicators (every 1s when someone is typing)
    useEffect(() => {
        if (!activeConversation?.typing || Object.keys(activeConversation.typing).length === 0) return;
        const iv = setInterval(() => setTypingTick(t => t + 1), 1000);
        return () => clearInterval(iv);
    }, [activeConversation?.typing]);

    // Compute who's typing (other participants)
    const typingUsers = React.useMemo(() => {
        if (!activeConversation?.typing || !currentUserId) return [];
        const now = Date.now();
        return Object.entries(activeConversation.typing)
            .filter(([uid, ts]) => {
                if (uid === currentUserId) return false;
                // Only show if timestamp is within last 8 seconds
                const tsMs = ts?.toMillis?.() || 0;
                return now - tsMs < 8000;
            })
            .map(([uid]) => {
                const details = activeConversation.participantDetails?.[uid];
                const nick = activeConversation.nicknames?.[uid];
                return nick || details?.name || 'Someone';
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversation, currentUserId, typingTick]);

    // ─── Media Gallery: extract images, files, and links from messages ───
    const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

    const galleryImages = React.useMemo(() => {
        const images: { id: string; url: string; senderId: string; senderName: string; timestamp: Message['timestamp'] }[] = [];
        for (const m of messages) {
            const urls = m.imageUrls && m.imageUrls.length > 0
                ? m.imageUrls
                : (m.imageUrl ? [m.imageUrl] : []);

            for (const url of urls) {
                images.push({
                    id: `${m.id}-${url}`,
                    url,
                    senderId: m.senderId,
                    senderName: activeConversation?.participantDetails?.[m.senderId]?.name || 'Unknown',
                    timestamp: m.timestamp,
                });
            }
        }
        return images.reverse(); // newest first
    }, [messages, activeConversation]);

    const galleryLinks = React.useMemo(() => {
        const links: { id: string; url: string; text: string; senderId: string; senderName: string; timestamp: Message['timestamp'] }[] = [];
        for (const m of messages) {
            if (!m.text) continue;
            const matches = m.text.match(URL_REGEX);
            if (matches) {
                for (const url of matches) {
                    const messageImageUrls = m.imageUrls && m.imageUrls.length > 0
                        ? m.imageUrls
                        : (m.imageUrl ? [m.imageUrl] : []);

                    // Skip image hosting URLs that are already shown as image attachments.
                    if (messageImageUrls.includes(url)) continue;
                    links.push({
                        id: `${m.id}-${url}`,
                        url,
                        text: m.text,
                        senderId: m.senderId,
                        senderName: activeConversation?.participantDetails?.[m.senderId]?.name || 'Unknown',
                        timestamp: m.timestamp,
                    });
                }
            }
        }
        return links.reverse(); // newest first
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, activeConversation]);

    const galleryFiles = React.useMemo(() => {
        const files: { id: string; name: string; url: string; type: string; size: number; senderId: string; senderName: string; timestamp: Message['timestamp'] }[] = [];
        for (const m of messages) {
            const attachments = m.fileAttachments && m.fileAttachments.length > 0
                ? m.fileAttachments
                : (m.fileUrl && m.fileName ? [{
                    fileUrl: m.fileUrl,
                    fileName: m.fileName,
                    fileType: m.fileType || 'file',
                    fileSize: m.fileSize || 0,
                }] : []);

            for (const attachment of attachments) {
                files.push({
                    id: `${m.id}-${attachment.fileUrl}`,
                    name: attachment.fileName,
                    url: attachment.fileUrl,
                    type: attachment.fileType || 'file',
                    size: attachment.fileSize || 0,
                    senderId: m.senderId,
                    senderName: activeConversation?.participantDetails?.[m.senderId]?.name || 'Unknown',
                    timestamp: m.timestamp,
                });
            }
        }
        return files.reverse(); // newest first
    }, [messages, activeConversation]);

    // Close media gallery & chat menu when switching conversations
    useEffect(() => {
        setShowMediaGallery(false);
        setShowChatMenu(false);
    }, [activeConversationId]);

    // Focus input when conversation opens & clear pending image
    useEffect(() => {
        if (activeConversationId) {
            setTimeout(() => messageInputRef.current?.focus(), 100);
        }
        // Clear pending images when switching conversations
        setPendingImages(prev => {
            prev.forEach(img => URL.revokeObjectURL(img.preview));
            return [];
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (attachFileInputRef.current) attachFileInputRef.current.value = '';
        setPendingFiles([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversationId]);

    const handleStartConversation = async (otherUser: ChatUser) => {
        if (!user) return;
        const myUid = firebaseUser?.uid || currentUserId || user.id;
        if (!otherUser?.uid || otherUser.uid === myUid) return;
        const endGlobalLoading = beginGlobalLoading();
        try {
            const chatUser: ChatUser = {
                uid: currentUserId || user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            };
            const convId = await getOrCreateConversation(chatUser, otherUser);
            setActiveConversationId(convId);
            setShowUserSearch(false);
            setSearchQuery('');
        } catch (err) {
            console.error('Failed to start conversation:', err);
            setChatError('Failed to start conversation. Check Firestore permissions.');
        } finally {
            endGlobalLoading();
        }
    };

    const handleCreateGroup = async () => {
        if (!user || !groupName.trim()) return;

        const myUid = firebaseUser?.uid || currentUserId || user.id;
        const normalizedMembers = selectedGroupMembers.filter((member, index, arr) => {
            if (!member?.uid) return false;
            if (member.uid === myUid) return false;
            return arr.findIndex(m => m.uid === member.uid) === index;
        });

        if (normalizedMembers.length < 2) {
            setChatError('Select at least 2 other members to create a group.');
            return;
        }

        const endGlobalLoading = beginGlobalLoading();
        setCreatingGroup(true);
        try {
            const chatUser: ChatUser = {
                uid: currentUserId || user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            };
            const convId = await createGroupConversation(chatUser, normalizedMembers, groupName.trim());
            setActiveConversationId(convId);
            setShowGroupCreate(false);
            setShowUserSearch(false);
            setGroupName('');
            setSelectedGroupMembers([]);
            setGroupSearchQuery('');
        } catch (err) {
            console.error('Failed to create group:', err);
            setChatError('Failed to create group. Check Firestore permissions.');
        } finally {
            setCreatingGroup(false);
            endGlobalLoading();
        }
    };

    const toggleGroupMember = (u: ChatUser) => {
        const myUid = firebaseUser?.uid || currentUserId || user?.id || '';
        if (!u?.uid || u.uid === myUid) return;
        setSelectedGroupMembers(prev =>
            prev.find(m => m.uid === u.uid)
                ? prev.filter(m => m.uid !== u.uid)
                : [...prev, u]
        );
    };

    const openNicknameModal = (targetUid: string) => {
        if (!activeConversation) return;
        setNicknameTarget(targetUid);
        setNicknameValue(activeConversation.nicknames?.[targetUid] || '');
        setShowNicknameModal(true);
    };

    const handleSaveNickname = async () => {
        if (!activeConversationId || !nicknameTarget) return;
        const endGlobalLoading = beginGlobalLoading();
        setSavingNickname(true);
        try {
            await setNickname(activeConversationId, nicknameTarget, nicknameValue);
            setShowNicknameModal(false);
        } catch (err) {
            console.error('Failed to set nickname:', err);
            setChatError('Failed to set nickname.');
        } finally {
            setSavingNickname(false);
            endGlobalLoading();
        }
    };

    const clearAllPendingImages = () => {
        pendingImages.forEach(img => URL.revokeObjectURL(img.preview));
        setPendingImages([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const clearAllPendingFiles = () => {
        setPendingFiles([]);
        if (attachFileInputRef.current) attachFileInputRef.current.value = '';
    };

    const removePendingImage = (index: number) => {
        setPendingImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index));
    };

    const insertMention = (candidateName: string) => {
        if (mentionStartIndex === null) return;
        setMessageText((prev) => {
            const before = prev.slice(0, mentionStartIndex);
            const afterRaw = prev.slice(mentionStartIndex);
            const after = afterRaw.replace(/^@[^\s@]*/, '');
            return `${before}@${candidateName} ${after}`;
        });
        setMentionQuery('');
        setMentionStartIndex(null);
        requestAnimationFrame(() => messageInputRef.current?.focus());
    };

    const handleSendMessage = async () => {
        if (sendInFlightRef.current) return;
        const hasText = messageText.trim().length > 0;
        const hasImages = pendingImages.length > 0;
        const hasFiles = pendingFiles.length > 0;
        if ((!hasText && !hasImages && !hasFiles) || !activeConversationId || !activeConversation) return;
        sendInFlightRef.current = true;
        const endGlobalLoading = beginGlobalLoading();
        const text = messageText.trim();
        setMessageText('');
        setMentionQuery('');
        setMentionStartIndex(null);
        setSending(true);
        setChatError(null); // Clear any previous error

        // Clear typing indicator
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
            isTypingRef.current = false;
            setTypingStatus(activeConversationId, currentUserId, false);
        }

        try {
            const otherIds = Array.from(new Set(activeConversation.participants.filter(p => p !== currentUserId)));

            if (hasImages || hasFiles) {
                setUploading(true);
                const uploadedImageUrls: string[] = [];
                const uploadedFileAttachments: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] = [];

                if (hasImages) {
                    for (const img of pendingImages) {
                        const imageBlob = await compressImageForUpload(img.file);
                        const url = await uploadChatImage(activeConversationId, imageBlob);
                        uploadedImageUrls.push(url);
                    }
                }

                if (hasFiles) {
                    for (const pendingFile of pendingFiles) {
                        const result = await uploadChatFile(pendingFile.file);
                        uploadedFileAttachments.push({
                            fileUrl: result.url,
                            fileName: result.name,
                            fileSize: result.size,
                            fileType: result.type,
                        });
                    }
                }

                await sendMessage(
                    activeConversationId,
                    currentUserId,
                    otherIds,
                    text || undefined,
                    undefined,
                    undefined,
                    {
                        imageUrls: uploadedImageUrls,
                        fileAttachments: uploadedFileAttachments,
                    },
                );

                clearAllPendingImages();
                clearAllPendingFiles();
            } else {
                await sendMessage(activeConversationId, currentUserId, otherIds, text);
            }
        } catch (err: unknown) {
            console.error('Failed to send message:', err);
            if (text) setMessageText(text);
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setChatError(`Failed to send message: ${errorMsg}`);
        } finally {
            setUploading(false);
            setSending(false);
            sendInFlightRef.current = false;
            messageInputRef.current?.focus();
            endGlobalLoading();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !activeConversationId || !activeConversation) return;

        const newImages: { file: File; preview: string }[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                setChatError(`"${file.name}" is not an image file. Skipped.`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                setChatError(`"${file.name}" exceeds 5MB. Skipped.`);
                continue;
            }
            newImages.push({ file, preview: URL.createObjectURL(file) });
        }

        if (newImages.length > 0) {
            setPendingImages(prev => [...prev, ...newImages]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        messageInputRef.current?.focus();
    };

    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !activeConversationId || !activeConversation) return;

        const newImages: { file: File; preview: string }[] = [];
        const newFiles: { file: File; name: string; size: number; type: string }[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (file.type.startsWith('image/')) {
                if (file.size > 5 * 1024 * 1024) {
                    setChatError(`"${file.name}" exceeds 5MB. Skipped.`);
                    continue;
                }
                newImages.push({ file, preview: URL.createObjectURL(file) });
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                setChatError(`"${file.name}" exceeds 10 MB. Skipped.`);
                continue;
            }

            newFiles.push({ file, name: file.name, size: file.size, type: file.type || 'application/octet-stream' });
        }

        if (newImages.length > 0) {
            setPendingImages(prev => [...prev, ...newImages]);
        }
        if (newFiles.length > 0) {
            setPendingFiles(prev => [...prev, ...newFiles]);
        }

        if (attachFileInputRef.current) attachFileInputRef.current.value = '';
        messageInputRef.current?.focus();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileExtension = (name: string): string => {
        const ext = name.split('.').pop()?.toUpperCase() || '';
        return ext;
    };

    const compressImageForUpload = async (fileOrBlob: File | Blob): Promise<Blob> => {
        if (uploadHdImages) return fileOrBlob;
        const mimeType = fileOrBlob.type || '';
        if (!mimeType.startsWith('image/')) return fileOrBlob;

        const objectUrl = URL.createObjectURL(fileOrBlob);
        try {
            const image = await createImage(objectUrl);
            const maxDimension = 1920;
            let targetWidth = image.width;
            let targetHeight = image.height;

            if (targetWidth > maxDimension || targetHeight > maxDimension) {
                const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
                targetWidth = Math.round(targetWidth * ratio);
                targetHeight = Math.round(targetHeight * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return fileOrBlob;
            ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

            const compressed = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
            });

            return compressed || fileOrBlob;
        } catch {
            return fileOrBlob;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    };

    const handleViewProfile = async (uid: string) => {
        const endGlobalLoading = beginGlobalLoading();
        try {
            const profile = await getChatUser(uid);
            if (profile) setSelectedProfile(profile);
        } finally {
            endGlobalLoading();
        }
    };

    const selectableUsers = React.useMemo(() => {
        const ownIds = new Set([
            firebaseUser?.uid,
            currentUserId,
            user?.id,
        ].filter(Boolean) as string[]);
        const ownEmail = (user?.email || '').trim().toLowerCase();
        const seen = new Set<string>();
        const seenEmails = new Set<string>();
        return allUsers.filter((u) => {
            if (!u?.uid) return false;
            if (ownIds.has(u.uid)) return false;
            const normalizedEmail = (u.email || '').trim().toLowerCase();
            if (ownEmail && normalizedEmail === ownEmail) return false;
            if (seen.has(u.uid)) return false;
            if (normalizedEmail && seenEmails.has(normalizedEmail)) return false;
            seen.add(u.uid);
            if (normalizedEmail) seenEmails.add(normalizedEmail);
            return true;
        });
    }, [allUsers, currentUserId, firebaseUser, user]);

    const filteredUsers = selectableUsers.filter(u =>
        (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroupUsers = selectableUsers.filter(u =>
        (u.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(groupSearchQuery.toLowerCase())
    );

    const visibleFilteredUsers = filteredUsers.slice(0, userSearchVisibleCount);
    const visibleGroupUsers = filteredGroupUsers.slice(0, groupSearchVisibleCount);

    useEffect(() => {
        setUserSearchVisibleCount(80);
    }, [searchQuery, showUserSearch]);

    useEffect(() => {
        setGroupSearchVisibleCount(80);
    }, [groupSearchQuery, showGroupCreate]);

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.[currentUserId] || 0), 0);

    const formatTime = (timestamp: { toDate?: () => Date } | undefined) => {
        if (!timestamp?.toDate) return '';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };

    const formatMessageTime = (timestamp: { toDate?: () => Date } | undefined) => {
        if (!timestamp?.toDate) return '';
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getConversationPreviewMeta = useCallback((conv: Conversation) => {
        const previewType = conv.lastMessageType;
        const previewText = conv.lastMessage || 'Start chatting...';
        const imageCount = conv.lastAttachmentImageCount || 0;
        const fileCount = conv.lastAttachmentFileCount || 0;

        if (previewType === 'unsent') {
            return { kind: 'unsent' as const, text: previewText };
        }
        if (previewType === 'attachments') {
            if (imageCount > 0 && fileCount > 0) return { kind: 'mixed' as const, text: previewText };
            if (imageCount > 0) return { kind: 'image' as const, text: previewText };
            if (fileCount > 0) return { kind: 'file' as const, text: previewText };
        }

        // Backward compatibility for old preview formats.
        if (previewText.startsWith('[File]')) {
            return { kind: 'file' as const, text: previewText.replace('[File] ', '') };
        }
        if (/image/i.test(previewText)) {
            return { kind: 'image' as const, text: previewText };
        }
        if (/file/i.test(previewText)) {
            return { kind: 'file' as const, text: previewText };
        }

        return { kind: 'text' as const, text: previewText };
    }, []);

    const startEditMessage = (msg: Message) => {
        const messageTimestampMs = msg.timestamp?.toDate?.()?.getTime?.();
        const EDIT_WINDOW_MS = 10 * 60 * 1000;
        if (!messageTimestampMs || Date.now() - messageTimestampMs > EDIT_WINDOW_MS) {
            setChatError('You can only edit messages within 10 minutes.');
            return;
        }
        setEditingMessageId(msg.id);
        setEditingMessageText(msg.text || '');
    };

    const cancelEditMessage = () => {
        setEditingMessageId(null);
        setEditingMessageText('');
    };

    const saveEditMessage = async () => {
        if (!activeConversationId || !editingMessageId || !editingMessageText.trim()) return;
        setSavingMessageEdit(true);
        try {
            await editChatMessage(activeConversationId, editingMessageId, editingMessageText.trim());
            setEditingMessageId(null);
            setEditingMessageText('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to edit message';
            setChatError(message);
        } finally {
            setSavingMessageEdit(false);
        }
    };

    const executeUnsendMessage = async (msg: Message) => {
        if (!activeConversationId || !msg.id) return;
        setUnsendingMessageId(msg.id);
        try {
            await unsendChatMessage(activeConversationId, msg.id);
            if (editingMessageId === msg.id) {
                cancelEditMessage();
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to unsend message';
            setChatError(message);
        } finally {
            setUnsendingMessageId(null);
        }
    };

    const handleUnsendMessage = async (msg: Message) => {
        if (!activeConversationId || !msg.id) return;
        if (skipUnsendConfirm) {
            await executeUnsendMessage(msg);
            return;
        }
        setPendingUnsendMessage(msg);
        setShowUnsendConfirmModal(true);
    };

    const confirmUnsendMessage = async () => {
        if (!pendingUnsendMessage) return;
        if (rememberUnsendChoice) {
            setSkipUnsendConfirm(true);
        }
        setShowUnsendConfirmModal(false);
        const target = pendingUnsendMessage;
        setPendingUnsendMessage(null);
        await executeUnsendMessage(target);
    };

    const cancelUnsendConfirmation = () => {
        setShowUnsendConfirmModal(false);
        setPendingUnsendMessage(null);
    };

    const reactionOptions = [
        { key: 'heart', emoji: '❤️', label: 'Heart' },
        { key: 'haha', emoji: '😂', label: 'Haha' },
        { key: 'wow', emoji: '😮', label: 'Wow' },
        { key: 'sad', emoji: '😢', label: 'Sad' },
        { key: 'angry', emoji: '😡', label: 'Angry' },
        { key: 'like', emoji: '👍', label: 'Like' },
    ] as const;

    const reactionDetailsMessage = reactionDetailsMessageId
        ? (messages.find((message) => message.id === reactionDetailsMessageId) || null)
        : null;
    const reactionDetailsRows = React.useMemo(() => {
        if (!reactionDetailsMessage || !activeConversation) return [] as Array<{ key: string; emoji: string; label: string; names: string[] }>;

        const grouped = new Map<string, string[]>();
        for (const [uid, reactionKey] of Object.entries(reactionDetailsMessage.reactions || {})) {
            const current = grouped.get(reactionKey) || [];
            const name = uid === currentUserId ? 'You' : getDisplayName(activeConversation, uid);
            current.push(name);
            grouped.set(reactionKey, current);
        }

        return reactionOptions
            .filter((reaction) => grouped.has(reaction.key))
            .map((reaction) => ({
                key: reaction.key,
                emoji: reaction.emoji,
                label: reaction.label,
                names: grouped.get(reaction.key) || [],
            }));
    }, [reactionDetailsMessage, activeConversation, currentUserId, getDisplayName]);

    const toggleEditHistoryInline = (messageId: string) => {
        setExpandedEditHistoryMessageId((current) => (current === messageId ? null : messageId));
    };

    const handleReactToMessage = async (msg: Message, reactionKey: string) => {
        if (!activeConversationId || !msg.id || !currentUserId) return;
        const currentReaction = msg.reactions?.[currentUserId] || null;
        const nextReaction = currentReaction === reactionKey ? null : reactionKey;

        setUpdatingReactionMessageId(msg.id);
        try {
            await setMessageReaction(activeConversationId, msg.id, nextReaction);
            setReactionPickerMessageId(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update reaction';
            setChatError(message);
        } finally {
            setUpdatingReactionMessageId(null);
        }
    };

    // ─── RENDER ─────────────────────────────────────────

    // Loading state while Firebase Auth restores session
    if (authLoading) {
        return (
            <div style={{
                display: 'flex',
                height: 'calc(100vh - 40px)',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--slate-950)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={32} style={{ color: 'var(--primary-400)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--slate-400)', fontSize: 14, marginTop: 12 }}>Connecting to chat...</p>
                </div>
            </div>
        );
    }

    // Error state if Firebase Auth is not available
    if (!firebaseUser && user) {
        return (
            <div style={{
                display: 'flex',
                height: 'calc(100vh - 40px)',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--slate-950)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                padding: 40,
            }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 16 }} />
                    <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Chat Unavailable</h3>
                    <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6 }}>
                        Your Firebase session has expired. Please log out and log back in to use the chat feature.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            height: isFullscreen ? '100vh' : 'calc(100vh - 40px)',
            maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 40px)',
            background: 'var(--slate-950)',
            borderRadius: isFullscreen ? 0 : 16,
            overflow: 'hidden',
            border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.06)',
            position: isFullscreen ? 'fixed' : 'relative',
            ...(isFullscreen ? { top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } : {}),
            transition: 'all 200ms ease',
        }}
        className="chat-outer-container"
        >
            {/* Error banner */}
            {chatError && (
                <div style={{
                    position: 'absolute',
                    top: 12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 200,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 12,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    maxWidth: '90%',
                }}>
                    <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <span style={{ color: '#fca5a5', fontSize: 13 }}>{chatError}</span>
                    <button
                        onClick={() => setChatError(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            padding: 2,
                            flexShrink: 0,
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            {/* ─── LEFT PANEL: Conversations List ──────────── */}
            <div
                style={{
                    width: 360,
                    minWidth: 300,
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255,255,255,0.01)',
                }}
                className="chat-left-panel"
            >
                {/* Header */}
                <div style={{
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <MessageCircle size={22} style={{ color: 'var(--primary-400)' }} />
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Messages</h2>
                            {totalUnread > 0 && (
                                <span style={{
                                    background: 'var(--primary-500)',
                                    color: 'white',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                }}>
                                    {totalUnread}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowUserSearch(true)}
                            title="New conversation"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'var(--primary-500)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 150ms',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <Users size={18} />
                        </button>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--slate-500)',
                        }} />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 38px',
                                borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                color: 'white',
                                fontSize: 14,
                                outline: 'none',
                            }}
                        />
                    </div>
                </div>

                {/* User Search Modal / Group Create Modal */}
                {showUserSearch && !showGroupCreate && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 60,
                    }}>
                        <div style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            maxWidth: 400,
                            width: '90%',
                            maxHeight: '60vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>New Conversation</h3>
                                <button
                                    onClick={() => { setShowUserSearch(false); setSearchQuery(''); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--slate-400)',
                                        cursor: 'pointer',
                                        padding: 4,
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Create Group Button */}
                            <button
                                onClick={() => { setShowGroupCreate(true); setSearchQuery(''); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '14px 20px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                    transition: 'background 150ms',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.06)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Users size={18} style={{ color: 'white' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>Create Group Chat</p>
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: 0 }}>Chat with multiple people</p>
                                </div>
                            </button>

                            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{
                                        position: 'absolute',
                                        left: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--slate-500)',
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search users by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 38px',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'white',
                                            fontSize: 14,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                                {searchingUsers && filteredUsers.length === 0 ? (
                                    <div style={{
                                        padding: 40,
                                        textAlign: 'center',
                                        color: 'var(--slate-500)',
                                        fontSize: 14,
                                    }}>
                                        Loading users...
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div style={{
                                        padding: 40,
                                        textAlign: 'center',
                                        color: 'var(--slate-500)',
                                        fontSize: 14,
                                    }}>
                                        {selectableUsers.length === 0 ? 'No other users found.' : 'No users match your search.'}
                                    </div>
                                ) : (
                                    visibleFilteredUsers.map(u => (
                                        <button
                                            key={u.uid}
                                            onClick={() => handleStartConversation(u)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '12px 14px',
                                                borderRadius: 12,
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                transition: 'background 150ms',
                                                textAlign: 'left',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {u.profileImage ? (
                                                <img src={u.profileImage} alt={u.name} style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: 16,
                                                    color: 'white',
                                                    flexShrink: 0,
                                                }}>
                                                    {(u.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>{u.name || 'Unknown'}</p>
                                                <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || ''}</p>
                                            </div>
                                            <div style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: u.online ? '#22c55e' : '#475569',
                                                flexShrink: 0,
                                            }} />
                                        </button>
                                    ))
                                )}
                                {filteredUsers.length > visibleFilteredUsers.length && (
                                    <div style={{ padding: '6px 8px 12px' }}>
                                        <button
                                            onClick={() => setUserSearchVisibleCount((prev) => prev + 80)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.03)',
                                                color: 'var(--slate-300)',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Load more users ({filteredUsers.length - visibleFilteredUsers.length} remaining)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Group Creation Modal */}
                {showGroupCreate && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 40,
                    }}>
                        <div style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            maxWidth: 420,
                            width: '92%',
                            maxHeight: '75vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}>
                                <button
                                    onClick={() => { setShowGroupCreate(false); setGroupName(''); setSelectedGroupMembers([]); setGroupSearchQuery(''); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--slate-400)',
                                        cursor: 'pointer',
                                        padding: 4,
                                    }}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', flex: 1 }}>Create Group Chat</h3>
                                <button
                                    onClick={() => { setShowGroupCreate(false); setShowUserSearch(false); setGroupName(''); setSelectedGroupMembers([]); setGroupSearchQuery(''); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--slate-400)',
                                        cursor: 'pointer',
                                        padding: 4,
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Group Name Input */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Group Name
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Hash size={16} style={{
                                        position: 'absolute',
                                        left: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--slate-500)',
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Enter group name..."
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 38px',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'white',
                                            fontSize: 14,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Selected Members Chips */}
                            {selectedGroupMembers.length > 0 && (
                                <div style={{
                                    padding: '10px 20px',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 6,
                                }}>
                                    {selectedGroupMembers.map(m => (
                                        <span
                                            key={m.uid}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '4px 10px 4px 6px',
                                                borderRadius: 20,
                                                background: 'rgba(16,185,129,0.15)',
                                                border: '1px solid rgba(16,185,129,0.2)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#86efac',
                                            }}
                                        >
                                            {m.profileImage ? (
                                                <img src={m.profileImage} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 9,
                                                    fontWeight: 700,
                                                    color: 'white',
                                                }}>
                                                    {(m.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            {(m.name || 'Unknown').split(' ')[0]}
                                            <button
                                                onClick={() => toggleGroupMember(m)}
                                                style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', padding: 0, display: 'flex' }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Search Members */}
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{
                                        position: 'absolute',
                                        left: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--slate-500)',
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search members to add..."
                                        value={groupSearchQuery}
                                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 38px',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'white',
                                            fontSize: 14,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* User List (selectable) */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                                {searchingUsers && filteredGroupUsers.length === 0 ? (
                                    <div style={{
                                        padding: 28,
                                        textAlign: 'center',
                                        color: 'var(--slate-500)',
                                        fontSize: 13,
                                    }}>
                                        Loading members...
                                    </div>
                                ) : filteredGroupUsers.length === 0 ? (
                                    <div style={{
                                        padding: 28,
                                        textAlign: 'center',
                                        color: 'var(--slate-500)',
                                        fontSize: 13,
                                    }}>
                                        No members found for this search.
                                    </div>
                                ) : (
                                    visibleGroupUsers
                                        .map(u => {
                                            const isSelected = selectedGroupMembers.some(m => m.uid === u.uid);
                                            return (
                                                <button
                                                    key={u.uid}
                                                    onClick={() => toggleGroupMember(u)}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 12,
                                                        padding: '12px 14px',
                                                        borderRadius: 12,
                                                        border: 'none',
                                                        background: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'background 150ms',
                                                        textAlign: 'left',
                                                    }}
                                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    {u.profileImage ? (
                                                        <img src={u.profileImage} alt={u.name} style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: '50%',
                                                            objectFit: 'cover',
                                                        }} />
                                                    ) : (
                                                        <div style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 700,
                                                            fontSize: 16,
                                                            color: 'white',
                                                            flexShrink: 0,
                                                        }}>
                                                            {(u.name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>{u.name || 'Unknown'}</p>
                                                        <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || ''}</p>
                                                    </div>
                                                    <div style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: 6,
                                                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.15)',
                                                        background: isSelected ? 'var(--primary-500)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        transition: 'all 150ms',
                                                    }}>
                                                        {isSelected && <Check size={14} style={{ color: 'white' }} />}
                                                    </div>
                                                </button>
                                            );
                                        })
                                )}
                                {filteredGroupUsers.length > visibleGroupUsers.length && (
                                    <div style={{ padding: '6px 8px 12px' }}>
                                        <button
                                            onClick={() => setGroupSearchVisibleCount((prev) => prev + 80)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.03)',
                                                color: 'var(--slate-300)',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Load more members ({filteredGroupUsers.length - visibleGroupUsers.length} remaining)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Create Button */}
                            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                    onClick={handleCreateGroup}
                                    disabled={!groupName.trim() || selectedGroupMembers.length < 2 || creatingGroup}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: (groupName.trim() && selectedGroupMembers.length >= 2)
                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : 'rgba(255,255,255,0.06)',
                                        color: (groupName.trim() && selectedGroupMembers.length >= 2) ? 'white' : 'var(--slate-500)',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: (groupName.trim() && selectedGroupMembers.length >= 2) ? 'pointer' : 'not-allowed',
                                        transition: 'all 150ms',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                    }}
                                >
                                    {creatingGroup ? (
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        <Users size={16} />
                                    )}
                                    {creatingGroup ? 'Creating...' : `Create Group${selectedGroupMembers.length > 0 ? ` (${selectedGroupMembers.length} members)` : ''}`}
                                </button>
                                {selectedGroupMembers.length < 2 && selectedGroupMembers.length > 0 && (
                                    <p style={{ fontSize: 11, color: 'var(--slate-500)', textAlign: 'center', marginTop: 6 }}>
                                        Select at least 2 members to create a group
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Conversations list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {conversations.length === 0 ? (
                        <div style={{
                            padding: 40,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                background: 'rgba(16,185,129,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <MessageCircle size={24} style={{ color: 'var(--primary-400)' }} />
                            </div>
                            <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>No conversations yet</p>
                            <button
                                onClick={() => setShowUserSearch(true)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    background: 'var(--primary-500)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Start chatting
                            </button>
                        </div>
                    ) : (
                        conversations
                            .filter(c => {
                                if (!searchQuery || showUserSearch) return true;
                                const display = getConversationDisplay(c);
                                if (c.isGroup) {
                                    return (display.name || '').toLowerCase().includes(searchQuery.toLowerCase());
                                }
                                const other = getOtherUser(c);
                                return (other.name || '').toLowerCase().includes(searchQuery.toLowerCase())
                                    || (other.email || '').toLowerCase().includes(searchQuery.toLowerCase());
                            })
                            .map(conv => {
                                const display = getConversationDisplay(conv);
                                const unread = conv.unreadCount?.[currentUserId] || 0;
                                const isActive = conv.id === activeConversationId;
                                const preview = getConversationPreviewMeta(conv);

                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => setActiveConversationId(conv.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '14px',
                                            borderRadius: 12,
                                            border: isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                                            background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 150ms',
                                            textAlign: 'left',
                                            marginBottom: 2,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            {conv.isGroup ? (
                                                <div style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #059669, #ec4899)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Users size={20} style={{ color: 'white' }} />
                                                </div>
                                            ) : display.avatar ? (
                                                <img src={display.avatar} alt={display.name} style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: 18,
                                                    color: 'white',
                                                }}>
                                                    {(display.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginBottom: 4,
                                            }}>
                                                <span style={{
                                                    fontSize: 14,
                                                    fontWeight: unread > 0 ? 700 : 600,
                                                    color: 'white',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    {display.name}
                                                    {conv.isGroup && (
                                                        <span style={{ fontSize: 11, color: 'var(--slate-500)', fontWeight: 400 }}>
                                                            ({display.memberCount})
                                                        </span>
                                                    )}
                                                </span>
                                                <span style={{
                                                    fontSize: 11,
                                                    color: unread > 0 ? 'var(--primary-400)' : 'var(--slate-500)',
                                                    fontWeight: unread > 0 ? 600 : 400,
                                                    flexShrink: 0,
                                                    marginLeft: 8,
                                                }}>
                                                    {formatTime(conv.lastMessageTime)}
                                                </span>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}>
                                                <span style={{
                                                    fontSize: 13,
                                                    color: unread > 0 ? 'var(--slate-300)' : 'var(--slate-500)',
                                                    fontWeight: unread > 0 ? 500 : 400,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '80%',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    {conv.lastMessageSenderId === currentUserId && conv.lastMessage ? 'You: ' : 
                                                     (conv.isGroup && conv.lastMessageSenderId ? `${getSenderName(conv, conv.lastMessageSenderId)}: ` : '')}
                                                    {preview.kind === 'image' && <ImageIcon size={12} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />}
                                                    {preview.kind === 'file' && <FileText size={12} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />}
                                                    {preview.kind === 'mixed' && <Paperclip size={12} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />}
                                                    {preview.kind === 'unsent' && <AlertCircle size={12} style={{ color: 'var(--slate-500)', flexShrink: 0 }} />}
                                                    {preview.text}
                                                </span>
                                                {unread > 0 && (
                                                    <span style={{
                                                        background: 'var(--primary-500)',
                                                        color: 'white',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                    )}
                </div>
            </div>

            {/* ─── RIGHT PANEL: Chat Window ────────────────── */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                }}
                className="chat-right-panel"
            >
                {!activeConversationId ? (
                    // Empty state
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        padding: 40,
                    }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(16,185,129,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <MessageCircle size={36} style={{ color: 'var(--primary-400)', opacity: 0.6 }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Select a conversation</h3>
                        <p style={{ fontSize: 14, color: 'var(--slate-500)', textAlign: 'center', maxWidth: 300 }}>
                            Pick a conversation from the list or start a new one to begin chatting with fellow interns.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: 'rgba(255,255,255,0.01)',
                        }}>
                            <button
                                onClick={() => setActiveConversationId(null)}
                                className="chat-back-btn"
                                style={{
                                    display: 'none',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--slate-400)',
                                    cursor: 'pointer',
                                    padding: 4,
                                }}
                            >
                                <ArrowLeft size={20} />
                            </button>

                            {activeConversation && (() => {
                                const display = getConversationDisplay(activeConversation);
                                if (activeConversation.isGroup) {
                                    return (
                                        <>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #059669, #ec4899)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <Users size={18} style={{ color: 'white' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontSize: 15,
                                                    fontWeight: 700,
                                                    color: 'white',
                                                    margin: 0,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {display.name}
                                                </p>
                                                <p style={{
                                                    fontSize: 12,
                                                    color: 'var(--slate-500)',
                                                    margin: 0,
                                                }}>
                                                    {display.memberCount} members
                                                </p>
                                            </div>
                                        </>
                                    );
                                }
                                const other = getOtherUser(activeConversation);
                                const otherId = activeConversation.participants.find(p => p !== currentUserId) || '';
                                const otherDisplayName = getDisplayName(activeConversation, otherId);
                                const hasNickname = !!(activeConversation.nicknames?.[otherId]);
                                return (
                                    <>
                                        <button
                                            onClick={() => handleViewProfile(otherId)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                flexShrink: 0,
                                            }}
                                            title="View profile"
                                        >
                                            {other.profileImage ? (
                                                <img src={other.profileImage} alt={other.name} style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: 16,
                                                    color: 'white',
                                                }}>
                                                    {(other.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleViewProfile(otherId)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                textAlign: 'left',
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            <p style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: 'white',
                                                margin: 0,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {otherDisplayName}
                                                {hasNickname && (
                                                    <span style={{ fontSize: 11, color: 'var(--slate-500)', fontWeight: 400, marginLeft: 6 }}>
                                                        ({other.name})
                                                    </span>
                                                )}
                                            </p>
                                            <p style={{
                                                fontSize: 12,
                                                color: 'var(--slate-500)',
                                                margin: 0,
                                            }}>
                                                Tap to view profile
                                            </p>
                                        </button>
                                    </>
                                );
                            })()}
                            {/* Chat menu dropdown */}
                            <div ref={chatMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                    onClick={() => setShowChatMenu(m => !m)}
                                    title="Chat options"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 8,
                                        background: showChatMenu ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${showChatMenu ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                        color: showChatMenu ? 'var(--primary-400)' : 'var(--slate-400)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 150ms',
                                        marginLeft: 4,
                                    }}
                                    onMouseEnter={(e) => { if (!showChatMenu) { e.currentTarget.style.color = 'var(--primary-400)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; } }}
                                    onMouseLeave={(e) => { if (!showChatMenu) { e.currentTarget.style.color = 'var(--slate-400)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {showChatMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        background: 'var(--slate-800, #27272a)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 12,
                                        padding: '6px 0',
                                        minWidth: 180,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                        zIndex: 100,
                                    }}>
                                        {/* Nicknames */}
                                        <button
                                            onClick={() => {
                                                setShowChatMenu(false);
                                                if (activeConversation?.isGroup) {
                                                    openNicknameModal('');
                                                } else {
                                                    const otherId = activeConversation?.participants.find(p => p !== currentUserId) || '';
                                                    openNicknameModal(otherId);
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--slate-300)',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                transition: 'background 150ms',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                                        >
                                            <Pencil size={15} style={{ opacity: 0.7 }} />
                                            Nicknames
                                        </button>
                                        {/* Members (group only) */}
                                        {activeConversation?.isGroup && (
                                            <button
                                                onClick={() => { setShowChatMenu(false); setShowMembersModal(true); }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 16px',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--slate-300)',
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    transition: 'background 150ms',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                                            >
                                                <Users size={15} style={{ opacity: 0.7 }} />
                                                Members
                                            </button>
                                        )}
                                        {/* Media gallery */}
                                        <button
                                            onClick={() => { setShowChatMenu(false); setShowMediaGallery(g => !g); setMediaTab('images'); }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                background: 'none',
                                                border: 'none',
                                                color: showMediaGallery ? 'var(--primary-400)' : 'var(--slate-300)',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                transition: 'background 150ms',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                                        >
                                            <Grid3X3 size={15} style={{ opacity: 0.7 }} />
                                            Media
                                        </button>
                                        {/* Divider */}
                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                        {/* Fullscreen */}
                                        <button
                                            onClick={() => { setShowChatMenu(false); setIsFullscreen(f => !f); }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--slate-300)',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                transition: 'background 150ms',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                                        >
                                            {isFullscreen ? <Minimize2 size={15} style={{ opacity: 0.7 }} /> : <Maximize2 size={15} style={{ opacity: 0.7 }} />}
                                            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages area */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                            className="chat-messages-area"
                        >
                            {messages.length === 0 && (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Smile size={32} style={{ color: 'var(--slate-600)', marginBottom: 8 }} />
                                        <p style={{ color: 'var(--slate-500)', fontSize: 14 }}>
                                            Say hello! Send the first message.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => {
                                const isMine = msg.senderId === currentUserId;
                                const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                                const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId;
                                const isGroup = activeConversation?.isGroup;
                                const senderDetails = activeConversation?.participantDetails?.[msg.senderId];
                                const isEditingThisMessage = editingMessageId === msg.id;
                                const messageTimestampMs = msg.timestamp?.toDate?.()?.getTime?.() || 0;
                                const canEditByTime = Date.now() - messageTimestampMs <= 10 * 60 * 1000;
                                const isHistoryExpanded = expandedEditHistoryMessageId === msg.id;
                                const messageReactionEntries = Object.entries(msg.reactions || {});
                                const reactionCounts = messageReactionEntries.reduce<Record<string, number>>((acc, [, reactionKey]) => {
                                    acc[reactionKey] = (acc[reactionKey] || 0) + 1;
                                    return acc;
                                }, {});
                                const totalReactions = messageReactionEntries.length;
                                const reactionEmojiPreview = reactionOptions
                                    .filter((reaction) => reactionCounts[reaction.key] > 0)
                                    .map((reaction) => reaction.emoji)
                                    .slice(0, 3);
                                const myReaction = currentUserId ? (msg.reactions?.[currentUserId] || null) : null;
                                const actionPanelOnLeft = isMine;
                                const pickerOnRight = !isMine;
                                const messageImageUrls = msg.imageUrls && msg.imageUrls.length > 0
                                    ? msg.imageUrls
                                    : (msg.imageUrl ? [msg.imageUrl] : []);
                                const messageFileAttachments = msg.fileAttachments && msg.fileAttachments.length > 0
                                    ? msg.fileAttachments
                                    : (msg.fileUrl && msg.fileName
                                        ? [{
                                            fileUrl: msg.fileUrl,
                                            fileName: msg.fileName,
                                            fileSize: msg.fileSize || 0,
                                            fileType: msg.fileType || 'file',
                                        }]
                                        : []);

                                return (
                                    <div
                                        key={msg.id}
                                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                                        onMouseLeave={() => setHoveredMessageId(current => (current === msg.id ? null : current))}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                                            gap: 8,
                                            marginTop: showAvatar ? 12 : 0,
                                        }}
                                    >
                                        {/* Other user avatar */}
                                        {!isMine && showAvatar && activeConversation && (() => {
                                            const sender = isGroup
                                                ? (senderDetails || { name: 'Unknown', profileImage: undefined })
                                                : getOtherUser(activeConversation);
                                            return sender.profileImage ? (
                                                <img src={sender.profileImage} alt="" style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    flexShrink: 0,
                                                    marginTop: 2,
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                    color: 'white',
                                                    flexShrink: 0,
                                                    marginTop: 2,
                                                }}>
                                                    {(sender.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            );
                                        })()}
                                        {!isMine && !showAvatar && <div style={{ width: 28, flexShrink: 0 }} />}

                                        <div style={{ maxWidth: '70%', position: 'relative' }}>
                                            {/* Sender name for group chats */}
                                            {isGroup && !isMine && showAvatar && (
                                                <p style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: '#86efac',
                                                    marginBottom: 3,
                                                    paddingLeft: 4,
                                                }}>
                                                    {activeConversation ? getDisplayName(activeConversation, msg.senderId) : 'Unknown'}
                                                </p>
                                            )}

                                            <div style={{
                                                position: 'relative',
                                                width: 'fit-content',
                                                maxWidth: '100%',
                                                paddingBottom: !msg.isUnsent && totalReactions > 0 ? 18 : 0,
                                            }}>
                                            {!msg.isUnsent && !isEditingThisMessage && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        [actionPanelOnLeft ? 'right' : 'left']: '100%',
                                                        top: '50%',
                                                        [actionPanelOnLeft ? 'marginRight' : 'marginLeft']: 10,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        opacity: hoveredMessageId === msg.id ? 1 : 0,
                                                        pointerEvents: hoveredMessageId === msg.id ? 'auto' : 'none',
                                                        transform: hoveredMessageId === msg.id
                                                            ? 'translate(0, -50%)'
                                                            : (actionPanelOnLeft ? 'translate(6px, -50%)' : 'translate(-6px, -50%)'),
                                                        transition: 'opacity 150ms ease, transform 150ms ease',
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            if (totalReactions > 0) {
                                                                setReactionDetailsMessageId(msg.id);
                                                                return;
                                                            }
                                                            setReactionPickerMessageId((current) => (current === msg.id ? null : msg.id));
                                                        }}
                                                        style={{
                                                            fontSize: 11,
                                                            color: 'var(--slate-500)',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                        title={totalReactions > 0 ? 'View reactions' : 'React'}
                                                    >
                                                        <Smile size={11} /> {totalReactions > 0 ? 'Reactions' : 'React'}
                                                    </button>
                                                    {isMine && msg.text && canEditByTime && (
                                                        <button
                                                            onClick={() => startEditMessage(msg)}
                                                            style={{
                                                                fontSize: 11,
                                                                color: 'var(--slate-500)',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: 0,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            <Pencil size={11} /> Edit
                                                        </button>
                                                    )}
                                                    {isMine && (
                                                        <button
                                                            onClick={() => void handleUnsendMessage(msg)}
                                                            disabled={unsendingMessageId === msg.id}
                                                            style={{
                                                                fontSize: 11,
                                                                color: '#fca5a5',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: unsendingMessageId === msg.id ? 'not-allowed' : 'pointer',
                                                                padding: 0,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                opacity: unsendingMessageId === msg.id ? 0.65 : 1,
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            <Trash2 size={11} /> {unsendingMessageId === msg.id ? 'Unsending...' : 'Unsend'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {reactionPickerMessageId === msg.id && !msg.isUnsent && totalReactions === 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    [pickerOnRight ? 'left' : 'right']: '100%',
                                                    top: '50%',
                                                    [pickerOnRight ? 'marginLeft' : 'marginRight']: 10,
                                                    transform: 'translateY(calc(-50% + 28px))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '6px 8px',
                                                    borderRadius: 999,
                                                    border: '1px solid rgba(255,255,255,0.14)',
                                                    background: 'rgba(24,24,27,0.96)',
                                                    zIndex: 5,
                                                }}>
                                                    {reactionOptions.map((reaction) => (
                                                        <button
                                                            key={`${msg.id}-${reaction.key}`}
                                                            onClick={() => void handleReactToMessage(msg, reaction.key)}
                                                            disabled={updatingReactionMessageId === msg.id}
                                                            title={reaction.label}
                                                            style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '50%',
                                                                border: myReaction === reaction.key ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.08)',
                                                                background: myReaction === reaction.key ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: updatingReactionMessageId === msg.id ? 'not-allowed' : 'pointer',
                                                                opacity: updatingReactionMessageId === msg.id ? 0.7 : 1,
                                                                fontSize: 14,
                                                                padding: 0,
                                                            }}
                                                        >
                                                            {reaction.emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Stacked image attachments */}
                                            {messageImageUrls.length > 0 && (
                                                <div style={{ marginBottom: (messageFileAttachments.length > 0 || msg.text) ? 6 : 0 }}>
                                                    {messageImageUrls.length > 1 ? (
                                                        <div style={{ display: 'grid', gap: 6 }}>
                                                            <p style={{
                                                                margin: 0,
                                                                fontSize: 11,
                                                                color: isMine ? 'rgba(255,255,255,0.75)' : 'var(--slate-500)',
                                                                textAlign: isMine ? 'right' : 'left',
                                                                fontWeight: 600,
                                                            }}>
                                                                {isMine ? 'You sent' : 'Sent'} {messageImageUrls.length} photo{messageImageUrls.length === 1 ? '' : 's'}
                                                            </p>
                                                            <div
                                                                onClick={() => setPreviewImage({ images: messageImageUrls, index: 0 })}
                                                                style={{
                                                                    position: 'relative',
                                                                    width: 260,
                                                                    height: 190,
                                                                    cursor: 'zoom-in',
                                                                }}
                                                            >
                                                                {[...messageImageUrls].slice(0, 3).reverse().map((imageUrl, stackIndex, arr) => {
                                                                    const visualIndex = arr.length - 1 - stackIndex;
                                                                    const offset = visualIndex * 10;
                                                                    const isTop = visualIndex === 0;
                                                                    return (
                                                                        <div
                                                                            key={`${msg.id}-stack-${stackIndex}`}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                inset: 0,
                                                                                transform: `translateY(${offset}px) scale(${1 - visualIndex * 0.03}) rotate(${isMine ? visualIndex * 1.2 : -visualIndex * 1.2}deg)`,
                                                                                borderRadius: 16,
                                                                                overflow: 'hidden',
                                                                                border: `2px solid ${isMine ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}`,
                                                                                background: '#0b0b0f',
                                                                                boxShadow: isTop ? '0 8px 20px rgba(0,0,0,0.35)' : '0 3px 10px rgba(0,0,0,0.22)',
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={imageUrl}
                                                                                alt="Shared image"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '100%',
                                                                                    objectFit: 'cover',
                                                                                    display: 'block',
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}

                                                                {messageImageUrls.length > 3 && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        right: 10,
                                                                        top: 10,
                                                                        padding: '4px 8px',
                                                                        borderRadius: 999,
                                                                        background: 'rgba(0,0,0,0.6)',
                                                                        color: 'white',
                                                                        fontSize: 12,
                                                                        fontWeight: 700,
                                                                        border: '1px solid rgba(255,255,255,0.16)',
                                                                    }}>
                                                                        +{messageImageUrls.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => setPreviewImage({ images: messageImageUrls, index: 0 })}
                                                            style={{
                                                                cursor: 'zoom-in',
                                                                borderRadius: 16,
                                                                overflow: 'hidden',
                                                                border: `2px solid ${isMine ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                                maxWidth: 260,
                                                            }}
                                                        >
                                                            <img
                                                                src={messageImageUrls[0]}
                                                                alt="Shared image"
                                                                style={{
                                                                    maxWidth: 260,
                                                                    maxHeight: 300,
                                                                    display: 'block',
                                                                    borderRadius: 14,
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Stacked file attachments */}
                                            {messageFileAttachments.length > 0 && (
                                                <div style={{ display: 'grid', gap: 6, marginBottom: msg.text ? 6 : 0 }}>
                                                    {messageFileAttachments.map((attachment, fileIndex) => (
                                                        <a
                                                            key={`${msg.id}-file-${fileIndex}`}
                                                            href={attachment.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 10,
                                                                padding: '10px 14px',
                                                                borderRadius: 14,
                                                                background: isMine
                                                                    ? 'rgba(255,255,255,0.12)'
                                                                    : 'rgba(255,255,255,0.06)',
                                                                border: `1px solid ${isMine ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                                                                textDecoration: 'none',
                                                                maxWidth: 260,
                                                                cursor: 'pointer',
                                                                transition: 'all 150ms',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = isMine ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = isMine ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'; }}
                                                        >
                                                            <div style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 8,
                                                                background: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(16,185,129,0.15)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                            }}>
                                                                <FileText size={18} style={{ color: isMine ? 'white' : 'var(--primary-400)' }} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p style={{
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    color: 'white',
                                                                    margin: 0,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    {attachment.fileName}
                                                                </p>
                                                                <p style={{
                                                                    fontSize: 10,
                                                                    color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--slate-500)',
                                                                    margin: 0,
                                                                    marginTop: 1,
                                                                }}>
                                                                    {attachment.fileSize ? formatFileSize(attachment.fileSize) : ''}{attachment.fileType ? ` · ${getFileExtension(attachment.fileName)}` : ''}
                                                                </p>
                                                            </div>
                                                            <Download size={14} style={{ color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--slate-500)', flexShrink: 0 }} />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Text message */}
                                            {isEditingThisMessage ? (
                                                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                                                    <input
                                                        value={editingMessageText}
                                                        onChange={(e) => setEditingMessageText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                void saveEditMessage();
                                                            }
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                cancelEditMessage();
                                                            }
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            borderRadius: 10,
                                                            border: '1px solid rgba(255,255,255,0.14)',
                                                            background: 'rgba(255,255,255,0.08)',
                                                            color: 'white',
                                                            fontSize: 13,
                                                            outline: 'none',
                                                        }}
                                                        autoFocus
                                                    />
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={cancelEditMessage}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 8,
                                                                border: '1px solid rgba(255,255,255,0.12)',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                color: 'var(--slate-300)',
                                                                fontSize: 11,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => void saveEditMessage()}
                                                            disabled={savingMessageEdit || !editingMessageText.trim()}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 8,
                                                                border: 'none',
                                                                background: 'var(--primary-500)',
                                                                color: 'white',
                                                                fontSize: 11,
                                                                cursor: savingMessageEdit ? 'not-allowed' : 'pointer',
                                                                opacity: savingMessageEdit ? 0.7 : 1,
                                                            }}
                                                        >
                                                            {savingMessageEdit ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : msg.text && (
                                                <div style={{
                                                    padding: '10px 16px',
                                                    borderRadius: isMine
                                                        ? (isLastInGroup ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                                                        : (isLastInGroup ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                                                    background: isMine
                                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                                        : 'rgba(255,255,255,0.06)',
                                                    color: 'white',
                                                    fontSize: 14,
                                                    lineHeight: 1.5,
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'anywhere',
                                                    whiteSpace: 'pre-wrap',
                                                    fontStyle: msg.isUnsent ? 'italic' : 'normal',
                                                    opacity: msg.isUnsent ? 0.82 : 1,
                                                }}>
                                                    {msg.text}
                                                </div>
                                            )}

                                            {!msg.isUnsent && totalReactions > 0 && (
                                                <button
                                                    onClick={() => setReactionDetailsMessageId(msg.id)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: 6,
                                                        bottom: 6,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '2px 7px',
                                                        borderRadius: 999,
                                                        border: myReaction ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.14)',
                                                        background: 'rgba(24,24,27,0.96)',
                                                        color: 'white',
                                                        fontSize: 11,
                                                        cursor: 'pointer',
                                                        zIndex: 3,
                                                    }}
                                                    title="View reactions"
                                                >
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, lineHeight: 1 }}>
                                                        {reactionEmojiPreview.map((emoji, reactionIdx) => (
                                                            <span
                                                                key={`${msg.id}-chip-emoji-${reactionIdx}`}
                                                                style={{ fontSize: 13, marginLeft: reactionIdx === 0 ? 0 : -2 }}
                                                            >
                                                                {emoji}
                                                            </span>
                                                        ))}
                                                    </span>
                                                    {totalReactions > 1 && <span style={{ fontSize: 11 }}>{totalReactions}</span>}
                                                </button>
                                            )}

                                            </div>

                                            {msg.editedAt && !msg.isUnsent && !isEditingThisMessage && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                                                    marginTop: 4,
                                                    paddingLeft: isMine ? 0 : 4,
                                                    paddingRight: isMine ? 4 : 0,
                                                }}>
                                                    <button
                                                        onClick={() => toggleEditHistoryInline(msg.id)}
                                                        style={{
                                                            fontSize: 10,
                                                            color: 'var(--slate-500)',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            textDecoration: 'underline',
                                                            textUnderlineOffset: 2,
                                                        }}
                                                        title="View edit history"
                                                    >
                                                        {isHistoryExpanded ? 'Hide edits' : 'Edited'}
                                                    </button>
                                                </div>
                                            )}

                                            {isHistoryExpanded && !msg.isUnsent && (
                                                <div style={{
                                                    marginTop: 6,
                                                    display: 'grid',
                                                    gap: 6,
                                                    justifyItems: isMine ? 'end' : 'start',
                                                }}>
                                                    {Array.isArray(msg.editHistory) && msg.editHistory.length > 0 ? (
                                                        [...msg.editHistory].reverse().map((item, index) => (
                                                            <div key={`${msg.id}-inline-history-${index}`} style={{
                                                                width: 'fit-content',
                                                                maxWidth: 300,
                                                                borderRadius: 12,
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                padding: '8px 12px',
                                                            }}>
                                                                <p style={{ margin: 0, fontSize: 10, color: 'var(--slate-500)', fontWeight: 600 }}>
                                                                    Previous version {msg.editHistory ? msg.editHistory.length - index : ''}
                                                                </p>
                                                                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--slate-300)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                                                    {item.text}
                                                                </p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p style={{ margin: 0, fontSize: 11, color: 'var(--slate-500)' }}>No previous versions recorded.</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Timestamp + Status */}
                                            {isLastInGroup && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                                                    gap: 4,
                                                    marginTop: 4,
                                                    paddingLeft: isMine ? 0 : 4,
                                                    paddingRight: isMine ? 4 : 0,
                                                }}>
                                                    <span style={{ fontSize: 10, color: 'var(--slate-600)' }}>
                                                        {formatMessageTime(msg.timestamp)}
                                                    </span>
                                                    {isMine && (() => {
                                                        if (!activeConversation) return null;
                                                        const status = msg.status || (msg.read ? 'seen' : 'sent');
                                                        const otherParticipants = Array.from(new Set(activeConversation?.participants.filter(p => p !== currentUserId) || []));
                                                        const allSeen = otherParticipants.every(p => msg.readBy?.[p]);
                                                        const effectiveStatus = allSeen ? 'seen' : status;
                                                        const seenByIds = otherParticipants.filter((uid) => msg.readBy?.[uid]);
                                                        const seenByNames = seenByIds
                                                            .map((uid) => getDisplayName(activeConversation, uid))
                                                            .filter(Boolean);
                                                        const seenSummary = seenByNames.length > 2
                                                            ? `${seenByNames.slice(0, 2).join(', ')} +${seenByNames.length - 2}`
                                                            : seenByNames.join(', ');

                                                        return (
                                                            <>
                                                                {effectiveStatus === 'seen' ? (
                                                                    <CheckCheck size={14} style={{ color: '#34d399' }} />
                                                                ) : effectiveStatus === 'delivered' ? (
                                                                    <CheckCheck size={14} style={{ color: 'var(--slate-500)' }} />
                                                                ) : (
                                                                    <Check size={14} style={{ color: 'var(--slate-500)' }} />
                                                                )}
                                                                {activeConversation?.isGroup && seenByNames.length > 0 && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: 'var(--slate-500)',
                                                                            maxWidth: 180,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                        title={`Seen by ${seenByNames.join(', ')}`}
                                                                    >
                                                                        Seen by {seenSummary}
                                                                    </span>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Typing indicator */}
                            {typingUsers.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '4px 0 8px 36px',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: 3,
                                        padding: '8px 14px',
                                        borderRadius: '18px 18px 18px 4px',
                                        background: 'rgba(255,255,255,0.06)',
                                    }}>
                                        <span className="typing-dot" style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: 'var(--slate-400)',
                                            animation: 'typingBounce 1.4s ease-in-out infinite',
                                            animationDelay: '0ms',
                                        }} />
                                        <span className="typing-dot" style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: 'var(--slate-400)',
                                            animation: 'typingBounce 1.4s ease-in-out infinite',
                                            animationDelay: '200ms',
                                        }} />
                                        <span className="typing-dot" style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: 'var(--slate-400)',
                                            animation: 'typingBounce 1.4s ease-in-out infinite',
                                            animationDelay: '400ms',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                                        {typingUsers.length === 1
                                            ? `${typingUsers[0]} is typing…`
                                            : `${typingUsers.join(', ')} are typing…`}
                                    </span>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Pending images preview */}
                        {pendingImages.length > 0 && (
                            <div style={{
                                padding: '10px 16px 4px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                background: 'var(--slate-950)',
                                flexShrink: 0,
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    alignItems: 'flex-end',
                                }}>
                                    {/* Add more images button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 10,
                                            border: '2px dashed rgba(255,255,255,0.15)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'var(--slate-400)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 2,
                                            flexShrink: 0,
                                            transition: 'all 150ms',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary-400)';
                                            e.currentTarget.style.color = 'var(--primary-400)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                            e.currentTarget.style.color = 'var(--slate-400)';
                                        }}
                                        title="Add more images"
                                    >
                                        <Plus size={24} />
                                        <span style={{ fontSize: 10, fontWeight: 500 }}>Add More</span>
                                    </button>

                                    {pendingImages.map((img, idx) => (
                                        <div key={idx} style={{
                                            position: 'relative',
                                            width: 80,
                                            height: 80,
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            flexShrink: 0,
                                        }}>
                                            <img
                                                src={img.preview}
                                                alt={`Preview ${idx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    display: 'block',
                                                }}
                                            />
                                            {/* Overlay with edit & remove buttons */}
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'rgba(0,0,0,0.3)',
                                                opacity: 0,
                                                transition: 'opacity 150ms',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                                            >
                                                <button
                                                    onClick={() => setEditingImageIndex(idx)}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        background: 'rgba(16,185,129,0.9)',
                                                        border: 'none', color: 'white', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        padding: 0,
                                                    }}
                                                    title="Edit / Crop"
                                                >
                                                    <Crop size={14} />
                                                </button>
                                                <button
                                                    onClick={() => removePendingImage(idx)}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        background: 'rgba(239,68,68,0.9)',
                                                        border: 'none', color: 'white', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        padding: 0,
                                                    }}
                                                    title="Remove"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            {/* Always-visible remove X in corner */}
                                            <button
                                                onClick={() => removePendingImage(idx)}
                                                style={{
                                                    position: 'absolute', top: 3, right: 3,
                                                    width: 18, height: 18, borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.7)', border: 'none',
                                                    color: 'white', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: 0,
                                                }}
                                                title="Remove"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 6 }}>
                                    {pendingImages.length} image{pendingImages.length !== 1 ? 's' : ''} selected — {uploadHdImages ? 'HD mode: original quality' : 'Standard mode: compressed'}
                                </div>
                            </div>
                        )}

                        {/* Pending file preview */}
                        {pendingFiles.length > 0 && (
                            <div style={{
                                padding: '10px 16px 4px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                background: 'var(--slate-950)',
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'grid', gap: 6 }}>
                                    {pendingFiles.map((pendingFile, fileIndex) => (
                                        <div
                                            key={`${pendingFile.name}-${pendingFile.size}-${fileIndex}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                background: 'rgba(16,185,129,0.08)',
                                                border: '1px solid rgba(16,185,129,0.2)',
                                            }}
                                        >
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 8,
                                                background: 'rgba(16,185,129,0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <FileText size={18} style={{ color: 'var(--primary-400)' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: 'white',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {pendingFile.name}
                                                </p>
                                                <p style={{ fontSize: 10, color: 'var(--slate-500)', margin: 0, marginTop: 1 }}>
                                                    {formatFileSize(pendingFile.size)} · {getFileExtension(pendingFile.name)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removePendingFile(fileIndex)}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    background: 'rgba(239,68,68,0.15)',
                                                    border: 'none',
                                                    color: '#f87171',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    transition: 'all 150ms',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                                                title="Remove file"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 6 }}>
                                    {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} attached — press Send when ready
                                </div>
                            </div>
                        )}

                        {/* Message input */}
                        <div style={{
                            padding: '12px 16px',
                            borderTop: (pendingImages.length > 0 || pendingFiles.length > 0) ? 'none' : '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'var(--slate-950)',
                            flexShrink: 0,
                        }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                            <input
                                type="file"
                                ref={attachFileInputRef}
                                multiple
                                onChange={handleFileAttach}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={() => attachFileInputRef.current?.click()}
                                disabled={uploading}
                                title="Attach file"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    border: `1px solid ${pendingFiles.length > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    background: pendingFiles.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                                    color: pendingFiles.length > 0 ? 'var(--primary-400)' : (uploading ? 'var(--primary-400)' : 'var(--slate-400)'),
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 150ms',
                                }}
                                onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.color = 'var(--primary-400)'; }}
                                onMouseLeave={(e) => { if (!uploading && pendingFiles.length === 0) e.currentTarget.style.color = 'var(--slate-400)'; }}
                            >
                                <Paperclip size={18} />
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                title="Send image"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: uploading ? 'var(--primary-400)' : 'var(--slate-400)',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 150ms',
                                }}
                                onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.color = 'var(--primary-400)'; }}
                                onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.color = 'var(--slate-400)'; }}
                            >
                                {uploading ? (
                                    <span style={{
                                        width: 18,
                                        height: 18,
                                        border: '2px solid rgba(16,185,129,0.3)',
                                        borderTopColor: 'var(--primary-400)',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        display: 'block',
                                    }} />
                                ) : (
                                    <ImageIcon size={20} />
                                )}
                            </button>

                            <button
                                onClick={() => setUploadHdImages((prev) => !prev)}
                                disabled={uploading}
                                title={uploadHdImages ? 'HD uploads enabled (original quality)' : 'Standard uploads enabled (compressed)'}
                                style={{
                                    height: 34,
                                    minWidth: 46,
                                    padding: '0 10px',
                                    borderRadius: 9,
                                    border: uploadHdImages ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.08)',
                                    background: uploadHdImages ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
                                    color: uploadHdImages ? 'var(--primary-300)' : 'var(--slate-400)',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                }}
                            >
                                HD
                            </button>

                            <div style={{ flex: 1, position: 'relative' }}>
                                {activeConversation?.isGroup && mentionStartIndex !== null && mentionSuggestions.length > 0 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                            bottom: 'calc(100% + 8px)',
                                            borderRadius: 12,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(15,23,42,0.96)',
                                            boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
                                            overflow: 'hidden',
                                            zIndex: 50,
                                        }}
                                    >
                                        {mentionSuggestions.map((candidate) => (
                                            <button
                                                key={candidate.uid}
                                                type="button"
                                                onClick={() => insertMention(candidate.name)}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    padding: '10px 12px',
                                                    border: 'none',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    color: 'white',
                                                }}
                                            >
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>@{candidate.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{candidate.email}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <input
                                    ref={messageInputRef}
                                    type="text"
                                    placeholder="Type a message..."
                                    value={messageText}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setMessageText(nextValue);
                                        handleTyping();

                                        if (!activeConversation?.isGroup) {
                                            setMentionQuery('');
                                            setMentionStartIndex(null);
                                            return;
                                        }

                                        const mentionMatch = nextValue.match(/(?:^|\s)@([^\s@]*)$/);
                                        if (!mentionMatch) {
                                            setMentionQuery('');
                                            setMentionStartIndex(null);
                                            return;
                                        }

                                        const atToken = `@${mentionMatch[1]}`;
                                        const atIndex = nextValue.lastIndexOf(atToken);
                                        setMentionQuery((mentionMatch[1] || '').toLowerCase());
                                        setMentionStartIndex(atIndex >= 0 ? atIndex : null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (sending || uploading || sendInFlightRef.current) return;
                                            handleSendMessage();
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        borderRadius: 12,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: 'white',
                                        fontSize: 14,
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <button
                                onClick={handleSendMessage}
                                disabled={(!messageText.trim() && pendingImages.length === 0 && pendingFiles.length === 0) || sending || uploading || sendInFlightRef.current}
                                title="Send"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: (messageText.trim() || pendingImages.length > 0 || pendingFiles.length > 0) ? 'var(--primary-500)' : 'rgba(255,255,255,0.04)',
                                    border: (messageText.trim() || pendingImages.length > 0 || pendingFiles.length > 0) ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    color: 'white',
                                    cursor: (messageText.trim() || pendingImages.length > 0 || pendingFiles.length > 0) && !sending && !uploading ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 150ms',
                                    opacity: (messageText.trim() || pendingImages.length > 0 || pendingFiles.length > 0) ? 1 : 0.5,
                                }}
                            >
                                {(sending || uploading) ? (
                                    <span style={{
                                        width: 18,
                                        height: 18,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        display: 'block',
                                    }} />
                                ) : (
                                    <Send size={18} />
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ─── MEDIA GALLERY PANEL ────────────────────── */}
            {showMediaGallery && activeConversationId && activeConversation && (
                <div
                    style={{
                        width: 320,
                        minWidth: 280,
                        borderLeft: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'rgba(255,255,255,0.01)',
                        overflow: 'hidden',
                    }}
                    className="chat-media-panel"
                >
                    {/* Gallery Header */}
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FolderOpen size={16} style={{ color: 'var(--primary-400)' }} />
                            Shared Media
                        </h3>
                        <button
                            onClick={() => setShowMediaGallery(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4 }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        padding: '0 8px',
                    }}>
                        {([
                            { key: 'images' as const, label: 'Images', icon: <ImageIcon size={13} />, count: galleryImages.length },
                            { key: 'files' as const, label: 'Files', icon: <FileText size={13} />, count: galleryFiles.length },
                            { key: 'links' as const, label: 'Links', icon: <Link2 size={13} />, count: galleryLinks.length },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setMediaTab(tab.key)}
                                style={{
                                    flex: 1,
                                    padding: '10px 6px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: mediaTab === tab.key ? '2px solid var(--primary-400)' : '2px solid transparent',
                                    color: mediaTab === tab.key ? 'var(--primary-400)' : 'var(--slate-500)',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    transition: 'all 150ms',
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count > 0 && (
                                    <span style={{
                                        fontSize: 10,
                                        background: mediaTab === tab.key ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                                        color: mediaTab === tab.key ? 'var(--primary-400)' : 'var(--slate-500)',
                                        padding: '1px 5px',
                                        borderRadius: 6,
                                        fontWeight: 700,
                                    }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Gallery Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }} className="chat-messages-area">
                        {/* ── Images Tab ── */}
                        {mediaTab === 'images' && (
                            galleryImages.length === 0 ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', height: '100%', gap: 12, padding: 24,
                                }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: 'rgba(16,185,129,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <ImageIcon size={24} style={{ color: 'var(--primary-400)', opacity: 0.5 }} />
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' }}>
                                        No images shared yet
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--slate-600)', textAlign: 'center' }}>
                                        Images shared in this chat will appear here
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 4,
                                }}>
                                    {galleryImages.map((img, index) => (
                                        <div
                                            key={img.id}
                                            onClick={() => setPreviewImage({ images: galleryImages.map((item) => item.url), index })}
                                            style={{
                                                aspectRatio: '1',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                cursor: 'zoom-in',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                position: 'relative',
                                            }}
                                        >
                                            <img
                                                src={img.url}
                                                alt="Shared"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    display: 'block',
                                                }}
                                                loading="lazy"
                                            />
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                padding: '16px 4px 3px',
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                                fontSize: 9,
                                                color: 'rgba(255,255,255,0.8)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {(img.senderName || 'Unknown').split(' ')[0]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── Files Tab ── */}
                        {mediaTab === 'files' && (
                            galleryFiles.length === 0 ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', height: '100%', gap: 12, padding: 24,
                                }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: 'rgba(16,185,129,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <FileText size={24} style={{ color: 'var(--primary-400)', opacity: 0.5 }} />
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' }}>
                                        No files shared yet
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--slate-600)', textAlign: 'center' }}>
                                        PDFs and documents shared in this chat will appear here
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {galleryFiles.map(file => (
                                        <a
                                            key={file.id}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '10px 12px', borderRadius: 10,
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                textDecoration: 'none', transition: 'all 150ms',
                                            }}
                                        >
                                            <FileText size={18} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {file.name}
                                                </p>
                                                <p style={{ fontSize: 10, color: 'var(--slate-500)', margin: 0 }}>
                                                    {file.senderName} · {file.size ? formatFileSize(file.size) : getFileExtension(file.name)}
                                                </p>
                                            </div>
                                            <ExternalLink size={14} style={{ color: 'var(--slate-500)', flexShrink: 0 }} />
                                        </a>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── Links Tab ── */}
                        {mediaTab === 'links' && (
                            galleryLinks.length === 0 ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', height: '100%', gap: 12, padding: 24,
                                }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: 'rgba(16,185,129,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Link2 size={24} style={{ color: 'var(--primary-400)', opacity: 0.5 }} />
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' }}>
                                        No links shared yet
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--slate-600)', textAlign: 'center' }}>
                                        URLs shared in this chat will appear here
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {galleryLinks.map(link => {
                                        let hostname = '';
                                        try { hostname = new URL(link.url).hostname; } catch { hostname = link.url; }
                                        return (
                                            <a
                                                key={link.id}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                                    padding: '10px 12px', borderRadius: 10,
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    textDecoration: 'none', transition: 'all 150ms',
                                                }}
                                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                                            >
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 8,
                                                    background: 'rgba(16,185,129,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <Link2 size={14} style={{ color: 'var(--primary-400)' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{
                                                        fontSize: 12, fontWeight: 600, color: '#6ee7b7', margin: 0,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {hostname}
                                                    </p>
                                                    <p style={{
                                                        fontSize: 10, color: 'var(--slate-500)', margin: '2px 0 0',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {link.url}
                                                    </p>
                                                    <p style={{ fontSize: 10, color: 'var(--slate-600)', margin: '2px 0 0' }}>
                                                        {link.senderName}
                                                    </p>
                                                </div>
                                                <ExternalLink size={14} style={{ color: 'var(--slate-500)', flexShrink: 0, marginTop: 2 }} />
                                            </a>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {selectedProfile && (
                <ProfileModal chatUser={selectedProfile} onClose={() => setSelectedProfile(null)} />
            )}
            {previewImage && (
                <ImagePreviewModal
                    images={previewImage.images}
                    initialIndex={previewImage.index}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            {reactionDetailsMessage && (
                <div
                    onClick={() => setReactionDetailsMessageId(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 460,
                            padding: 16,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>Message Reactions</h3>
                            <button
                                onClick={() => setReactionDetailsMessageId(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--slate-400)',
                                    cursor: 'pointer',
                                }}
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {reactionDetailsRows.length === 0 ? (
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)' }}>No reactions on this message.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {reactionDetailsRows.map((row) => (
                                    <div
                                        key={`${reactionDetailsMessage.id}-${row.key}`}
                                        style={{
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            background: 'rgba(255,255,255,0.03)',
                                        }}
                                    >
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>
                                            {row.emoji} {row.label}
                                        </p>
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>
                                            {row.names.join(', ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showUnsendConfirmModal && (
                <div
                    onClick={cancelUnsendConfirmation}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 420,
                            padding: 16,
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>Unsend message?</h3>
                        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--slate-400)' }}>
                            This will remove the message for everyone in the conversation.
                        </p>

                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 14,
                            color: 'var(--slate-300)',
                            fontSize: 12,
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}>
                            <input
                                type="checkbox"
                                checked={rememberUnsendChoice}
                                onChange={(e) => setRememberUnsendChoice(e.target.checked)}
                                style={{ accentColor: 'var(--primary-500)' }}
                            />
                            Remember my choice until refresh
                        </label>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                            <button
                                onClick={cancelUnsendConfirmation}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--slate-300)',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void confirmUnsendMessage()}
                                disabled={!pendingUnsendMessage || unsendingMessageId === pendingUnsendMessage.id}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#dc2626',
                                    color: 'white',
                                    fontSize: 12,
                                    cursor: !pendingUnsendMessage || unsendingMessageId === pendingUnsendMessage.id ? 'not-allowed' : 'pointer',
                                    opacity: !pendingUnsendMessage || unsendingMessageId === pendingUnsendMessage.id ? 0.7 : 1,
                                }}
                            >
                                {pendingUnsendMessage && unsendingMessageId === pendingUnsendMessage.id ? 'Unsending...' : 'Unsend'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Editor Modal */}
            {editingImageIndex !== null && pendingImages[editingImageIndex] && (
                <ImageEditorModal
                    imageSrc={pendingImages[editingImageIndex].preview}
                    onError={setChatError}
                    onSave={(croppedBlob, previewUrl) => {
                        setPendingImages(prev => {
                            const updated = [...prev];
                            URL.revokeObjectURL(updated[editingImageIndex].preview);
                            updated[editingImageIndex] = { file: croppedBlob, preview: previewUrl };
                            return updated;
                        });
                        setEditingImageIndex(null);
                    }}
                    onCancel={() => setEditingImageIndex(null)}
                />
            )}

            {/* Nickname Modal */}
            {showNicknameModal && activeConversation && (
                <div
                    onClick={() => setShowNicknameModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            maxWidth: 400,
                            width: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Pencil size={16} style={{ color: 'var(--primary-400)' }} />
                                {activeConversation.isGroup && !nicknameTarget ? 'Set Nicknames' : 'Set Nickname'}
                            </h3>
                            <button
                                onClick={() => setShowNicknameModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '16px 20px', maxHeight: '50vh', overflowY: 'auto' }}>
                            {/* For group chats with no specific target, show all members */}
                            {activeConversation.isGroup && !nicknameTarget ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {Array.from(new Set(activeConversation.participants)).map(uid => {
                                        const details = activeConversation.participantDetails?.[uid];
                                        const currentNickname = activeConversation.nicknames?.[uid] || '';
                                        const isMe = uid === currentUserId;
                                        return (
                                            <div key={uid} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 14px',
                                                borderRadius: 12,
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}>
                                                {details?.profileImage ? (
                                                    <img src={details.profileImage} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                                ) : (
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: 12, color: 'white', flexShrink: 0,
                                                    }}>
                                                        {(details?.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>
                                                        {details?.name || 'Unknown'}{isMe ? ' (You)' : ''}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setNicknameTarget(uid);
                                                        setNicknameValue(currentNickname);
                                                    }}
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: 6,
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        background: currentNickname ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                                                        color: currentNickname ? '#86efac' : 'var(--slate-400)',
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        transition: 'all 150ms',
                                                        maxWidth: 120,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {currentNickname || 'Set'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Single user nickname edit */
                                <div>
                                    <p style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 12 }}>
                                        Set a nickname for <strong style={{ color: 'white' }}>
                                            {activeConversation.participantDetails?.[nicknameTarget]?.name || 'this user'}
                                        </strong>
                                        {nicknameTarget === currentUserId ? ' (yourself)' : ''}
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Enter nickname (leave empty to remove)"
                                        value={nicknameValue}
                                        onChange={(e) => setNicknameValue(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNickname();
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'white',
                                            fontSize: 14,
                                            outline: 'none',
                                            marginBottom: 16,
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {activeConversation.isGroup && (
                                            <button
                                                onClick={() => { setNicknameTarget(''); setNicknameValue(''); }}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: 10,
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    color: 'var(--slate-400)',
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Back
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveNickname}
                                            disabled={savingNickname}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: 10,
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                color: 'white',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: savingNickname ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                opacity: savingNickname ? 0.7 : 1,
                                            }}
                                        >
                                            {savingNickname ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                                            {savingNickname ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal (Group Chat) */}
            {showMembersModal && activeConversation?.isGroup && (
                <div
                    onClick={() => { setShowMembersModal(false); setKickingUid(null); }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--slate-900)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            maxWidth: 420,
                            width: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={16} style={{ color: 'var(--primary-400)' }} />
                                Group Members ({Array.from(new Set(activeConversation.participants)).length})
                            </h3>
                            <button
                                onClick={() => { setShowMembersModal(false); setKickingUid(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: '12px 20px', maxHeight: '50vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {Array.from(new Set(activeConversation.participants)).map(uid => {
                                    const details = activeConversation.participantDetails?.[uid];
                                    const isMe = uid === currentUserId;
                                    const isCreator = uid === activeConversation.createdBy;
                                    const iAmCreator = currentUserId === activeConversation.createdBy;
                                    const nickname = activeConversation.nicknames?.[uid];

                                    return (
                                        <div key={uid} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '9px 10px 9px 12px',
                                            borderRadius: 12,
                                            background: isCreator ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${isCreator ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)'}`,
                                        }}>
                                            {details?.profileImage ? (
                                                <img src={details.profileImage} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                            ) : (
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: '50%',
                                                    background: isCreator
                                                        ? 'linear-gradient(135deg, #059669, #ec4899)'
                                                        : 'linear-gradient(135deg, #10b981, #34d399)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0,
                                                }}>
                                                    {(details?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setShowMembersModal(false);
                                                    setKickingUid(null);
                                                    void handleViewProfile(uid);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                }}
                                                title={isMe ? 'View your profile' : `View ${(details?.name || 'member')}'s profile`}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <p style={{
                                                        fontSize: 13, fontWeight: 600, color: 'white', margin: 0,
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>
                                                        {nickname || details?.name || 'Unknown'}
                                                        {isMe ? ' (You)' : ''}
                                                    </p>
                                                    {isCreator && (
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                                            fontSize: 10, fontWeight: 600, color: '#a78bfa',
                                                            background: 'rgba(167,139,250,0.12)',
                                                            padding: '2px 6px', borderRadius: 6,
                                                            flexShrink: 0,
                                                        }}>
                                                            <Shield size={10} /> Admin
                                                        </span>
                                                    )}
                                                </div>
                                                {nickname && details?.name && (
                                                    <p style={{ fontSize: 11, color: 'var(--slate-500)', margin: 0 }}>
                                                        {details.name}
                                                    </p>
                                                )}
                                                {details?.email && (
                                                    <p style={{
                                                        fontSize: 11,
                                                        color: 'var(--slate-600)',
                                                        margin: 0,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {details.email}
                                                    </p>
                                                )}
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                <button
                                                    onClick={() => {
                                                        setShowMembersModal(false);
                                                        setKickingUid(null);
                                                        void handleViewProfile(uid);
                                                    }}
                                                    title={isMe ? 'View your profile' : `View ${(details?.name || 'member')}'s profile`}
                                                    style={{
                                                        height: 30,
                                                        padding: '0 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        background: 'rgba(255,255,255,0.04)',
                                                        color: 'var(--slate-300)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 5,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        transition: 'all 150ms',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(16,185,129,0.12)';
                                                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.28)';
                                                        e.currentTarget.style.color = 'var(--primary-300)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                        e.currentTarget.style.color = 'var(--slate-300)';
                                                    }}
                                                >
                                                    <ExternalLink size={12} /> View
                                                </button>

                                                {iAmCreator && !isMe && (
                                                    kickingUid === uid ? (
                                                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                        <button
                                                            onClick={async () => {
                                                                const endGlobalLoading = beginGlobalLoading();
                                                                try {
                                                                    await kickGroupMember(activeConversation.id, uid);
                                                                    setKickingUid(null);
                                                                    if (activeConversation.participants.length <= 2) {
                                                                        setShowMembersModal(false);
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Kick failed:', err);
                                                                    setChatError('Failed to remove member. Please try again.');
                                                                    setKickingUid(null);
                                                                } finally {
                                                                    endGlobalLoading();
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '5px 10px', borderRadius: 6,
                                                                border: 'none',
                                                                background: 'rgba(239,68,68,0.9)',
                                                                color: 'white', fontSize: 11, fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setKickingUid(null)}
                                                            style={{
                                                                padding: '5px 10px', borderRadius: 6,
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                background: 'rgba(255,255,255,0.04)',
                                                                color: 'var(--slate-400)', fontSize: 11, fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setKickingUid(uid)}
                                                            title={`Remove ${details?.name || 'member'}`}
                                                            style={{
                                                                width: 30, height: 30, borderRadius: 8,
                                                                background: 'rgba(239,68,68,0.08)',
                                                                border: '1px solid rgba(239,68,68,0.15)',
                                                                color: '#f87171',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0,
                                                                transition: 'all 150ms',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
                                                        >
                                                            <UserMinus size={14} />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {currentUserId !== activeConversation.createdBy && (
                                <p style={{
                                    fontSize: 12, color: 'var(--slate-500)', marginTop: 12, textAlign: 'center',
                                    fontStyle: 'italic',
                                }}>
                                    Only the group admin can remove members
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Responsive CSS */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }

                .chat-messages-area::-webkit-scrollbar { width: 5px; }
                .chat-messages-area::-webkit-scrollbar-track { background: transparent; }
                .chat-messages-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
                .chat-messages-area::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

                @media (max-width: 1024px) {
                    .chat-outer-container {
                        height: calc(100dvh - 140px) !important;
                        max-height: calc(100dvh - 140px) !important;
                        border-radius: 12px !important;
                    }
                }

                @media (max-width: 768px) {
                    .chat-outer-container {
                        height: calc(100dvh - 140px) !important;
                        max-height: calc(100dvh - 140px) !important;
                        border-radius: 8px !important;
                    }
                    .chat-left-panel {
                        width: 100% !important;
                        min-width: 0 !important;
                        display: ${activeConversationId ? 'none' : 'flex'} !important;
                    }
                    .chat-right-panel {
                        display: ${activeConversationId ? 'flex' : 'none'} !important;
                    }
                    .chat-back-btn {
                        display: flex !important;
                    }
                    .chat-media-panel {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
