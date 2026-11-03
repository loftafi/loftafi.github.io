+++
title = "How to reliably save game state"
description = "Explore creating a blockchain in Zig."
date = 2020-01-09

[taxonomies]
tags = ["games", "zig"]
+++

## How to reliably save game state?

How do you safely and reliably save your game state? Create a function that
`serialize`s all game state into a text or binary format. This may include
player scores, achievements, backpack contents, map location. Create
another function to `deserialize` from this text or binary format back
into your game memory. 

```zig
pub const GameState = struct {
    pub const save_filename = "game.dat";

    score: u64,
    achievements: ArrayList(Achievement),

    // Convert the game state to a data string.
    pub fn serialize(state: *GameState) []const u8 { ... }

    // Convert save file data back into game state.
    pub fn deserialize(state: *GameState) []const u8 { ... }

    // Save the data string to disk
    pub fn save(state: *const GameState) !void { ... }
}
```
The mistake people commonly make, is to overwrite the existing game file
with the new data. The problem with this, if the write fails, you may
end up with an empty or incomplete game state file.

First write the game state to a temporary file such as
`game.json.202302050150` and after writing succeeds, rename/move the
temporary file into the place of the `game.json` file.

```zig
/// Save the game state
pub fn save(state: *const GameState, gpa: std.mem.Allocator) !void {
    // Add the current time to the save filename
    const temp_name = try std.fmt.allocPrint(gpa, "{s}.{d}", .{
        save_filename,
        std.time.milliTimestamp(),
    });
    defer gpa.free(temp_name);

    // Step 1: Write the game state to a temporary file.
    const data = state.serialize();
    var file = try std.fs.cwd().createFile(temp_name, .{});
    defer file.close();
    _ = file.write(data) catch {
        return;
    };

    // Step 2: move the temporary file onto the real file.
    try std.fs.cwd().rename(temp_name, save_filename);
}

```
