import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { storage } from '@/lib/firebase';
import { addPatient } from '@/lib/firestore';
import type { Patient, Room } from '@/types';

type Props = {
  visible: boolean;
  rooms: Room[];
  onClose: () => void;
  onPatientAdded: (patient: Patient) => void;
};

export default function AddPatientModal({ visible, rooms, onClose, onPatientAdded }: Props) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setRoomId(null);
    setPhotoUri(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function pickPhoto(source: 'camera' | 'library') {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    if (!roomId) { Alert.alert('Room required'); return; }
    if (!photoUri) { Alert.alert('Face photo required'); return; }

    setSaving(true);
    try {
      const resp = await fetch(photoUri);
      const blob = await resp.blob();
      const storageRef = ref(storage, `faces/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const faceId = await getDownloadURL(storageRef);

      const patient = await addPatient({
        name: name.trim(),
        roomId,
        faceId,
        medicines: [],
      });
      onPatientAdded(patient);
      handleClose();
    } catch {
      Alert.alert('Error', 'Failed to add patient. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add Patient</Text>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Patient name"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Room</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {rooms.length === 0 ? (
                <Text style={styles.noRooms}>No rooms yet — complete setup first.</Text>
              ) : (
                rooms.map((r) => (
                  <Pressable
                    key={r.id}
                    style={[styles.chip, roomId === r.id && styles.chipSelected]}
                    onPress={() => setRoomId(r.id)}
                  >
                    <Text style={[styles.chipText, roomId === r.id && styles.chipTextSelected]}>
                      {r.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <Text style={styles.label}>Face Photo</Text>
            <View style={styles.photoRow}>
              <Pressable style={styles.photoBtn} onPress={() => void pickPhoto('camera')}>
                <Text style={styles.photoBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.photoBtn} onPress={() => void pickPhoto('library')}>
                <Text style={styles.photoBtnText}>Library</Text>
              </Pressable>
            </View>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

            <Pressable
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add Patient</Text>
              )}
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  form: { gap: 2, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
  },
  chipRow: { gap: 8, paddingVertical: 2 },
  noRooms: { color: '#9CA3AF', fontSize: 14 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  photoBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  preview: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
