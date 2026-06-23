import type { Server, Socket } from "socket.io";

export interface ClassroomParticipant {
  userId: string;
  displayName: string;
  role: string;
  handRaised: boolean;
  joinedAt: string;
}

export interface ClassroomSessionState {
  sessionId: string;
  status: "waiting" | "live" | "ended";
  teacherId?: string;
  startedAt?: string;
  endedAt?: string;
  whiteboardJson: Record<string, unknown> | null;
  whiteboardLocked: boolean;
  participants: Map<string, ClassroomParticipant>;
}

const sessions = new Map<string, ClassroomSessionState>();

function getOrCreateSession(sessionId: string): ClassroomSessionState {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      status: "waiting",
      whiteboardJson: null,
      whiteboardLocked: false,
      participants: new Map(),
    };
    sessions.set(sessionId, session);
  }
  return session;
}

function isClassroomHost(role: string): boolean {
  return role === "teacher";
}

function serializeParticipants(session: ClassroomSessionState) {
  return Array.from(session.participants.values());
}

function serializeSession(session: ClassroomSessionState) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    teacherId: session.teacherId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    whiteboardJson: session.whiteboardJson,
    whiteboardLocked: session.whiteboardLocked,
    participants: serializeParticipants(session),
    participantCount: session.participants.size,
  };
}

function broadcastLiveClasses(io: Server): void {
  const live = Array.from(sessions.values())
    .filter((s) => s.status === "live" || s.participants.size > 0)
    .map((s) => ({
      sessionId: s.sessionId,
      status: s.status,
      startedAt: s.startedAt,
      participantCount: s.participants.size,
      teacherId: s.teacherId,
      participants: serializeParticipants(s).map((p) => ({
        displayName: p.displayName,
        role: p.role,
        handRaised: p.handRaised,
      })),
    }));
  io.to("role:admin").emit("admin:classroom:live", { sessions: live, at: new Date().toISOString() });
}

function roomName(sessionId: string): string {
  return `classroom:${sessionId}`;
}

export function registerClassroomHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;
  const role = socket.data.role as string;
  let activeSessionId: string | null = null;

  const leaveSession = (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.participants.delete(userId);
    socket.leave(roomName(sessionId));

    io.to(roomName(sessionId)).emit("classroom:participant:left", {
      sessionId,
      userId,
      participants: serializeParticipants(session),
    });

    if (session.participants.size === 0 && session.status !== "live") {
      sessions.delete(sessionId);
    }

    broadcastLiveClasses(io);
  };

  socket.on(
    "classroom:join",
    (payload: { sessionId?: string; displayName?: string }, ack?: (res: unknown) => void) => {
      const sessionId = payload?.sessionId?.trim();
      if (!sessionId) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }

      if (activeSessionId && activeSessionId !== sessionId) {
        leaveSession(activeSessionId);
      }

      const session = getOrCreateSession(sessionId);
      const displayName = payload.displayName?.trim() || "User";

      session.participants.set(userId, {
        userId,
        displayName,
        role,
        handRaised: false,
        joinedAt: new Date().toISOString(),
      });

      if (isClassroomHost(role) && !session.teacherId) {
        session.teacherId = userId;
      }

      activeSessionId = sessionId;
      socket.join(roomName(sessionId));

      io.to(roomName(sessionId)).emit("classroom:participant:joined", {
        sessionId,
        userId,
        displayName,
        role,
        participants: serializeParticipants(session),
      });

      socket.emit("classroom:state", serializeSession(session));
      broadcastLiveClasses(io);
      ack?.({ ok: true, state: serializeSession(session) });
    }
  );

  socket.on("classroom:leave", (payload?: { sessionId?: string }) => {
    const sessionId = payload?.sessionId?.trim() || activeSessionId;
    if (!sessionId) return;
    leaveSession(sessionId);
    if (activeSessionId === sessionId) activeSessionId = null;
  });

  socket.on(
    "classroom:start",
    (payload: { sessionId?: string }, ack?: (res: unknown) => void) => {
      if (!isClassroomHost(role)) {
        ack?.({ ok: false, error: "Forbidden" });
        return;
      }
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      if (!sessionId) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }

      const session = getOrCreateSession(sessionId);
      session.status = "live";
      session.startedAt = session.startedAt ?? new Date().toISOString();
      session.teacherId = userId;

      io.to(roomName(sessionId)).emit("classroom:state", serializeSession(session));
      broadcastLiveClasses(io);
      ack?.({ ok: true, state: serializeSession(session) });
    }
  );

  socket.on(
    "classroom:end",
    (payload: { sessionId?: string }, ack?: (res: unknown) => void) => {
      if (!isClassroomHost(role)) {
        ack?.({ ok: false, error: "Forbidden" });
        return;
      }
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      if (!sessionId) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        ack?.({ ok: false, error: "Session not found" });
        return;
      }

      session.status = "ended";
      session.endedAt = new Date().toISOString();

      io.to(roomName(sessionId)).emit("classroom:state", serializeSession(session));
      broadcastLiveClasses(io);
      ack?.({ ok: true, state: serializeSession(session) });
    }
  );

  socket.on(
    "whiteboard:update",
    (payload: { sessionId?: string; json?: Record<string, unknown> }) => {
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      if (!sessionId || !payload?.json) return;

      const session = sessions.get(sessionId);
      if (!session) return;

      const participant = session.participants.get(userId);
      if (!participant) return;

      if (role === "admin" || role === "super_admin") return;

      if (session.whiteboardLocked && !isClassroomHost(role)) return;

      session.whiteboardJson = payload.json;

      socket.to(roomName(sessionId)).emit("whiteboard:sync", {
        sessionId,
        json: payload.json,
        fromUserId: userId,
        at: new Date().toISOString(),
      });
    }
  );

  socket.on(
    "classroom:lock",
    (payload: { sessionId?: string; locked?: boolean }, ack?: (res: unknown) => void) => {
      if (!isClassroomHost(role)) {
        ack?.({ ok: false, error: "Forbidden" });
        return;
      }
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      if (!sessionId) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }

      const session = getOrCreateSession(sessionId);
      session.whiteboardLocked = Boolean(payload?.locked);

      io.to(roomName(sessionId)).emit("classroom:lock", {
        sessionId,
        locked: session.whiteboardLocked,
      });
      io.to(roomName(sessionId)).emit("classroom:state", serializeSession(session));
      ack?.({ ok: true, locked: session.whiteboardLocked });
    }
  );

  socket.on(
    "classroom:clear",
    (payload: { sessionId?: string }, ack?: (res: unknown) => void) => {
      if (!isClassroomHost(role)) {
        ack?.({ ok: false, error: "Forbidden" });
        return;
      }
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      if (!sessionId) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }

      const session = getOrCreateSession(sessionId);
      session.whiteboardJson = null;

      io.to(roomName(sessionId)).emit("whiteboard:clear", { sessionId });
      ack?.({ ok: true });
    }
  );

  socket.on(
    "classroom:hand",
    (payload: { sessionId?: string; raised?: boolean }, ack?: (res: unknown) => void) => {
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      if (!sessionId) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        ack?.({ ok: false, error: "Session not found" });
        return;
      }

      const participant = session.participants.get(userId);
      if (!participant) {
        ack?.({ ok: false, error: "Not in session" });
        return;
      }

      participant.handRaised = Boolean(payload?.raised);

      io.to(roomName(sessionId)).emit("classroom:hand", {
        sessionId,
        userId,
        displayName: participant.displayName,
        raised: participant.handRaised,
        participants: serializeParticipants(session),
      });
      ack?.({ ok: true, raised: participant.handRaised });
    }
  );

  socket.on(
    "classroom:notify",
    (payload: { sessionId?: string; message?: string; targetUserId?: string }) => {
      if (!isClassroomHost(role)) return;
      const sessionId = payload?.sessionId?.trim() || activeSessionId;
      const message = payload?.message?.trim();
      if (!sessionId || !message) return;

      const event = {
        sessionId,
        message,
        fromUserId: userId,
        at: new Date().toISOString(),
      };

      if (payload.targetUserId) {
        io.to(`user:${payload.targetUserId}`).emit("classroom:notify", event);
      } else {
        io.to(roomName(sessionId)).emit("classroom:notify", event);
      }
    }
  );

  socket.on("disconnect", () => {
    if (activeSessionId) {
      leaveSession(activeSessionId);
      activeSessionId = null;
    }
  });
}

export function emitAdminLiveClassrooms(io: Server): void {
  broadcastLiveClasses(io);
}
