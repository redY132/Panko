import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deletePatient } from '@/lib/firestore';
import type { Patient, Room } from '@/types';

type Props = {
  patients: Patient[];
  rooms: Room[];
  removeMode: boolean;
  searchQuery: string;
  onPatientDeleted: (id: string) => void;
};

export default function PatientList({
  patients,
  rooms,
  removeMode,
  searchQuery,
  onPatientDeleted,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function confirmDelete(patient: Patient) {
    Alert.alert(
      'Remove Patient',
      `Remove ${patient.name}? This will also delete their schedules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void handleDelete(patient) },
      ],
    );
  }

  async function handleDelete(patient: Patient) {
    setDeleting(patient.id);
    try {
      await deletePatient(patient.id);
      onPatientDeleted(patient.id);
    } catch {
      Alert.alert('Error', 'Failed to remove patient.');
    } finally {
      setDeleting(null);
    }
  }

  function roomName(roomId: string): string {
    return rooms.find((r) => r.id === roomId)?.name ?? roomId;
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.content}>
      {filtered.length === 0 && (
        <Text style={styles.empty}>No patients found.</Text>
      )}
      {filtered.map((patient) => {
        const isExpanded = expanded.has(patient.id);
        const isDeleting = deleting === patient.id;
        return (
          <View key={patient.id} style={styles.row}>
            <Pressable style={styles.rowHeader} onPress={() => toggle(patient.id)}>
              <View style={styles.info}>
                <Text style={styles.name}>{patient.name}</Text>
                <Text style={styles.room}>{roomName(patient.roomId)}</Text>
              </View>
              <View style={styles.rowRight}>
                {removeMode && (
                  <Pressable
                    style={[styles.delIcon, isDeleting && styles.delIconDisabled]}
                    onPress={() => confirmDelete(patient)}
                    disabled={isDeleting}
                    hitSlop={8}
                  >
                    <Text style={styles.delIconText}>✕</Text>
                  </Pressable>
                )}
                <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
              </View>
            </Pressable>

            {isExpanded && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>ROOM</Text>
                <Text style={styles.detailValue}>{roomName(patient.roomId)}</Text>

                <Text style={styles.detailLabel}>MEDICINES</Text>
                {patient.medicines.length === 0 ? (
                  <Text style={styles.detailValue}>None assigned</Text>
                ) : (
                  patient.medicines.map((m) => (
                    <Text key={m} style={styles.detailValue}>• {m}</Text>
                  ))
                )}

                <Text style={styles.detailLabel}>FACE ENROLLMENT</Text>
                {patient.faceEmbedding.length > 0 ? (
                  <Text style={styles.enrolled}>Enrolled ({patient.faceEmbedding.length}d vector)</Text>
                ) : (
                  <Text style={styles.pending}>Enrollment pending</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 32, fontSize: 15 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  room: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  delIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delIconDisabled: { opacity: 0.4 },
  delIconText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  chevron: { color: '#9CA3AF', fontSize: 12 },
  detail: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 14,
    gap: 4,
    backgroundColor: '#FAFAFA',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  detailValue: { fontSize: 14, color: '#374151' },
  enrolled: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  pending: { fontSize: 13, color: '#D97706', fontWeight: '500' },
  unenrolled: { fontSize: 13, color: '#9CA3AF' },
});
