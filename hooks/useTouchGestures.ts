'use client';

import { useRef, useEffect, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

interface GestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
}

interface TouchGestureOptions {
  swipeThreshold?: number; // Distancia mínima para detectar swipe
  velocityThreshold?: number; // Velocidad mínima para swipe
  longPressDelay?: number; // Tiempo para long press
  doubleTapDelay?: number; // Tiempo máximo entre taps para doble tap
  pinchThreshold?: number; // Cambio mínimo de escala para pinch
}

const DEFAULT_OPTIONS: Required<TouchGestureOptions> = {
  swipeThreshold: 30,
  velocityThreshold: 0.3,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.1,
};

export function useTouchGestures(
  handlers: GestureHandlers = {},
  options: TouchGestureOptions = {}
) {
  const gestureRef = useRef<HTMLElement | null>(null);
  const gestureState = useRef({
    touchStart: null as TouchPoint | null,
    lastTap: null as TouchPoint | null,
    initialDistance: 0,
    initialScale: 1,
    longPressTimeout: null as NodeJS.Timeout | null,
  });

  const config = { ...DEFAULT_OPTIONS, ...options };

  // Calcular distancia entre dos puntos
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calcular punto medio entre dos toques
  const getMidpoint = useCallback(
    (touch1: Touch, touch2: Touch) => ({
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }),
    []
  );

  // Limpiar timeout de long press
  const clearLongPressTimeout = useCallback(() => {
    if (gestureState.current.longPressTimeout) {
      clearTimeout(gestureState.current.longPressTimeout);
      gestureState.current.longPressTimeout = null;
    }
  }, []);

  // Manejar inicio de toque
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();

      const touch = e.touches[0];
      const touchPoint: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      gestureState.current.touchStart = touchPoint;

      if (e.touches.length === 2) {
        // Inicio de pinch
        gestureState.current.initialDistance = getDistance(
          e.touches[0],
          e.touches[1]
        );
        gestureState.current.initialScale = 1;
      } else if (e.touches.length === 1) {
        // Configurar long press
        gestureState.current.longPressTimeout = setTimeout(() => {
          if (handlers.onLongPress) {
            handlers.onLongPress(touchPoint);
          }
        }, config.longPressDelay);
      }
    },
    [handlers, config, getDistance]
  );

  // Manejar movimiento de toque
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      clearLongPressTimeout();

      if (e.touches.length === 2 && handlers.onPinch) {
        // Manejar pinch
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / gestureState.current.initialDistance;

        if (
          Math.abs(scale - gestureState.current.initialScale) >
          config.pinchThreshold
        ) {
          const center = getMidpoint(e.touches[0], e.touches[1]);
          handlers.onPinch({ scale, center });
          gestureState.current.initialScale = scale;
        }
      }
    },
    [handlers, config, getDistance, getMidpoint, clearLongPressTimeout]
  );

  // Manejar fin de toque
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      clearLongPressTimeout();

      if (e.changedTouches.length === 1 && gestureState.current.touchStart) {
        const touch = e.changedTouches[0];
        const touchEnd: TouchPoint = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };

        const deltaX = touchEnd.x - gestureState.current.touchStart.x;
        const deltaY = touchEnd.y - gestureState.current.touchStart.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = touchEnd.time - gestureState.current.touchStart.time;
        const velocity = distance / duration;

        // Detectar swipe
        if (
          distance > config.swipeThreshold &&
          velocity > config.velocityThreshold &&
          handlers.onSwipe
        ) {
          let direction: SwipeGesture['direction'];

          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }

          handlers.onSwipe({
            direction,
            distance,
            velocity,
            duration,
          });
        }
        // Detectar tap
        else if (distance < config.swipeThreshold) {
          const now = Date.now();

          // Verificar doble tap
          if (
            gestureState.current.lastTap &&
            now - gestureState.current.lastTap.time < config.doubleTapDelay &&
            Math.abs(touchEnd.x - gestureState.current.lastTap.x) < 50 &&
            Math.abs(touchEnd.y - gestureState.current.lastTap.y) < 50
          ) {
            if (handlers.onDoubleTap) {
              handlers.onDoubleTap(touchEnd);
            }
            gestureState.current.lastTap = null;
          } else {
            if (handlers.onTap) {
              handlers.onTap(touchEnd);
            }
            gestureState.current.lastTap = touchEnd;
          }
        }
      }

      gestureState.current.touchStart = null;
    },
    [handlers, config, clearLongPressTimeout]
  );

  // Configurar event listeners
  useEffect(() => {
    const element = gestureRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      clearLongPressTimeout();
    };
  }, [clearLongPressTimeout]);

  return gestureRef;
}
