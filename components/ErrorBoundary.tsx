import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-mono text-slate-200">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-900/50 rounded-lg p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-4 bg-red-900/20 rounded-full border border-red-900/50">
                <AlertTriangle size={48} className="text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-widest text-white">SYSTEM CRITICAL FAILURE</h1>
                <p className="text-red-400 text-sm">RUNTIME EXCEPTION DETECTED</p>
              </div>
            </div>

            <div className="bg-black/50 border border-slate-800 rounded p-4 mb-6 font-mono text-xs overflow-auto max-h-64 custom-scrollbar">
              <div className="flex items-center text-red-500 font-bold mb-2 border-b border-slate-800 pb-2">
                <Terminal size={14} className="mr-2" />
                STACK TRACE
              </div>
              <p className="text-red-300 mb-2">{(this as any).state.error?.toString()}</p>
              <pre className="text-slate-500 whitespace-pre-wrap">
                {(this as any).state.errorInfo?.componentStack}
              </pre>
            </div>

            <div className="flex justify-end space-x-4">
              <button 
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-6 py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-900 text-red-400 rounded transition-all font-bold tracking-wider"
              >
                <RefreshCw size={16} />
                <span>INITIATE SYSTEM REBOOT</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
