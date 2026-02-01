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
