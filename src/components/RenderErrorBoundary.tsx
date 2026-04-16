import { Component, type ErrorInfo, type ReactNode } from "react";

interface RenderErrorBoundaryProps {
  children: ReactNode;
  modeLabel: string;
}

interface RenderErrorBoundaryState {
  hasError: boolean;
}

export class RenderErrorBoundary extends Component<RenderErrorBoundaryProps, RenderErrorBoundaryState> {
  state: RenderErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RenderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.modeLabel}] render failed`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel helper-panel">
          <div className="panel-heading">
            <p className="eyebrow">Runtime Guard</p>
            <h2>{this.props.modeLabel} rendering failed</h2>
            <p>This mode was isolated so the rest of the app can stay usable while the underlying issue is fixed.</p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
