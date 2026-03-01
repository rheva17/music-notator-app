"use client";

import Toolbar from "./Toolbar";
import EditorPanel from "./EditorPanel";
import StandardNotation from "./notation/StandardNotation";
import NumberedNotation from "./notation/NumberedNotation";
import VirtualPiano from "./VirtualPiano";
import { useSongStore } from "@/store/useSongStore";
import { useAuthStore } from "@/store/useAuthStore";
import { LogOut, User } from "lucide-react";

export function MainContainer() {
    const notationMode = useSongStore((state) => state.notationMode);
    const { user, logout } = useAuthStore();

    return (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-6">
            <header className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Composer Workspace
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Create your melodies, switch notations, and see the results instantly.
                    </p>
                </div>

                {user && (
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                <User size={16} />
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{user.name}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                        <button onClick={logout} className="text-slate-500 hover:text-rose-500 transition-colors" title="Log Out">
                            <LogOut size={18} />
                        </button>
                    </div>
                )}
            </header>

            {/* Global Controls */}
            <Toolbar />

            <div className="flex flex-col gap-4 w-full">
                {/* Editor Panel Top Toolbar */}
                <div className="w-full">
                    <EditorPanel />
                </div>

                {/* Notation Display Area */}
                <div className="w-full flex flex-col gap-4">
                    <div id="notation-container" className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[300px]">
                        {notationMode === "standard" ? (
                            <StandardNotation />
                        ) : (
                            <NumberedNotation />
                        )}
                    </div>
                </div>
            </div>

            {/* Virtual Piano spanning full width below */}
            <VirtualPiano />
        </main>
    );
}
