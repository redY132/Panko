import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deleteSchedule, updateSchedule } from '@/lib/firestore';
import type { Patient, Schedule } from '@/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#4A90D9', '#E67E22', '#27AE60', '#9B59B6', '#E74C3C', '#1ABC9C', '#F1C40F'];

function getWeekDays(): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function patientColor(patientId: string, patients: Patient[]): string {
  const idx = patients.findIndex((p) => p.id === patientId);
  return COLORS[(idx < 0 ? 0 : idx) % COLORS.length]!;
}

type Props = {
  patients: Patient[];
  schedules: Schedule[];
  onScheduleDeleted: (id: string) => void;
  onScheduleUpdated: (updated: Schedule) => void;
};

export default function WeeklySchedule({
  patients,
  schedules,
  onScheduleDeleted,
  onScheduleUpdated,
}: Props) {
  const weekDays = getWeekDays();
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  function openDetail(s: Schedule) {
    setSelected(s);
    setEditTime(s.time);
  }

  function closeDetail() {
    setSelected(null);
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteSchedule(selected.id);
      onScheduleDeleted(selected.id);
      closeDetail();
    } catch {
      Alert.alert('Error', 'Failed to delete schedule.');
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await updateSchedule(selected.id, { time: editTime });
      onScheduleUpdated({ ...selected, time: editTime });
      closeDetail();
    } catch {
      Alert.alert('Error', 'Failed to update schedule.');
    } finally {
      setSaving(false);
    }
  }

  const patientOf = (s: Schedule) => patients.find((p) => p.id === s.patientId);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>This Week</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {weekDays.map((day, idx) => {
          const daySchedules = schedules.filter((s) => isSameDay(new Date(s.time), day));
          const isToday = isSameDay(day, new Date());
          return (
            <View key={idx} style={[styles.dayCol, isToday && styles.todayCol]}>
              <Text style={[styles.dayLabel, isToday && styles.todayText]}>
                {DAY_LABELS[idx]}
              </Text>
              <Text style={[styles.dateNum, isToday && styles.todayText]}>{day.getDate()}</Text>
              <View style={styles.events}>
                {daySchedules.map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.pill, { backgroundColor: patientColor(s.patientId, patients) }]}
                    onPress={() => openDetail(s)}
                  >
                    <Text style={styles.pillText} numberOfLines={1}>
                      {patientOf(s)?.name ?? '?'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeDetail}>
        <Pressable style={styles.overlay} onPress={closeDetail}>
          <Pressable style={styles.card} onPress={() => {}}>
            {selected && (
              <>
                <Text style={styles.cardTitle}>{patientOf(selected)?.name ?? 'Patient'}</Text>
                <Text style={styles.cardSub}>Medicine: {selected.medicineId}</Text>
                <Text style={styles.cardSub}>Room: {selected.roomId}</Text>
                <Text style={styles.cardSub}>Status: {selected.status}</Text>
                <Text style={styles.fieldLabel}>Time (ISO)</Text>
                <TextInput
                  style={styles.input}
                  value={editTime}
                  onChangeText={setEditTime}
                  placeholder="2025-04-18T09:00:00"
                  autoCapitalize="none"
                />
                <View style={styles.actions}>
                  <Pressable
                    style={styles.saveBtn}
                    onPress={() => void handleSave()}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                  <Pressable style={styles.deleteBtn} onPress={() => void handleDelete()}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  heading: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  strip: { paddingHorizontal: 12, gap: 4 },
  dayCol: {
    width: 68,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  todayCol: { backgroundColor: '#EFF6FF' },
  dayLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  dateNum: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#111' },
  todayText: { color: '#2563EB' },
  events: { gap: 3, width: '100%' },
  pill: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  pillText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    gap: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 14, color: '#555' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600' },
});
