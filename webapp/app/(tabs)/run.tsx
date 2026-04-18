import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommandPanel from '@/components/run/CommandPanel';
import MapPanel from '@/components/run/MapPanel';
import TelemetryPanel from '@/components/run/TelemetryPanel';
import WsTestButton from '@/components/run/WsTestButton';
import { useRobotState } from '@/hooks/useRobotState';
import { getRooms } from '@/lib/firestore';
import type { Room } from '@/types';

export default function RunScreen() {
  const { telemetry, connectionState } = useRobotState();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    void getRooms().then(setRooms).catch(console.error);
  }, []);

  const hasMap = rooms.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1C1C1E' }} edges={['top', 'bottom']}>
      <TelemetryPanel telemetry={telemetry} connectionState={connectionState} />
      <MapPanel telemetry={telemetry} rooms={rooms} />
      <WsTestButton />
      <CommandPanel telemetry={telemetry} connectionState={connectionState} hasMap={hasMap} />
      {/* TODO: ActPhaseOverlay */}
    </SafeAreaView>
  );
}
