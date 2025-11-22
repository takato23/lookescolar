export const APERTURA_CONFIG = {
    colors: {
        blade: "#1a1a1a",
        ring: "#d4af37",
        sensor: "#050505",
        sensorLight: "#44aaff",
        rimLight: "#66ccff",
        fillLight: "#aaddff",
        volumetric: "#eeffff",
    },
    materials: {
        blade: {
            metalness: 0.9,
            roughness: 0.2,
            envMapIntensity: 1.5,
        },
        ring: {
            metalness: 1,
            roughness: 0.3,
            envMapIntensity: 2,
        },
        glass: {
            samples: 6, // Balanced for quality/perf
            resolution: 512, // Balanced resolution
            thickness: 0.5,
            chromaticAberration: 0.06,
            anisotropy: 0.3,
            distortion: 0.25,
            distortionScale: 0.3,
            temporalDistortion: 0.1,
            ior: 1.5,
            color: "#ffffff",
        }
    },
    animation: {
        breathingSpeed: 0.5,
        breathingIntensity: 0.02,
        tiltSensitivity: 0.05,
        scrollDamping: 0.2,
    },
    lighting: {
        spotIntensity: 12,
        rimIntensity: 4,
        fillIntensity: 0.8,
        sensorIntensity: 3,
    },
    postProcessing: {
        bloom: {
            intensity: 1.0,
            radius: 0.6,
            luminanceThreshold: 1,
        },
        vignette: {
            offset: 0.1,
            darkness: 1.1,
        }
    }
};
