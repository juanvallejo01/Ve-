"use client"

import { Component, type ReactNode } from "react"

// The 3D background is purely decorative — if WebGL fails (lost context,
// unsupported GPU, etc.) it must not be able to bring down the rest of the app.
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error("Scene3D error (ignored, purely decorative):", error)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
