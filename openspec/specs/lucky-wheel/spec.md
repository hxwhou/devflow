# lucky-wheel Specification

## Purpose
A browser-based lucky-wheel lottery: the user spins a wheel that decelerates to a stop under a fixed pointer, revealing the winning prize. Prizes are configurable (name, weight, color) and persisted locally; recent draw history is retained.
## Requirements
### Requirement: Default prize set

The system SHALL provide a built-in default set of at least 6 prizes on first launch and whenever stored configuration is missing or invalid, so the wheel is always drawable.

#### Scenario: First launch with empty storage

- **WHEN** the application loads and localStorage has no saved configuration
- **THEN** the system SHALL load a built-in default prize set and render a drawable wheel

#### Scenario: Corrupted storage fallback

- **WHEN** the saved configuration cannot be parsed or fails validation
- **THEN** the system SHALL discard it, warn via console, and load the default prize set

### Requirement: Prize configuration

The user SHALL be able to add, remove, and edit each prize's name, weight, and color. Edits SHALL immediately re-render the wheel and persist.

#### Scenario: Edit a prize

- **WHEN** the user changes a prize's name, weight, or color in the edit panel
- **THEN** the wheel SHALL re-render to reflect the change and the change SHALL be persisted to localStorage

#### Scenario: Add a prize

- **WHEN** the user adds a new prize
- **THEN** a new segment SHALL appear on the wheel and the configuration SHALL persist

#### Scenario: Remove a prize

- **WHEN** the user removes a prize
- **THEN** that segment SHALL disappear from the wheel and the configuration SHALL persist

#### Scenario: Cannot remove the last prize

- **WHEN** only one prize remains
- **THEN** its delete control SHALL be disabled, leaving at least one drawable prize

#### Scenario: Invalid weight is rejected

- **WHEN** the user enters a weight that is not a positive number
- **THEN** the system SHALL prevent the invalid value (clamping to a minimum of 1) and not accept an empty/non-numeric weight as the saved value

#### Scenario: Empty name is rejected

- **WHEN** the user clears a prize's name
- **THEN** the system SHALL block the save with an inline "name cannot be empty" message and keep the previous valid name

### Requirement: Configuration persistence

The system SHALL persist the entire configuration under a single namespaced, versioned localStorage key, written as one consistent snapshot after every configuration change and every draw.

#### Scenario: Configuration survives reload

- **WHEN** the user reloads the page after editing prizes
- **THEN** the previously saved configuration SHALL be loaded and rendered

#### Scenario: Single atomic snapshot

- **WHEN** any prize is added, removed, or edited, or a draw completes
- **THEN** the whole configuration object (prizes + history + version) SHALL be serialized and written to storage in one operation

#### Scenario: Storage write failure is non-fatal

- **WHEN** localStorage writes throw (e.g., quota exceeded, privacy mode)
- **THEN** the system SHALL warn via console and continue operating from in-memory state for the rest of the session

### Requirement: Weighted drawing

The system SHALL select the winning prize with probability proportional to each prize's weight, and each visible wheel segment's arc length SHALL be proportional to that same weight.

#### Scenario: Winner distribution matches weights

- **WHEN** drawing is repeated many times on a fixed weighted configuration
- **THEN** each prize's observed win frequency SHALL approximate its weight's share of the total weight (within a statistical tolerance)

#### Scenario: Visual matches probability

- **WHEN** the wheel is rendered
- **THEN** segment i's arc length SHALL equal (weight_i / total_weight) * 2π, so the visible slice proportion equals the win probability

#### Scenario: Single prize always wins

- **WHEN** only one prize is configured
- **THEN** every draw SHALL select that prize

### Requirement: Wheel animation

When the user starts a draw, the wheel SHALL rotate forward and decelerate, then stop with the pointer resting within the winning prize's segment.

#### Scenario: Forward rotation to a stop

- **WHEN** the user triggers a draw
- **THEN** the wheel rotation SHALL monotonically increase toward a target angle greater than the current angle, decelerate, and come to rest

#### Scenario: Pointer lands inside the winner segment

- **WHEN** a draw completes
- **THEN** the pointer SHALL rest within the winning prize's segment arc (not on a separator), so the visually indicated prize equals the logically selected winner

#### Scenario: No concurrent spins

- **WHEN** a spin is in progress
- **THEN** the start control SHALL be disabled and further start clicks SHALL be ignored until the spin completes

#### Scenario: Reduced motion

- **WHEN** the user agent signals `prefers-reduced-motion: reduce`
- **THEN** the spin duration SHALL be shortened so the wheel still rotates and stops but without a long deceleration

### Requirement: Result presentation

On spin completion the system SHALL present the winning prize to the user via a modal and SHALL allow drawing again.

#### Scenario: Winner shown after stop

- **WHEN** a spin completes
- **THEN** a modal SHALL display the winning prize's name

#### Scenario: Dismiss and redraw

- **WHEN** the user dismisses the result modal
- **THEN** the start control SHALL be re-enabled, allowing another draw

### Requirement: Draw history

The system SHALL record each completed draw as a history entry carrying a draw timestamp and the winning prize name snapshotted at draw time.

#### Scenario: Draw appended to history

- **WHEN** a draw completes
- **THEN** a new history entry (timestamp + winning prize name) SHALL be appended and persisted

#### Scenario: History cap

- **WHEN** history already contains 50 entries and a new draw completes
- **THEN** the oldest entry SHALL be evicted so history never exceeds 50 entries

#### Scenario: History survives prize changes

- **WHEN** a prize that was won is later renamed or deleted
- **THEN** existing history entries SHALL still show the prize name as it was at draw time

#### Scenario: Clear history

- **WHEN** the user confirms clearing history
- **THEN** all history entries SHALL be removed and the empty history SHALL persist across reloads

### Requirement: Responsive redraw

The wheel SHALL remain correctly drawn across viewport size changes without losing its current rotation.

#### Scenario: Resize keeps rotation

- **WHEN** the viewport is resized while a wheel is displayed
- **THEN** the canvas SHALL be re-scaled and the wheel redrawn at the same rotation angle it had before the resize

