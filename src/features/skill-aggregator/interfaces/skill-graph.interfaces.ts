export interface GraphNode {
  id: string;
  name: string;
  progress: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface SkillGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SkillTreeResponse {
  id: string;
  name: string;
  progress: number;
  children: SkillTreeResponse[];
}
