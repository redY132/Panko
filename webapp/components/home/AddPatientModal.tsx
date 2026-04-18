import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { addPatient } from '@/lib/firestore';
// import { robotWebSocket } from '@/lib/websocket'; // TODO: re-enable when Mini PC WebSocket is ready
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
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setRoomId(null);
    setPhoto(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function pickPhoto(source: 'camera' | 'library') {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera access denied', 'Enable camera access in Settings to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 ?? '' });
      }
    } else {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Photo library access denied', 'Enable photo library access in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 ?? '' });
      }
    }
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    if (!photo) { Alert.alert('Face photo required'); return; }

    setSaving(true);
    try {
      const patient = await addPatient({
        name: name.trim(),
        roomId: roomId ?? '',
        faceEmbedding: [], // populated async when Mini PC responds via FACE_ENROLLED
        medicines: [],
      });

      // TODO: re-enable when Mini PC WebSocket is ready
      // robotWebSocket.sendCommand({
      //   type: 'ENROLL_FACE',
      //   patientId: patient.id,
      //   imageBase64: photo.base64,
      // });

      onPatientAdded(patient);
      handleClose();
    } catch (e) {
      console.error('AddPatientModal: failed to save patient', e);
      Alert.alert('Error', 'Failed to save patient. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.kavWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
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
                  <Text style={styles.noRooms}>No rooms yet — tap "+ Room" to add one.</Text>
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
              {photo && <Image source={{ uri: photo.uri }} style={styles.preview} />}

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavWrapper: { flex: 1, justifyContent: 'flex-end' },
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
