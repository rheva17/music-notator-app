import { NoteItem, Duration, SongConfiguration, BarlineType } from "@/types/music";

export interface MeasureInfo {
    notes: NoteItem[];
    hasOverflow: boolean;
    currentBeats: number;
    maxBeats: number;
    startBar?: BarlineType;
    endBar?: BarlineType;
}

/**
 * Returns the beat value in quarter-notes.
 * w = 4, h = 2, q = 1, 8 = 0.5, 16 = 0.25, 32 = 0.125
 */
export const getDurationBeats = (note: NoteItem): number => {
    if (note.isBarline) return 0;

    let base = 1;
    switch (note.duration) {
        case "w": base = 4; break;
        case "h": base = 2; break;
        case "q": base = 1; break;
        case "8": base = 0.5; break;
        case "16": base = 0.25; break;
        case "32": base = 0.125; break;
        default: base = 1; break;
    }

    return note.isDotted ? base * 1.5 : base;
};

/**
 * Validates and groups notes into measures based on the time signature.
 * e.g., if 3/4, max beats per measure = 3.
 */
export const calculateMeasures = (notes: NoteItem[], config: SongConfiguration): MeasureInfo[] => {
    const num = config.timeSignature[0];
    const den = config.timeSignature[1];

    const maxBeats = num * (4 / den);

    const measures: MeasureInfo[] = [];
    let currentMeasureNotes: NoteItem[] = [];
    let currentBeats = 0;
    let currentStartBar: BarlineType | undefined = undefined;

    for (const note of notes) {
        if (note.isBarline) {
            if (currentMeasureNotes.length === 0 && currentBeats === 0) {
                // Barline at the exact start of a new measure
                currentStartBar = note.barlineType;
            } else {
                // Barline in the middle or end of a measure, close it and start a new one
                measures.push({
                    notes: currentMeasureNotes,
                    hasOverflow: currentBeats > maxBeats,
                    currentBeats,
                    maxBeats,
                    startBar: currentStartBar,
                    endBar: note.barlineType,
                });
                currentMeasureNotes = [];
                currentBeats = 0;
                currentStartBar = undefined;
            }
            continue; // Barlines themselves are not tickables
        }

        const beats = getDurationBeats(note);

        if (currentBeats + beats > maxBeats + 0.001) {
            // It overflows the current measure.
            if (currentMeasureNotes.length > 0) {
                measures.push({
                    notes: currentMeasureNotes,
                    hasOverflow: false,
                    currentBeats,
                    maxBeats,
                    startBar: currentStartBar,
                });
                currentStartBar = undefined;
            }

            if (beats > maxBeats + 0.001) {
                measures.push({
                    notes: [note],
                    hasOverflow: true,
                    currentBeats: beats,
                    maxBeats,
                    startBar: currentStartBar,
                });
                currentMeasureNotes = [];
                currentBeats = 0;
                currentStartBar = undefined;
            } else {
                currentMeasureNotes = [note];
                currentBeats = beats;
            }

        } else {
            currentMeasureNotes.push(note);
            currentBeats += beats;

            if (currentBeats === maxBeats) {
                measures.push({
                    notes: currentMeasureNotes,
                    hasOverflow: false,
                    currentBeats,
                    maxBeats,
                    startBar: currentStartBar,
                });
                currentMeasureNotes = [];
                currentBeats = 0;
                currentStartBar = undefined;
            }
        }
    }

    if (currentMeasureNotes.length > 0 || currentStartBar) {
        measures.push({
            notes: currentMeasureNotes,
            hasOverflow: currentBeats > maxBeats,
            currentBeats,
            maxBeats,
            startBar: currentStartBar,
        });
    }

    return measures;
};
