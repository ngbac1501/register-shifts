'use client';

import { useState, useRef, useEffect } from 'react';
import { getVietnamAddresses, type VietnamAddress } from '@/lib/api/vietnam-address-api';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export function AddressAutocomplete({
    value,
    onChange,
    placeholder = 'Nhập địa chỉ...',
    required = false,
    className = '',
}: AddressAutocompleteProps) {
    const [addresses, setAddresses] = useState<VietnamAddress[]>([]);
    const [suggestions, setSuggestions] = useState<VietnamAddress[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Load addresses from API on mount
    useEffect(() => {
        async function loadAddresses() {
            try {
                setLoading(true);
                const apiAddresses = await getVietnamAddresses();
                if (apiAddresses.length > 0) {
                    setAddresses(apiAddresses);
                    setError(false);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('Failed to load addresses from API:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        loadAddresses();
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (input: string) => {
        onChange(input);

        if (input.trim().length === 0) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const filtered = addresses.filter(addr =>
            addr.full.toLowerCase().includes(input.toLowerCase()) ||
            addr.district.toLowerCase().includes(input.toLowerCase()) ||
            addr.city.toLowerCase().includes(input.toLowerCase())
        );

        setSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
        setShowSuggestions(filtered.length > 0);
        setHighlightedIndex(-1);
    };

    const handleSelectSuggestion = (suggestion: VietnamAddress) => {
        onChange(suggestion.full);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelectSuggestion(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                {loading ? (
                    <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
                ) : error ? (
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400 w-5 h-5" />
                ) : (
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                )}
                <input
                    type="text"
                    required={required}
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (value.trim().length > 0 && suggestions.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                    placeholder={loading ? 'Đang tải địa chỉ...' : error ? 'Nhập địa chỉ thủ công' : placeholder}
                    autoComplete="off"
                />
            </div>

            {/* Error message */}
            {error && !loading && (
                <p className="text-xs text-red-500 mt-1">
                    Không thể tải danh sách địa chỉ. Vui lòng nhập địa chỉ thủ công.
                </p>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && !loading && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-fadeIn">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={`${suggestion.district}-${suggestion.city}-${index}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${index === highlightedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {suggestion.full}
                                    </p>
                                    {suggestion.district && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {suggestion.city}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No results */}
            {showSuggestions && value.trim().length > 0 && suggestions.length === 0 && !loading && !error && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl p-4 text-center animate-fadeIn">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Không tìm thấy địa chỉ phù hợp
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Bạn vẫn có thể nhập địa chỉ thủ công
                    </p>
                </div>
            )}
        </div>
    );
}
