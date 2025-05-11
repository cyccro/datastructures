interface Hashable {
  hash(): number;
}
interface Bin {
  entry: number; //entry is the index inside the IndexMap.entries
  collision: number; //If not -1, its an index inside IndexMap.entries that makes a single linked list
}
interface IndexMapEntry<K extends Hashable, T> {
  key: K,
  value: T
  hash: number;
}
export class IndexMap<K extends Hashable, T> {
  private _len = 0;
  private entries: Array<IndexMapEntry<K, T>> = new Array();
  private bins: Array<Bin> = new Array(4).fill({ entry: -1, collision: -1 });
  private binmask: number = 0; //due to limitations not pretending to use f64, this will be forced to be a SMI
  private free_head = -1;

  len() {
    return this._len;
  }
  capacity() {
    return this.bins.length;
  }

  private set_last_bin(value: Bin) {
    this.bins[this._len++] = value;
  }

  private should_grow() {
    //check https://github.com/khonsulabs/budlang/blob/5677822b270d05f68cef324e7db4aaa905548c90/budlang/src/map.rs#L163
    const cap = this.bins.length;
    const len = this._len;
    if (len == 0 && cap == 0) return true;
    if (cap == 4) return len == 4;
    if (cap == 8) return len >= 6;
    if (cap == 16) return len >= 13;
    return len > ((cap * 0.875) | 0);
  }

  private free_index() {
    if (this.free_head == -1) return;
    const curr = this.bins[this.free_head];

    this.free_head = curr.collision;
    curr.collision = -1;
  }

  private insert_bin(bin_idx: number, entry_idx: number) {
    const old = this.bins[bin_idx];
    this.bins[bin_idx] = {
      entry: entry_idx,
      collision: -1
    };
    if (old) {
      this.free_index();
      this.bins[bin_idx].collision = this.free_head == -1 ? this.bins.length : this.free_head;

      if (this.free_head != -1) {
        this.bins[this.free_head] = old;
      } else {
        this.bins.push(old);
      }
    }
  }
  private try_grow() {
    if (this.should_grow()) {

      let old_len = this._len;
      const new_len = this.bins.length *= 2;
      this.binmask = new_len - 1;
      this.free_head = -1;
      for (; old_len < new_len; old_len++)this.bins[old_len] = {
        entry: -1,
        collision: -1
      }
      this.entries.forEach((entry, idx) =>
        this.insert_bin(entry.hash & this.binmask, idx)
      )
    }
  }
  /**
  * Gets the entry based on the key and its hashcode
  * @returns The bucket, and the index of it in the inner array
  */
  private entry(hash: number, key: K): [number, number] | void {
    if (this.entries.length == 0) return;
    let bucket = hash & this.binmask;
    while (bucket != -1) {
      const bin = this.bins[bucket];
      if (bin.entry == -1) return;
      const entry = this.entries[bin.entry];
      if (entry.hash == hash && entry.key == key) {
        return [bucket, bin.entry];
      } else bucket = bin.collision;
    }
  }

  insert(key: K, value: T): T | void {
    const hash = key.hash();
    const entry = this.entry(hash, key);
    if (entry) {
      const arrentry = this.entries[entry[1]];
      const old_value = arrentry.value;
      arrentry.value = value;
      return old_value;
    } else {
      const entry_index = this.entries.length;
      this.try_grow();
      this.entries.push({ key, hash, value });
      this._len++;
      let bucket = hash & this.binmask;
      if (!this.bins[bucket]) this.bins[bucket] = { entry: entry_index, collision: -1 };
      else {
        let bin = this.bins[bucket];
        while (bin.collision != -1) {
          bin = this.bins[bin.collision];
        }
        bin.collision = entry_index;
        this.bins[entry_index] = { entry: entry_index, collision: -1 };
      }
    }
  }

  delete(key: K) {
    const hash = key.hash();
    let bucket = hash & this.binmask;
    let prevBinIndex = -1;
    let binIndex = bucket;

    while (binIndex !== -1) {
      const bin = this.bins[binIndex];
      const entry = this.entries[bin.entry];

      if (entry.hash === hash && entry.key === key) {
        const removedValue = entry.value;
        const delEntryIndex = bin.entry;

        // 1. Unlink bin from collision chain (same as before)
        if (prevBinIndex === -1) {
          if (bin.collision !== -1) {
            this.bins[bucket] = this.bins[bin.collision];
            this.bins[bin.collision] = { collision: -1, entry: -1 };
          } else {
            this.bins[bucket] = { collision: -1, entry: -1 };
          }
        } else {
          this.bins[prevBinIndex].collision = bin.collision;
          this.bins[binIndex] = { collision: -1, entry: -1 };
        }

        // 2. Remove entry from entries array by splicing (preserves order)
        this.entries.splice(delEntryIndex, 1);

        // 3. Update bins pointing to entries after delEntryIndex
        for (let i = 0; i < this.bins.length; i++) {
          const b = this.bins[i];
          if (b && b.entry > delEntryIndex) {
            b.entry--;
          }
        }
        this._len--;
        return removedValue;
      }

      prevBinIndex = binIndex;
      binIndex = bin.collision;
    }
    return;
  }
  get(key: K): T | void {
    const hash = key.hash();
    const entry = this.entry(hash, key);
    if (entry) return this.entries[entry[1]].value;
  }
  get_index_of(key: K) {
    const hash = key.hash();
    const entry = this.entry(hash, key);
    if (entry) return entry[1];
  }
  get_indexed(idx: number) {
    return this.entries[idx]?.value;
  }
  has(key: K) {
    return this.entry(key.hash(), key) != void 0;
  }
  has_index(n: number) {
    return n < this.bins.length;
  }

}
declare namespace globalThis {
  interface Number extends Hashable { }
}
Number.prototype.hash = function() {
  return this | 0;
}


function main() {
  const limit = 100000;
  const map = new IndexMap<number, string>();
  console.log("testing with limit =", limit)
  console.time("insert");
  for (let i = 0; i < limit; i++) {
    map.insert(i * 3, 'a');
  }
  console.timeEnd("insert");
  console.time("idxof");
  for (let i = 0; i < limit; i++) {
    map.get(i * 3);
  }
  console.timeEnd("idxof");
}
main();
