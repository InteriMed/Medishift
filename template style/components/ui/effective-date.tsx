'use client';

import { useEffect, useState } from 'react';

/**
 * Client component for displaying effective date
 * Prevents non-deterministic output in ISR pages
 */
export function EffectiveDate() {
    const [date, setDate] = useState<string>('');

    useEffect(() => {
        setDate(new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
    }, []);

    if (!date) {
        return <span className="text-muted-foreground">Loading...</span>;
    }

    return <span>{date}</span>;
}
