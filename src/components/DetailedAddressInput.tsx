'use client';

import { useState, useEffect } from 'react';
import { AddressAutocomplete } from './AddressAutocomplete';
import { Home, MapPin } from 'lucide-react';

interface DetailedAddressInputProps {
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}

export function DetailedAddressInput({
    value,
    onChange,
    required = false,
}: DetailedAddressInputProps) {
    // Parse existing address into components
    const parseAddress = (addr: string) => {
        // Try to parse format: "123 Street Name, District, City"
        const parts = addr.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            const streetPart = parts[0] || '';
            const district = parts[1] || '';
            const city = parts[2] || '';

            // Try to extract house number from street part
            const streetMatch = streetPart.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
            if (streetMatch) {
                return {
                    houseNumber: streetMatch[1],
                    street: streetMatch[2],
                    district,
                    city,
                };
            }

            return {
                houseNumber: '',
                street: streetPart,
                district,
                city,
            };
        }

        return {
            houseNumber: '',
            street: '',
            district: '',
            city: '',
        };
    };

    const parsed = parseAddress(value);
    const [houseNumber, setHouseNumber] = useState(parsed.houseNumber);
    const [street, setStreet] = useState(parsed.street);
    const [districtCity, setDistrictCity] = useState(
        parsed.district && parsed.city
            ? `${parsed.district}, ${parsed.city}`
            : parsed.district || ''
    );

    // Update full address when components change
    useEffect(() => {
        const parts = [];

        // Add house number + street
        if (houseNumber && street) {
            parts.push(`${houseNumber} ${street}`);
        } else if (street) {
            parts.push(street);
        } else if (houseNumber) {
            parts.push(houseNumber);
        }

        // Add district/city
        if (districtCity) {
            parts.push(districtCity);
        }

        const fullAddress = parts.join(', ');

        // Only call onChange if the value actually changed
        if (fullAddress !== value) {
            onChange(fullAddress);
        }
    }, [houseNumber, street, districtCity, onChange, value]);

    return (
        <div className="space-y-3">
            {/* House Number + Street Name */}
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Số nhà
                    </label>
                    <div className="relative">
                        <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={houseNumber}
                            onChange={(e) => setHouseNumber(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400 text-sm"
                            placeholder="293"
                        />
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Tên đường <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        required={required}
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400 text-sm"
                        placeholder="Quang Trung"
                    />
                </div>
            </div>

            {/* District + City (Autocomplete) */}
            <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Quận/Huyện, Thành phố <span className="text-red-500">*</span>
                </label>
                <AddressAutocomplete
                    value={districtCity}
                    onChange={setDistrictCity}
                    placeholder="Quận Gò Vấp, TP. Hồ Chí Minh"
                    required={required}
                />
            </div>

            {/* Preview */}
            {(houseNumber || street || districtCity) && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">
                                Địa chỉ đầy đủ:
                            </p>
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                                {houseNumber && street && `${houseNumber} ${street}`}
                                {!houseNumber && street && street}
                                {houseNumber && !street && houseNumber}
                                {(houseNumber || street) && districtCity && ', '}
                                {districtCity}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
