import React, { Component, ReactNode } from 'react';
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  declare props: { children: ReactNode };
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="max-w-xl mx-auto p-8 space-y-4">
          <h1 className="text-2xl font-bold">TinyShift could not display this screen</h1>
          <p>
            Reload to try again. Unsaved edits may be lost; check whether your last action was saved
            before repeating it.
          </p>
          <button className="underline" onClick={() => window.location.reload()}>
            Reload TinyShift
          </button>
        </main>
      );
    return this.props.children;
  }
}
