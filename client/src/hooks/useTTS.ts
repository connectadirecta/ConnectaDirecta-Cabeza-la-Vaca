import { useEffect, useRef, useState } from "react";

export function useTTS(lang = "es-ES") {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices()
        .filter(v => v.lang?.toLowerCase().startsWith("es"));
      setVoices(list);
      setAvailable(true);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => { 
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null; 
      }
    };
  }, []);

  const speak = (text: string, voiceName?: string) => {
    if (!synthRef.current || !text.trim()) return false;
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.8; // Velocidad más lenta para personas mayores
    utter.volume = 1.0;
    
    if (voiceName) {
      const v = voices.find(v => v.name === voiceName);
      if (v) utter.voice = v;
    } else if (voices[0]) {
      utter.voice = voices[0];
    }
    
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utter.onstart = () => setSpeaking(true);

    // Evita superposiciones
    synthRef.current.cancel();
    synthRef.current.speak(utter);
    return true;
  };

  const stop = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
  };

  return { available, speaking, speak, stop, voices };
}