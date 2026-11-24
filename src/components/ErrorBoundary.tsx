/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Unexpected rendering error",
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.removeItem("mikrotik_hotspot_config");
      localStorage.removeItem("mikrotik_hotspot_profiles");
    } catch {
      // Ignore storage failures during recovery
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-red-800/70 rounded-2xl p-6 space-y-4 shadow-xl">
            <h1 className="text-lg font-bold text-red-300">
              حدث خطأ غير متوقع / Unexpected Error
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              تعذّر عرض الواجهة بسبب بيانات غير صالحة أو خطأ برمجي مؤقت. يمكنك إعادة تحميل الصفحة أو تصفير الإعدادات المحفوظة.
            </p>
            <p className="text-xs font-mono text-red-300 bg-slate-950 border border-slate-800 rounded-lg p-2.5 break-all" dir="ltr">
              {this.state.errorMessage}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="min-h-[44px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-lg transition"
              >
                إعادة التحميل / Reload
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition"
              >
                تصفير البيانات المحفوظة / Reset Storage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
