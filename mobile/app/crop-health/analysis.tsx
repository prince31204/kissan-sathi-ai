import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';

export default function CropAnalysisScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = () => {
    // Simulating selecting a leafy disease image for now
    setImage('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400');
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      // Create form data
      const formData = new FormData();
      // Normally we would use an actual file URI from image picker
      // For this demo with remote URL, we will fetch the blob first
      const response = await fetch(image);
      const blob = await response.blob();
      formData.append('image', blob, 'disease.jpg');

      const res = await fetch('http://localhost:5000/api/detect-disease', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Send data to the next screen via global state or query params
        // For simplicity, using query params
        router.push({
          pathname: '/crop-health/disease-result',
          params: { disease: data.disease, confidence: data.confidence, message: data.message }
        });
      } else {
        Alert.alert("Error", data.error || "Failed to analyze");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not connect to disease detection API. Make sure ML backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyze Crop</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {!image ? (
          <View style={styles.uploadContainer}>
            <MaterialCommunityIcons name="camera-plus" size={64} color={Theme.Colors.textSecondary} />
            <Text style={styles.uploadTitle}>Take a Photo or Upload</Text>
            <Text style={styles.uploadSub}>Supported: Leaf / Crop Images</Text>
            
            <View style={styles.uploadActions}>
              <Button title="Take a Photo" onPress={handleUpload} style={styles.actionBtn} icon={<MaterialCommunityIcons name="camera" size={20} color={Theme.Colors.surface} />} />
              <Button title="Upload from Gallery" variant="outline" onPress={handleUpload} style={styles.actionBtn} icon={<MaterialCommunityIcons name="image" size={20} color={Theme.Colors.primary} />} />
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
              <MaterialCommunityIcons name="close" size={20} color={Theme.Colors.error} />
              <Text style={styles.removeText}>Remove Image</Text>
            </TouchableOpacity>

            <View style={styles.analyzeSection}>
              <Button title={loading ? "Analyzing via AI..." : "Analyze Crop"} onPress={handleAnalyze} disabled={loading} />
              <Text style={styles.disclaimer}>*This uses AI model to detect disease.</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.Spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.Colors.border },
  backBtn: { padding: Theme.Spacing.xs },
  headerTitle: { ...Theme.Typography.h3 },
  content: { flex: 1, padding: Theme.Spacing.lg, justifyContent: 'center' },
  
  uploadContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: Theme.Colors.border, borderRadius: Theme.BorderRadius.lg, padding: Theme.Spacing.xl },
  uploadTitle: { ...Theme.Typography.h3, marginTop: Theme.Spacing.md },
  uploadSub: { ...Theme.Typography.body, color: Theme.Colors.textSecondary, marginTop: Theme.Spacing.xs, marginBottom: Theme.Spacing.xl },
  uploadActions: { width: '100%', gap: Theme.Spacing.md },
  actionBtn: { marginBottom: Theme.Spacing.md },
  
  previewContainer: { flex: 1, alignItems: 'center' },
  previewImage: { width: '100%', height: 300, borderRadius: Theme.BorderRadius.lg, marginBottom: Theme.Spacing.md },
  removeBtn: { flexDirection: 'row', alignItems: 'center', padding: Theme.Spacing.sm },
  removeText: { ...Theme.Typography.bodyMedium, color: Theme.Colors.error, marginLeft: Theme.Spacing.xs },
  
  analyzeSection: { width: '100%', marginTop: 'auto', marginBottom: Theme.Spacing.xl },
  disclaimer: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, textAlign: 'center', marginTop: Theme.Spacing.sm },
});
