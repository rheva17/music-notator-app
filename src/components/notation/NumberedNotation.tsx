"use client";

import { useRef } from "react";
import { useSongStore } from "@/store/useSongStore";
import { NoteItem, NotePitch } from "@/types/music";
import { calculateMeasures } from "@/utils/measureUtils";

export default function NumberedNotation() {
    const { tracks, config, selectedNoteId, setSelectedNoteId } = useSongStore();
    const lastClickRef = useRef<{ id: string | null, time: number }>({ id: null, time: 0 });

    const handleNoteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedNoteId(id);
    };

    const getNumberFromPitch = (pitch: string) => {
        // Basic mapping for major scale (C=1, D=2, E=3, F=4, G=5, A=6, B=7)
        // Real implementation would depend on keySignature
        const mapping: Record<string, string> = {
            C: "1", D: "2", E: "3", F: "4", G: "5", A: "6", B: "7"
        };

        const letter = pitch.charAt(0).toUpperCase();
        return mapping[letter] || "0";
    };

    const renderNote = (note: NoteItem) => {
        const isSelected = note.id === selectedNoteId;
        const colorClass = isSelected ? "text-blue-500" : "text-slate-900";
        const bgClass = isSelected ? "bg-blue-500" : "bg-slate-900";
        const restColorClass = isSelected ? "text-blue-500" : "text-slate-700";
        const dotColorClass = isSelected ? "bg-blue-500" : "bg-slate-800";

        if (note.isRest) {
            return (
                <div
                    key={note.id}
                    onClick={(e) => handleNoteClick(e, note.id)}
                    className="flex flex-col items-center justify-end w-8 h-16 relative cursor-pointer hover:bg-slate-200/50 rounded transition-colors"
                >
                    <span className={`text-2xl font-serif ${restColorClass}`}>0</span>
                    <div className="flex flex-col gap-0.5 mt-1">
                        {note.duration === "8" && <div className={`w-6 h-[2px] ${dotColorClass}`}></div>}
                        {note.duration === "16" && (
                            <>
                                <div className={`w-6 h-[2px] ${dotColorClass}`}></div>
                                <div className={`w-6 h-[2px] ${dotColorClass}`}></div>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        const renderPitch = (p: NotePitch, isChordMode: boolean, pIndex: number) => {
            const number = getNumberFromPitch(p.pitch);
            const octave = p.octave || 4;

            const dotsAbove = Math.max(0, octave - 4);
            const dotsBelow = Math.max(0, 4 - octave);

            const accSymbol = {
                "sharp": "♯",
                "flat": "♭",
                "natural": "♮",
                "none": ""
            }[p.accidental] || "";

            return (
                <div key={pIndex} className={`flex flex-col items-center justify-end relative ${isChordMode ? 'h-10' : 'h-16'}`}>
                    {/* Accidental */}
                    {accSymbol && (
                        <span className="absolute -left-2 top-0 text-xs font-sans text-slate-600">
                            {accSymbol}
                        </span>
                    )}

                    {/* High octave dots */}
                    {dotsAbove > 0 && (
                        <div className="flex flex-col gap-0.5 mb-0.5">
                            {Array(dotsAbove).fill(0).map((_, i) => (
                                <div key={`high-${i}`} className={`w-1 h-1 rounded-full mx-auto ${dotColorClass}`}></div>
                            ))}
                        </div>
                    )}

                    <span className={`text-xl font-serif font-bold leading-none ${colorClass}`}>{number}</span>

                    {/* Low octave dots */}
                    {dotsBelow > 0 && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            {Array(dotsBelow).fill(0).map((_, i) => (
                                <div key={`low-${i}`} className={`w-1 h-1 rounded-full mx-auto ${dotColorClass}`}></div>
                            ))}
                        </div>
                    )}
                </div>
            )
        };

        const isChordMode = note.pitches && note.pitches.length > 1;

        return (
            <div
                key={note.id}
                className="flex flex-col items-center justify-end w-auto min-w-[32px] min-h-[64px] relative cursor-pointer hover:bg-slate-200/50 rounded px-1 transition-colors"
                onClick={(e) => handleNoteClick(e, note.id)}
            >

                {/* Stack pitches vertically if chord, else just display the single pitch */}
                <div className="flex flex-col-reverse justify-center h-full mb-1">
                    {note.pitches && note.pitches.map((p, i) => renderPitch(p, isChordMode, i))}
                </div>

                {/* Duration markings below notes */}
                <div className="flex flex-col items-center gap-0.5 mt-auto w-full">
                    {/* Underlines for 8th and 16th */}
                    {note.duration === "8" && <div className={`w-6 h-[2px] ${bgClass}`}></div>}
                    {note.duration === "16" && (
                        <>
                            <div className={`w-6 h-[2px] ${bgClass}`}></div>
                            <div className={`w-6 h-[2px] ${bgClass}`}></div>
                        </>
                    )}
                </div>

                {/* Duration dashes for half/whole appear on the right side of the entire block */}
                {note.duration === "h" && <span className={`absolute -right-3 top-1/2 -translate-y-1/2 font-bold tracking-widest ${colorClass}`}>-</span>}
                {note.duration === "w" && <span className={`absolute -right-8 top-1/2 -translate-y-1/2 font-bold tracking-widest ${colorClass}`}>- - -</span>}

                {/* Lyric text */}
                {note.lyric && (
                    <div className="absolute -bottom-6 text-xs text-indigo-700 whitespace-nowrap font-sans font-medium">
                        {note.lyric}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className="w-full bg-[#fdfaf6] p-8 rounded-xl shadow-inner min-h-[220px] border-2 border-[#e6decb] font-serif flex flex-col gap-24 cursor-default"
            onClick={() => setSelectedNoteId(null)}
        >
            <div className="flex justify-between items-end border-b-2 border-slate-300 pb-2">
                <h2 className="text-2xl font-bold text-slate-800 tracking-wider">Numbered Notation</h2>
                <div className="text-slate-600 font-medium text-lg">
                    1 = {config.keySignature} &nbsp; {config.timeSignature[0]}/{config.timeSignature[1]}
                </div>
            </div>

            {tracks.map((track, tIndex) => {
                const measures = calculateMeasures(track.notes, config);

                return (
                    <div key={track.id} className="relative w-full">
                        <div className="flex flex-wrap gap-y-16 items-end leading-none">
                            {measures.length === 0 ? (
                                <span className="text-slate-400 italic font-sans text-sm">No notes added yet</span>
                            ) : (
                                measures.map((measure, mIndex) => (
                                    <div key={`measure-${mIndex}`} className="flex items-end gap-3 mr-4">
                                        {/* Notes in measure */}
                                        <div className="flex items-end gap-5">
                                            {measure.notes.map(renderNote)}
                                        </div>

                                        {/* Barline at the end of measure */}
                                        <div className="h-16 w-[1.5px] bg-slate-400 opacity-60 ml-2"></div>

                                        {/* Final double barline if it's the last measure */}
                                        {mIndex === measures.length - 1 && (
                                            <div className="h-16 w-[3px] bg-slate-600 ml-0.5"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
