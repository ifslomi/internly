'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [phase, setPhase] = useState(0);
    const [mounted, setMounted] = useState(false);
    // Phase 0: Initial (logo builds)
    // Phase 1: Logo glow + text reveal
    // Phase 2: Tagline + particles
    // Phase 3: Progress bar
    // Phase 4: Exit animation

    useEffect(() => {
        setMounted(true);
        const timers = [
            setTimeout(() => setPhase(1), 400),
            setTimeout(() => setPhase(2), 1000),
            setTimeout(() => setPhase(3), 1600),
            setTimeout(() => setPhase(4), 2800),
            setTimeout(() => onFinish(), 3500),
        ];
        return () => timers.forEach(clearTimeout);
    }, [onFinish]);

    if (!mounted) return null;

    return createPortal(
        <div className={`splash-screen ${phase >= 4 ? 'splash-exit' : ''}`}>
            {/* Animated background grid */}
            <div className="splash-grid" />

            {/* Floating orbs */}
            <div className="splash-orb splash-orb-1" />
            <div className="splash-orb splash-orb-2" />
            <div className="splash-orb splash-orb-3" />

            {/* Particle ring */}
            {phase >= 2 && (
                <div className="splash-particles">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="splash-particle"
                            style={{
                                '--angle': `${i * 30}deg`,
                                '--delay': `${i * 0.08}s`,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            )}

            {/* Center content */}
            <div className="splash-center">
                {/* Logo */}
                <div className={`splash-logo ${phase >= 0 ? 'splash-logo-enter' : ''} ${phase >= 1 ? 'splash-logo-glow' : ''}`}>
                    <div className="splash-logo-inner">
                        <span className="splash-logo-letter">I</span>
                    </div>
                    {/* Rotating ring */}
                    <div className={`splash-ring ${phase >= 1 ? 'splash-ring-active' : ''}`} />
                    <div className={`splash-ring splash-ring-2 ${phase >= 1 ? 'splash-ring-active' : ''}`} />
                </div>

                {/* Brand name */}
                <div className={`splash-brand ${phase >= 1 ? 'splash-brand-enter' : ''}`}>
                    {'Internly'.split('').map((char, i) => (
                        <span
                            key={i}
                            className="splash-brand-char"
                            style={{ '--char-index': i } as React.CSSProperties}
                        >
                            {char}
                        </span>
                    ))}
                </div>

                {/* Tagline */}
                <p className={`splash-tagline ${phase >= 2 ? 'splash-tagline-enter' : ''}`}>
                    OJT Management & Hours Monitoring
                </p>

                {/* Progress bar */}
                <div className={`splash-progress ${phase >= 3 ? 'splash-progress-enter' : ''}`}>
                    <div className="splash-progress-track">
                        <div className={`splash-progress-fill ${phase >= 3 ? 'splash-progress-animate' : ''}`} />
                    </div>
                    <p className="splash-loading-text">Loading your workspace...</p>
                </div>
            </div>

            {/* Bottom shimmer line */}
            <div className={`splash-shimmer ${phase >= 2 ? 'splash-shimmer-active' : ''}`} />
        </div>,
        document.body
    );
}
