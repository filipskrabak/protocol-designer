// Pure Graph Theory Algorithms

export interface GraphNode {
  id: string;
  [key: string]: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: any;
}

/**
 * Build adjacency list from edges
 */
export function buildAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }
  
  return adjacency;
}

/**
 * Build reverse adjacency list (incoming edges)
 */
export function buildReverseAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, []);
    }
    adjacency.get(edge.target)!.push(edge.source);
  }
  
  return adjacency;
}

/**
 * Find all nodes reachable from a starting node using BFS
 */
export function findReachableNodes(
  startNode: string,
  adjacency: Map<string, string[]>
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [startNode];
  reachable.add(startNode);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || [];
    
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return reachable;
}

/**
 * Check if there's a path from source to target using BFS
 */
export function hasPath(
  source: string,
  target: string,
  adjacency: Map<string, string[]>
): boolean {
  if (source === target) return true;
  
  const visited = new Set<string>();
  const queue: string[] = [source];
  visited.add(source);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || [];
    
    for (const neighbor of neighbors) {
      if (neighbor === target) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return false;
}

/**
 * Detect cycles using DFS with recursion stack
 */
export function hasCycles(
  nodes: GraphNode[],
  adjacency: Map<string, string[]>
): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true; // Back edge found - cycle detected
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }
  
  return false;
}

/**
 * Find all cycles in the graph using DFS
 */
export function findAllCycles(
  nodes: GraphNode[],
  adjacency: Map<string, string[]>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract it from path
        const cycleStartIndex = path.indexOf(neighbor);
        const cycle = path.slice(cycleStartIndex);
        cycles.push([...cycle]);
      }
    }
    
    path.pop();
    recursionStack.delete(nodeId);
  }
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }
  
  return cycles;
}

/**
 * Find strongly connected components using Tarjan's algorithm
 */
export function findStronglyConnectedComponents(
  nodes: GraphNode[],
  adjacency: Map<string, string[]>
): string[][] {
  const sccs: string[][] = [];
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let index = 0;
  
  function strongConnect(nodeId: string): void {
    indices.set(nodeId, index);
    lowLinks.set(nodeId, index);
    index++;
    stack.push(nodeId);
    onStack.add(nodeId);
    
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!indices.has(neighbor)) {
        strongConnect(neighbor);
        lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, lowLinks.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, indices.get(neighbor)!));
      }
    }
    
    if (lowLinks.get(nodeId) === indices.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);
      sccs.push(scc);
    }
  }
  
  for (const node of nodes) {
    if (!indices.has(node.id)) {
      strongConnect(node.id);
    }
  }
  
  return sccs;
}

/**
 * Calculate longest path from a starting node (with cycle detection)
 */
export function longestPath(
  startNode: string,
  adjacency: Map<string, string[]>
): number {
  const visited = new Set<string>();
  
  function dfs(nodeId: string, currentDepth: number): number {
    if (visited.has(nodeId)) {
      return currentDepth; // Cycle detected, stop here
    }
    
    visited.add(nodeId);
    let maxDepth = currentDepth;
    
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const depth = dfs(neighbor, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    visited.delete(nodeId);
    return maxDepth;
  }
  
  return dfs(startNode, 0);
}

/**
 * Check if graph is strongly connected (all nodes reach all nodes)
 */
export function isStronglyConnected(
  nodes: GraphNode[],
  adjacency: Map<string, string[]>
): boolean {
  if (nodes.length === 0) return true;
  
  const sccs = findStronglyConnectedComponents(nodes, adjacency);
  return sccs.length === 1 && sccs[0].length === nodes.length;
}

/**
 * Count self-loops in the graph
 */
export function countSelfLoops(edges: GraphEdge[]): number {
  return edges.filter(edge => edge.source === edge.target).length;
}
