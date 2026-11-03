+++
title = "Blockchain in Zig"
description = "Explore creating a blockchain in Zig."
date = 2026-11-03

[taxonomies]
tags = ["blockchain", "zig"]
+++

A blockchain is a sequence of data blocks. The integrity of an individual
data `Block` is established by signing it with a `hash`. The integrity of
the complete sequence of blocks is established by ensuring the `hash` of
each `Block` includes the hash of the previous block.

<center>
<img src="/blockchain-example1.svg" style="width:100%; max-width: 30em;"/>
</center>


> Each block is signed by hashing its contents along with the
> hash from the previous block.

Consider this simple `Block`:

```zig
pub const Block = struct {
    pub const hash_length = 32;

    data: []const u8,
    when: i96,
    hash: [hash_length]u8,
}
```

Zig convention is to avoid defining magic numbers as global or top level
variabes, the `Block` `hash_length` is declared inside the `Block` struct.

Bitcoin is signed with `sha256` and Ethereum is signed with a slightly more
modern and secure[^1] `keccak256`:


```zig
fn calculateHash(
    data: []const u8,
    now: i96,
    previous_hash: []const u8,
) [hash_length]u8 {
    //var h = std.crypto.hash.sha2.Sha256.init(.{});
    var h = std.crypto.hash.sha3.Keccak256.init(.{});
    h.update(previous_hash); // Add previous hash to the hash
    h.update(data);          // Add `data` to the hash
    var buffer: [@bitSizeOf(i96) / @bitSizeOf(u8)]u8 = undefined;
    std.mem.writeInt(i96, &buffer, now, .little);
    h.update(&buffer);       // Add `now` timestamp to the hash
    return h.finalResult();
}
```

A basic `Blockchain` holds an array collection of `Block` entries, and
provides a way to `append` new blocks to the chain.

In zig, the `Block` struct would commonly be nested in the `Blockchain`
struct so that it nested into the `Blockchain` namespace.


```zig
pub const Blockchain = struct {

    pub const Block = struct { ... };

    blocks: std.ArrayList(Block) = .empty,

    pub fn append(
        self: *Blockchain,
        allocator: Allocator,
        io: std.Io,
        data: []const u8,
    ) Allocator.Error!void {
        const now = std.Io.Clock.now(.real, io).toNanoseconds();
        if (self.blocks.lastPtr()) |block| {
            try self.blocks.append(allocator, .{
                .data = try allocator.dupe(u8, data),
                .when = now,
                .hash = calculateHash(data, now, previous_hash),
            });
        } else {
            const zero: [Block.hash_length]u8 = @splat(0);
            try self.blocks.append(allocator, .{
                .data = try allocator.dupe(u8, data),
                .when = now,
                .hash = calculateHash(data, now, &zero),
            });
        }
    }
};
```

The append function does not simply hash the `data` and the `when` timestamp.
It includes the hash of the previous block, or a zero filled hash for the
first block.

Tying it all together, with appropriate `init` and `deinit` functions,
here is a complete working example of a minimal `Blockchain` in zig:

```zig
pub const Blockchain = struct {
    blocks: std.ArrayList(Block),

    pub const empty: Blockchain = .{
        .blocks = .empty,
    };

    pub fn deinit(self: *Blockchain, allocator: Allocator) void {
        for (self.blocks.items) |*block| {
            block.deinit(allocator);
        }
        self.blocks.deinit(allocator);
        self.* = undefined;
    }

    /// A block contains both an aribrary `data` byte sequence,
    /// and the `previous_hash` of the previous block.
    pub const Block = struct {
        pub const hash_length = 32;
        pub const zero: [hash_length]u8 = @splat(0);

        data: []const u8,
        when: i96,
        hash: [hash_length]u8,

        pub fn init(
            allocator: std.mem.Allocator,
            io: std.Io,
            data: []const u8,
            previous_hash: ?*const [hash_length]u8,
        ) Allocator.Error!Block {
            const now = std.Io.Clock.now(.real, io).toNanoseconds();
            return .{
                .data = try allocator.dupe(u8, data),
                .when = now,
                .hash = calculateHash(data, now, previous_hash orelse &zero),
            };
        }

        pub fn deinit(self: *Block, allocator: Allocator) void {
            allocator.free(self.data);
            self.* = undefined;
        }

        fn calculateHash(
            data: []const u8,
            now: i96,
            previous_hash: []const u8,
        ) [hash_length]u8 {
            var h = std.crypto.hash.sha3.Keccak256.init(.{});
            //var h = std.crypto.hash.sha2.Sha256.init(.{});
            h.update(data);
            var buffer: [@bitSizeOf(i96) / @bitSizeOf(u8)]u8 = undefined;
            std.mem.writeInt(i96, &buffer, now, .little);
            h.update(&buffer);
            h.update(previous_hash);
            return h.finalResult();
        }
    };

    pub fn append(
        self: *Blockchain,
        allocator: Allocator,
        io: std.Io,
        data: []const u8,
    ) Allocator.Error!void {
        if (self.blocks.lastPtr()) |block| {
            try self.blocks.append(allocator, try .init(allocator, io, data, &block.hash));
        } else {
            try self.blocks.append(allocator, try .init(allocator, io, data, null));
        }
    }
};
```

Finally, we need a `validate` function to check the contents of
the `Blockchain`. This is achieved by starting at the first block, and
recalculating the `hash` of each block:

```zig
pub fn validate(self: *Blockchain) bool {
    var previous: ?*Block = null;
    for (self.blocks.items) |*block| {
        const hash = Block.calculateHash(
            block.data,
            block.when,
            if (previous) |p| &p.hash else &Block.zero,
        );
        if (!std.mem.eql(u8, &hash, &block.hash)) return false;
        previous = block;
    }
    return true;
}
```

<div class="addendum">
<p class="addendum-eyebrow">Added — November 2026</p>

A complete working zig example, including addtional blockchain `load`
and `save` example functions
is [available on github](https://github.com/loftafi/blockchain).

</div>

[^1]: [Ethereum's keccak256 vs Bitcoin's SHA-256](https://chainscorelabs.com/differences/layer-1-ecosystem-design/wallet-and-key-management-standards/ethereums-keccak256-vs-bitcoins-sha-256-hashing-differences)
