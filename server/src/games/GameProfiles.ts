
export enum ProfileType {
    SUPPORT = 'Support',
    STEADY = 'Steady',
    CASUAL = 'Casual',
    ACTIVE = 'Active',
    ELITE = 'Elite',
    UNDEFINED = 'Undefined'
}

export enum ComplexityBitmap {
    SIDE = 1 << 0,   // 1
    FLIP = 1 << 1,   // 2
    FAKE = 1 << 2,   // 4
    DOUBLE = 1 << 3,  // 8
    FIXED_POS = 1 << 4 // 16
}

export const COMPLEXITY_ALL = ComplexityBitmap.SIDE | ComplexityBitmap.FLIP | ComplexityBitmap.FAKE | ComplexityBitmap.DOUBLE;
export const COMPLEXITY_NONE = ComplexityBitmap.DOUBLE;

export enum StyleBitmap {
    BOOST = 1 << 0   // 1
}

export const STYLE_ALL = StyleBitmap.BOOST;

export interface UserProfile {
    name: ProfileType;
    globalCap: number;
    startSpeed: number;
    trainingBuffer: number;
    growthRate: number;
    kInit: number;
    kUp: number;
    kDown: number;
    complexity: number; // Bitmap
    style: number;      // Bitmap
}

export const PROFILES: Record<ProfileType, UserProfile> = {
    [ProfileType.SUPPORT]: {
        name: ProfileType.SUPPORT,
        globalCap: 100.0,
        startSpeed: 50.0,
        trainingBuffer: 5.0,
        growthRate: 0.08,
        kInit: 0.03,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.STEADY]: {
        name: ProfileType.STEADY,
        globalCap: 130.0,
        startSpeed: 65.0,
        trainingBuffer: 12.0,
        growthRate: 0.1,
        kInit: 0.04,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.CASUAL]: {
        name: ProfileType.CASUAL,
        globalCap: 150.0,
        startSpeed: 80.0,
        trainingBuffer: 20.0,
        growthRate: 0.15,
        kInit: 0.05,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.ACTIVE]: {
        name: ProfileType.ACTIVE,
        globalCap: 170.0,
        startSpeed: 90.0,
        trainingBuffer: 32.0,
        growthRate: 0.2,
        kInit: 0.06,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.ELITE]: {
        name: ProfileType.ELITE,
        globalCap: 200.0,
        startSpeed: 100.0,
        trainingBuffer: 45.0,
        growthRate: 0.25,
        kInit: 0.07,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_ALL,
        style: STYLE_ALL
    },
    [ProfileType.UNDEFINED]: {
        name: ProfileType.UNDEFINED,
        globalCap: 150.0,
        startSpeed: 70.0,
        trainingBuffer: 30.0,
        growthRate: 0.15,
        kInit: 0.03,
        kUp: 0.03,
        kDown: 0.15,
        complexity: COMPLEXITY_NONE,
        style: STYLE_ALL
    }
};

export const DEFAULT_PROFILE = PROFILES[ProfileType.CASUAL];

export function getProfileFromSpeed(maxSpeed: number): ProfileType {
    if (maxSpeed > 130) return ProfileType.ELITE;
    if (maxSpeed > 120) return ProfileType.ACTIVE;
    if (maxSpeed > 100) return ProfileType.CASUAL;
    if (maxSpeed > 80) return ProfileType.STEADY;
    return ProfileType.SUPPORT;
}
