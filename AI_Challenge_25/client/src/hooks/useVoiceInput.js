// client/src/hooks/useVoiceInput.js

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook для работы с голосовым вводом (Web Speech API)
 */
export function useVoiceInput(
  onResult = () => {},
  onError = () => {},
  language = 'ru-RU'
) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef(null);

  // Проверка поддержки Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Настройки
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language;
      
      // Обработчики событий
      recognitionRef.current.onresult = (event) => {
        const result = event.results[0];
        const text = result[0].transcript;
        const confidence = result[0].confidence;
        
        console.log('🎤 Voice result:', text, `(${(confidence * 100).toFixed(1)}%)`);
        
        setTranscript(text);
        setIsListening(false);
        
        if (onResult) {
          onResult(text, confidence);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('🎤 Voice error:', event.error);
        setError(event.error);
        setIsListening(false);
        
        if (onError) {
          onError(event.error);
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSupported(false);
      console.warn('⚠️ Web Speech API not supported');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onResult, onError]);

  // Начать прослушивание
  const startListening = useCallback(() => {
    if (!isSupported) {
      const err = 'Web Speech API не поддерживается в этом браузере';
      setError(err);
      if (onError) onError(err);
      return;
    }
    
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      setIsListening(true);
      
      try {
        recognitionRef.current.start();
        console.log('🎤 Started listening...');
      } catch (err) {
        console.error('🎤 Start error:', err);
        setError(err.message);
        setIsListening(false);
        if (onError) onError(err.message);
      }
    }
  }, [isSupported, isListening, onError]);

  // Остановить прослушивание
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('🎤 Stopped listening');
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening
  };
}
