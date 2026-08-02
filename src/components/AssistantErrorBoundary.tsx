import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AssistantErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Assistant render failed', error, info);
  }

  render() {
    if (this.state.failed) {
      return <section className="assistant-loading" role="alert">The assistant could not display that response. Reload this page to continue using the rest of MySANGAJOR.</section>;
    }
    return this.props.children;
  }
}
