import React from 'react';
import { Conflict } from '@/lib/conflict-detection';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ConflictWarningProps {
    conflicts: Conflict[];
    className?: string;
}

export function ConflictWarning({ conflicts, className = '' }: ConflictWarningProps) {
    if (conflicts.length === 0) return null;

    const errors = conflicts.filter(c => c.severity === 'error');
    const warnings = conflicts.filter(c => c.severity === 'warning');

    return (
        <div className={`space-y-2 ${className}`}>
            {errors.map((conflict, index) => (
                <div
                    key={`error-${index}`}
                    className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">{conflict.message}</p>
                    </div>
                </div>
            ))}

            {warnings.map((conflict, index) => (
                <div
                    key={`warning-${index}`}
                    className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900">{conflict.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface SlotIndicatorProps {
    available: number;
    total: number;
    percentage: number;
    className?: string;
}

export function SlotIndicator({ available, total, percentage, className = '' }: SlotIndicatorProps) {
    const getColor = () => {
        if (percentage === 0) return 'text-gray-500 bg-gray-100';
        if (percentage < 20) return 'text-red-600 bg-red-100';
        if (percentage < 50) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
    };

    const getLabel = () => {
        if (percentage === 0) return 'Đã đầy';
        if (percentage < 20) return 'Sắp đầy';
        if (percentage < 50) return 'Còn ít';
        return 'Còn nhiều';
    };

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor()}`}>
                {getLabel()}
            </span>
            <span className="text-sm text-gray-600">
                {available}/{total} slot
            </span>
        </div>
    );
}
