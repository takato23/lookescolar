'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Command, ChevronRight } from 'lucide-react';

const COMMAND_LOG = [
    { id: 1, text: "Show sales for last week", type: "user", time: "10:42 AM" },
    { id: 2, text: "Here is the sales report for Oct 15-21", type: "system", time: "10:42 AM" },
    { id: 3, text: "Filter by 'Digital Download'", type: "user", time: "10:43 AM" },
    { id: 4, text: "Filtering applied. 45 orders found.", type: "system", time: "10:43 AM" },
];

export default function VoiceCommandMockup() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isListening) {
            const phrases = ["Open settings...", "Create new gallery...", "Export to CSV..."];
            let i = 0;
            const typeWriter = () => {
                if (i < phrases[1].length) {
                    setTranscript(phrases[1].substring(0, i + 1));
                    i++;
                    timeout = setTimeout(typeWriter, 100);
                } else {
                    setTimeout(() => {
                        setIsListening(false);
                        setTranscript("");
                    }, 1000);
                }
            };
            timeout = setTimeout(typeWriter, 500);
        }
        return () => clearTimeout(timeout);
    }, [isListening]);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-yellow-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-yellow-500/20 p-2">
                        <Command className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Voice Control</h3>
                        <p className="text-sm text-slate-400">Hands-free admin actions</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsListening(!isListening)}
                    className={`rounded-full p-3 transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
            </div>

            <div className="flex h-64 flex-col justify-end gap-3 overflow-hidden rounded-xl bg-slate-950/50 p-4 font-mono text-sm">
                {COMMAND_LOG.map((log) => (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex w-max max-w-[90%] flex-col gap-1 rounded-lg px-3 py-2 ${log.type === 'user'
                                ? 'self-end bg-blue-500/20 text-blue-200'
                                : 'self-start bg-slate-800 text-slate-300'
                            }`}
                    >
                        <span>{log.text}</span>
                        <span className="text-[10px] opacity-50">{log.time}</span>
                    </motion.div>
                ))}

                <AnimatePresence>
                    {isListening && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 self-end text-yellow-400"
                        >
                            <span className="h-2 w-2 animate-bounce rounded-full bg-yellow-400"></span>
                            <span className="h-2 w-2 animate-bounce rounded-full bg-yellow-400 delay-75"></span>
                            <span className="h-2 w-2 animate-bounce rounded-full bg-yellow-400 delay-150"></span>
                            <span className="ml-2">{transcript}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Suggested Commands</div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {["Find student...", "Upload photos", "Check revenue"].map((cmd) => (
                        <button key={cmd} className="flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10">
                            {cmd} <ChevronRight className="h-3 w-3 opacity-50" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
