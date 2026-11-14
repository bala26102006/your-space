import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('activeWorkspace');
      localStorage.setItem('activeWorkspace', 'today');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen p-6 bg-[#121212] text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xl mb-4">
            YS
          </div>
          <h2 className="text-xl font-bold mb-2">Workspace Recovery</h2>
          <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
            {this.state.error?.message || 'A render issue occurred. Your data in IndexedDB is safe.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Reload Home Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

