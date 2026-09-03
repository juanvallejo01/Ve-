"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface CameraRigProps {
  scrollProgress: React.RefObject<number>
}

export function CameraRig({ scrollProgress }: CameraRigProps) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    const scroll = scrollProgress.current ?? 0
    const time = state.clock.elapsedTime

    // Camera positions based on scroll sections
    let targetX: number, targetY: number, targetZ: number
    let targetRotX: number, targetRotY: number

    if (scroll < 0.25) {
      // Hero: slightly elevated, centered
      const t = scroll / 0.25
      targetX = t * 0.5
      targetY = 1.5 - t * 0.3
      targetZ = 5 - t * 0.5
      targetRotX = -0.05
      targetRotY = 0
    } else if (scroll < 0.5) {
      // Benefits: shifted right, reveal connections
      const t = (scroll - 0.25) / 0.25
      targetX = 0.5 + t * 0.8
      targetY = 1.2 - t * 0.3
      targetZ = 4.5 - t * 0.8
      targetRotX = -0.05 + t * 0.02
      targetRotY = -t * 0.15
    } else if (scroll < 0.75) {
      // How it works: closer, organized
      const t = (scroll - 0.5) / 0.25
      targetX = 1.3 - t * 1.3
      targetY = 0.9 + t * 0.3
      targetZ = 3.7 - t * 0.2
      targetRotX = -0.03
      targetRotY = -0.15 + t * 0.15
    } else {
      // CTA/FAQ: centered, focused
      const t = (scroll - 0.75) / 0.25
      targetX = t * 0.2
      targetY = 1.2 + t * 0.3
      targetZ = 3.5 + t * 0.8
      targetRotX = -0.02 - t * 0.02
      targetRotY = 0
    }

    // Subtle breathing motion
    targetX += Math.sin(time * 0.3) * 0.08
    targetY += Math.cos(time * 0.2) * 0.05

    // Smooth interpolation
    const lerpFactor = 0.03
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, lerpFactor)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, lerpFactor)
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, lerpFactor)

    state.camera.rotation.x = THREE.MathUtils.lerp(state.camera.rotation.x, targetRotX, lerpFactor)
    state.camera.rotation.y = THREE.MathUtils.lerp(state.camera.rotation.y, targetRotY, lerpFactor)
  })

  return <group ref={groupRef} />
}
