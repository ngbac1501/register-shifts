// Vietnam Province API Integration
// API: https://provinces.open-api.vn/api/

const API_BASE = 'https://provinces.open-api.vn/api';

export interface Province {
    name: string;
    code: number;
    division_type: string;
    codename: string;
    phone_code: number;
}

export interface District {
    name: string;
    code: number;
    division_type: string;
    codename: string;
    province_code: number;
}

export interface ProvinceWithDistricts extends Province {
    districts: District[];
}

export interface VietnamAddress {
    district: string;
    city: string;
    full: string;
}

// Cache to avoid repeated API calls
let cachedAddresses: VietnamAddress[] | null = null;

/**
 * Fetch all provinces from API
 */
export async function getProvinces(): Promise<Province[]> {
    try {
        const res = await fetch(`${API_BASE}/p/`);
        if (!res.ok) throw new Error('Failed to fetch provinces');
        return await res.json();
    } catch (error) {
        console.error('Error fetching provinces:', error);
        throw error;
    }
}

/**
 * Fetch province details with districts
 */
export async function getProvinceWithDistricts(provinceCode: number): Promise<ProvinceWithDistricts> {
    try {
        const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
        if (!res.ok) throw new Error(`Failed to fetch province ${provinceCode}`);
        return await res.json();
    } catch (error) {
        console.error(`Error fetching province ${provinceCode}:`, error);
        throw error;
    }
}

/**
 * Get all Vietnam addresses (provinces + districts)
 * Results are cached after first call
 */
export async function getVietnamAddresses(): Promise<VietnamAddress[]> {
    // Return cached data if available
    if (cachedAddresses) {
        return cachedAddresses;
    }

    try {
        // Fetch all provinces
        const provinces = await getProvinces();

        // Fetch districts for major cities only (to reduce API calls)
        // Focus on: TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng
        const majorCityCodes = [79, 1, 48, 92, 31]; // HCM, HN, DN, CT, HP

        const addresses: VietnamAddress[] = [];

        // Fetch districts for major cities
        for (const province of provinces) {
            if (majorCityCodes.includes(province.code)) {
                const provinceDetails = await getProvinceWithDistricts(province.code);

                for (const district of provinceDetails.districts) {
                    addresses.push({
                        district: district.name,
                        city: province.name,
                        full: `${district.name}, ${province.name}`
                    });
                }
            } else {
                // For other provinces, just add the province name
                addresses.push({
                    district: '',
                    city: province.name,
                    full: province.name
                });
            }
        }

        // Cache the results
        cachedAddresses = addresses;
        return addresses;
    } catch (error) {
        console.error('Error loading Vietnam addresses:', error);
        // Return empty array on error, component will use fallback
        return [];
    }
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export function clearAddressCache() {
    cachedAddresses = null;
}
