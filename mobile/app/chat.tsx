import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time?: string;
}

const QUICK_PROMPTS = [
  '🌾 गेहूँ की उन्नत खेती व बुवाई समय',
  '🍅 टमाटर में पत्तियां पीली होने का इलाज',
  '💧 ड्रिप सिंचाई के फायदे और सब्सिडी',
  '🌱 जैविक खाद (वर्मीकम्पोस्ट) कैसे बनाएं?',
  '💰 मंडी में सही भाव कैसे पता करें?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'नमस्ते किसान भाई! 🙏 मैं आपका "किसान साथी AI" सलाहकार हूँ।\n\nआप मुझसे फसल, खाद, कीटनाशक, सिंचाई, सरकारी योजनाओं या मंडी भाव के बारे में कोई भी सवाल पूछ सकते हैं।',
      isUser: false,
      time: 'अभी',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const BASE_URL = 'http://localhost:8000';

  const sendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: textToSend,
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build history for context
      const historyPayload = newMessages.map((m) => ({
        isUser: m.isUser,
        text: m.text,
      }));

      const res = await fetch(`${BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (res.ok && data.response) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          text: data.response,
          isUser: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg = data.error || 'क्षमा करें, इस समय उत्तर देने में समस्या आ रही है। कृपया पुनः प्रयास करें।';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            text: errMsg,
            isUser: false,
            time: 'त्रुटि',
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: 'सर्वर से संपर्क नहीं हो पा रहा है। कृपया अपना इंटरनेट कनेक्शन या सर्वर जांचें।',
          isUser: false,
          time: 'त्रुटि',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        text: 'नमस्ते किसान भाई! 🙏 मैं आपका "किसान साथी AI" सलाहकार हूँ।\n\nआप मुझसे फसल, खाद, कीटनाशक, सिंचाई, सरकारी योजनाओं या मंडी भाव के बारे में कोई भी सवाल पूछ सकते हैं।',
        isUser: false,
        time: 'अभी',
      },
    ]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View
        style={[
          styles.messageRow,
          item.isUser ? styles.userRow : styles.aiRow,
        ]}
      >
        {!item.isUser && (
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            item.isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.isUser ? styles.userText : styles.aiText,
            ]}
          >
            {item.text}
          </Text>
          {item.time ? (
            <Text
              style={[
                styles.timeText,
                item.isUser ? styles.userTimeText : styles.aiTimeText,
              ]}
            >
              {item.time}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={Theme.Colors.primary}
            />
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.pageTitle}>KisanSaathi AI</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
            <Text style={styles.subTitle}>Powered by Google Gemini</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClearChat}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Thinking Indicator */}
        {loading && (
          <View style={styles.thinkingBox}>
            <ActivityIndicator size="small" color={Theme.Colors.primary} />
            <Text style={styles.thinkingText}>किसान साथी सोच रहा है...</Text>
          </View>
        )}

        {/* Quick Suggestion Chips */}
        {messages.length <= 2 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsHeader}>त्वरित सुझाव (Quick Questions):</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {QUICK_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => sendMessage(prompt)}
                  disabled={loading}
                >
                  <Text style={styles.chipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="अपनी खेती का सवाल यहाँ पूछें... (Ask in Hindi/English)"
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
            multiline={false}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.Colors.primary,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.Colors.primary,
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Theme.Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aiText: {
    color: '#1E293B',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimeText: {
    color: '#DCFCE7',
  },
  aiTimeText: {
    color: '#94A3B8',
  },
  thinkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  thinkingText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 8,
    fontWeight: '500',
  },
  chipsSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chipsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: Theme.Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
