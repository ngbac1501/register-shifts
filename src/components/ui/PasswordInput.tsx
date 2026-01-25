'use client';

import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ label, error, leftIcon, className = '', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        {...props}
                        ref={ref}
                        type={showPassword ? 'text' : 'password'}
                        className={`w-full ${leftIcon ? 'pl-10' : 'pl-5'} pr-12 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white ${className} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-500 pl-1 animate-fadeInDown">{error}</p>
                )}
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
