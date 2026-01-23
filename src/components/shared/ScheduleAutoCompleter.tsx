'use client';

import { useEffect, useRef } from 'react';

export function ScheduleAutoCompleter() {
    const hasRun = useRef(false);

    useEffect(() => {
        // Run once per session mount
        if (hasRun.current) return;
        hasRun.current = true;

        // Rate limiting logic: Check if we ran this recently (e.g., last 1 hour)
        // Used 'force_v1' to bypass previous cache
        const lastRun = localStorage.getItem('last_schedule_update_force_v1');
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        if (lastRun && (now - parseInt(lastRun)) < ONE_HOUR) {
            return;
        }

        const runUpdate = async () => {
            try {
                // Call the API route
                const res = await fetch('/api/cron/update-schedules');

                if (res.ok) {
                    const data = await res.json();
                    console.log('Schedule auto-complete success:', data);
                    // Update timestamp only on success
                    localStorage.setItem('last_schedule_update_force_v1', now.toString());
                } else {
                    const errorData = await res.text();
                    console.error('Schedule auto-complete failed status:', res.status, errorData);
                }
            } catch (error) {
                console.error('Error triggering schedule auto-complete:', error);
            }
        };

        runUpdate();
    }, []);

    return null;
}
