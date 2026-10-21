import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';

type VoiceState = 'idle' | 'listening' | 'processing' | 'response' | 'error';

const SAMPLE_QUESTIONS_HI = [
  '🌾 गेहूँ में पहला पानी (सिंचाई) कब लगाना चाहिए?',
  '🍅 टमाटर की पत्तियाँ पीली हो रही हैं, क्या करूँ?',
  '🌱 यूरिया और DAP खाद डालने का सही समय क्या है?',
  '💧 ड्रिप सिंचाई पर सरकारी सब्सिडी कैसे मिलेगी?',
  '💰 आज गेहूँ और सरसों का मंडी भाव क्या है?',
  '🥔 आलू में झुलसा रोग से बचाव के उपाय बताइए',
];

const SAMPLE_QUESTIONS_EN = [
  '🌾 When should I irrigate wheat for the first time?',
  '🍅 Tomato leaves are turning yellow, how to cure it?',
  '🌱 Best time to apply Urea and DAP fertilizer?',
  '💧 How to get government subsidy on drip irrigation?',
  '💰 What is the market price of wheat today?',
  '🥔 How to protect potato crops from blight disease?',
];

export default function VoiceAssistantScreen() {
  const [state, setState] = useState<VoiceState>('idle');
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const recognitionRef = useRef<any>(null);
  const BASE_URL = 'http://localhost:8000';

  // Stop speech when unmounting
  useEffect(() => {
    return () => {
      stopSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const stopSpeech = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsSpeaking(false);
  };

  const speakText = (text: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        // Remove markdown asterisks or special characters for cleaner speech
        const cleanText = text.replace(/[*#_`]/g, '').slice(0, 300);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  };

  const queryGemini = async (question: string) => {
    setState('processing');
    setErrorMessage('');
    stopSpeech();

    try {
      const res = await fetch(`${BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
        }),
      });

      const data = await res.json();
      if (res.ok && data.response) {
        setAiResponse(data.response);
        setState('response');
        speakText(data.response);
      } else {
        const err = data.error || 'उत्तर प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।';
        setErrorMessage(err);
        setState('error');
      }
    } catch (err) {
      setErrorMessage('सर्वर से संपर्क नहीं हो पाया। कृपया इंटरनेट कनेक्शन जांचें।');
      setState('error');
    }
  };

  const startListening = () => {
    stopSpeech();
    setTranscript('');
    setAiResponse('');
    setErrorMessage('');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
          recognition.interimResults = true;
          recognition.continuous = false;

          recognition.onstart = () => {
            setState('listening');
          };

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              current += event.results[i][0].transcript;
            }
            if (current) {
              setTranscript(current);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech error:', event.error);
            if (event.error === 'not-allowed') {
              setErrorMessage('माइक्रोफ़ोन की अनुमति नहीं है। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन चालू करें।');
            } else if (event.error === 'no-speech') {
              setErrorMessage('कोई आवाज़ नहीं सुनी गई। कृपया पुनः माइक दबाकर बोलें।');
            } else {
              setErrorMessage(`आवाज़ पहचानने में त्रुटि: ${event.error}`);
            }
            setState('error');
          };

          recognition.onend = () => {
            if (transcript.trim()) {
              queryGemini(transcript.trim());
            } else {
              setState((prev) => (prev === 'listening' ? 'idle' : prev));
            }
          };

          recognition.start();
          return;
        } catch (e) {
          console.warn('Recognition start failed', e);
        }
      }
    }

    // Fallback if SpeechRecognition not supported in browser or on native:
    // Prompt with sample or open input
    setState('listening');
    setShowManualInput(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (transcript.trim()) {
      queryGemini(transcript.trim());
    } else {
      setState('idle');
    }
  };

  const handleMicToggle = () => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleQuestionSelect = (q: string) => {
    setTranscript(q);
    queryGemini(q);
  };

  const sampleQuestions = lang === 'hi' ? SAMPLE_QUESTIONS_HI : SAMPLE_QUESTIONS_EN;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Ask KisanSaathi AI</Text>
          <Text style={styles.headerSubtitle}>
            {lang === 'hi' ? 'बोलकर पूछें (Voice Assistant)' : 'Voice Agricultural Assistant'}
          </Text>
        </View>
        {/* Language switch */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}
        >
          <Text style={styles.langBtnText}>{lang === 'hi' ? '🇮🇳 हिंदी' : '🌐 EN'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status / Transcript / Response Area */}
        <View style={styles.statusArea}>
          {state === 'idle' && (
            <View style={styles.idleBox}>
              <MaterialCommunityIcons name="microphone-outline" size={44} color="#16A34A" />
              <Text style={styles.statusText}>
                {lang === 'hi'
                  ? 'नीचे दिए गए माइक बटन को दबाएं और अपनी खेती से जुड़ा कोई भी सवाल बोलें।'
                  : 'Tap the microphone below and ask any farming or crop question.'}
              </Text>
            </View>
          )}

          {state === 'listening' && (
            <View style={styles.listeningBox}>
              <View style={styles.soundWaveRow}>
                <View style={[styles.waveBar, { height: 24 }]} />
                <View style={[styles.waveBar, { height: 40 }]} />
                <View style={[styles.waveBar, { height: 56 }]} />
                <View style={[styles.waveBar, { height: 32 }]} />
                <View style={[styles.waveBar, { height: 48 }]} />
              </View>
              <Text style={styles.listeningText}>
                {lang === 'hi' ? 'सुन रहा हूँ... बोलिए' : 'Listening... speak now'}
              </Text>
              {transcript ? (
                <View style={styles.transcriptCard}>
                  <Text style={styles.transcriptLabel}>
                    {lang === 'hi' ? 'आप बोल रहे हैं:' : 'You said:'}
                  </Text>
                  <Text style={styles.transcriptText}>"{transcript}"</Text>
                </View>
              ) : null}
            </View>
          )}

          {state === 'processing' && (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.processingText}>
                {lang === 'hi' ? 'किसान साथी AI सोच रहा है...' : 'KisanSaathi AI is preparing your answer...'}
              </Text>
              {transcript ? (
                <Text style={styles.processingQuestion}>"{transcript}"</Text>
              ) : null}
            </View>
          )}

          {state === 'error' && (
            <Card style={styles.errorCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setState('idle')}
              >
                <Text style={styles.retryBtnText}>पुनः प्रयास करें</Text>
              </TouchableOpacity>
            </Card>
          )}

          {state === 'response' && (
            <Card style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="robot" size={22} color="#16A34A" />
                  <Text style={styles.responseTitle}>KisanSaathi AI</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.audioActionBtn}
                    onPress={() => (isSpeaking ? stopSpeech() : speakText(aiResponse))}
                  >
                    <MaterialCommunityIcons
                      name={isSpeaking ? 'volume-off' : 'volume-high'}
                      size={20}
                      color={isSpeaking ? '#DC2626' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.audioActionText,
                        isSpeaking && { color: '#DC2626' },
                      ]}
                    >
                      {isSpeaking ? 'रोकें' : 'सुनें'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {transcript ? (
                <View style={styles.questionEchoBox}>
                  <Text style={styles.questionEchoLabel}>सवाल:</Text>
                  <Text style={styles.questionEchoText}>{transcript}</Text>
                </View>
              ) : null}

              <Text style={styles.responseText}>{aiResponse}</Text>

              <View style={styles.responseFooter}>
                <TouchableOpacity
                  style={styles.chatRedirectBtn}
                  onPress={() => router.push('/chat')}
                >
                  <MaterialCommunityIcons name="chat-outline" size={18} color="#16A34A" />
                  <Text style={styles.chatRedirectText}>चैटबॉट में पूरी बातचीत देखें</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </View>

        {/* Central Glowing Mic Button */}
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[
              styles.micBtn,
              state === 'listening' && styles.micListening,
              state === 'processing' && styles.micProcessing,
            ]}
            onPress={handleMicToggle}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={
                state === 'listening'
                  ? 'stop'
                  : state === 'processing'
                  ? 'dots-horizontal'
                  : 'microphone'
              }
              size={48}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.micSubText}>
            {state === 'listening'
              ? lang === 'hi'
                ? 'रोकने के लिए टैप करें'
                : 'Tap to stop'
              : lang === 'hi'
              ? 'बोलने के लिए माइक दबाएं'
              : 'Tap to speak'}
          </Text>
        </View>

        {/* Or Type Manual Question Toggle */}
        <View style={styles.manualSection}>
          <TouchableOpacity
            style={styles.toggleManualBtn}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <MaterialCommunityIcons
              name={showManualInput ? 'chevron-up' : 'keyboard-outline'}
              size={18}
              color="#64748B"
            />
            <Text style={styles.toggleManualText}>
              {showManualInput ? 'कीबोर्ड छुपाएं' : 'या लिखकर पूछें (Type instead)'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualTextInput}
                placeholder={lang === 'hi' ? 'खेती का सवाल यहाँ लिखें...' : 'Type farming question...'}
                value={manualText}
                onChangeText={setManualText}
                onSubmitEditing={() => {
                  if (manualText.trim()) {
                    handleQuestionSelect(manualText.trim());
                    setManualText('');
                  }
                }}
              />
              <TouchableOpacity
                style={styles.manualSendBtn}
                onPress={() => {
                  if (manualText.trim()) {
                    handleQuestionSelect(manualText.trim());
                    setManualText('');
                  }
                }}
              >
                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Suggested Voice Questions */}
        <View style={styles.suggestions}>
          <View style={styles.suggestionTitleRow}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#D97706" />
            <Text style={styles.suggestionsTitle}>
              {lang === 'hi' ? 'अक्सर पूछे जाने वाले सवाल (टैप करें):' : 'Frequently Asked Farming Questions:'}
            </Text>
          </View>
          {sampleQuestions.map((q, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionPill}
              onPress={() => handleQuestionSelect(q)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  statusArea: {
    width: '100%',
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  idleBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  listeningBox: {
    alignItems: 'center',
    width: '100%',
  },
  soundWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
    marginBottom: 10,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#16A34A',
    borderRadius: 3,
  },
  listeningText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  transcriptLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  transcriptText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 4,
  },
  processingBox: {
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    fontSize: 15,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 12,
  },
  processingQuestion: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  responseCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  audioActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  audioActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  questionEchoBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  questionEchoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  questionEchoText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  responseText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1E293B',
  },
  responseFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  chatRedirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chatRedirectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  micContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  micBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  micListening: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 1.08 }],
    shadowColor: '#DC2626',
  },
  micProcessing: {
    backgroundColor: '#D97706',
    shadowColor: '#D97706',
  },
  micSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },
  manualSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  toggleManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  toggleManualText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  manualInputRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 8,
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  manualSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    width: '100%',
    marginTop: 10,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  suggestionPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
});
