export class CircularBuffer<T> {
  private inner = new Array();
  private capacity: number;
  constructor(capacity: number) {
    if ((capacity & capacity - 1) != 0) throw new Error("Circular Buffer len must be power of 2");
    this.capacity = capacity - 1;
  }

  get(n: number) {
    return this.inner[n & this.capacity];
  }
  set(n: number, value: T) {
    this.inner[n & this.capacity] = value;
  }
  grow() {
    this.inner.length *= 2;
    this.capacity = this.inner.length - 1;
  }
  push(value: T) {
    let old_length = this.inner.length;
    if (old_length == this.capacity + 1) {
      this.grow();
    }
    this.set(old_length, value);
  }
}
