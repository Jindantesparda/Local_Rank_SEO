import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Last line of defence against a blank page.
 *
 * When a component throws during render or in an effect, React unmounts the
 * whole tree and the user is left staring at white space with no explanation —
 * which is exactly how the competitors page failed once. This catches that and
 * shows what actually went wrong, so the next occurrence is diagnosable instead
 * of silent.
 *
 * It is deliberately NOT a way to hide bugs: the error is shown, not swallowed.
 */

interface Props {
  children: ReactNode;
  /** Shown above the message, e.g. "Competitor comparison". */
  label?: string;
}

interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  // @types/react is not installed in this project, so the base class members are
  // not visible to TypeScript. These declarations describe what React provides
  // at runtime; `declare` emits no code.
  declare props: Props;
  declare setState: (next: Partial<State>) => void;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep this in the console as well — it is the thing to paste into a bug
    // report, and it names the component that failed.
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ info: info.componentStack || null });
  }

  private reset = () => {
    this.setState({ error: null, info: null });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-2xl mx-auto my-8 bg-white rounded-3xl p-8 border border-rose-200 shadow-sm">
        <span className="inline-flex px-3 py-1 rounded-full bg-rose-50 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
          Something broke
        </span>
        <h3 className="mt-3 text-lg font-bold text-slate-900">
          {this.props.label ? `${this.props.label} could not be displayed` : 'This page could not be displayed'}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          The rest of the app is still working. You can try again, or reload the page.
        </p>

        <pre className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-rose-700 overflow-x-auto whitespace-pre-wrap">
          {error.name}: {error.message}
        </pre>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={this.reset} className="btn btn-primary btn-md" id="btn-error-retry">
            Try again
          </button>
          <button onClick={this.reload} className="btn btn-outline btn-md" id="btn-error-reload">
            Reload page
          </button>
        </div>

        {info && (
          <details className="mt-4">
            <summary className="text-xs font-semibold text-slate-500 cursor-pointer">
              Technical details
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
              {info.trim()}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
