import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MockUser } from '../../services/mockData';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useLanguage } from '../../context/LanguageContext';

const PRESET_AVATARS = [
  { id: '1', label: 'किसान भाई', uri: 'https://images.unsplash.com/photo-1595956553066-fe24a8c33395?auto=format&fit=crop&w=300&q=80' },
  { id: '2', label: 'महिला किसान', uri: 'https://images.unsplash.com/photo-1617450365226-9bf28c04e130?auto=format&fit=crop&w=300&q=80' },
  { id: '3', label: 'युवा किसान', uri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80' },
  { id: '4', label: 'वरिष्ठ किसान', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: '5', label: 'स्मार्ट किसान', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { id: '6', label: 'डिफ़ॉल्ट', uri: MockUser.avatar },
];

export default function ProfileScreen() {
  const { language, toggleLanguage, t } = useLanguage();
  const isHindi = language === 'hi';

  const [user, setUser] = useState({
    name: 'Ramesh Singh',
    mobile: '+91 98765 43210',
    email: 'ramesh.farmer@kisansaathi.in',
    village: 'Rampur',
    district: 'Dehradun',
    state: 'Uttarakhand',
    avatar: MockUser.avatar,
  });

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ ...user });
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load user data on focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('userProfile');
      let currentAvatar = MockUser.avatar;
      let userEmail = '';
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) userEmail = parsed.email;
        if (parsed.avatar) currentAvatar = parsed.avatar;
        setUser((prev) => ({
          ...prev,
          name: parsed.name || parsed.fullName || prev.name,
          mobile: parsed.phone || parsed.mobile || prev.mobile,
          email: parsed.email || prev.email,
          village: parsed.village || prev.village,
          district: parsed.district || prev.district,
          state: parsed.state || prev.state,
          avatar: parsed.avatar || prev.avatar || MockUser.avatar,
        }));
      } else {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) {
          setUser((prev) => ({ ...prev, name: storedName }));
        }
      }

      // Check persistent avatar cache
      const cachedGlobalAvatar = await AsyncStorage.getItem('@user_avatar');
      const cachedEmailAvatar = userEmail ? await AsyncStorage.getItem(`@user_avatar_${userEmail.trim().toLowerCase()}`) : null;
      const bestSavedAvatar = cachedEmailAvatar || cachedGlobalAvatar;
      if (bestSavedAvatar) {
        currentAvatar = bestSavedAvatar;
        setUser((prev) => ({ ...prev, avatar: bestSavedAvatar }));
      }

      // Sync from backend if userToken exists
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await fetch('http://localhost:8000/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const remote = await res.json();
          const merged = {
            name: remote.fullName || remote.name || user.name,
            mobile: remote.phone || remote.mobile || user.mobile,
            email: remote.email || user.email,
            village: remote.village || user.village,
            district: remote.district || user.district,
            state: remote.state || user.state,
            avatar: remote.avatar || bestSavedAvatar || currentAvatar || MockUser.avatar,
          };
          setUser(merged);
          await AsyncStorage.setItem('userProfile', JSON.stringify(merged));
          if (merged.name) await AsyncStorage.setItem('userName', merged.name);
          if (merged.avatar) {
            await AsyncStorage.setItem('@user_avatar', merged.avatar);
            if (merged.email) {
              await AsyncStorage.setItem(`@user_avatar_${merged.email.trim().toLowerCase()}`, merged.avatar);
            }
          }
        }
      }
    } catch (e) {
      // offline fallback is safe
    }
  };

  const openEditModal = () => {
    setEditForm({ ...user });
    setShowUrlInput(false);
    setIsEditModalVisible(true);
  };

  // Device file/photo picker for web
  const handleChooseImage = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            const dataUrl = loadEvt.target?.result as string;
            // Compress using HTML5 canvas to keep lightweight
            try {
              const img = new (window as any).Image();
              img.onload = () => {
                const maxSize = 360;
                let w = img.width;
                let h = img.height;
                if (w > h) {
                  if (w > maxSize) {
                    h = Math.round((h * maxSize) / w);
                    w = maxSize;
                  }
                } else {
                  if (h > maxSize) {
                    w = Math.round((w * maxSize) / h);
                    h = maxSize;
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, w, h);
                  const compressed = canvas.toDataURL('image/jpeg', 0.85);
                  setEditForm((prev) => ({ ...prev, avatar: compressed }));
                } else {
                  setEditForm((prev) => ({ ...prev, avatar: dataUrl }));
                }
              };
              img.onerror = () => {
                setEditForm((prev) => ({ ...prev, avatar: dataUrl }));
              };
              img.src = dataUrl;
            } catch (err) {
              setEditForm((prev) => ({ ...prev, avatar: dataUrl }));
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        isHindi ? 'फ़ोटो बदलें' : 'Change Photo',
        isHindi ? 'कृपया नीचे दिए गए अवतारों में से चुनें या इमेज लिंक दर्ज करें।' : 'Please choose from the preset avatars or enter an image link below.'
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      const msg = isHindi ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your name.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Notice', msg);
      return;
    }

    setSaving(true);
    try {
      const updated = {
        ...user,
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        village: editForm.village.trim(),
        district: editForm.district.trim(),
        state: editForm.state.trim(),
        avatar: editForm.avatar || user.avatar || MockUser.avatar,
      };

      // 1. Save locally in AsyncStorage immediately
      setUser(updated);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updated));
      await AsyncStorage.setItem('userName', updated.name);
      if (updated.avatar) {
        await AsyncStorage.setItem('@user_avatar', updated.avatar);
        if (updated.email) {
          await AsyncStorage.setItem(`@user_avatar_${updated.email.trim().toLowerCase()}`, updated.avatar);
        }
      }

      // 2. Try to sync with backend
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        fullName: updated.name,
        phone: updated.mobile,
        village: updated.village,
        district: updated.district,
        state: updated.state,
        avatar: updated.avatar,
      };

      if (token) {
        await fetch('http://localhost:8000/api/v1/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
      if (updated.email) {
        await fetch('http://localhost:8000/api/v1/auth/profile/update-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: updated.email, ...payload }),
        }).catch(() => {});
      }

      setIsEditModalVisible(false);
      const successMsg = isHindi ? 'प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!' : 'Profile updated successfully!';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert(isHindi ? 'सफल' : 'Success', successMsg);
      }
    } catch (err) {
      console.warn('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrapper}>
          {/* User Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              activeOpacity={0.85} 
              onPress={openEditModal} 
              style={styles.avatarWrapper}
              accessibilityLabel="Change profile picture"
            >
              <Image source={{ uri: user.avatar || MockUser.avatar }} style={styles.avatar} />
              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="camera" size={17} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.mobile}>{user.mobile || user.email}</Text>
            <Text style={styles.location}>
              {user.village ? `${user.village}, ` : ''}
              {user.district ? `${user.district}, ` : ''}
              {user.state || 'Uttarakhand'}
            </Text>
            <Button
              title={t('profile.editProfile', 'Edit Profile')}
              variant="outline"
              style={styles.editBtn}
              fullWidth={false}
              onPress={openEditModal}
              icon={<MaterialCommunityIcons name="account-edit-outline" size={18} color={Theme.Colors.primary} />}
            />
          </View>

          {/* Menu Items */}
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

          {/* Logout Button */}
          <Button 
            title={t('profile.logout', 'Logout')} 
            variant="outline" 
            onPress={async () => {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userRole');
              router.replace('/(auth)/login');
            }} 
            style={styles.logoutBtn}
            icon={<MaterialCommunityIcons name="logout" size={20} color={Theme.Colors.primary} />}
          />
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isHindi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={24} color={Theme.Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Profile Picture Section */}
              <View style={styles.avatarSection}>
                <Text style={styles.sectionTitle}>
                  {isHindi ? '📷 प्रोफ़ाइल फ़ोटो' : '📷 Profile Picture'}
                </Text>
                <View style={styles.avatarPreviewRow}>
                  <Image
                    source={{ uri: editForm.avatar || MockUser.avatar }}
                    style={styles.modalAvatarPreview}
                  />
                  <View style={styles.avatarActionsCol}>
                    <TouchableOpacity
                      style={styles.uploadPhotoBtn}
                      onPress={handleChooseImage}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="camera-plus" size={18} color="#FFFFFF" />
                      <Text style={styles.uploadPhotoText}>
                        {isHindi ? 'गैलरी / कैमरे से चुनें' : 'Upload from Device'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.urlToggleBtn}
                      onPress={() => setShowUrlInput(!showUrlInput)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="link-variant" size={16} color={Theme.Colors.primary} />
                      <Text style={styles.urlToggleText}>
                        {showUrlInput 
                          ? (isHindi ? 'लिंक बॉक्स बंद करें' : 'Hide Link Input')
                          : (isHindi ? 'फ़ोटो URL / लिंक डालें' : 'Enter Image URL')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showUrlInput && (
                  <View style={styles.urlInputContainer}>
                    <Input
                      label={isHindi ? 'इमेज वेब लिंक' : 'Image URL'}
                      placeholder="https://example.com/photo.jpg"
                      value={editForm.avatar}
                      onChangeText={(text) => setEditForm((prev) => ({ ...prev, avatar: text }))}
                      icon={<MaterialCommunityIcons name="image-outline" size={20} color="#64748B" />}
                    />
                  </View>
                )}

                {/* Preset Avatars */}
                <Text style={styles.presetsLabel}>
                  {isHindi ? 'या पसंदीदा अवतार चुनें:' : 'Or choose a preset avatar:'}
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsList}
                >
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = editForm.avatar === preset.uri;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        onPress={() => setEditForm((prev) => ({ ...prev, avatar: preset.uri }))}
                        style={[
                          styles.presetItem,
                          isSelected && styles.presetItemSelected,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: preset.uri }} style={[styles.presetThumb, isSelected && styles.presetThumbSelected]} />
                        {isSelected && (
                          <View style={styles.presetCheck}>
                            <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={[styles.presetText, isSelected && styles.presetTextActive]} numberOfLines={1}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <Input
                label={isHindi ? 'पूरा नाम' : 'Full Name'}
                placeholder={isHindi ? 'अपना नाम दर्ज करें' : 'Enter your name'}
                value={editForm.name}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, name: text }))}
                icon={<MaterialCommunityIcons name="account-outline" size={20} color="#64748B" />}
              />

              <Input
                label={isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
                placeholder="+91 98765 43210"
                value={editForm.mobile}
                keyboardType="phone-pad"
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, mobile: text }))}
                icon={<MaterialCommunityIcons name="phone-outline" size={20} color="#64748B" />}
              />

              <Input
                label={isHindi ? 'ग्राम / गांव' : 'Village'}
                placeholder={isHindi ? 'उदा. रामपुर' : 'e.g. Rampur'}
                value={editForm.village}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, village: text }))}
                icon={<MaterialCommunityIcons name="home-outline" size={20} color="#64748B" />}
              />

              <Input
                label={isHindi ? 'जनपद / जिला' : 'District'}
                placeholder={isHindi ? 'उदा. देहरादून' : 'e.g. Dehradun'}
                value={editForm.district}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, district: text }))}
                icon={<MaterialCommunityIcons name="map-marker-outline" size={20} color="#64748B" />}
              />

              <Input
                label={isHindi ? 'राज्य' : 'State'}
                placeholder={isHindi ? 'उदा. उत्तराखण्ड' : 'e.g. Uttarakhand'}
                value={editForm.state}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, state: text }))}
                icon={<MaterialCommunityIcons name="flag-outline" size={20} color="#64748B" />}
              />

              <View style={styles.modalButtonsRow}>
                <Button
                  title={isHindi ? 'रद्द करें' : 'Cancel'}
                  variant="outline"
                  onPress={() => setIsEditModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={saving ? (isHindi ? 'सहेज रहे हैं...' : 'Saving...') : (isHindi ? 'सहेजें' : 'Save Changes')}
                  onPress={handleSaveProfile}
                  loading={saving}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  scroll: { padding: Theme.Spacing.lg, paddingBottom: 95, width: '100%' },
  cardWrapper: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  profileHeader: { alignItems: 'center', marginBottom: Theme.Spacing.xl },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Theme.Spacing.md,
  },
  avatar: { 
    width: 96, 
    height: 96, 
    borderRadius: 48, 
    borderWidth: 3, 
    borderColor: Theme.Colors.surface 
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Theme.Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  name: { ...Theme.Typography.h2, color: Theme.Colors.text },
  mobile: { ...Theme.Typography.caption, color: Theme.Colors.textSecondary, marginTop: 4 },
  location: { ...Theme.Typography.caption, color: Theme.Colors.textSecondary, marginTop: 2 },
  editBtn: { marginTop: Theme.Spacing.md },
  menuContainer: { backgroundColor: Theme.Colors.surface, borderRadius: Theme.BorderRadius.xl, marginBottom: Theme.Spacing.xl, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Theme.Spacing.md },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Theme.Colors.border },
  menuText: { ...Theme.Typography.bodyMedium, flex: 1, marginLeft: Theme.Spacing.md },
  logoutBtn: { marginBottom: Theme.Spacing.xl },

  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  avatarSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatarPreview: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Theme.Colors.primary,
  },
  avatarActionsCol: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  uploadPhotoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  urlToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  urlToggleText: {
    color: Theme.Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  urlInputContainer: {
    marginTop: 10,
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  presetsList: {
    gap: 12,
    paddingVertical: 4,
  },
  presetItem: {
    alignItems: 'center',
    width: 62,
    position: 'relative',
  },
  presetItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  presetThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  presetThumbSelected: {
    borderColor: Theme.Colors.primary,
    borderWidth: 2.5,
  },
  presetCheck: {
    position: 'absolute',
    top: -2,
    right: 6,
    backgroundColor: '#16A34A',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  presetText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  presetTextActive: {
    color: Theme.Colors.primary,
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 8,
  },
});
