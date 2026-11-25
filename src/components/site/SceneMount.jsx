"use client";

import { Component } from "react";
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

// Without WebGL the page keeps its CSS backdrop and every control still works.
class Guard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SceneMount() {
  return (
    <div className="sg-scene3d" aria-hidden="true">
      <Guard>
        <Scene />
      </Guard>
    </div>
  );
}
