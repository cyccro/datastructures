type RadixHandler = (params: Map<string, string>) => string;

const enum RadixNodeKind {
  Param,
  Static,
}
interface RadixNodeType {
  kind: RadixNodeKind;
  value: string;
}
function node_type(kind: RadixNodeKind, value: string): RadixNodeType {
  return { kind, value };
}

class RadixNode {
  children: Map<string, RadixNode> | null = null;
  paramChild: RadixNode | null;
  handler: RadixHandler | null = null;
  constructor(public readonly kind: RadixNodeType) {
  }
  private get_children() {
    return this.children ?? (this.children = new Map);
  }
  insert(segments: string[], handler: RadixHandler, index = 0) {
    let initial_node = this as RadixNode;
    let node: RadixNode | null = null;
    const len = segments.length;
    while (index < len) {
      const segment = segments[index++];
      if (segment.charCodeAt(0) == 58) { //":"
        node = new RadixNode(node_type(RadixNodeKind.Param, segment.slice(1)));
        !initial_node.paramChild && (initial_node.paramChild = node);
      } else {
        if (!(node = initial_node.get_children().get(segment)!)) {
          node = new RadixNode(node_type(RadixNodeKind.Static, segment));
          initial_node.get_children().set(segment, node);
        };
      }
      initial_node = node;
    }
    (node ?? initial_node).handler = handler;
  }
  find(path: string) {
    const split = path.split("/").filter(Boolean);
    return this.find_segments(split);
  }
  find_segments(segments: string[], index = 0): [RadixHandler, Map<string, string>] | void {
    if (index == segments.length) return this.handler ? [this.handler!, new Map] : void 0;
    const segment = segments[index++];
    const child = this.get_children().get(segment) ?? this.paramChild;
    if (child) {
      const result = child.find_segments(segments, index);
      if (result && child == this.paramChild) result[1].set(child.kind.value, segment);
      return result;
    }
  }
}

class RadixTree {
  private inner = new RadixNode(node_type(RadixNodeKind.Static, ""));

  constructor() { }

  route(path: string, handler: (params: Map<string, string>) => string) {
    const split = path.split("/").filter(Boolean);
    this.inner.insert(split, handler);
  }

  execute(path: string) {
    const value = this.inner.find(path);

    if (!value) "404";
    else return value[0](value[1]);
  }
}

function generateRoute(depth: number) {
  const route: string[] = new Array(depth);
  for (let i = 0; i < depth; i++) route[i] = `${Math.random() > 0.5 ? ':param' : 'static'}${i}`;
  return `/${route.join("/")}`;
};

function benchmark() {
  const tree = new RadixTree();
  const numRoutes = 100000; // Number of routes to add
  const depth = 32; // Maximum depth of the routes
  const routes = new Array(numRoutes) as string[];
  // Benchmark Insertion
  console.time("Insert Routes");
  for (let i = 0; i < numRoutes; i++) {
    const route = generateRoute(depth);
    routes[i] = route;
    tree.route(route, (params) => `Handler for ${route}`);
  }
  console.timeEnd("Insert Routes");

  // Benchmark Execution
  console.time("Match routes");
  for (const route of routes) {
    const r = tree.execute(route);
  }
  console.timeEnd("Match routes");
};

function main() {
  /**const tree = new RadixTree();
  tree.route("/suamae/:id/:corno", (e) => {
    console.log(e);
    return "oi";
  });

  tree.execute("/suamae/55/oigostosa");
  */
  benchmark();
}
main();
