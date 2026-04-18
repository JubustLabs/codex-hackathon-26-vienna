export const participantKey = (roomId: string) => `georg.participant.${roomId}`;

export function withParticipant(path: string, participantId?: string) {
  if (!participantId) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}participantId=${encodeURIComponent(participantId)}`;
}
