import { Stack } from 'expo-router';
import { Theme } from '../../constants/Theme';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Theme.Colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-scheme" />
      <Stack.Screen name="manage-schemes" />
      <Stack.Screen name="add-mandi-price" />
      <Stack.Screen name="manage-mandi-prices" />
      <Stack.Screen name="add-equipment" />
      <Stack.Screen name="manage-equipment" />
      <Stack.Screen name="add-notification" />
      <Stack.Screen name="manage-notifications" />
    </Stack>
  );
}
