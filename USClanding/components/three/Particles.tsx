"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

interface ParticlesProps {
  scrollProgress: React.RefObject<number>
  isDark: boolean
}

export function Particles({ scrollProgress, isDark }: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const { viewport } = useThree()
  const isMobile = viewport.width < 6

  const count = isMobile ? 80 : 200
  const baseColor = isDark ? "#3b82f6" : "#1d4ed8"

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const spread = isMobile ? 8 : 14

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread

      velocities[i * 3] = (Math.random() - 0.5) * 0.003
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.003
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002
    }
    return { positions, velocities }
  }, [count, isMobile])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.elapsedTime
    const scroll = scrollProgress.current ?? 0
    const geo = pointsRef.current.geometry
    const posArr = geo.attributes.position.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      // Organic floating motion
      posArr[i3] += velocities[i3] + Math.sin(time * 0.3 + i * 0.1) * 0.001
      posArr[i3 + 1] += velocities[i3 + 1] + Math.cos(time * 0.2 + i * 0.15) * 0.001
      posArr[i3 + 2] += velocities[i3 + 2] + Math.sin(time * 0.15 + i * 0.2) * 0.0005

      // Scroll-based expansion
      const expansionFactor = 1 + scroll * 0.3
      const spread = isMobile ? 8 : 14
      const halfSpread = (spread / 2) * expansionFactor

      // Wrap around boundaries
      if (Math.abs(posArr[i3]) > halfSpread) posArr[i3] *= -0.5
      if (Math.abs(posArr[i3 + 1]) > halfSpread) posArr[i3 + 1] *= -0.5
      if (Math.abs(posArr[i3 + 2]) > halfSpread) posArr[i3 + 2] *= -0.5
    }

    geo.attributes.position.needsUpdate = true

    // Subtle rotation responding to scroll
    pointsRef.current.rotation.y = time * 0.02 + scroll * 0.5
    pointsRef.current.rotation.x = Math.sin(time * 0.01) * 0.1
  })

  return (
    <points ref={pointsRef}>
      {/* key={count} forces geometry recreation (instead of mutating it) when
          particle count changes across the isMobile threshold — THREE
          doesn't support resizing an existing bufferAttribute in place. */}
      <bufferGeometry key={count}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isMobile ? 0.03 : 0.025}
        color={baseColor}
        transparent
        opacity={isDark ? 0.5 : 0.35}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
