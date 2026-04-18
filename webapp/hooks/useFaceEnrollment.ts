import { useEffect } from 'react';

import { updatePatientEmbedding } from '@/lib/firestore';
import { robotWebSocket } from '@/lib/websocket';

type Props = {
  onEmbeddingReceived: (patientId: string, embedding: number[], model?: string) => void;
};

export function useFaceEnrollment({ onEmbeddingReceived }: Props): void {
  useEffect(() => {
    return robotWebSocket.subscribeToFaceEnrollment(async (msg) => {
      try {
        await updatePatientEmbedding(msg.patientId, msg.embedding, msg.model);
        onEmbeddingReceived(msg.patientId, msg.embedding, msg.model);
      } catch (e) {
        console.error('useFaceEnrollment: failed to persist embedding', e);
      }
    });
  }, [onEmbeddingReceived]);
}
