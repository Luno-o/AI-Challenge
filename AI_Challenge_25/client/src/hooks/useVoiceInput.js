import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook для управления Web Speech API
 * @param {Function} onResult - Callback при успешном распознавании
 * @param {Function} onError - Callback при ошибке
 * @param {string} language - Язык распознавания ('ru-RU', 'en-US')
 */
export const useVoiceInput = (onResult, onError = null, language = 'ru-RU') => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const startListening = useCallback(() => {
    if (!isSupported) {
      const err = 'Голосовой ввод не поддерживается в этом браузере. Используйте Chrome или Edge.';
      setError(err);
      onError?.(err);
      return;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('🎤 Начало распознавания речи...');
      };

      recognition.onresult = (event) => {
        const result = event.results[0][0];
        const text = result.transcript;
        const confidence = result.confidence;
        
        console.log('✅ Распознано:', text, `(уверенность: ${(confidence * 100).toFixed(1)}%)`);
        setTranscript(text);
        onResult(text, confidence);
      };

      recognition.onerror = (event) => {
        console.error('❌ Ошибка распознавания:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Ошибка распознавания речи';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'Речь не обнаружена. Попробуйте ещё раз.';
            break;
          case 'audio-capture':
            errorMessage = 'Микрофон не найден или недоступен.';
            break;
          case 'not-allowed':
            errorMessage = 'Доступ к микрофону запрещён. Разрешите в настройках браузера.';
            break;
          case 'network':
            errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
            break;
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('🔴 Распознавание завершено');
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('❌ Ошибка инициализации:', err);
      setError('Не удалось инициализировать распознавание речи');
      setIsListening(false);
    }
  }, [isSupported, language, onResult, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening
  };
};
