import { useEffect, useRef, useState } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental as VexAccidental, RenderContext, StaveConnector, Annotation, Dot, StaveTie, TextDynamics, Barline } from "vexflow";
import { useSongStore } from "@/store/useSongStore";
import { calculateMeasures } from "@/utils/measureUtils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function StandardNotation() {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastClickRef = useRef<{ id: string | null, time: number }>({ id: null, time: 0 });
    const { tracks, config, selectedNoteId, setSelectedNoteId, editorState, updateEditorState } = useSongStore();
    const [overflowWarning, setOverflowWarning] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Group notes into measures FOR EACH TRACK
        const trackMeasures = tracks.map(track => calculateMeasures(track.notes, config));

        // Check for any overflow across all tracks
        const hasAnyOverflow = trackMeasures.some(measures => measures.some(m => m.hasOverflow));
        setOverflowWarning(hasAnyOverflow);

        const maxMeasuresCount = Math.max(...trackMeasures.map(m => m.length), 0);

        // Page Metrics
        const SYSTEM_WIDTH = 800; // Simulated A4 width
        const PAGE_HEIGHT = 1131; // A4 height ratio
        const PAGE_MARGIN_TOP = 40; // Reduced padding
        const PAGE_MARGIN_BOTTOM = 40; // Reduced padding
        const PAGE_GAP = 40;

        const measureWidth = 250;
        const measuresPerSystem = Math.max(1, Math.floor((SYSTEM_WIDTH - 80) / measureWidth));

        // Calculate total systems to determine renderer height
        const totalSystems = Math.max(1, Math.ceil(maxMeasuresCount / measuresPerSystem));

        // Height depends on number of staves (piano takes 2)
        const staveHeight = 120;
        let totalStaves = 0;
        tracks.forEach(t => {
            totalStaves += (t.instrument === "piano" ? 2 : 1);
        });

        const systemHeight = totalStaves * staveHeight + 60;
        const usablePageHeight = PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM;
        const systemsPerPage = Math.max(1, Math.floor(usablePageHeight / systemHeight));
        const totalPages = Math.max(1, Math.ceil(totalSystems / systemsPerPage));

        // Horizontal layout: totalSvgWidth = totalPages * width + gaps
        const totalSvgWidth = totalPages * SYSTEM_WIDTH + Math.max(0, totalPages - 1) * PAGE_GAP;
        const totalSvgHeight = PAGE_HEIGHT;

        // Clear previous render
        containerRef.current.innerHTML = "";

        const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
        renderer.resize(totalSvgWidth, totalSvgHeight);

        const context = renderer.getContext() as RenderContext;
        // SVG background is transparent to let CSS paper pages show through
        context.setFont("Arial", 10, "");

        if (maxMeasuresCount === 0) {
            // Draw empty staves for all tracks
            let yPos = 40;
            const emptyStaves: Stave[] = [];

            tracks.forEach(track => {
                const isPiano = track.instrument === "piano";

                if (isPiano) {
                    const staveTreble = new Stave(20, yPos, SYSTEM_WIDTH - 40);
                    staveTreble.addClef("treble").addTimeSignature(`${config.timeSignature[0]}/${config.timeSignature[1]}`);
                    staveTreble.addKeySignature(config.keySignature);
                    staveTreble.setContext(context).draw();
                    emptyStaves.push(staveTreble);

                    yPos += staveHeight;

                    const staveBass = new Stave(20, yPos, SYSTEM_WIDTH - 40);
                    staveBass.addClef("bass").addTimeSignature(`${config.timeSignature[0]}/${config.timeSignature[1]}`);
                    staveBass.addKeySignature(config.keySignature);
                    staveBass.setContext(context).draw();
                    emptyStaves.push(staveBass);

                    // Grand staff brace
                    new StaveConnector(staveTreble, staveBass).setType(StaveConnector.type.BRACE).setContext(context).draw();
                    new StaveConnector(staveTreble, staveBass).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();

                    yPos += staveHeight;
                } else {
                    const stave = new Stave(20, yPos, SYSTEM_WIDTH - 40);
                    stave.addClef(track.clef).addTimeSignature(`${config.timeSignature[0]}/${config.timeSignature[1]}`);
                    stave.addKeySignature(config.keySignature);
                    stave.setContext(context).draw();

                    emptyStaves.push(stave);
                    yPos += staveHeight;
                }
            });

            // Connect staves if > 1 track (meaning totalStaves > 1)
            // But we only bracket the outermost if there are multiple lines that aren't already braced
            if (emptyStaves.length > 1) {
                new StaveConnector(emptyStaves[0], emptyStaves[emptyStaves.length - 1])
                    .setType(StaveConnector.type.BRACKET)
                    .setContext(context)
                    .draw();

                new StaveConnector(emptyStaves[0], emptyStaves[emptyStaves.length - 1])
                    .setType(StaveConnector.type.SINGLE_LEFT)
                    .setContext(context)
                    .draw();
            }
            return;
        }

        let currX = 20;
        const allRenderedNotes: StaveNote[] = [];

        for (let mIndex = 0; mIndex < maxMeasuresCount; mIndex++) {
            const isSystemStart = mIndex % measuresPerSystem === 0;
            const currentSystemIndex = Math.floor(mIndex / measuresPerSystem);

            const pageIndex = Math.floor(currentSystemIndex / systemsPerPage);
            const systemIndexOnPage = currentSystemIndex % systemsPerPage;

            if (isSystemStart) {
                currX = (pageIndex * (SYSTEM_WIDTH + PAGE_GAP)) + 80; // Start further right to leave room for instrument names, shifted by page
            }

            const width = isSystemStart ? measureWidth + 50 : measureWidth;
            const systemOffsetY = PAGE_MARGIN_TOP + (systemIndexOnPage * systemHeight);

            let yPos = systemOffsetY;
            const measureStaves: Stave[] = [];
            const measureVoices: Voice[] = [];

            // Draw Staves and create Voices for each Track in this column
            tracks.forEach((track, tIndex) => {
                const measures = trackMeasures[tIndex];
                const measure = measures[mIndex]; // might be undefined if this track has fewer measures
                const isPiano = track.instrument === "piano";
                const isGenericTrackName = /^Track\s*\d*$/i.test(track.name);
                const displayName = isGenericTrackName ? track.instrument.charAt(0).toUpperCase() + track.instrument.slice(1) : track.name;

                if (isPiano) {
                    const staveTreble = new Stave(currX, yPos, width);
                    const staveBass = new Stave(currX, yPos + staveHeight, width);

                    if (isSystemStart) {
                        staveTreble.addClef("treble").addKeySignature(config.keySignature);
                        staveBass.addClef("bass").addKeySignature(config.keySignature);

                        if (mIndex === 0) {
                            staveTreble.addTimeSignature(`${config.timeSignature[0]}/${config.timeSignature[1]}`);
                            staveBass.addTimeSignature(`${config.timeSignature[0]}/${config.timeSignature[1]}`);
                        }

                        // Track label disabled to reduce visual clutter

                        new StaveConnector(staveTreble, staveBass).setType(StaveConnector.type.BRACE).setContext(context).draw();
                        new StaveConnector(staveTreble, staveBass).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();
                    }

                    if (measure?.startBar) {
                        staveTreble.setBegBarType(getVexBarline(measure.startBar));
                        staveBass.setBegBarType(getVexBarline(measure.startBar));
                    }
                    if (measure?.endBar) {
                        staveTreble.setEndBarType(getVexBarline(measure.endBar));
                        staveBass.setEndBarType(getVexBarline(measure.endBar));
                    }

                    measureStaves.push(staveTreble, staveBass);

                    // Draw Stave Highlight if Targeted
                    if (editorState.activeTargetClef === "treble") {
                        context.save();
                        context.setFillStyle("rgba(59, 130, 246, 0.05)"); // faint blue
                        context.fillRect(currX, yPos + 20, width, staveHeight - 40);
                        // Left accent border
                        context.setFillStyle("rgba(59, 130, 246, 0.5)");
                        context.fillRect(currX, yPos + 20, 2, staveHeight - 40);
                        context.restore();
                    }
                    if (editorState.activeTargetClef === "bass") {
                        context.save();
                        context.setFillStyle("rgba(59, 130, 246, 0.05)");
                        context.fillRect(currX, yPos + staveHeight + 20, width, staveHeight - 40);
                        // Left accent border
                        context.setFillStyle("rgba(59, 130, 246, 0.5)");
                        context.fillRect(currX, yPos + staveHeight + 20, 2, staveHeight - 40);
                        context.restore();
                    }

                    if (measure && measure.notes.length > 0) {
                        const trebleNotes: StaveNote[] = [];
                        const bassNotes: StaveNote[] = [];

                        measure.notes.forEach((note) => {
                            const durationStr = note.isRest ? `${note.duration}r` : note.duration;

                            if (note.isRest) {
                                const makeRest = (clef: string, key: string) => {
                                    const sn = new StaveNote({ clef, keys: [key], duration: durationStr });
                                    sn.addClass(`note-${note.id}`);
                                    return sn;
                                };

                                if (note.staveTarget === "treble") {
                                    trebleNotes.push(makeRest("treble", "b/4"));
                                } else if (note.staveTarget === "bass") {
                                    bassNotes.push(makeRest("bass", "d/3"));
                                } else {
                                    trebleNotes.push(makeRest("treble", "b/4"));
                                    bassNotes.push(makeRest("bass", "d/3"));
                                }
                            } else {
                                const trebleKeys: string[] = [];
                                const bassKeys: string[] = [];
                                const trebleMods: { acc: string; index: number }[] = [];
                                const bassMods: { acc: string; index: number }[] = [];

                                note.pitches.forEach(p => {
                                    // Split at C4 (Middle C). Anything >= 4 goes to treble.
                                    let isTreb = p.octave >= 4;

                                    if (note.staveTarget === "treble") isTreb = true;
                                    if (note.staveTarget === "bass") isTreb = false;

                                    // VexFlow requires lowercase note names
                                    const keyStr = `${p.pitch.toLowerCase()}/${p.octave}`;

                                    let vexAcc = "";
                                    if (p.accidental === "sharp") vexAcc = "#";
                                    if (p.accidental === "flat") vexAcc = "b";
                                    if (p.accidental === "natural") vexAcc = "n";

                                    if (isTreb) {
                                        if (vexAcc) trebleMods.push({ acc: vexAcc, index: trebleKeys.length });
                                        trebleKeys.push(keyStr);
                                    } else {
                                        if (vexAcc) bassMods.push({ acc: vexAcc, index: bassKeys.length });
                                        bassKeys.push(keyStr);
                                    }
                                });

                                const makeStaveNote = (keys: string[], mods: any[], targetClef: string) => {
                                    if (keys.length === 0) {
                                        // If a hand is not playing this chord, draw a generic rest for it
                                        // Vexflow rests need an 'r' at the end of duration and specific generic keys
                                        const restKey = targetClef === "treble" ? "b/4" : "d/3";
                                        const restDuration = note.isRest ? `${note.duration}r` : `${note.duration}r`;
                                        const rsn = new StaveNote({ clef: targetClef, keys: [restKey], duration: restDuration });
                                        rsn.addClass(`note-${note.id}`);
                                        return rsn;
                                    }
                                    const sn = new StaveNote({ clef: targetClef, keys, duration: note.isDotted ? `${note.duration}d` : note.duration, autoStem: true });
                                    mods.forEach(m => sn.addModifier(new VexAccidental(m.acc), m.index));

                                    if (note.isDotted) {
                                        Dot.buildAndAttach([sn]);
                                    }

                                    if (note.lyric && targetClef === "treble") { // Only attach lyric to treble to avoid overlap
                                        sn.addModifier(new Annotation(note.lyric), 0);
                                    }
                                    if (note.expression && targetClef === "treble") { // Attach dynamics below the staff
                                        sn.addModifier(new Annotation(note.expression).setVerticalJustification(Annotation.VerticalJustify.BOTTOM).setFont("Times", 12, "italic"), 0);
                                    }

                                    if (measure.hasOverflow && measure.currentBeats > measure.maxBeats) {
                                        sn.setStyle({ fillStyle: "red", strokeStyle: "red" });
                                    }

                                    // Store the original note ID in the stave note for Tie logic & Click Detection
                                    sn.addClass(`note-${note.id}`);
                                    if (note.tieToNext) {
                                        sn.setAttribute("tieToNext", "true");
                                    }

                                    return sn;
                                };

                                trebleNotes.push(makeStaveNote(trebleKeys, trebleMods, "treble"));
                                bassNotes.push(makeStaveNote(bassKeys, bassMods, "bass"));
                            }
                        });

                        const voiceBeats = Math.max(measure.maxBeats, Math.ceil(measure.currentBeats));

                        const vTreble = new Voice({ numBeats: voiceBeats, beatValue: 4 });
                        vTreble.setMode(Voice.Mode.SOFT);
                        vTreble.addTickables(trebleNotes);

                        const vBass = new Voice({ numBeats: voiceBeats, beatValue: 4 });
                        vBass.setMode(Voice.Mode.SOFT);
                        vBass.addTickables(bassNotes);

                        measureVoices.push(vTreble, vBass);
                    } else {
                        // Empty measure padding
                        const restT = new StaveNote({ keys: ["b/4"], duration: "1r" });
                        const restB = new StaveNote({ clef: "bass", keys: ["d/3"], duration: "1r" });
                        const vT = new Voice({ numBeats: config.timeSignature[0] * (4 / config.timeSignature[1]), beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([restT]);
                        const vB = new Voice({ numBeats: config.timeSignature[0] * (4 / config.timeSignature[1]), beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([restB]);
                        measureVoices.push(vT, vB);
                    }

                    yPos += staveHeight * 2;

                } else {
                    // Normal Non-Piano Instrument Logic
                    const stave = new Stave(currX, yPos, width);

                    if (isSystemStart) {
                        stave.addClef(track.clef).addKeySignature(config.keySignature);

                        if (mIndex === 0) {
                            stave.addTimeSignature(`${config.timeSignature[0]}/${config.timeSignature[1]}`);
                        }

                        // Track label disabled to reduce visual clutter
                    }

                    if (measure?.startBar) {
                        stave.setBegBarType(getVexBarline(measure.startBar));
                    }
                    if (measure?.endBar) {
                        stave.setEndBarType(getVexBarline(measure.endBar));
                    }

                    measureStaves.push(stave);

                    if (measure && measure.notes.length > 0) {
                        const vexNotes: StaveNote[] = measure.notes.map((note) => {
                            const durationStr = note.isRest ? `${note.duration}r` : (note.isDotted ? `${note.duration}d` : note.duration);

                            const keys = note.isRest
                                ? [track.clef === "bass" ? "d/3" : "b/4"]
                                : note.pitches.map(p => `${p.pitch.toLowerCase()}/${p.octave}`);

                            const staveNote = new StaveNote({
                                clef: track.clef,
                                keys: keys,
                                duration: durationStr,
                                autoStem: true,
                            });

                            if (!note.isRest && note.pitches) {
                                note.pitches.forEach((p, index) => {
                                    if (p.accidental !== "none") {
                                        let vexAcc = "";
                                        if (p.accidental === "sharp") vexAcc = "#";
                                        if (p.accidental === "flat") vexAcc = "b";
                                        if (p.accidental === "natural") vexAcc = "n";
                                        if (vexAcc) staveNote.addModifier(new VexAccidental(vexAcc), index);
                                    }
                                });
                            }

                            if (note.isDotted && !note.isRest) {
                                Dot.buildAndAttach([staveNote]);
                            }
                            if (note.lyric) {
                                staveNote.addModifier(new Annotation(note.lyric), 0);
                            }
                            if (note.expression) {
                                staveNote.addModifier(new Annotation(note.expression).setVerticalJustification(Annotation.VerticalJustify.BOTTOM).setFont("Times", 12, "italic"), 0);
                            }

                            if (measure.hasOverflow && measure.currentBeats > measure.maxBeats) {
                                staveNote.setStyle({ fillStyle: "red", strokeStyle: "red" });
                            }

                            staveNote.addClass(`note-${note.id}`);
                            if (note.tieToNext) {
                                staveNote.setAttribute("tieToNext", "true");
                            }

                            return staveNote;
                        });

                        const voiceBeats = Math.max(measure.maxBeats, Math.ceil(measure.currentBeats));
                        const voice = new Voice({ numBeats: voiceBeats, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables(vexNotes);
                        measureVoices.push(voice);
                    } else {
                        const rest = new StaveNote({ keys: [track.clef === "bass" ? "d/3" : "b/4"], duration: "1r" });
                        const voice = new Voice({ numBeats: config.timeSignature[0] * (4 / config.timeSignature[1]), beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([rest]);
                        measureVoices.push(voice);
                    }

                    yPos += staveHeight;
                }
            });

            // Format all voices in this measure column together
            if (measureVoices.length > 0) {
                new Formatter().joinVoices(measureVoices).format(measureVoices, width - (isSystemStart ? 70 : 20));
            }

            // Draw everything for this column
            measureStaves.forEach((stave, sIndex) => {
                stave.setContext(context).draw();
                if (measureVoices[sIndex]) {
                    measureVoices[sIndex].draw(context, stave);
                }
            });

            // Connect staves vertically with a bracket if there are multiple tracks/staves
            if (measureStaves.length > 1 && isSystemStart) {
                new StaveConnector(measureStaves[0], measureStaves[measureStaves.length - 1])
                    .setType(StaveConnector.type.BRACKET)
                    .setContext(context)
                    .draw();
            }
            // Always draw the outside border left line
            if (measureStaves.length > 1) {
                new StaveConnector(measureStaves[0], measureStaves[measureStaves.length - 1])
                    .setType(StaveConnector.type.SINGLE_LEFT)
                    .setContext(context)
                    .draw();
            }

            // Draw right line if it's the last measure of a system or the very last measure
            const isSystemEnd = ((mIndex + 1) % measuresPerSystem === 0) || (mIndex === maxMeasuresCount - 1);
            if (measureStaves.length > 1 && isSystemEnd) {
                new StaveConnector(measureStaves[0], measureStaves[measureStaves.length - 1])
                    .setType(StaveConnector.type.SINGLE_RIGHT)
                    .setContext(context)
                    .draw();
            }

            currX += width;

            // Collect all StaveNotes rendered in this column, we'll draw ties across them later
            measureVoices.forEach(voice => {
                const tickables = voice.getTickables();
                tickables.forEach(t => {
                    if (t instanceof StaveNote && t.getAttribute("id")) {
                        allRenderedNotes.push(t);
                    }
                });
            });
        }

        // Draw Ties
        const tiesToDraw: StaveTie[] = [];
        for (let i = 0; i < allRenderedNotes.length; i++) {
            const note = allRenderedNotes[i];
            if (note.getAttribute("tieToNext") === "true" && i + 1 < allRenderedNotes.length) {
                const nextNote = allRenderedNotes[i + 1];
                // Check if they are in the same track/stave generally by comparing their Y position or assuming sequential
                // For a simple tie, we just tie it to the next note rendered for that track.
                // Since allRenderedNotes contains all voices mixed, we need to find the next note ON THE SAME LINE.
                // It's safer to find the next note with the same clef and roughly same Y position, or maintain a per-track list.
                // To keep it simple, we just tie to the literal next note played. In a multi-track setup, this is tricky.

                // Let's find the next note in the same "line" (y-coordinate)
                let targetNote = null;
                for (let j = i + 1; j < allRenderedNotes.length; j++) {
                    const targetStave = allRenderedNotes[j].getStave();
                    if (targetStave && Math.abs(targetStave.getYForLine(0) - (note.getStave()?.getYForLine(0) ?? 0)) < 10) {
                        targetNote = allRenderedNotes[j];
                        break;
                    }
                }

                if (targetNote) {
                    tiesToDraw.push(new StaveTie({
                        firstNote: note,
                        lastNote: targetNote,
                        firstIndexes: [0],
                        lastIndexes: [0]
                    }));
                }
            }
        }

        tiesToDraw.forEach(tie => tie.setContext(context).draw());

        // We run initial selection sync manually immediately after draw, in case a note was selected.
        if (selectedNoteId) {
            const activeNote = containerRef.current.querySelector(`.note-${selectedNoteId}`);
            if (activeNote) {
                activeNote.classList.add('notation-selected');
                activeNote.querySelectorAll('path').forEach(p => {
                    p.classList.add('notation-selected-path');
                });
            }
        }

    }, [tracks, config]); // Removed selectedNoteId from heavy render deps

    // Lightweight Effect: Sync selection styling instantly without redrawing entire canvas
    useEffect(() => {
        if (!containerRef.current) return;

        // Strip previous selection
        const notes = containerRef.current.querySelectorAll('.notation-selected');
        notes.forEach(note => {
            note.classList.remove('notation-selected');
            note.querySelectorAll('.notation-selected-path').forEach(p => {
                p.classList.remove('notation-selected-path');
            });
        });

        // Apply new selection
        if (selectedNoteId) {
            const activeNote = containerRef.current.querySelector(`.note-${selectedNoteId}`);
            if (activeNote) {
                activeNote.classList.add('notation-selected');
                activeNote.querySelectorAll('path').forEach(p => {
                    p.classList.add('notation-selected-path');
                });
            }
        }
    }, [selectedNoteId]);

    // Values needed for UI wrapper calculation
    const trackMeasures = tracks.map(track => calculateMeasures(track.notes, config));
    const maxMeasuresCount = Math.max(...trackMeasures.map(m => m.length), 0);
    const SYSTEM_WIDTH = 800;
    const PAGE_HEIGHT = 1131;
    const PAGE_MARGIN_TOP = 40;
    const PAGE_MARGIN_BOTTOM = 40;
    const PAGE_GAP = 40;
    const measureWidth = 250;
    const measuresPerSystem = Math.max(1, Math.floor((SYSTEM_WIDTH - 80) / measureWidth));
    const totalSystems = Math.max(1, Math.ceil(maxMeasuresCount / measuresPerSystem));
    const staveHeight = 120;
    let totalStaves = 0;
    tracks.forEach(t => { totalStaves += (t.instrument === "piano" ? 2 : 1); });
    const systemHeight = totalStaves * staveHeight + 60;
    const usablePageHeight = PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM;
    const systemsPerPage = Math.max(1, Math.floor(usablePageHeight / systemHeight));
    const totalPages = Math.max(1, Math.ceil(totalSystems / systemsPerPage));
    const totalSvgWidth = totalPages * SYSTEM_WIDTH + Math.max(0, totalPages - 1) * PAGE_GAP;
    const totalSvgHeight = PAGE_HEIGHT;

    const zoomScale = config.zoom / 100;

    // Reset page if bounds change
    useEffect(() => {
        if (currentPage >= totalPages && totalPages > 0) {
            setCurrentPage(totalPages - 1);
        }
    }, [totalPages, currentPage]);

    const extractNoteId = (element: Element | null): string | null => {
        if (!element) return null;
        for (const cls of Array.from(element.classList)) {
            const match = cls.match(/^note-([a-zA-Z0-9-]+)$/);
            if (match) {
                return match[1];
            }
        }
        return null;
    };

    const handleSvgClick = (e: React.MouseEvent) => {
        let closestNoteId: string | null = null;

        // 1. Exact DOM Hit (clicks explicitly on the note path)
        const target = e.target as Element;
        const noteGroup = target.closest('.vf-stavenote');
        if (noteGroup) {
            closestNoteId = extractNoteId(noteGroup);
        }

        // 2. Bounding Box Area Hit (Fallback for difficult tiny noteheads)
        if (!closestNoteId) {
            const notes = document.querySelectorAll('.vf-stavenote');
            let minDistance = Infinity;

            notes.forEach(noteNode => {
                const extractedId = extractNoteId(noteNode);
                if (!extractedId) return; // Ignore VexFlow filler elements without our UUID

                const rect = noteNode.getBoundingClientRect();

                // Check if click is anywhere near the bounding box (15px padding)
                if (
                    e.clientX >= rect.left - 15 &&
                    e.clientX <= rect.right + 15 &&
                    e.clientY >= rect.top - 15 &&
                    e.clientY <= rect.bottom + 15
                ) {
                    // Calculate distance to center
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

                    if (dist < minDistance) {
                        minDistance = dist;
                        closestNoteId = extractedId;
                    }
                }
            });
        }

        const now = Date.now();
        lastClickRef.current = { id: closestNoteId, time: now };

        if (closestNoteId) {
            console.log("Selected note from VexFlow Canvas:", closestNoteId);
            setSelectedNoteId(closestNoteId);
            return; // Stop processing target staves
        }

        // 3. Stave Region Target Detection (Treble or Bass)
        setSelectedNoteId(null);

        // Only Piano uses split clefs currently in our system
        const hasPiano = tracks.some(t => t.instrument === "piano");
        if (!hasPiano) return;

        // Calculate Y-Offset relative to the SVG container
        const svgContainer = containerRef.current;
        if (!svgContainer) return;

        const rect = svgContainer.getBoundingClientRect();
        const yOffsetRaw = e.clientY - rect.top;

        // Adjust Y for current zoom scale and scroll
        const yOff = yOffsetRaw / zoomScale;

        // A very rough calculation: 
        // systems vertically stack. Every system has a certain height `systemHeight`.
        // within that system, Treble is roughly top half, Bass is bottom half.
        // We find which system we are in vertically...
        const systemIndex = Math.floor(yOff / systemHeight);
        const yWithinSystem = yOff - (systemIndex * systemHeight);

        if (yWithinSystem > 20 && yWithinSystem < staveHeight * 2 + 20) {
            if (yWithinSystem < staveHeight + 20) {
                updateEditorState({ activeTargetClef: "treble" });
            } else {
                updateEditorState({ activeTargetClef: "bass" });
            }
        }
    };

    return (
        <div className="w-full flex justify-center bg-slate-100 dark:bg-slate-900 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800 p-6 overflow-hidden relative" style={{ height: "calc(100vh - 200px)" }}>
            <style jsx global>{`
                .notation-selected-path {
                    fill: #3b82f6 !important;
                    stroke: #3b82f6 !important;
                }
            `}</style>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="absolute top-4 right-8 z-50 flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-4 items-center w-full h-full relative">
                {overflowWarning && (
                    <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 text-sm rounded border border-rose-200 dark:border-rose-800 flex items-center gap-2 max-w-[800px] w-full shadow-sm sticky top-0 z-40">
                        <span className="font-bold">Warning:</span> One or more measures exceed the time signature limits (notes marked in red).
                    </div>
                )}

                {/* Scaled workspace wrapper - Horizontally masked to show ONE page at a time */}
                <div
                    className="overflow-hidden flex items-start justify-center"
                    style={{
                        width: SYSTEM_WIDTH * zoomScale,
                        height: PAGE_HEIGHT * zoomScale,
                        marginTop: overflowWarning ? '0' : '20px'
                    }}
                >
                    <div
                        style={{
                            transform: `scale(${zoomScale}) translateX(-${currentPage * (SYSTEM_WIDTH + PAGE_GAP)}px)`,
                            transformOrigin: 'top left',
                            width: `${totalSvgWidth}px`,
                            height: `${PAGE_HEIGHT}px`,
                            position: 'relative',
                            transition: 'transform 0.3s ease-in-out'
                        }}
                    >
                        {/* Background Pages representation */}
                        <div className="absolute inset-0 z-0 flex pointer-events-none" style={{ gap: `${PAGE_GAP}px` }}>
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <div key={i} className="bg-white shadow-xl rounded-sm shrink-0" style={{ width: `${SYSTEM_WIDTH}px`, height: `${PAGE_HEIGHT}px` }} />
                            ))}
                        </div>

                        {/* VexFlow Canvas Container */}
                        <div
                            ref={containerRef}
                            className="absolute inset-0 z-10 cursor-pointer"
                            onClick={handleSvgClick}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function getVexBarline(type: string): number {
    switch (type) {
        case "single": return Barline.type.SINGLE;
        case "double": return Barline.type.DOUBLE;
        case "end": return Barline.type.END;
        case "repeat-begin": return Barline.type.REPEAT_BEGIN;
        case "repeat-end": return Barline.type.REPEAT_END;
        case "repeat-both": return Barline.type.REPEAT_BOTH;
        default: return Barline.type.SINGLE;
    }
}
