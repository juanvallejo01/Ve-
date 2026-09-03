"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

interface CoreGeometryProps {
  scrollProgress: React.RefObject<number>
  isDark: boolean
}

export function CoreGeometry({ scrollProgress, isDark }: CoreGeometryProps) {
  const mainRef = useRef<THREE.Mesh>(null!)
  const wireRef = useRef<THREE.Mesh>(null!)
  const nodesGroupRef = useRef<THREE.Group>(null!)
  const { viewport } = useThree()
  const isMobile = viewport.width < 6

  // Create node positions for the "network" state
  const nodeData = useMemo(() => {
    const nodeCount = isMobile ? 6 : 12
    const nodes: THREE.Vector3[] = []
    const radius = isMobile ? 1.5 : 2.2

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount)
      const theta = Math.sqrt(nodeCount * Math.PI) * phi
      nodes.push(
        new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        )
      )
    }
    return nodes
  }, [isMobile])

  // Create connection lines between nearby nodes
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions: number[] = []

    for (let i = 0; i < nodeData.length; i++) {
      for (let j = i + 1; j < nodeData.length; j++) {
        if (nodeData[i].distanceTo(nodeData[j]) < 3.0) {
          positions.push(nodeData[i].x, nodeData[i].y, nodeData[i].z)
          positions.push(nodeData[j].x, nodeData[j].y, nodeData[j].z)
        }
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [nodeData])

  // Colors for light and dark mode: Blue main, Yellow details
  const emissiveColor = isDark ? "#3b82f6" : "#2563eb" // Blue glow (primary)
  const wireColor = isDark ? "#fbbf24" : "#f59e0b" // Yellow wireframe (detail)
  const nodeColor = isDark ? "#fbbf24" : "#f59e0b" // Yellow nodes (detail)
  const lineColor = isDark ? "#fcd34d" : "#fbbf24" // Yellow lines (detail)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const scroll = scrollProgress.current ?? 0

    if (mainRef.current) {
      // Rotation increases gently with scroll (slower and more fluid)
      mainRef.current.rotation.y = time * 0.05 + scroll * Math.PI * 0.6
      mainRef.current.rotation.x = Math.sin(time * 0.05) * 0.1 + scroll * Math.PI * 0.3
      mainRef.current.rotation.z = Math.cos(time * 0.04) * 0.1 + scroll * Math.PI * 0.2

      // Scale: gentle pulse, grow slightly with scroll
      const basePulse = 1 + Math.sin(time * 0.3) * 0.02
      const scrollScale = 1 + scroll * 0.15
      const targetScale = basePulse * scrollScale * (isMobile ? 0.7 : 1)
      mainRef.current.scale.setScalar(
        THREE.MathUtils.lerp(mainRef.current.scale.x, targetScale, 0.02)
      )

      // Distort and Emissive intensity for a calming, secure feel
      const mat = mainRef.current.material as any
      if (mat.distort !== undefined) {
        // Soft, fluid deformation (like water or soft energy)
        mat.distort = THREE.MathUtils.lerp(mat.distort, 0.15 + scroll * 0.45, 0.02)
        mat.speed = THREE.MathUtils.lerp(mat.speed, 0.5 + scroll * 0.8, 0.02)
      }
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        0.3 + scroll * 0.6,
        0.02
      )

      // Opacity: core shape fades slightly as nodes appear, but remains solid enough
      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        scroll > 0.3 ? 0.5 : 0.85,
        0.02
      )
    }

    // Wire frame matches main ref but softly
    if (wireRef.current) {
      wireRef.current.rotation.copy(mainRef.current.rotation)
      wireRef.current.scale.copy(mainRef.current.scale)
      const wireMat = wireRef.current.material as any

      if (wireMat.distort !== undefined) {
        wireMat.distort = THREE.MathUtils.lerp(wireMat.distort, 0.15 + scroll * 0.45, 0.02)
        wireMat.speed = THREE.MathUtils.lerp(wireMat.speed, 0.5 + scroll * 0.8, 0.02)
      }

      wireMat.opacity = THREE.MathUtils.lerp(
        wireMat.opacity,
        0.1 + scroll * 0.2,
        0.02
      )
    }

    // Network nodes — gentle appearance and slower rotation
    if (nodesGroupRef.current) {
      nodesGroupRef.current.rotation.y = time * 0.03 + scroll * Math.PI * 0.3
      nodesGroupRef.current.rotation.x = Math.sin(time * 0.04) * 0.1 + scroll * 0.2

      const nodeVisibility = Math.max(0, (scroll - 0.2) / 0.3)
      nodesGroupRef.current.children.forEach((child, i) => {
        const target = nodeData[i]
        if (target) {
          // Soft expansion
          const expandMultiplier = 1 + scroll * 0.4
          child.position.lerp(
            target.clone().multiplyScalar(nodeVisibility * expandMultiplier),
            0.02
          )
          child.scale.setScalar(
            THREE.MathUtils.lerp(child.scale.x, nodeVisibility * 0.15, 0.02)
          )
        }
      })

      // Connection lines opacity
      const lineMesh = nodesGroupRef.current.children[nodeData.length]
      if (lineMesh) {
        const lineMat = (lineMesh as THREE.Line).material as THREE.LineBasicMaterial
        if (lineMat) {
          lineMat.opacity = THREE.MathUtils.lerp(lineMat.opacity, nodeVisibility * 0.3, 0.02)
        }
      }
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Main icosahedron — translucent with emissive glow and distortion */}
      <mesh ref={mainRef}>
        <icosahedronGeometry args={[1.2, 8]} />
        <MeshDistortMaterial
          color={isDark ? "#1e3a8a" : "#93c5fd"}
          emissive={emissiveColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
          wireframe={false}
          side={THREE.DoubleSide}
          roughness={0.3}
          metalness={0.7}
          distort={0.1}
          speed={2}
        />
      </mesh>

      {/* Wireframe overlay with matching distortion */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.25, 8]} />
        <MeshDistortMaterial
          color={wireColor}
          transparent
          opacity={0.2}
          depthWrite={false}
          wireframe={true}
          distort={0.1}
          speed={2}
        />
      </mesh>

      {/* Network nodes and connections */}
      <group ref={nodesGroupRef}>
        {nodeData.map((_, i) => (
          <mesh key={i} position={[0, 0, 0]} scale={0}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial
              color={nodeColor}
              emissive={nodeColor}
              emissiveIntensity={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
        {/* Connection lines */}
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial
            color={lineColor}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>
    </group>
  )
}
