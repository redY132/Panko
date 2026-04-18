# Panko — Autonomous Med Delivery Bot

## Overview

A wheeled robot that navigates a home or hospital floor plan via LiDAR SLAM, identifies patients using camera-based face recognition, and delivers the correct medication to the correct person. The system is managed through a cross-platform React Native app built with Expo, installed directly on devices — no web hosting required. Firebase handles authentication and persistent data storage.

---

## Stack

| Layer                | Technology                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| Frontend             | React Native (Web + iOS + Android via Expo)                               |
| Distribution         | Expo Go / standalone build — installed directly on devices, no web server |
| Database             | Firebase Firestore                                                        |
| Auth                 | Firebase Auth (Google OAuth + Email/Password)                             |
| Device Communication | WiFi — WebSockets (real-time) + REST (commands)                           |
| Robot OS             | ROS 2                                                                     |
| ML Training          | HuggingFace pretrained models + fine-tuning                               |

---

## Hardware Architecture

### Components

**ESP32**
Responsible exclusively for real-time hardware control:

- Wheel drive and motor control
- Medicine compartment open/close
- Turret/body rotation
- Communicates with the Mini PC over WiFi via WebSocket

**Rubik Pi 3**
Responsible for camera data capture and lightweight preprocessing:

- Streams camera feed to the Mini PC over WiFi (compressed, not raw)
- Optionally runs lightweight on-device preprocessing using its onboard 12 TOPS NPU to reduce bandwidth (e.g. detecting whether a face is present before sending frames)
- Connected to the rover physically

**Mini PC** _(lives physically adjacent to the robot arm, mounted on the rover platform)_
The central brain of the entire operation:

- Receives camera stream from Rubik Pi over local WiFi
- Runs all three inference models (navigation, face recognition, arm control)
- Sends motor commands to the ESP over WiFi
- Sends arm commands directly via USB/serial (physical proximity)
- Maintains and exposes the Robot State to the app via WebSocket
- Hosts a local WebSocket server that the React Native app connects to

**Robot Arm**

- Physically co-located with the Mini PC on the rover
- Controlled directly by the Mini PC via USB/serial
- Responsible for picking pill bottles from the 2×4 shelf and placing them in the rover compartment

**2×4 Pill Bottle Shelf**

- Fixed shelf with 8 labeled cells
- Each cell is assigned to a patient and medicine
- The arm model uses cell position as a known reference for pickup

### Communication Architecture

```
React Native App (installed on phone / tablet / laptop)
        |
        |  WebSocket (WiFi — real-time telemetry + commands)
        |
      Mini PC (on rover)
       /        \
      /          \
  WiFi          USB/Serial
  (WebSocket)     |
     |           Robot Arm
  Rubik Pi
  (camera stream)
     |
    ESP32
  (motor control via WiFi WebSocket from Mini PC)
```

> Firebase Firestore is used exclusively for persistent application data (patients, schedules, map). It is not involved in real-time device communication.

---

## Inference Models _(Mini PC)_

All three models are fine-tuned from HuggingFace pretrained checkpoints using ROS 2-compatible tooling.

### 1. Navigation Model

- Input: LiDAR occupancy grid + robot position (Robot Position)
- Task: Obstacle avoidance and pathfinding to a target room
- Output: Velocity and steering commands sent to ESP32

### 2. Face Recognition Model

- Input: Camera frames from Rubik Pi
- Task: Match detected face against enrolled patient face embeddings
- Output: Patient match result (matched ID or no match)

### 3. Arm Control Model

- Input: Camera view of shelf + target cell position
- Task: Pick pill bottle from assigned shelf cell and place in rover compartment
- Output: Arm joint commands

---

## Training Phase _(one-time)_

Runs once before deployment. Not part of the app flow.

- **Arm model**: Trained to pick pill bottles from known cell positions on the 2×4 shelf
- **Navigation model**: Trained on obstacle avoidance and room navigation using simulated and real environment data
- **Face recognition model**: Fine-tuned from a pretrained face embedding model; enrollment happens per-patient at setup time (see Patient Enrollment)

---

## Robot States

```
IDLE
MAPPING
MAP_READY
READY
DISPATCHED
NAVIGATING
ARRIVED
VERIFYING_FACE
DELIVERING
WAITING_FOR_FACE
RETURNING
ERROR
```

---

## App Screens

### 1. Home

Displays a global overview of patients and their medication schedules.

**Top — Weekly Schedule**

- Google Tasks-style weekly view (Sunday–Saturday)
- Shows scheduled medication deliveries for all patients across all rooms
- Tap an event to view details, modify time/medicine, or delete
- Color-coded per patient

**Bottom — Patient Database**

- Header row contains a search bar and two buttons side by side: **Add Patient** and **Remove Patient**
- Searchable list of all enrolled patients
- In Remove mode, patients get a delete icon; tapping prompts a confirmation dialog before deletion. Deleting a patient also removes their associated schedules and face data.
- Tap a patient to expand their profile:
  - Assigned room
  - Medicine list with per-medicine schedule nested beneath
  - Face enrollment photo thumbnail
  - Delivery history log

**Add Patient Flow** _(modal or sheet, triggered from Home)_
Three required fields — no optional steps:

1. **Name** — text input
2. **Room** — dropdown of existing rooms from the map
3. **Face Photo** — camera capture or photo library upload; basic quality validation (face detected, sufficient lighting) before accepting

On confirm, the patient record is saved to Firestore and the face photo is uploaded to Firebase Cloud Storage. The photo is then sent to the Mini PC to generate and store the face embedding.

---

### 2. Run

The main operational screen. Contains the building map and robot control interface.

**Map Panel**

- Initially empty — populated after LIDAR SLAM completes during setup
- Displays the occupancy grid as a simplified polygon map (rooms as closed polygons with straight edges)
- Live robot position overlay using Robot Position from ROS 2
- Tap a room to view:
  - Room name
  - Assigned patient(s)
  - Current schedule for that room
- Color-coded room states (e.g. robot present, delivery pending)

**Telemetry Panel**

- Live WebSocket feed from Mini PC:
  - Current Robot State
  - Robot Position (x, y, heading)
  - Battery level
  - Active SLAM observations (displayed as overlaid dots on map)

**Command Panel**

- Send Now: Select patient → confirm medicine → dispatch immediately
- Schedule: Select patient → medicine → date/time → save to Firestore
- Emergency Stop: Immediately halts all motors

**Act Phase (overlaid on Run tab when robot is ARRIVED or later)**

- Face verification status shown in real time
- If no face detected: countdown timer shown (default 5 min, configurable)
- Options: Extend wait / Abort and return
- Push notification sent to app automatically on no-face detection

---

### 3. Setup _(Onboarding Wizard — one-time per installation)_

Multi-step flow triggered on first launch or from Settings.

**Step 1 — Device Discovery**

- App scans local WiFi network for Mini PC, Rubik Pi, and ESP32
- Displays discovered devices with IP and status
- User confirms connections

**Step 2 — LIDAR SLAM**

- User initiates mapping run from the app
- Robot enters MAPPING state
- Progress shown on a live raw map feed
- Robot State transitions to MAP_READY when complete

**Step 3 — Map Simplification**

- Raw occupancy grid is processed into simplified closed polygons
- Displayed to user for review
- User can adjust polygon boundaries if needed

**Step 4 — Room Naming**

- Each detected polygon is shown
- User can rename rooms or leave as default (Room 1, Room 2, etc.)
- Room data is saved to Firestore

**Step 5 — Shelf Configuration**

- User assigns each of the 8 shelf cells to a patient + medicine
- Saved to Firestore

> Patient enrollment (name, room, face photo) is done from the Home screen and is not part of the setup wizard. Rooms must be named before patients can be added, since room assignment is required at patient creation.

---

### 4. Settings

- Standby duration after no face detected (5 min default / extended / indefinite)
- Return behavior after failed delivery (return to base / retry once)
- Push notification preferences
- Re-run SLAM (re-triggers Setup Step 2)
- Device IP configuration (in case network changes)

---

## Data Model (Firestore)

### `users/{userId}`

```
{
  email: string,
  displayName: string,
  createdAt: timestamp
}
```

### `patients/{patientId}`

```
{
  name: string,
  roomId: string,
  faceEnrolled: boolean,
  faceEmbeddingRef: string,   // file path on Mini PC
  facePhotoRef: string,       // Firebase Cloud Storage path to enrollment photo
  medicineIds: string[],
  createdAt: timestamp
}
```

### `medicines/{medicineId}`

```
{
  name: string,
  dosage: string,
  unit: string,               // e.g. "mg", "ml"
  notes: string
}
```

### `rooms/{roomId}`

```
{
  displayName: string,
  polygon: [{ x: number, y: number }],   // SLAM-derived vertices
  patientIds: string[],
  floor: number                           // future: multi-floor support
}
```

### `shelf/{cellId}` _(cellId: "A1"–"B4")_

```
{
  patientId: string | null,
  medicineId: string | null,
  occupied: boolean
}
```

### `schedules/{scheduleId}`

```
{
  patientId: string,
  medicineId: string,
  roomId: string,
  startTime: timestamp,
  recurrence: "once" | "daily" | "weekly" | null,
  status: "pending" | "completed" | "failed" | "cancelled"
}
```

### `deliveryLogs/{logId}`

```
{
  scheduleId: string | null,
  patientId: string,
  medicineId: string,
  roomId: string,
  dispatchedAt: timestamp,
  arrivedAt: timestamp | null,
  faceVerified: boolean,
  deliveredAt: timestamp | null,
  outcome: "delivered" | "no_face" | "aborted" | "error",
  notes: string
}
```

### `map/{installationId}`

```
{
  occupancyGridRef: string,   // Firebase Cloud Storage path to raw SLAM grid
  rooms: roomId[],
  generatedAt: timestamp,
  floor: number
}
```

---

## Access Control

All authenticated users have full access. Firebase Auth handles login (Google OAuth + Email/Password) and is the sole gatekeeper — any signed-in user can perform all actions. Firestore security rules enforce that only authenticated users can read or write any document.

---

## WebSocket Event Schema _(Mini PC ↔ App)_

### App → Mini PC (Commands)

```json
{ "type": "DISPATCH", "patientId": "...", "medicineId": "...", "roomId": "..." }
{ "type": "MANUAL_DRIVE", "linear": 0.5, "angular": -0.1 }
{ "type": "EMERGENCY_STOP" }
{ "type": "EXTEND_STANDBY", "durationSeconds": 300 }
{ "type": "ABORT_RETURN" }
{ "type": "START_MAPPING" }
```

### Mini PC → App (Telemetry)

```json
{ "type": "STATE_UPDATE", "state": "NAVIGATING" }
{ "type": "POSITION_UPDATE", "x": 3.4, "y": 1.2, "heading": 1.57 }
{ "type": "BATTERY_UPDATE", "percent": 72 }
{ "type": "FACE_RESULT", "matched": true, "patientId": "..." }
{ "type": "SLAM_UPDATE", "observations": [...] }
{ "type": "ERROR", "code": "SHELF_EMPTY", "cellId": "A2" }
```

---

## Error Handling

| Error              | Trigger                                | Behavior                                                      |
| ------------------ | -------------------------------------- | ------------------------------------------------------------- |
| Shelf cell empty   | Arm detects no bottle in assigned cell | Robot stays IDLE, app notified, delivery blocked with alert   |
| No face detected   | Timer expires in WAITING_FOR_FACE      | Push notification sent, robot returns                         |
| Navigation blocked | Obstacle cannot be routed around       | Robot enters ERROR state, app alerted, manual control offered |
| WiFi loss          | WebSocket disconnects mid-delivery     | Robot enters safe IDLE, resumes on reconnect                  |
| Face mismatch      | Detected face does not match patient   | Robot does not open compartment, logs event, notifies app     |

---

## Additional Improvements

### High Priority

**Multi-robot support groundwork**
Even if you start with one robot, the data model and WebSocket schema should include a `robotId` field from day one. Adding it later across Firestore, the WebSocket layer, and the UI is painful.

**Offline resilience on the Mini PC**
If the app disconnects or WiFi drops mid-delivery, the Mini PC should be able to complete the current delivery autonomously using its last known instruction. It should not abort just because the app lost connection.

**Cell-level shelf verification before dispatch**
Before the robot is dispatched, the system should verify that the target shelf cell is marked as occupied in Firestore. If empty, block the dispatch and alert the user rather than sending the robot out for nothing.

**Delivery log access in the UI**
The delivery log data model exists but no screen surfaces it. A dedicated log view (or tab within the patient profile) is important for medical accountability and debugging.

### Medium Priority

**Recurrence for schedules**
The schedule object supports `daily` and `weekly` recurrence flags but there is no UI or logic described for how recurring schedules auto-generate future delivery events or handle missed deliveries.

**Low battery return-to-base**
The telemetry schema includes battery level but there is no defined behavior when battery drops below a threshold. The robot should automatically abort non-critical tasks and return to a charging dock.

**Map versioning**
If SLAM is re-run (e.g. after a renovation), the old map and room assignments become invalid. The map data model should support versioning so that historical delivery logs still reference the correct room layout.

**Face enrollment quality check**
When enrolling a patient's face, the system should validate that the image is usable (correct lighting, face centered, minimum resolution) before storing the embedding, rather than failing silently at delivery time.

### Lower Priority / Future

**Manual Robot Control**
A joystick overlay on the Run tab for direct drive control, sending velocity commands to the ESP32 via the Mini PC WebSocket. Useful for repositioning the robot or navigating edge cases the autonomous system can't handle.

**Multi-floor navigation**
Already noted as a future idea. The Room and Map data models include a `floor` field in anticipation of this. Stair/elevator navigation will require significant ROS 2 planning work.

**Caregiver mobile alerts**
Beyond in-app push notifications, consider SMS or email fallback for critical events like missed deliveries or robot errors, especially in home environments where the app may not be open.

**Delivery confirmation from patient**
A simple physical button on the rover that the patient presses to confirm receipt could supplement (or replace) face recognition for patients who are difficult to recognize reliably (poor lighting, face coverings, significant appearance changes).
