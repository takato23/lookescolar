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
            samples: 2,
            resolution: 128,
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
        scrollDamping: 0.08, // Responsive yet smooth scrolling
    },
    lighting: {
        spotIntensity: 18,    // Optimized for dramatic contrast
        rimIntensity: 6,      // Subtle cinematic rim lighting
        fillIntensity: 3,     // Deep shadows for premium feel
        sensorIntensity: 12,  // Bright focal center
    },
    tunnel: {
        cameraZ: -8,        // Camera travels through aperture
        fov: 90,            // Moderate FOV for speed sensation
        scale: 2.5,         // Moderate scale expansion
        rotations: 0.5,     // Subtle rotation
        speed: 0.5,         // Progress speed (~2 seconds total)
    },
    postProcessing: {
        bloom: {
            intensity: 0.4, // Balanced bloom for premium quality
            radius: 0.3,    // Tight radius for precise glow
            luminanceThreshold: 1.5, // Higher threshold for selective bloom
        },
        vignette: {
            offset: 0.2,    // Subtle edge darkening
            darkness: 0.9,  // Strong vignette for cinematic feel
        },
        chromaticAberration: {
            offset: 0.0005, // Subtle lens distortion effect
        }
    },
    performance: {
        mobile: {
            bladeCount: 7,           // Reduced blade count on mobile
            particleMultiplier: 0.5, // 50% particles on mobile
            geometrySegments: 0.75,  // 75% geometry detail
            lightCount: 0.6,         // 60% of lights
            shadowsEnabled: false,   // Disable shadows
            postProcessingQuality: 0.7, // 70% post-processing quality
        },
        desktop: {
            bladeCount: 9,
            particleMultiplier: 1.0,
            geometrySegments: 1.0,
            lightCount: 1.0,
            shadowsEnabled: true,
            postProcessingQuality: 1.0,
        }
    }
};
