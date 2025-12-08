'use client';

import { useEffect, useState } from 'react';

/**
 * Client component for displaying last updated date
 * Prevents non-deterministic output in ISR pages
 */
export function LastUpdatedDate() {
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
