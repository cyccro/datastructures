function wrap_index(lgc_idx: number, capacity: number): number {
  return lgc_idx - (capacity * +(lgc_idx >= capacity));
}

export class VecDeque<T> {
  static capacity_to<T>(n: number): VecDeque<T> {
    const out = new VecDeque<T>(n);
    out.limit = 40;
    return out;
  }
  private head: number;
  private len: number;
  private limit = 0;
  private buf: T[];
  constructor(initial_size = 16) {
    this.head = 0;
    this.len = 0;
    this.buf = [];
  }

  size() {
    return this.len;
  }

  limit_capacity_to(n: number) {
    this.limit = n;
  }

  is_full() {
    return this.len == this.capacity();
  }

  capacity() {
    return this.limit || this.buf.length;
  }
  is_empty() {
    return this.len == 0;
  }
  clear() {
    this.buf.length = this.head = this.len = 0;
    this.buf.length = 1;
  }

  private wrap_add(idx: number, addend: number) {
    return wrap_index((idx + addend) % Number.MAX_SAFE_INTEGER, this.capacity());
  }

  private wrap_sub(idx: number, addend: number) {
    return wrap_index((idx - addend + this.capacity()) % Number.MAX_SAFE_INTEGER, this.capacity());
  }

  private physical_idx(idx: number) {
    return this.wrap_add(this.head, idx);
  }

  private write(offset: number, val: T) {
    this.buf[offset] = val;
  }

  private read(offset: number) {
    return this.buf[offset];
  }

  get(idx: number) {
    if (idx < this.len) return this.read(this.physical_idx(idx));
  }

  swap(i: number, j: number) {
    if (i > this.len || j > this.len) throw new Error("I or J are greater than the max size of the vector");
    let i_idx = this.physical_idx(i);
    let j_idx = this.physical_idx(j);
    const i_element = this.buf[i_idx];
    this.buf[i_idx] = this.buf[j_idx];
    this.buf[j_idx] = i_element;
  }

  front() {
    return this.read(0);
  }

  back() {
    return this.read(this.len - 1);
  }

  pop_front() {
    if (this.is_empty()) return void 0;
    else {
      const old = this.head;
      this.head = this.physical_idx(1);
      this.len--;
      return this.read(old);
    }
  }

  pop_back() {
    if (this.is_empty()) return void 0;
    else {
      this.len--;
      return this.read(this.len);
    }
  }

  push_front(val: T) {
    if (this.limit && this.is_full()) return;
    this.head = this.wrap_sub(this.head, 1);
    this.len++;
    this.write(this.head, val);
  }

  push_back(val: T) {
    if (this.limit && this.is_full()) return;
    this.write(this.physical_idx(this.len), val);
    this.len++;
  }
  write_at(idx: number, val: T) {
    this.write(this.physical_idx(idx), val);
  }
  *iter() {
    for (let i = 0; i < this.len; i++) yield this.read(i);
  }
}


function main() {
  const LIMIT = 16;
  const array = [];
  const vecdeque = new VecDeque(LIMIT);

  {

    let flag = true;
    let i = 0;
    console.time("array");
    while (i < 100000) {
      if (flag) {
        for (let j = 0; j < LIMIT; j++, i++) {
          array.unshift(i);
        }
      } else {
        for (let j = 0; j < LIMIT; j++, i++) {
          array.shift();
        }
      }
      flag = !flag;
    }
    console.timeEnd("array");
  }
  {
    let flag = true;
    let i = 0;
    console.time("deque");
    while (i < 100000) {
      if (flag) {
        for (let j = 0; j < LIMIT; j++, i++) {
          vecdeque.push_front(i);
        }
      } else {
        for (let j = 0; j < LIMIT; j++, i++) {
          vecdeque.pop_front();
        }
      }
      flag = !flag;
    }
    console.timeEnd("deque");
  }

}
main();
