import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const ACCENT = '#F97316';
const GREEN = '#22C55E';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

type MedEntry = {
  id: string;
  time: string;
  name: string;
  description: string;
  dose_description: string;
  prescribed_by: string;
  active: boolean;
};

const SAMPLE_MEDS: MedEntry[] = [
  {
    id: '1',
    time: '10:00',
    name: 'Oxycodone',
    description: 'Used to manage moderate to severe chronic pain',
    dose_description: 'Take 1 tablet orally every 8 hours with or without food',
    prescribed_by: 'Dr. Sarah Mitchell',
    active: true,
  },
  {
    id: '2',
    time: '13:15',
    name: 'Naloxone',
    description: 'Reverses opioid overdose effects rapidly',
    dose_description: 'Administer 1 spray intranasally as needed, may repeat after 2–3 min',
    prescribed_by: 'Dr. James Carter',
    active: false,
  },
  {
    id: '3',
    time: '18:00',
    name: 'Ibuprofen',
    description: 'Reduces inflammation, fever, and mild to moderate pain',
    dose_description: 'Take 1 tablet (400 mg) orally every 6–8 hours after food',
    prescribed_by: 'Dr. Sarah Mitchell',
    active: false,
  },
];

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

export default function CalendarScreen() {
  const today = new Date();
  const weekDays = getWeekDays();
  const [selectedDate, setSelectedDate] = useState(today.getDate());

  const selectedDay = weekDays.find((d) => d.getDate() === selectedDate) ?? today;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDayNum}>{selectedDate}</Text>
          <Text style={styles.headerSub}>
            {DAY_NAMES[selectedDay.getDay()]} / {MONTH_NAMES[selectedDay.getMonth()]}{' '}
            {selectedDay.getFullYear()}
          </Text>
        </View>
        <Pressable style={styles.todayBtn} onPress={() => setSelectedDate(today.getDate())}>
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      {/* Weekly date strip */}
      <View style={styles.weekStrip}>
        {weekDays.map((day, idx) => {
          const isSelected = day.getDate() === selectedDate;
          const isToday = day.getDate() === today.getDate();
          return (
            <Pressable
              key={idx}
              style={styles.dayItem}
              onPress={() => setSelectedDate(day.getDate())}
            >
              <Text style={[styles.dayLetter, isSelected && styles.dayLetterActive]}>
                {DAY_LETTERS[idx]}
              </Text>
              <View style={[styles.dayCircle, isSelected && styles.dayCircleActive]}>
                <Text
                  style={[
                    styles.dayNum,
                    isToday && !isSelected && styles.dayNumToday,
                    isSelected && styles.dayNumActive,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Column headers */}
      <View style={styles.colHeaders}>
        <Text style={styles.colLabel}>TIME</Text>
        <Text style={[styles.colLabel, styles.colLabelMed]}>MEDICATION</Text>
        <Ionicons name="swap-vertical-outline" size={14} color="#9CA3AF" />
      </View>

      {/* Medication list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {SAMPLE_MEDS.map((med) => (
          <View key={med.id} style={styles.entryRow}>
            <Text style={styles.entryTime}>{med.time}</Text>
            <View style={[styles.card, med.active && styles.cardActive]}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardName, med.active && styles.whiteText]} numberOfLines={1}>
                  {med.name}
                </Text>
                <Pressable hitSlop={8}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={18}
                    color={med.active ? 'rgba(255,255,255,0.65)' : '#C4C9D4'}
                  />
                </Pressable>
              </View>

              <Text style={[styles.cardDescription, med.active && styles.whiteFaded]}>
                {med.description}
              </Text>

              <View style={styles.metaRow}>
                <MaterialCommunityIcons
                  name="pill"
                  size={14}
                  color={med.active ? 'rgba(255,255,255,0.75)' : '#9CA3AF'}
                />
                <Text style={[styles.metaText, med.active && styles.whiteFaded]}>
                  {med.dose_description}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={med.active ? 'rgba(255,255,255,0.75)' : '#9CA3AF'}
                />
                <Text style={[styles.metaText, med.active && styles.whiteFaded]}>
                  {med.prescribed_by}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerDayNum: {
    fontSize: 52,
    fontWeight: '800',
    color: '#111',
    lineHeight: 56,
    letterSpacing: -1,
  },
  headerSub: { fontSize: 14, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  todayBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    marginBottom: 6,
  },
  todayBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 14 },

  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  dayItem: { alignItems: 'center', gap: 6, flex: 1 },
  dayLetter: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  dayLetterActive: { color: ACCENT },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: ACCENT },
  dayNum: { fontSize: 15, fontWeight: '600', color: '#374151' },
  dayNumToday: { color: ACCENT, fontWeight: '700' },
  dayNumActive: { color: '#fff', fontWeight: '700' },

  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  colLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6 },
  colLabelMed: { flex: 1, marginLeft: 52, marginRight: 6 },

  scroll: { flex: 1 },
  listContent: { padding: 16, gap: 14, paddingBottom: 48 },

  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  entryTime: {
    width: 46,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingTop: 18,
    textAlign: 'right',
    flexShrink: 0,
  },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardActive: { backgroundColor: GREEN },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  cardDescription: { fontSize: 13, color: '#6B7280' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#6B7280' },

  whiteText: { color: '#fff' },
  whiteFaded: { color: 'rgba(255,255,255,0.82)' },
});
