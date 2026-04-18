import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AddPatientModal from '@/components/home/AddPatientModal';
import PatientList from '@/components/home/PatientList';
import WeeklySchedule from '@/components/home/WeeklySchedule';
import { useAuth } from '@/contexts/AuthProvider';
// import { useFaceEnrollment } from '@/hooks/useFaceEnrollment'; // TODO: re-enable when Mini PC WebSocket is ready
import { addRoom, getPatients, getRooms, getSchedules } from '@/lib/firestore';
import type { Patient, Room, Schedule } from '@/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeMode, setRemoveMode] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [addRoomVisible, setAddRoomVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, s, r] = await Promise.all([
        getPatients(user.id),
        getSchedules(user.id),
        getRooms(),
      ]);
      setPatients(p);
      setSchedules(s);
      setRooms(r);
    } catch (e) {
      console.error('Failed to load home data', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // TODO: re-enable when Mini PC WebSocket is ready
  // useFaceEnrollment({
  //   onEmbeddingReceived: useCallback((patientId, embedding, model) => {
  //     setPatients((prev) =>
  //       prev.map((p) =>
  //         p.id === patientId
  //           ? { ...p, faceEmbedding: embedding, ...(model ? { faceEmbeddingModel: model } : {}) }
  //           : p,
  //       ),
  //     );
  //   }, []),
  // });

  function handleAddRoomPress() {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add Room',
        'Enter a room name',
        async (name) => {
          if (!name?.trim()) return;
          try {
            const room = await addRoom(name);
            setRooms((r) => [...r, room]);
          } catch (e) {
            console.error('Home: failed to add room (iOS prompt)', e);
            Alert.alert('Error', 'Failed to add room.');
          }
        },
        'plain-text',
      );
    } else {
      setRoomName('');
      setAddRoomVisible(true);
    }
  }

  async function handleSaveRoom() {
    if (!roomName.trim()) { Alert.alert('Name required'); return; }
    setSavingRoom(true);
    try {
      const room = await addRoom(roomName);
      setRooms((r) => [...r, room]);
      setAddRoomVisible(false);
      setRoomName('');
    } catch (e) {
      console.error('Home: failed to add room', e);
      Alert.alert('Error', 'Failed to add room.');
    } finally {
      setSavingRoom(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search patients…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <View style={styles.headerBtns}>
          <Pressable style={styles.btn} onPress={() => setAddVisible(true)}>
            <Text style={styles.btnText}>+ Patient</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={handleAddRoomPress}>
            <Text style={styles.btnText}>+ Room</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, removeMode && styles.btnDanger]}
            onPress={() => setRemoveMode((v) => !v)}
          >
            <Text style={[styles.btnText, removeMode && styles.btnDangerText]}>
              {removeMode ? 'Done' : 'Remove'}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <>
          <WeeklySchedule
            patients={patients}
            schedules={schedules}
            onScheduleDeleted={(id) => setSchedules((s) => s.filter((x) => x.id !== id))}
            onScheduleUpdated={(updated) =>
              setSchedules((s) => s.map((x) => (x.id === updated.id ? updated : x)))
            }
          />
          <PatientList
            patients={patients}
            rooms={rooms}
            removeMode={removeMode}
            searchQuery={searchQuery}
            onPatientDeleted={(id) => {
              setPatients((p) => p.filter((x) => x.id !== id));
              setSchedules((s) => s.filter((x) => x.patientId !== id));
            }}
          />
        </>
      )}

      <AddPatientModal
        visible={addVisible}
        rooms={rooms}
        onClose={() => setAddVisible(false)}
        onPatientAdded={(patient) => {
          setPatients((p) => [...p, patient]);
          setAddVisible(false);
        }}
      />

      {/* Android Add Room modal (iOS uses Alert.prompt) */}
      <Modal visible={addRoomVisible} transparent animationType="fade" onRequestClose={() => setAddRoomVisible(false)}>
        <Pressable style={styles.roomOverlay} onPress={() => setAddRoomVisible(false)}>
          <Pressable style={styles.roomCard} onPress={() => {}}>
            <Text style={styles.roomCardTitle}>Add Room</Text>
            <TextInput
              style={styles.roomInput}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Room name"
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.roomActions}>
              <Pressable style={styles.roomCancelBtn} onPress={() => setAddRoomVisible(false)}>
                <Text style={styles.roomCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.roomSaveBtn, savingRoom && styles.roomSaveBtnDisabled]}
                onPress={() => void handleSaveRoom()}
                disabled={savingRoom}
              >
                {savingRoom ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.roomSaveText}>Add</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 16, paddingBottom: 10, gap: 10 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111',
  },
  headerBtns: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btnText: { fontWeight: '600', fontSize: 13, color: '#374151' },
  btnDanger: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  btnDangerText: { color: '#DC2626' },
  loader: { flex: 1 },
  roomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    gap: 12,
  },
  roomCardTitle: { fontSize: 17, fontWeight: '700' },
  roomInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  roomActions: { flexDirection: 'row', gap: 10 },
  roomCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  roomCancelText: { fontWeight: '600', color: '#374151' },
  roomSaveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#111',
  },
  roomSaveBtnDisabled: { opacity: 0.5 },
  roomSaveText: { fontWeight: '600', color: '#fff' },
});
