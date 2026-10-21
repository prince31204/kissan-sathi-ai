import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MockUser } from '../../services/mockData';
import { Button } from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

export default function ProfileScreen() {
  const { language, toggleLanguage, t } = useLanguage();

  const MENU_ITEMS = [
    { title: t('profile.myFields', 'My Fields'), icon: 'map-marker-radius', route: '/field-monitoring' },
    { title: t('profile.myCrops', 'My Crops'), icon: 'leaf', route: '/(tabs)/crop-health' },
    { title: t('profile.rentals', 'Rental Requests'), icon: 'tractor', route: '/(tabs)/equipment' },
    { title: '🎙️ बोलकर पूछें (Voice Assistant)', icon: 'microphone', route: '/voice-assistant' },
    { title: '🤖 किसान साथी चैट (AI Chatbot)', icon: 'robot', route: '/chat' },
    { title: t('profile.diseaseHistory', 'Disease Analysis History'), icon: 'history', route: '/crop-health/disease-result' },
    { title: t('profile.settings', 'Settings'), icon: 'cog', route: '/profile/settings' },
    { 
      title: language === 'hi' ? 'भाषा: 🇮🇳 हिन्दी (बदलें)' : 'Language: 🌐 English (Switch)', 
      icon: 'translate', 
      isAction: true,
      onPress: toggleLanguage 
    },
    { title: t('profile.helpSupport', 'Help & Support'), icon: 'help-circle', route: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHeader}>
          <Image source={{ uri: MockUser.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{MockUser.name}</Text>
          <Text style={styles.mobile}>{MockUser.mobile}</Text>
          <Text style={styles.location}>{MockUser.village}, {MockUser.district}, {MockUser.state}</Text>
          <Button title={t('profile.editProfile', 'Edit Profile')} variant="outline" style={styles.editBtn} fullWidth={false} />
        </View>

        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.borderBottom]}
              onPress={() => {
                if (item.onPress) item.onPress();
                else if (item.route) router.push(item.route as any);
              }}
            >
              <MaterialCommunityIcons name={item.icon as any} size={24} color={item.isAction ? Theme.Colors.primary : Theme.Colors.textSecondary} />
              <Text style={[styles.menuText, item.isAction && { color: Theme.Colors.primary, fontWeight: '700' }]}>{item.title}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={Theme.Colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        <Button 
          title={t('profile.logout', 'Logout')} 
          variant="outline" 
          onPress={() => router.replace('/(auth)/login')} 
          style={styles.logoutBtn}
          icon={<MaterialCommunityIcons name="logout" size={20} color={Theme.Colors.primary} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  scroll: { padding: Theme.Spacing.lg },
  profileHeader: { alignItems: 'center', marginBottom: Theme.Spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: Theme.Spacing.md, borderWidth: 3, borderColor: Theme.Colors.surface },
  name: { ...Theme.Typography.h2, color: Theme.Colors.text },
  mobile: { ...Theme.Typography.caption, color: Theme.Colors.textSecondary, marginTop: 4 },
  location: { ...Theme.Typography.caption, color: Theme.Colors.textSecondary, marginTop: 2 },
  editBtn: { marginTop: Theme.Spacing.md },
  menuContainer: { backgroundColor: Theme.Colors.surface, borderRadius: Theme.BorderRadius.xl, marginBottom: Theme.Spacing.xl, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Theme.Spacing.md },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Theme.Colors.border },
  menuText: { ...Theme.Typography.bodyMedium, flex: 1, marginLeft: Theme.Spacing.md },
  logoutBtn: { marginBottom: Theme.Spacing.xl },
});
