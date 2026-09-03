"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Preload } from "@react-three/drei"
import { Particles } from "./Particles"
import { CameraRig } from "./CameraRig"
import { CoreGeometry } from "./CoreGeometry"
import { Effects } from "./Effects"

interface Scene3DProps {
  scrollProgress: React.RefObject<number>
  isDark: boolean
}

function SceneContent({ scrollProgress, isDark }: Scene3DProps) {
  return (
    <>
      <CameraRig scrollProgress={scrollProgress} />
      <Effects scrollProgress={scrollProgress} isDark={isDark} />
      <CoreGeometry scrollProgress={scrollProgress} isDark={isDark} />
      <Particles scrollProgress={scrollProgress} isDark={isDark} />
      <Preload all />
    </>
  )
}

export function Scene3D({ scrollProgress, isDark }: Scene3DProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{
          position: [0, 1.5, 5],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <SceneContent scrollProgress={scrollProgress} isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  )
}
