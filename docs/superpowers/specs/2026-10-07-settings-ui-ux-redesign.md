# Settings UI/UX Redesign Specification

Status: Design ready for implementation  
Owner issue: #32  
Reviewed base: `fa261bb548991a840921494fb7312496d6335e77`

## 1. Purpose

The settings surface exists to let the user adjust clock behavior and appearance quickly while retaining visual context of the clock whenever the viewport permits.

This design follows the UI/UX rules in:

- `kinoko34077/.ai-guidelines/uiux_vibecoding_protocol_pack_v1`
- `.ai-guidelines/guidelines/UI_UX_POLICY.md`
- `.ai-guidelines/guidelines/USABILITY_POLICY.md`

The work type is **B. Existing UI improvement**.

## 2. Current-state diagnosis

The accepted settings UI currently exposes six peer sections in a multi-column grid:

1. 時計設定
2. 表記設定
3. 表示情報
4. 色設定
5. 毎日のランダム色
6. その他

It also exposes a manual `部分 / 全画面` view toggle and uses a long-form modal/dialog model with focus trapping.

### 2.1 Main problems

#### Flat information architecture

Frequently used clock controls, visual controls, optional metadata, advanced random-color tuning, diagnostics, sharing, compatibility and reset are presented at roughly the same hierarchy level.

This increases scanning cost and makes low-frequency settings compete with everyday controls.

#### Layout-mode control is user-visible implementation detail

The user must choose `部分` or `全画面` even though the appropriate layout is primarily determined by available viewport width.

Responsive layout should adapt automatically.

#### Multi-category settings are modeled as a modal

The settings surface is long-lived and multi-section, but currently uses `role="dialog" aria-modal="true"` and traps focus. The referenced component rules reserve modal/dialog patterns for short confirmation, warning and light-input tasks.

#### Advanced random controls are always expanded

Hue/lightness ranges for multiple color targets consume substantial vertical space despite being advanced configuration.

#### System responsibilities are mixed

Sharing, diagnostics, retry actions, legacy mode and destructive reset share the broad `その他` grouping.

#### Mobile behavior is mostly column collapse

Current narrow behavior largely turns the grid into one column rather than changing the navigation and information architecture for the narrower context.

## 3. Interaction model

### 3.1 Apply and persistence

Settings continue to:

- apply immediately;
- persist automatically through the existing settings mechanism;
- update the clock without a separate Save action.

No Save button is introduced.

The settings header communicates:

> 即時反映・自動保存

Dynamic results such as URL copy, retry success/failure or storage errors continue to use a dedicated status region.

### 3.2 Primary action hierarchy

There is no persistent Primary Action because editing is immediate-apply.

Operation classes:

- Secondary: category navigation, URL copy, retry.
- Tertiary: advanced range disclosure, compatibility.
- System: status, Wake Lock and location diagnostics.
- Danger: reset only.

## 4. Information architecture

The six current sections become five user-oriented categories.

### 4.1 時計

Order:

1. 時計方式
2. 秒表示
3. 点滅を倍速
4. 時間形式
5. 英字を大文字化
6. 時計フォント
7. 時計文字サイズ
8. 時計字間

Rules:

- 時間形式 is disabled when the selected clock system does not support it.
- 英字を大文字化 is disabled when the selected clock system does not support alphabetic radix digits.
- Disabled controls keep their stored values.
- If disabled state could be ambiguous, a short helper explains why.

### 4.2 表記

Order:

1. 年表示
2. 字体
3. 書字方向
4. 日本語フォント

### 4.3 表示

Order:

1. 天気
2. 月齢
3. 六曜

Location status belongs contextually near the location-dependent controls.

The global System category may repeat only a concise diagnostic summary/link if necessary, but the primary error/retry path remains next to the affected controls.

### 4.4 色

Base controls:

1. 背景色
2. 文字色
3. 時計色
4. 毎日ランダム
5. 背景色も変更

Advanced disclosure:

- label: `詳細範囲`
- collapsed by default;
- disclosure row uses chevron and accessible expanded state;
- contains:
  - 時計 hue range
  - 時計 lightness range
  - 文字 hue range
  - 文字 lightness range
  - 背景 hue range
  - 背景 lightness range

Random-range values and controls retain the existing underlying settings schema.

### 4.5 システム

Subsections:

#### 共有
- URLコピー

#### 診断
- Wake Lock state
- Wake Lock retry when failed

位置情報の主状態・再試行は「表示」に置き、天気・月齢との因果関係を崩さない。システム側へ同じ診断UIを重複表示しない。

#### 互換
- legacy mode

#### Danger Zone
- 初期化

Reset remains separated visually and keeps explicit confirmation.

## 5. Desktop layout

Wide layout uses a right-side inspector rather than a full-screen settings grid.

### 5.1 Shell

Initial target width:

`clamp(420px, 34vw, 520px)`

This is an implementation candidate, not a fixed aesthetic number. The final value is accepted only after checking select/range/color-picker overflow and the remaining live-clock viewport. The inspector must not become so wide that it defeats the purpose of retaining the clock as live context.

The rest of the viewport continues showing the live clock and remains interactive on wide layouts.

The inspector contains:

1. sticky header;
2. category navigation rail;
3. active category form.

Suggested internal grid:

- category rail: 120–140px;
- form pane: remaining width.

Only one category pane is active at a time.

### 5.2 Header

Contains:

- `設定`
- persistent helper/status text: `即時反映・自動保存`
- dynamic status message region
- close icon button

Remove:

- manual `部分 / 全画面` toggle.

The close button remains icon-only because it is a known auxiliary action; it keeps tooltip/title and `aria-label`.

## 6. Narrow/mobile layout

At narrow usable widths the settings surface becomes full viewport. The obscured main application becomes inert while settings are open, and inertness is removed on close or when returning to a wide layout.

The change is structural, not a scaled-down desktop inspector.

### 6.1 Navigation

Desktop category rail becomes a horizontal category bar under the sticky header.

Requirements:

- horizontally scrollable only for the category navigation itself if needed;
- active category remains visually distinct;
- the form pane itself does not require horizontal scrolling;
- same category model and state are shared with desktop.

### 6.2 Form

One vertical column.

Touch targets should approach 44px where practical while preserving compact information density.

Advanced color ranges remain collapsed by default.

The narrow fullscreen presentation is page-like rather than a nested dialog. While it is open, the obscured application surface must not remain keyboard-reachable; implementation should make the underlying main app region `inert` (or use an equivalent proven mechanism) and restore it on close.

### 6.3 Breakpoint

Do not canonize a device label.

Implementation should begin with a candidate usable-width breakpoint around 760–820px and verify actual overflow/reflow behavior before freezing the threshold.

## 7. Category navigation semantics

Use a real navigation/control structure.

Desktop:

- container: `nav aria-label="設定カテゴリ"`
- category buttons expose selected/current state;
- the settings inspector is non-modal: background clock remains visible and usable;
- no blanket focus trap is used.

Mobile:

- same category data source;
- responsive presentation may use tab semantics if implemented consistently.

Category changes must:

- never discard settings state;
- not recreate settings from defaults;
- preserve the active category for the current settings session, including close/reopen within the same page session;
- preserve per-category scroll position where switching away and back would otherwise create avoidable re-navigation;
- preserve native disclosure state while the current page session remains alive;
- keep this browsing state session-local; do not add it to persistent settings/localStorage;
- avoid unexpected focus movement;
- keep keyboard navigation predictable.

## 8. Settings surface semantics

The long settings editor should no longer depend on modal-dialog semantics as its default model.

Implementation direction:

- desktop inspector: non-modal settings region/aside;
- narrow fullscreen settings: same logical settings surface presented full-screen;
- Escape closes the settings surface;
- closing returns focus to the settings trigger;
- no blanket focus trap is required for the long-form settings editor.

If implementation evidence shows a real accessibility reason to keep modal behavior at a specific narrow state, that exception must be documented and tested rather than applied to both layouts by default.

## 9. Form component rules

### 9.1 Labels

All form controls retain visible labels.

Placeholder text is not used as a label.

### 9.2 Switches

Existing switches remain suitable for boolean settings.

Disabled switches:

- remain visually distinguishable;
- expose actual disabled state;
- do not erase the stored preference.

### 9.3 Segmented controls

Use only where choices are few and mutually exclusive, such as 12/24-hour format.

### 9.4 Selects

Use for enumerations with several values, such as clock system and font.

### 9.5 Color picker input paths

When the enhanced iro.js picker is available, the native `input[type="color"]` remains visible and keyboard-reachable as the non-pointer alternative. Both paths update the same setting and stay synchronized through the existing render path.

### 9.6 Ranges

Keep range controls for size, tracking and random range limits.

Show the current numeric value adjacent to the control.

Compact density is not forced uniformly. Color pickers and paired range controls may use more vertical space than ordinary boolean/select rows when that improves manipulation accuracy and prevents horizontal crowding.

### 9.7 Helper text

Move helper text close to the setting it explains.

The large clock-system explanatory paragraph should be split or reduced so that information appears only where it is needed.

## 10. Status and recovery

### 10.1 Immediate setting change

No success toast for every toggle.

Visual change in the live clock is the primary feedback.

Persistence state is communicated by the header helper/status.

### 10.2 URL copy

On success:

- update `role=status` text briefly.

On failure:

- show an actionable error;
- do not discard settings.

### 10.3 Location / Wake Lock

Failures remain visible until resolved or state changes.

Retry stays beside the affected diagnostic.

### 10.4 Reset

Reset:

- stays in Danger Zone;
- requires explicit confirmation;
- after reset, settings remain open unless current implementation requirements dictate otherwise;
- category should not jump unexpectedly.

## 11. Responsive and accessibility acceptance

Implementation must verify:

- keyboard reaches category navigation and all controls;
- focus-visible is preserved;
- closing returns focus to the settings trigger;
- category changes do not lose values;
- no form-level horizontal scroll at narrow widths;
- active category is machine-readable;
- visible labels remain present;
- status messages remain exposed to assistive technology;
- disabled controls expose actual disabled state;
- color/state is not the only indication of selection or error;
- target size remains at least 24px; narrow/touch mode approaches 44px where practical;
- zoom/text scaling does not hide critical controls;
- advanced disclosure works with keyboard and exposes expanded state.

## 12. Implementation constraints

Preserve:

- existing settings data schema;
- existing URL parameter schema;
- immediate rendering behavior;
- local persistence behavior;
- color-picker library;
- all existing clock/time semantics;
- existing runtime diagnostics functionality.

The first implementation should prefer regrouping existing controls over rewriting their business logic.

## 13. Implementation sequence

### Phase A — IA and state

- add category model/state;
- regroup existing DOM controls into five category panes;
- keep existing element IDs;
- keep settings callbacks and persistence intact.

### Phase B — adaptive shell

- remove manual layout-toggle UX;
- implement desktop inspector with the initial `clamp(420px, 34vw, 520px)` candidate width;
- implement narrow fullscreen mode;
- make the main application inert only in narrow mode;
- update settings open/close semantics and focus handling;
- preserve active category and per-category scroll positions as session-only UI state.

### Phase C — progressive disclosure / system separation

- add advanced random-range disclosure;
- split System subsections;
- move reset into Danger Zone.

### Phase D — verification

Run:

- existing automated settings tests;
- URL/storage round-trip regression;
- keyboard navigation checks;
- focus return checks;
- desktop and narrow viewport runtime checks;
- overflow/reflow checks;
- accessibility name/role/state checks.

## 14. Design completion criteria

The design is implementation-ready when:

- category ownership of every current setting is explicit;
- desktop and narrow shell behavior are explicit;
- immediate-apply/autosave semantics are explicit;
- danger/system/diagnostics responsibilities are separated;
- accessibility and focus behavior are explicit;
- no storage or clock behavior changes are required to implement the redesign.
