import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getPatients, getRooms, getSchedules } from '@/lib/firestore';
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
            <Text style={styles.btnText}>+ Add Patient</Text>
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
  btnText: { fontWeight: '600', fontSize: 14, color: '#374151' },
  btnDanger: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  btnDangerText: { color: '#DC2626' },
  loader: { flex: 1 },
});
