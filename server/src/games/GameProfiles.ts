
export enum ProfileType {
    SUPPORT = 'Support',
    STEADY = 'Steady',
    CASUAL = 'Casual',
    ACTIVE = 'Active',
    ELITE = 'Elite'
}

export enum ComplexityBitmap {
    SIDE = 1 << 0,   // 1
    FLIP = 1 << 1,   // 2
    FAKE = 1 << 2,   // 4
    DOUBLE = 1 << 3  // 8
}

export const COMPLEXITY_ALL = ComplexityBitmap.SIDE | ComplexityBitmap.FLIP | ComplexityBitmap.FAKE | ComplexityBitmap.DOUBLE;

export enum StyleBitmap {
    BOOST = 1 << 0   // 1
}

export const STYLE_ALL = StyleBitmap.BOOST;

export interface UserProfile {
    name: ProfileType;
    globalCap: number;
    startSpeed: number;
    growthRate: number;
    kUp: number;
    kDown: number;
    complexity: number; // Bitmap
    style: number;      // Bitmap
}

export const PROFILES: Record<ProfileType, UserProfile> = {
    [ProfileType.SUPPORT]: {
        name: ProfileType.SUPPORT,
        globalCap: 110.0,
        startSpeed: 50.0,
        growthRate: 0.08,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.STEADY]: {
        name: ProfileType.STEADY,
        globalCap: 160.0,
        startSpeed: 80.0,
        growthRate: 0.1,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.CASUAL]: {
        name: ProfileType.CASUAL,
        globalCap: 280.0,
        startSpeed: 125.0,
        growthRate: 0.15,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.ACTIVE]: {
        name: ProfileType.ACTIVE,
        globalCap: 400.0,
        startSpeed: 200.0,
        growthRate: 0.2,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.ELITE]: {
        name: ProfileType.ELITE,
        globalCap: 500.0,
        startSpeed: 300.0,
        growthRate: 0.25,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    }
};

export const DEFAULT_PROFILE = PROFILES[ProfileType.CASUAL];
