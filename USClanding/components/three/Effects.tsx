"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface EffectsProps {
  scrollProgress: React.RefObject<number>
  isDark: boolean
}

export function Effects({ scrollProgress, isDark }: EffectsProps) {
  const light1Ref = useRef<THREE.PointLight>(null!)
  const light2Ref = useRef<THREE.PointLight>(null!)
  const light3Ref = useRef<THREE.PointLight>(null!)

  // Light colors adapt to theme
  const primaryLightColor = isDark ? "#2563eb" : "#3b82f6"
  const secondaryLightColor = isDark ? "#1d4ed8" : "#60a5fa"
  const accentLightColor = isDark ? "#06b6d4" : "#0ea5e9"

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const scroll = scrollProgress.current ?? 0

    // Orbiting lights that respond to scroll
    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(time * 0.3) * 4 + scroll * 2
      light1Ref.current.position.y = Math.cos(time * 0.2) * 3 + 1
      light1Ref.current.position.z = Math.sin(time * 0.15) * 3
      light1Ref.current.intensity = THREE.MathUtils.lerp(
        light1Ref.current.intensity,
        (isDark ? 1.5 : 0.8) + scroll * 1.5,
        0.03
      )
    }

    if (light2Ref.current) {
      light2Ref.current.position.x = Math.cos(time * 0.25) * 5 - scroll * 1.5
      light2Ref.current.position.y = Math.sin(time * 0.3) * 2 - 1
      light2Ref.current.position.z = Math.cos(time * 0.2) * 4
      light2Ref.current.intensity = THREE.MathUtils.lerp(
        light2Ref.current.intensity,
        (isDark ? 1.0 : 0.5) + scroll * 1.0,
        0.03
      )
    }

    if (light3Ref.current) {
      light3Ref.current.position.x = Math.sin(time * 0.15 + 2) * 3
      light3Ref.current.position.y = Math.cos(time * 0.1 + 1) * 4 + 2
      light3Ref.current.position.z = Math.sin(time * 0.12) * 5 - 2
      light3Ref.current.intensity = THREE.MathUtils.lerp(
        light3Ref.current.intensity,
        (isDark ? 0.8 : 0.4) + scroll * 0.8,
        0.03
      )
    }
  })

  return (
    <>
      {/* Ambient light — base illumination */}
      <ambientLight intensity={isDark ? 0.15 : 0.4} color={isDark ? "#1e293b" : "#f8fafc"} />

      {/* Directional fill — subtle top-down */}
      <directionalLight
        position={[0, 5, 5]}
        intensity={isDark ? 0.2 : 0.3}
        color={isDark ? "#334155" : "#e2e8f0"}
      />

      {/* Orbiting blue point lights */}
      <pointLight
        ref={light1Ref}
        color={primaryLightColor}
        intensity={isDark ? 1.5 : 0.8}
        distance={15}
        decay={2}
      />
      <pointLight
        ref={light2Ref}
        color={secondaryLightColor}
        intensity={isDark ? 1.0 : 0.5}
        distance={12}
        decay={2}
      />
      <pointLight
        ref={light3Ref}
        color={accentLightColor}
        intensity={isDark ? 0.8 : 0.4}
        distance={10}
        decay={2}
      />
    </>
  )
}
