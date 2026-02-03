# SuperGame Mechanics

## Sprite Speed & Movement

The game uses a normalized coordinate system for consistent gameplay across different screen sizes.

### Coordinate System
- **Grid Range**: 0 to 100 on both axes.
- **X-Axis**: 0 (Left) to 100 (Right).
- **Y-Axis**: 0 (Top) to 100 (Bottom).

### Speed Definition
- **Speed Value**: Represents **coordinate units traveled per second**.
- **Example**: `Speed 10` means the sprite covers 10% of the screen dimension (height or width) every second.

### Speed to Pixels Conversion
Given a standard frame rate of **60 FPS**:

#### Vertical Movement (Falling)
Based on Reference Height (1080px):
- **Formula**: `(Speed * Height / 100) / FPS`
- **Calculation for Speed 10**: `(10 * 1080 / 100) / 60`
- **Result**: **1.8 pixels per frame**

#### Horizontal Movement (Flying)
Based on Reference Width (1920px):
- **Formula**: `(Speed * Width / 100) / FPS`
- **Calculation for Speed 10**: `(10 * 1920 / 100) / 60`
- **Result**: **3.2 pixels per frame**

### Time-Based Speed Calculation
To determine the required Speed for a sprite to stay on screen for a specific duration:

**Formula**: `Speed = 100 / (Duration_ms / 1000)`

**Example**:
If you want the sprite to be on screen for **800ms**:
1. Convert to seconds: `800ms / 1000 = 0.8s`
2. Calculate speed: `100 / 0.8`
3. **Required Speed**: **125**

> **Note**: This assumes the sprite travels the full 100 units of the screen. If including sprite entry/exit time (size), the distance would be `100 + SpriteSize` (approx `100 + 32` for vertical).

## Game Session Flow

### 1. Pre-Session Processing
- **Profile Resolution**: When a user joins (`join_game`), the server checks their profile (Casual, Elite, etc.) from the database.
- **Initialization**: A `GameSession` is created with unique ID, mapped to the socket.
- **Ready State**: Server emits `game_ready` with session duration (3 minutes).

### 2. Trigger to Start
- **Client Ready**: When the `GameCanvas` mounts and socket connects, it emits `start_game`.
- **Countdown**: Server acknowledges with `start_countdown` (3 seconds).
- **Start**: After countdown, server marks start time and triggers first spawn.

### 3. Session Loop
- **Spawning**: Server generates events (Single or Double letters) based on profile complexity.
- **Emission**: `spawn_sprite` event sent to client.
- **Client Rendering**: Client calculates arrival time and renders falling/flying sprites.
- **Interaction**:
    - **Valid Hit**: User types correct key for *first* sprite. Client sends `hit`.
    - **Miss/Wrong**: Sprite leaves bounds or wrong key. Client sends `miss`/`wrong`.
    - **Batch Complete**: Client reports results `event_completed`.
- **Validation**: Server validates timing and order.
- **Progression**: Server updates speed (Reward/Punish) based on hits/misses.

### 4. Ending & Post-Processing
- **Time Limit**: Session ends automatically after 3 minutes.
- **Termination**: Server calls `endGame`.
- **Scoring**: Final score and stats (Error Rate) calculated.
- **Persistence**: `GameResult` saved to MongoDB. User stats updated (e.g. Max Speed).
- **Client Notification**: `game_over` emitted to show Results Page.
